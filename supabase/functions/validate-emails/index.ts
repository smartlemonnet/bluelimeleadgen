import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  emails: string[];
  listName: string;
}

interface MailsSoResponse {
  email: string;
  result: string;
  score: number;
  isv_format: boolean;
  isv_domain: boolean;
  isv_smtp: boolean;
  catch_all: boolean;
  disposable: boolean;
  free_email: boolean;
  reason?: string;
  mx_record?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${authError.message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.error('No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User authenticated: ${user.id}`);

    const { emails, listName }: ValidationRequest = await req.json();
    
    console.log(`Starting validation for ${emails.length} emails`);

    // Create validation list
    const { data: validationList, error: listError } = await supabaseClient
      .from('validation_lists')
      .insert({
        name: listName,
        user_id: user.id,
        total_emails: emails.length,
        status: 'processing'
      })
      .select()
      .single();

    if (listError) throw listError;

    const mailsApiKey = Deno.env.get('MAILS_SO_API_KEY');
    if (!mailsApiKey) {
      throw new Error('MAILS_SO_API_KEY not configured');
    }

    let deliverableCount = 0;
    let undeliverableCount = 0;
    let riskyCount = 0;
    let unknownCount = 0;

    // Process in batches of 100 (Mails.so batch API limit)
    const batchSize = 100;
    const allResults = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      try {
        // Use Mails.so batch validation API
        const response = await fetch('https://api.mails.so/v1/batch', {
          method: 'POST',
          headers: {
            'x-mails-api-key': mailsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ emails: batch }),
        });

        if (!response.ok) {
          throw new Error(`Batch API returned ${response.status}`);
        }

        const data = await response.json();
        const results = Array.isArray(data) ? data : (data.data || []);

        // Process and save results
        for (const result of results) {
          const outcome: string = result?.result ?? result?.status ?? 'unknown';
          const format_valid = result?.isv_format ?? result?.format_valid ?? null;
          const domain_valid = result?.isv_domain ?? result?.domain_valid ?? null;
          const smtp_valid = result?.isv_smtp ?? result?.smtp_valid ?? null;
          const free_email = result?.is_free ?? result?.free_email ?? null;
          const disposable = result?.is_disposable ?? result?.disposable ?? null;
          const catch_all = typeof result?.catch_all === 'boolean'
            ? result.catch_all
            : (typeof result?.isv_nocatchall === 'boolean' ? !result.isv_nocatchall : null);
          const deliverable = outcome === 'deliverable';

          allResults.push({
            validation_list_id: validationList.id,
            email: result.email,
            result: outcome,
            format_valid,
            domain_valid,
            smtp_valid,
            catch_all,
            disposable,
            free_email,
            reason: result?.reason ?? null,
            deliverable,
            full_response: result
          });

          // Update counters
          switch (outcome) {
            case 'deliverable':
              deliverableCount++;
              break;
            case 'undeliverable':
              undeliverableCount++;
              break;
            case 'risky':
              riskyCount++;
              break;
            default:
              unknownCount++;
              break;
          }
        }

        console.log(`Processed ${Math.min(i + batchSize, emails.length)}/${emails.length} emails`);

      } catch (error) {
        console.error(`Error validating batch:`, error);
        // Mark batch as failed
        for (const email of batch) {
          allResults.push({
            validation_list_id: validationList.id,
            email: email,
            result: 'unknown',
            reason: 'Validation failed',
            deliverable: false
          });
          unknownCount++;
        }
      }
    }

    // Save all results in one operation
    if (allResults.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('validation_results')
        .insert(allResults);

      if (insertError) {
        console.error('Error saving results:', insertError);
      }
    }

    // Mark as completed
    await supabaseClient
      .from('validation_lists')
      .update({
        status: 'completed',
        processed_emails: emails.length,
        deliverable_count: deliverableCount,
        undeliverable_count: undeliverableCount,
        risky_count: riskyCount,
        unknown_count: unknownCount
      })
      .eq('id', validationList.id);

    console.log(`Validation completed: ${deliverableCount} deliverable, ${undeliverableCount} undeliverable, ${riskyCount} risky, ${unknownCount} unknown`);

    return new Response(
      JSON.stringify({
        success: true,
        list_id: validationList.id,
        summary: {
          total: emails.length,
          deliverable: deliverableCount,
          undeliverable: undeliverableCount,
          risky: riskyCount,
          unknown: unknownCount
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in validate-emails function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

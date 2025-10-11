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

    // Process in batches of 50 to avoid overwhelming the API
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      // Validate each email individually with retry logic
      for (const email of batch) {
        let retries = 3;
        let success = false;

        while (retries > 0 && !success) {
          try {
            const response = await fetch(
              `https://api.mails.so/v1/validate?email=${encodeURIComponent(email)}`,
              {
                method: 'GET',
                headers: {
                  'x-mails-api-key': mailsApiKey,
                },
              }
            );

            if (response.status === 429) {
              // Rate limit hit, wait and retry
              const waitTime = Math.pow(2, 4 - retries) * 1000;
              console.log(`Rate limited, waiting ${waitTime}ms before retry`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              retries--;
              continue;
            }

            if (!response.ok) {
              throw new Error(`API returned ${response.status}`);
            }

            const result: MailsSoResponse = await response.json();
            
            // Normalize outcome and persist
            const outcome = (result as any).result ?? (result as any).status ?? 'unknown';
            const { error: resultError } = await supabaseClient
              .from('validation_results')
              .insert({
                validation_list_id: validationList.id,
                email: email, // use requested email, API may not echo it back
                result: outcome,
                format_valid: (result as any).isv_format ?? (result as any).format_valid ?? null,
                domain_valid: (result as any).isv_domain ?? (result as any).domain_valid ?? null,
                smtp_valid: (result as any).isv_smtp ?? (result as any).smtp_valid ?? null,
                catch_all: (result as any).catch_all ?? null,
                disposable: (result as any).disposable ?? null,
                free_email: (result as any).free_email ?? null,
                reason: (result as any).reason ?? null,
                deliverable: outcome === 'deliverable',
                full_response: result as any
              });

            if (resultError) {
              console.error('Error saving result:', resultError);
            }

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

            success = true;

            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.error(`Error validating ${email}:`, error);
            retries--;
            if (retries === 0) {
              // Save failed result
              await supabaseClient
                .from('validation_results')
                .insert({
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
      }

      // Update progress
      const processedCount = Math.min(i + batchSize, emails.length);
      await supabaseClient
        .from('validation_lists')
        .update({
          processed_emails: processedCount,
          deliverable_count: deliverableCount,
          undeliverable_count: undeliverableCount,
          risky_count: riskyCount,
          unknown_count: unknownCount
        })
        .eq('id', validationList.id);

      console.log(`Processed ${processedCount}/${emails.length} emails`);
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

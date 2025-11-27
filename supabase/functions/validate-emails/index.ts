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

interface TruelistBatchResponse {
  id: string;
  batch_state: string;
  email_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User authenticated: ${user.id}`);

    const { emails, listName }: ValidationRequest = await req.json();
    console.log(`Starting batch validation for ${emails.length} emails`);

    const truelistApiKey = Deno.env.get('TRUELIST_API_KEY');
    if (!truelistApiKey) {
      throw new Error('TRUELIST_API_KEY not configured');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create validation list in our database
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

    console.log('Created validation list:', validationList.id);

    // Prepare data for Truelist Batch API
    // Format: array of arrays with email in each row
    const emailData = emails.map(email => [email.trim().toLowerCase()]);
    
    // Create batch on Truelist using their Batch API
    const formData = new FormData();
    formData.append('data', JSON.stringify(emailData));
    
    // Use webhook to get notified when batch completes
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-validation-batch?list_id=${validationList.id}`;
    formData.append('webhook_url', webhookUrl);

    console.log('Creating Truelist batch with webhook:', webhookUrl);

    const truelistResponse = await fetch('https://api.truelist.io/api/v1/batches', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${truelistApiKey}`,
      },
      body: formData,
    });

    if (!truelistResponse.ok) {
      const errorText = await truelistResponse.text();
      console.error('Truelist batch creation failed:', truelistResponse.status, errorText);
      
      // Update list status to failed
      await supabaseAdmin
        .from('validation_lists')
        .update({ status: 'failed' })
        .eq('id', validationList.id);
        
      throw new Error(`Truelist API error: ${truelistResponse.status} - ${errorText}`);
    }

    const batchData: TruelistBatchResponse = await truelistResponse.json();
    console.log('Truelist batch created:', batchData.id, 'state:', batchData.batch_state);

    // Store Truelist batch ID for tracking
    const { error: updateError } = await supabaseAdmin
      .from('validation_lists')
      .update({ 
        truelist_batch_id: batchData.id,
        status: 'processing'
      })
      .eq('id', validationList.id);

    if (updateError) {
      console.error('Error updating list with batch ID:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        list_id: validationList.id,
        truelist_batch_id: batchData.id,
        message: `Batch created for ${emails.length} emails. Truelist will process in background.`,
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

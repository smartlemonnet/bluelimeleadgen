import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TruelistBatchStatus {
  id: string;
  batch_state: 'pending' | 'pending_processing' | 'processing' | 'completed';
  email_count: number;
  processed_count: number;
  ok_count: number;
  unknown_count: number;
  disposable_count: number;
  role_count: number;
  failed_syntax_check_count: number;
  failed_mx_check_count: number;
  failed_no_mailbox_count: number;
  ok_for_all_count: number;
  annotated_csv_url?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get list_id from query parameter
    const url = new URL(req.url);
    const listId = url.searchParams.get('list_id');
    
    if (!listId) {
      return new Response(
        JSON.stringify({ error: 'Missing list_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get validation list from database
    const { data: validationList, error: listError } = await supabaseAdmin
      .from('validation_lists')
      .select('*')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single();

    if (listError || !validationList) {
      return new Response(
        JSON.stringify({ error: 'Validation list not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already completed, return current status
    if (validationList.status === 'completed') {
      return new Response(
        JSON.stringify({
          status: 'completed',
          list_id: listId,
          total_emails: validationList.total_emails,
          processed_emails: validationList.processed_emails,
          deliverable_count: validationList.deliverable_count,
          undeliverable_count: validationList.undeliverable_count,
          risky_count: validationList.risky_count,
          unknown_count: validationList.unknown_count,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const truelistBatchId = validationList.truelist_batch_id;
    if (!truelistBatchId) {
      return new Response(
        JSON.stringify({ error: 'No Truelist batch ID found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Truelist API key
    const truelistApiKey = Deno.env.get('TRUELIST_API_KEY');
    if (!truelistApiKey) {
      throw new Error('TRUELIST_API_KEY not configured');
    }

    // Check batch status on Truelist
    console.log(`Checking Truelist batch status: ${truelistBatchId}`);
    
    const batchResponse = await fetch(`https://api.truelist.io/api/v1/batches/${truelistBatchId}`, {
      headers: {
        'Authorization': `Bearer ${truelistApiKey}`,
      },
    });

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      console.error('Failed to get batch status:', batchResponse.status, errorText);
      throw new Error(`Truelist API error: ${batchResponse.status}`);
    }

    const batchData: TruelistBatchStatus = await batchResponse.json();
    console.log(`Batch state: ${batchData.batch_state}, processed: ${batchData.processed_count}/${batchData.email_count}`);

    // Update progress in database
    await supabaseAdmin
      .from('validation_lists')
      .update({
        processed_emails: batchData.processed_count,
      })
      .eq('id', listId);

    // If not completed yet, return current status
    if (batchData.batch_state !== 'completed') {
      return new Response(
        JSON.stringify({
          status: 'processing',
          batch_state: batchData.batch_state,
          list_id: listId,
          total_emails: batchData.email_count,
          processed_emails: batchData.processed_count,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Batch is completed! Download and process results
    console.log('Batch completed! Processing results...');

    // Update counts in database
    await supabaseAdmin
      .from('validation_lists')
      .update({
        processed_emails: batchData.processed_count,
        deliverable_count: batchData.ok_count,
        risky_count: batchData.ok_for_all_count + batchData.disposable_count + batchData.role_count,
        undeliverable_count: batchData.failed_syntax_check_count + batchData.failed_mx_check_count + batchData.failed_no_mailbox_count,
        unknown_count: batchData.unknown_count,
        status: 'completed',
      })
      .eq('id', listId);

    // Download and process CSV if available
    if (batchData.annotated_csv_url) {
      console.log('Downloading annotated CSV...');
      await processAnnotatedCSV(supabaseAdmin, listId, batchData.annotated_csv_url);
    }

    // Return completed status
    return new Response(
      JSON.stringify({
        status: 'completed',
        list_id: listId,
        total_emails: batchData.email_count,
        processed_emails: batchData.processed_count,
        deliverable_count: batchData.ok_count,
        undeliverable_count: batchData.failed_syntax_check_count + batchData.failed_mx_check_count + batchData.failed_no_mailbox_count,
        risky_count: batchData.ok_for_all_count + batchData.disposable_count + batchData.role_count,
        unknown_count: batchData.unknown_count,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in check-validation-status:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processAnnotatedCSV(supabase: any, listId: string, csvUrl: string) {
  try {
    const csvResponse = await fetch(csvUrl);
    
    if (!csvResponse.ok) {
      console.error('Failed to download CSV:', csvResponse.status);
      return;
    }

    const csvText = await csvResponse.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.log('CSV has no data rows');
      return;
    }

    // Parse CSV header
    const header = parseCSVLine(lines[0]);
    const headerLower = header.map(h => h.toLowerCase().trim());
    
    // Find column indices
    const emailIndex = headerLower.findIndex(h => h.includes('email') || h === 'address');
    const stateIndex = headerLower.findIndex(h => h.includes('state') || h === 'result');
    
    console.log(`CSV columns - email: ${emailIndex}, state: ${stateIndex}`);

    const validationResults: any[] = [];
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length < 2) continue;

      const email = row[emailIndex !== -1 ? emailIndex : 0]?.trim();
      if (!email || !email.includes('@')) continue;

      const stateValue = row[stateIndex !== -1 ? stateIndex : row.length - 1]?.trim().toLowerCase();

      // Map Truelist states to our format
      let result = 'unknown';
      let smtpValid = false;
      let deliverable = false;
      let catchAll = false;
      let disposable = false;
      let formatValid = true;
      let domainValid = true;

      // Map based on email_state and email_sub_state from Truelist
      if (stateValue === 'ok' || stateValue === 'email_ok') {
        result = 'deliverable';
        smtpValid = true;
        deliverable = true;
      } else if (stateValue === 'email_invalid' || stateValue === 'invalid') {
        result = 'undeliverable';
      } else if (stateValue === 'risky' || stateValue === 'accept_all' || stateValue === 'is_disposable' || stateValue === 'is_role') {
        result = 'risky';
        if (stateValue.includes('accept_all')) catchAll = true;
        if (stateValue.includes('disposable')) disposable = true;
      } else if (stateValue.includes('failed_syntax')) {
        result = 'undeliverable';
        formatValid = false;
      } else if (stateValue.includes('failed_mx')) {
        result = 'undeliverable';
        domainValid = false;
      } else if (stateValue.includes('failed_no_mailbox') || stateValue.includes('failed_smtp')) {
        result = 'undeliverable';
        smtpValid = false;
      }

      validationResults.push({
        validation_list_id: listId,
        email,
        result,
        reason: stateValue,
        format_valid: formatValid,
        domain_valid: domainValid,
        smtp_valid: smtpValid,
        deliverable,
        catch_all: catchAll,
        disposable,
        free_email: false,
        full_response: { state: stateValue },
      });
    }

    console.log(`Parsed ${validationResults.length} results from CSV`);

    // Insert results in batches of 100
    const batchSize = 100;
    for (let i = 0; i < validationResults.length; i += batchSize) {
      const batch = validationResults.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('validation_results')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
      } else {
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} results)`);
      }
    }

  } catch (error) {
    console.error('Error processing CSV:', error);
  }
}

// Simple CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

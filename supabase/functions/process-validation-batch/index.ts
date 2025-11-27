import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TruelistBatchResult {
  id: string;
  batch_state: string;
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
  safest_bet_csv_url?: string;
  highest_reach_csv_url?: string;
  annotated_csv_url?: string;
}

// This function handles:
// 1. Webhook from Truelist when batch completes
// 2. Manual polling to check batch status and fetch results
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const truelistApiKey = Deno.env.get('TRUELIST_API_KEY');
    if (!truelistApiKey) {
      throw new Error('TRUELIST_API_KEY not configured');
    }

    const url = new URL(req.url);
    const listId = url.searchParams.get('list_id');
    
    let batchId: string | null = null;

    // Check if this is a webhook callback from Truelist
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        batchId = body.batch_id || body.id;
        console.log('Received webhook from Truelist, batch_id:', batchId);
      } catch {
        console.log('No JSON body, checking for manual trigger');
      }
    }

    // If no batch_id from webhook, get it from our database using list_id
    if (!batchId && listId) {
      const { data: list } = await supabase
        .from('validation_lists')
        .select('truelist_batch_id')
        .eq('id', listId)
        .single();
      
      batchId = list?.truelist_batch_id;
    }

    // If still no batch_id, check for processing lists
    if (!batchId) {
      const { data: processingLists } = await supabase
        .from('validation_lists')
        .select('id, truelist_batch_id')
        .eq('status', 'processing')
        .not('truelist_batch_id', 'is', null)
        .limit(5);

      if (processingLists && processingLists.length > 0) {
        console.log(`Found ${processingLists.length} processing lists to check`);
        
        for (const list of processingLists) {
          await processCompletedBatch(supabase, truelistApiKey, list.truelist_batch_id, list.id);
        }
        
        return new Response(
          JSON.stringify({ success: true, checked: processingLists.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      return new Response(
        JSON.stringify({ message: 'No batches to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get the list for this batch
    const { data: validationList } = await supabase
      .from('validation_lists')
      .select('*')
      .eq('truelist_batch_id', batchId)
      .single();

    if (!validationList) {
      console.error('No validation list found for batch:', batchId);
      return new Response(
        JSON.stringify({ error: 'Validation list not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    await processCompletedBatch(supabase, truelistApiKey, batchId, validationList.id);

    return new Response(
      JSON.stringify({ success: true, list_id: validationList.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in process-validation-batch:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function processCompletedBatch(
  supabase: any,
  truelistApiKey: string,
  batchId: string,
  listId: string
) {
  console.log(`Processing batch ${batchId} for list ${listId}`);

  // Get batch status from Truelist
  const batchResponse = await fetch(`https://api.truelist.io/api/v1/batches/${batchId}`, {
    headers: {
      'Authorization': `Bearer ${truelistApiKey}`,
    },
  });

  if (!batchResponse.ok) {
    console.error('Failed to get batch status:', batchResponse.status);
    return;
  }

  const batchData: TruelistBatchResult = await batchResponse.json();
  console.log('Batch status:', batchData.batch_state, 'processed:', batchData.processed_count, '/', batchData.email_count);

  if (batchData.batch_state !== 'completed') {
    console.log('Batch not yet completed, current state:', batchData.batch_state);
    
    // Update progress
    await supabase
      .from('validation_lists')
      .update({
        processed_emails: batchData.processed_count,
      })
      .eq('id', listId);
    
    return;
  }

  // Batch is complete - fetch results using annotated_csv_url
  console.log('Batch completed! Fetching results from annotated CSV...');

  // Update counts from batch summary
  await supabase
    .from('validation_lists')
    .update({
      processed_emails: batchData.processed_count,
      deliverable_count: batchData.ok_count || 0,
      risky_count: batchData.ok_for_all_count || 0,
      undeliverable_count: (batchData.failed_mx_check_count || 0) + (batchData.failed_no_mailbox_count || 0) + (batchData.failed_syntax_check_count || 0),
      unknown_count: batchData.unknown_count || 0,
      status: 'completed',
    })
    .eq('id', listId);

  // Use annotated_csv_url to get detailed results
  if (!batchData.annotated_csv_url) {
    console.log('No annotated_csv_url available, skipping detailed results');
    return;
  }

  console.log('Downloading annotated CSV from:', batchData.annotated_csv_url);

  try {
    const csvResponse = await fetch(batchData.annotated_csv_url);
    
    if (!csvResponse.ok) {
      console.error('Failed to download annotated CSV:', csvResponse.status);
      return;
    }

    const csvText = await csvResponse.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.log('CSV has no data rows');
      return;
    }

    // Parse CSV header to find column indices
    const header = parseCSVLine(lines[0]);
    const headerLower = header.map(h => h.toLowerCase().trim());
    
    // Find email column - check multiple possible names
    const emailIndex = headerLower.findIndex(h => 
      h === 'email' || h === 'email address' || h === 'address'
    );
    
    // Find state column - check multiple possible names
    const stateIndex = headerLower.findIndex(h => 
      h === 'email state' || h === 'email_state' || h === 'state' || h === 'result'
    );
    
    // Find sub-state column
    const subStateIndex = headerLower.findIndex(h => 
      h === 'email sub-state' || h === 'email_sub_state' || h === 'sub_state' || h === 'sub-state' || h === 'reason'
    );

    console.log(`CSV columns - email: ${emailIndex}, state: ${stateIndex}, subState: ${subStateIndex}`);
    console.log('Header row:', header);

    // If standard columns not found, use reasonable defaults
    const emailColumnIndex = emailIndex !== -1 ? emailIndex : 1; // Usually column 1 is email
    const resultColumnIndex = stateIndex !== -1 ? stateIndex : 3; // Usually column 3 is state

    const validationResults: any[] = [];
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length < 2) continue;

      const email = row[emailColumnIndex]?.trim();
      if (!email || !email.includes('@')) continue;

      // Parse the validation result - could be in different formats
      const stateValue = row[resultColumnIndex]?.trim().toLowerCase() || '';
      const subStateValue = subStateIndex !== -1 ? row[subStateIndex]?.trim().toLowerCase() : '';

      let result = 'unknown';
      let formatValid = true;
      let domainValid = true;
      let smtpValid = false;
      let deliverable = false;
      let catchAll = false;
      let disposable = false;

      // Map Truelist states to our format
      // Truelist uses: ok, invalid, unknown, risky
      // Sub-states: email_ok, failed_syntax_check, failed_mx_check, failed_no_mailbox, ok_for_all, disposable
      if (stateValue === 'ok' || stateValue === 'deliverable' || stateValue === 'valid') {
        result = 'deliverable';
        smtpValid = true;
        deliverable = true;
      } else if (stateValue === 'invalid' || stateValue === 'undeliverable') {
        result = 'undeliverable';
      } else if (stateValue === 'risky') {
        result = 'risky';
      } else if (stateValue === 'unknown') {
        result = 'unknown';
      }
      
      // Also check sub_state for more accurate categorization
      if (subStateValue === 'email_ok') {
        result = 'deliverable';
        smtpValid = true;
        deliverable = true;
      }

      // Check sub-states for more detail
      if (subStateValue.includes('syntax') || subStateValue.includes('failed_syntax')) {
        formatValid = false;
        result = 'undeliverable';
      }
      if (subStateValue.includes('mx') || subStateValue.includes('failed_mx')) {
        domainValid = false;
        result = 'undeliverable';
      }
      if (subStateValue.includes('accept_all') || subStateValue.includes('ok_for_all') || subStateValue.includes('catch_all')) {
        catchAll = true;
        result = 'risky';
      }
      if (subStateValue.includes('disposable')) {
        disposable = true;
        result = 'risky';
      }

      validationResults.push({
        validation_list_id: listId,
        email,
        result,
        reason: subStateValue || stateValue,
        format_valid: formatValid,
        domain_valid: domainValid,
        smtp_valid: smtpValid,
        deliverable,
        catch_all: catchAll,
        disposable,
        free_email: false,
        full_response: { state: stateValue, sub_state: subStateValue, row: row },
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
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      } else {
        console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} results)`);
      }
    }

    console.log(`Finished processing batch ${batchId}`);

  } catch (csvError) {
    console.error('Error processing annotated CSV:', csvError);
  }
}

// Simple CSV line parser that handles quoted fields
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

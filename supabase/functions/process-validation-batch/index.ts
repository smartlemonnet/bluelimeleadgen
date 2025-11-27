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

interface TruelistEmailResult {
  address: string;
  email_state: string; // "ok", "risky", "invalid", "unknown"
  email_sub_state: string;
  domain: string;
  mx_record: string;
  canonical: string;
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

  // Batch is complete - fetch results
  console.log('Batch completed! Fetching results...');

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

  // Fetch detailed results
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  while (hasMore) {
    const resultsResponse = await fetch(
      `https://api.truelist.io/api/v1/emails?batch_uuid=${batchId}&page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': `Bearer ${truelistApiKey}`,
        },
      }
    );

    if (!resultsResponse.ok) {
      console.error('Failed to fetch results page:', page, resultsResponse.status);
      break;
    }

    const results = await resultsResponse.json();
    
    if (!results || !Array.isArray(results) || results.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Fetched page ${page} with ${results.length} results`);

    // Map results to our database format
    const validationResults = results.map((email: any) => {
      let result = 'unknown';
      if (email.email_state === 'ok') {
        result = 'deliverable';
      } else if (email.email_state === 'invalid') {
        result = 'undeliverable';
      } else if (email.email_state === 'risky') {
        result = 'risky';
      }

      return {
        validation_list_id: listId,
        email: email.address || email.email,
        result,
        format_valid: email.email_sub_state !== 'failed_syntax_check',
        domain_valid: email.email_sub_state !== 'failed_mx_check',
        smtp_valid: email.email_state === 'ok',
        deliverable: email.email_state === 'ok',
        catch_all: email.email_sub_state === 'ok_for_all' || email.email_sub_state === 'accept_all',
        disposable: email.email_sub_state === 'is_disposable',
        free_email: false, // Truelist doesn't provide this directly
        full_response: email,
      };
    });

    // Insert results in batches
    const { error: insertError } = await supabase
      .from('validation_results')
      .insert(validationResults);

    if (insertError) {
      console.error('Error inserting results:', insertError);
    }

    if (results.length < perPage) {
      hasMore = false;
    } else {
      page++;
    }

    // Small delay between pages to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`Finished processing batch ${batchId}`);
}

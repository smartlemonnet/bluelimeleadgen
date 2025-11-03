import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueItem {
  id: string;
  email: string;
  validation_list_id: string;
}

interface MailsSoResponse {
  email: string;
  format_valid: boolean;
  domain_valid: boolean;
  smtp_valid: boolean;
  deliverable: boolean;
  catch_all: boolean;
  disposable: boolean;
  free_email: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const mailsSoApiKey = Deno.env.get('MAILS_SO_API_KEY');
    if (!mailsSoApiKey) {
      throw new Error('MAILS_SO_API_KEY not configured');
    }

    // Process emails faster: larger batches + loop until empty or time limit
    const batchSize = 200;
    const maxDurationMs = 50000; // keep under function timeout
    const startTime = Date.now();

    console.log('Starting validation queue processor...');

    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalProcessed = 0;
    const touchedListIds = new Set<string>();

    // Keep processing while there are pending items and we have time left
    while (Date.now() - startTime < maxDurationMs) {
      // Get a batch of pending emails from queue
      const { data: queueItems, error: queueError } = await supabase
        .from('validation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(batchSize);

      if (queueError) {
        console.error('Error fetching queue items:', queueError);
        throw queueError;
      }

      if (!queueItems || queueItems.length === 0) {
        console.log('No pending emails in queue');
        break;
      }

      console.log(`Fetched ${queueItems.length} pending emails. Claiming and processing in parallel...`);

      // Claim items to avoid double-processing across concurrent runs
      const ids = queueItems.map((q) => q.id);
      const { data: claimedItems, error: claimError } = await supabase
        .from('validation_queue')
        .update({ status: 'processing' })
        .in('id', ids)
        .eq('status', 'pending')
        .select('*');

      if (claimError) {
        console.error('Error claiming queue items:', claimError);
        throw claimError;
      }

      if (!claimedItems || claimedItems.length === 0) {
        console.log('Nothing claimed (likely processed by another worker). Continuing...');
        continue;
      }

      // Track lists touched in this batch
      claimedItems.forEach((item: any) => touchedListIds.add(item.validation_list_id));

      let succeeded = 0;
      let failed = 0;

      // Process all claimed emails in parallel using Promise.allSettled
      const results = await Promise.allSettled(
        claimedItems.map(async (item: QueueItem) => {
          try {
            // Call Mails.so API
            const response = await fetch(`https://api.mails.so/v1/validate?email=${encodeURIComponent(item.email)}`, {
              headers: {
                'x-mails-api-key': mailsSoApiKey,
              },
            });

            if (!response.ok) {
              throw new Error(`Mails.so API error: ${response.status}`);
            }

            const validationData: MailsSoResponse = await response.json();

            // Normalize the outcome
            let result = 'unknown';
            if (validationData.deliverable) {
              result = 'deliverable';
            } else if (validationData.disposable || !validationData.format_valid || !validationData.domain_valid) {
              result = 'undeliverable';
            } else if (validationData.catch_all || !validationData.smtp_valid) {
              result = 'risky';
            }

            // Save validation result
            const { error: insertError } = await supabase
              .from('validation_results')
              .insert({
                validation_list_id: item.validation_list_id,
                email: item.email,
                result,
                format_valid: validationData.format_valid,
                domain_valid: validationData.domain_valid,
                smtp_valid: validationData.smtp_valid,
                deliverable: validationData.deliverable,
                catch_all: validationData.catch_all,
                disposable: validationData.disposable,
                free_email: validationData.free_email,
                full_response: validationData,
              });

            if (insertError) {
              console.error(`Error saving result for ${item.email}:`, insertError);
              throw insertError;
            }

            // Mark queue item as completed
            const { error: updateError } = await supabase
              .from('validation_queue')
              .update({ status: 'completed', processed_at: new Date().toISOString() })
              .eq('id', item.id);

            if (updateError) {
              console.error(`Error updating queue item ${item.id}:`, updateError);
              throw updateError;
            }

            // Update validation list counters
            const counterField = `${result}_count`;
            const { error: counterError } = await supabase.rpc('increment_validation_counter', {
              list_id: item.validation_list_id,
              counter_name: counterField,
            });

            if (counterError) {
              console.error(`Error updating counter for ${item.validation_list_id}:`, counterError);
            }

            return { success: true, item, result };
          } catch (error: any) {
            console.error(`Failed to validate ${item.email}:`, error);

            // Mark as failed in queue
            await supabase
              .from('validation_queue')
              .update({
                status: 'failed',
                error_message: String(error?.message ?? error),
                processed_at: new Date().toISOString(),
              })
              .eq('id', item.id);

            return { success: false, item, error: String(error?.message ?? error) };
          }
        })
      );

      // Count successes and failures for this batch
      results.forEach((result: PromiseSettledResult<any>) => {
        if (result.status === 'fulfilled' && result.value.success) {
          succeeded++;
        } else {
          failed++;
        }
      });

      totalSucceeded += succeeded;
      totalFailed += failed;
      totalProcessed += claimedItems.length;

      console.log(`Batch complete: ${succeeded} succeeded, ${failed} failed. Total processed so far: ${totalProcessed}`);

      // If we processed fewer than batchSize, queue is likely draining; loop will fetch again
    }

    console.log(`Validation run complete: ${totalSucceeded} succeeded, ${totalFailed} failed, ${totalProcessed} processed in total.`);

    // Mark lists as completed if no pending/processing items remain
    for (const listId of touchedListIds) {
      const { count, error: countError } = await supabase
        .from('validation_queue')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'processing'])
        .eq('validation_list_id', listId);

      if (countError) {
        console.error(`Error counting remaining items for list ${listId}:`, countError);
        continue;
      }

      if ((count ?? 0) === 0) {
        const { error: statusUpdateError } = await supabase
          .from('validation_lists')
          .update({ status: 'completed' })
          .eq('id', listId)
          .eq('status', 'processing');
        if (statusUpdateError) {
          console.error(`Error updating list status for ${listId}:`, statusUpdateError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        succeeded: totalSucceeded,
        failed: totalFailed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Queue processor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

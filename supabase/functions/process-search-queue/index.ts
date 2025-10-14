import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchJob {
  id: string;
  batch_id: string;
  query: string;
  location: string | null;
  pages: number;
  target_names: string[] | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting queue processor...');

    // Trova batch in stato 'running'
    const { data: runningBatches, error: batchError } = await supabase
      .from('search_batches')
      .select('*')
      .eq('status', 'running')
      .order('created_at', { ascending: true });

    if (batchError) {
      console.error('Error fetching batches:', batchError);
      throw batchError;
    }

    if (!runningBatches || runningBatches.length === 0) {
      console.log('No running batches found');
      return new Response(
        JSON.stringify({ message: 'No running batches' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const batch of runningBatches) {
      console.log(`Processing batch: ${batch.id} - ${batch.name}`);

      // Trova il prossimo job pending
      const { data: jobs, error: jobsError } = await supabase
        .from('search_jobs')
        .select('*')
        .eq('batch_id', batch.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        continue;
      }

      if (!jobs || jobs.length === 0) {
        // Nessun job pending, completa il batch
        console.log(`Batch ${batch.id} completed`);
        await supabase
          .from('search_batches')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', batch.id);
        continue;
      }

      const job: SearchJob = jobs[0];
      console.log(`Processing job: ${job.id} - ${job.query}`);

      // Marca il job come running
      await supabase
        .from('search_jobs')
        .update({ status: 'running' })
        .eq('id', job.id);

      try {
        // Ottieni user_id del job
        const { data: jobData } = await supabase
          .from('search_jobs')
          .select('user_id')
          .eq('id', job.id)
          .single();

        // Chiama search-contacts passando user_id nel body
        const searchUrl = `${supabaseUrl}/functions/v1/search-contacts`;
        const searchResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            query: job.query,
            pages: job.pages,
            location: job.location, // Passa la località
            user_id: jobData?.user_id, // Passa user_id esplicitamente
            targetNames: job.target_names || [], // Passa i nomi target
          }),
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          throw new Error(`Search failed: ${searchResponse.status} - ${errorText}`);
        }

        const searchData = await searchResponse.json();
        console.log(`Search completed: ${searchData.contacts?.length || 0} contacts found`);

        // Ottieni l'ID della ricerca appena creata per questo user
        const { data: latestSearch } = await supabase
          .from('searches')
          .select('id')
          .eq('user_id', jobData?.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Aggiorna il job come completato
        await supabase
          .from('search_jobs')
          .update({
            status: 'completed',
            executed_at: new Date().toISOString(),
            result_count: searchData.contacts?.length || 0,
            search_id: latestSearch?.id,
          })
          .eq('id', job.id);

        // Aggiorna il contatore del batch
        await supabase
          .from('search_batches')
          .update({
            completed_jobs: batch.completed_jobs + 1,
          })
          .eq('id', batch.id);

      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Marca il job come failed
        await supabase
          .from('search_jobs')
          .update({
            status: 'failed',
            executed_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq('id', job.id);

        // Aggiorna il contatore failed del batch
        await supabase
          .from('search_batches')
          .update({
            failed_jobs: batch.failed_jobs + 1,
          })
          .eq('id', batch.id);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Queue processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing queue:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

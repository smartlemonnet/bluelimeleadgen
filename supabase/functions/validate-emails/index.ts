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
    console.log(`Starting validation for ${emails.length} emails - using queue system`);

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

    // Add all emails to validation queue for parallel processing
    const queueItems = emails.map(email => ({
      email,
      validation_list_id: validationList.id,
      status: 'pending'
    }));

    const { error: queueError } = await supabaseClient
      .from('validation_queue')
      .insert(queueItems);

    if (queueError) {
      console.error('Error adding to queue:', queueError);
      throw queueError;
    }

    console.log(`Added ${emails.length} emails to validation queue`);

    // Return immediately - processing happens in background via process-validation-queue
    return new Response(
      JSON.stringify({
        success: true,
        list_id: validationList.id,
        message: 'Validation started. Check status on results page.',
        total: emails.length
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

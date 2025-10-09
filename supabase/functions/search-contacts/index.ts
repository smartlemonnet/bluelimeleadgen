import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location } = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }

    console.log('Searching for:', query, location);

    // Build the search query
    let searchQuery = query;
    if (location) {
      searchQuery = `${query} ${location}`;
    }

    // Call Serper API
    const serperApiKey = Deno.env.get('SERPER_API_KEY');
    if (!serperApiKey) {
      throw new Error('SERPER_API_KEY not configured');
    }

    const serperResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 10, // Number of results
      }),
    });

    if (!serperResponse.ok) {
      throw new Error(`Serper API error: ${serperResponse.statusText}`);
    }

    const serperData = await serperResponse.json();
    console.log('Serper results:', serperData);

    // Extract contacts from results
    const contacts = await extractContacts(serperData, query, location);
    
    console.log(`Extracted ${contacts.length} contacts`);

    return new Response(
      JSON.stringify({ contacts }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        } 
      }
    );
  }
});

async function extractContacts(serperData: any, query: string, location?: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Save search to database
  const { data: searchData, error: searchError } = await supabase
    .from('searches')
    .insert({ query, location })
    .select()
    .single();

  if (searchError) {
    console.error('Error saving search:', searchError);
    throw new Error('Failed to save search');
  }

  const searchId = searchData.id;
  const contacts: any[] = [];
  const seenEmails = new Set<string>();

  // Extract contacts from organic results
  const results = serperData.organic || [];
  
  for (const result of results) {
    const snippet = result.snippet || '';
    const title = result.title || '';
    const link = result.link || '';
    const text = `${title} ${snippet}`;

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex) || [];

    // Extract phone numbers (US format)
    const phoneRegex = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
    const phones = text.match(phoneRegex) || [];

    for (const email of emails) {
      if (seenEmails.has(email)) continue;
      seenEmails.add(email);

      const contact = {
        search_id: searchId,
        email: email,
        name: extractName(title, snippet),
        organization: extractOrganization(title, snippet),
        phone: phones[0] || null,
        website: link,
        social_links: null,
      };

      // Save to database
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .insert(contact)
        .select()
        .single();

      if (!contactError && contactData) {
        contacts.push(contactData);
      }
    }
  }

  return contacts;
}

function extractName(title: string, snippet: string): string | null {
  // Try to extract a person's name from title or snippet
  const text = `${title} ${snippet}`;
  
  // Look for patterns like "Name - Company" or "Name | Company"
  const namePattern = /^([A-Z][a-z]+\s[A-Z][a-z]+)[\s\-|]/;
  const match = text.match(namePattern);
  
  return match ? match[1] : null;
}

function extractOrganization(title: string, snippet: string): string | null {
  // Try to extract organization name
  const text = `${title} ${snippet}`;
  
  // Look for common organization indicators
  const orgPatterns = [
    /(?:at|@)\s+([A-Z][A-Za-z\s&.]+(?:Inc|LLC|Ltd|Corp)?)/,
    /([A-Z][A-Za-z\s&.]+(?:Inc|LLC|Ltd|Corp))/,
  ];
  
  for (const pattern of orgPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

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
    const requestData = await req.json();
    
    // Extract parameters directly from request
    const query = requestData.query;
    const location = requestData.location;
    const pages = requestData.pages || 1;
    const emailProviders = requestData.emailProviders || [];
    const websites = requestData.websites || [];
    const searchEngines = requestData.searchEngines || [];
    const targetNames = requestData.targetNames || [];
    const providedUserId = requestData.user_id; // From batch processor
    
    if (!query) {
      throw new Error('Query is required');
    }

    const numPages = Math.min(Math.max(1, pages), 50);
    console.log('Provided query from frontend:', query);
    console.log('Search params:', { numPages, emailProviders, websites, targetNames, providedUserId, location });

    // Build enhanced search query with target names for better results
    let searchQuery = query;
    
    // Add target names to query if specified (improves search relevance)
    if (targetNames && targetNames.length > 0) {
      const namesQuery = targetNames.slice(0, 5).map((n: string) => `"${n.toLowerCase()}"`).join(' OR ');
      searchQuery = `${query} (${namesQuery})`;
      console.log(`Enhanced query with names: ${searchQuery}`);
    }
    
    console.log('Final search query sent to Serper:', searchQuery);

    // Call Serper API
    const serperApiKey = Deno.env.get('SERPER_API_KEY');
    if (!serperApiKey) {
      throw new Error('SERPER_API_KEY not configured');
    }

    // Initialize Supabase client
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get user ID: from body (batch) or from auth header (frontend)
    let userId: string | null = providedUserId || null;
    
    if (!userId && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    console.log('User ID for this search:', userId);

    // Save search to database if user is authenticated
    let searchId: string | null = null;
    if (userId) {
      const { data: searchData, error: searchError } = await supabase
        .from('searches')
        .insert({ query, location, user_id: userId })
        .select()
        .single();

      if (searchError) {
        console.error('Error saving search:', searchError);
      } else {
        searchId = searchData.id;
      }
    }
    const allContacts: any[] = [];
    const seenEmails = new Set<string>();

    // Loop through pages
    for (let page = 1; page <= numPages; page++) {
      console.log(`Fetching page ${page}/${numPages}`);
      
      const serperBody: any = {
        q: searchQuery,
        num: 10,
        page: page,
      };

      // Add location to query text if provided (for keyword targeting)
      let finalQuery = searchQuery;
      if (location) {
        finalQuery = `${searchQuery} ${location}`;
      }
      serperBody.q = finalQuery;
      
      // Set geo/language targeting (always Italy)
      serperBody.gl = 'it'; // Country: Italy
      serperBody.hl = 'it'; // Language: Italian
      console.log(`Search query: "${finalQuery}", geo: IT, lang: IT`);

      const serperResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serperBody),
      });

      if (!serperResponse.ok) {
        console.error(`Serper API error on page ${page}: ${serperResponse.statusText}`);
        continue; // Skip failed pages
      }

      const serperData = await serperResponse.json();
      console.log(`Page ${page} results:`, serperData.organic?.length || 0, 'results');

      // Extract contacts from this page with filters
      const pageContacts = await extractContactsFromResults(
        serperData, 
        searchId, 
        seenEmails,
        supabase,
        userId,
        emailProviders,
        websites,
        targetNames
      );
      
      allContacts.push(...pageContacts);
      console.log(`Page ${page}: extracted ${pageContacts.length} new contacts (total: ${allContacts.length})`);
    }

    console.log(`Total extracted ${allContacts.length} unique contacts from ${numPages} pages`);

    return new Response(
      JSON.stringify({ contacts: allContacts }),
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

async function extractContactsFromResults(
  serperData: any, 
  searchId: string | null, 
  seenEmails: Set<string>,
  supabase: any,
  userId: string | null,
  emailProviders: string[] = [],
  websites: string[] = [],
  targetNames: string[] = []
) {
  const contacts: any[] = [];
  const results = serperData.organic || [];
  
  let fetchedPages = 0;
  let emailsFoundInHTML = 0;
  
  for (const result of results) {
    const snippet = result.snippet || '';
    const title = result.title || '';
    const link = result.link || '';
    let text = `${title} ${snippet}`;
    let htmlFetched = false;

    // Apply website filter if specified
    if (websites.length > 0) {
      try {
        const linkDomain = new URL(link).hostname.replace('www.', '');
        const matchesDomain = websites.some(w => linkDomain.includes(w.replace('www.', '')));
        if (!matchesDomain) {
          continue;
        }
      } catch (e) {
        continue; // Skip invalid URLs
      }
    }

    // Check if this is a social media link (Instagram, Facebook, TikTok)
    const isSocialMedia = link.includes('instagram.com') || 
                          link.includes('facebook.com') || 
                          link.includes('tiktok.com');

    // For social media, ONLY use snippets (don't fetch HTML - it's blocked)
    // For other sites, try to fetch HTML for more emails
    if (!isSocialMedia) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const htmlResponse = await fetch(link, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (htmlResponse.ok) {
          const contentType = htmlResponse.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            const html = await htmlResponse.text();
            const limitedHtml = html.substring(0, 50000); // Limit to 50KB
            text += ' ' + limitedHtml;
            htmlFetched = true;
            fetchedPages++;
          }
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        console.log(`Could not fetch ${link}: ${errorMsg}`);
      }
    } else {
      console.log(`Skipping HTML fetch for social media: ${link} - using snippet only`);
    }

    // Extract emails with improved regex - include accented characters
    const emailRegex = /\b[A-Za-z0-9àèéìòùÀÈÉÌÒÙ][\w\.\-àèéìòùÀÈÉÌÒÙ]*@[A-Za-z0-9][\w\.\-]*\.[A-Za-z]{2,}\b/gi;
    const rawEmails = text.match(emailRegex) || [];
    
    // Filter out invalid emails (file paths, placeholders, etc)
    const invalidExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.ttf', '.eot', '.ico'];
    const emails = rawEmails.filter(email => {
      const lowerEmail = email.toLowerCase();
      // Skip file extensions
      if (invalidExtensions.some(ext => lowerEmail.endsWith(ext))) return false;
      // Skip common placeholder/test emails
      if (lowerEmail.includes('example') || lowerEmail.includes('test@') || lowerEmail.includes('noreply')) return false;
      return true;
    });
    
    if (htmlFetched && emails.length > 0) {
      emailsFoundInHTML += emails.length;
    }

    // Extract phone numbers (international format)
    const phoneRegex = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;
    const phones = text.match(phoneRegex) || [];

    for (const email of emails) {
      if (seenEmails.has(email.toLowerCase())) continue;
      
      // Apply email provider filter if specified
      if (emailProviders.length > 0) {
        const emailDomain = '@' + email.split('@')[1];
        const matchesProvider = emailProviders.some(provider => 
          emailDomain.toLowerCase().includes(provider.toLowerCase().replace('@', ''))
        );
        if (!matchesProvider) {
          continue; // Skip this email if it doesn't match any specified provider
        }
      }
      
      seenEmails.add(email.toLowerCase());

      const extractedName = extractName(title, snippet);
      
    // Apply name filter if specified - CHECK ONLY IN EMAIL ADDRESS
    if (targetNames.length > 0) {
      const emailLower = email.toLowerCase();
      const emailLocalPart = emailLower.split('@')[0]; // Get part before @
      
      const nameInEmail = targetNames.some(targetName => {
        const targetLower = targetName.toLowerCase().trim();
        // Check if name appears in email address (local part or full email)
        // Support formats: name@, name.surname@, surname.name@, namesurname@
        return emailLocalPart.includes(targetLower) || emailLower.includes(targetLower);
      });
      
      if (!nameInEmail) {
        console.log(`Skipping ${email} - target name not found (checked: ${targetNames.slice(0, 3).join(', ')}...)`);
        continue;
      }
      console.log(`✓ Keeping ${email} - contains target name`);
    }

      const contact = {
        email: email.toLowerCase(),
        name: extractedName,
        organization: extractOrganization(title, snippet),
        phone: phones[0] || null,
        website: link,
        social_links: null,
      };

      // Save to database only if user is authenticated and search was saved
      if (userId && searchId) {
        const { data: contactData, error: contactError } = await supabase
          .from('contacts')
          .insert({ ...contact, search_id: searchId })
          .select()
          .single();

        if (!contactError && contactData) {
          contacts.push(contactData);
        } else if (contactError) {
          console.error('Error saving contact:', contactError);
        }
      } else {
        // Return contact without saving
        contacts.push(contact);
      }
    }
  }

  console.log(`\n=== EXTRACTION SUMMARY ===`);
  console.log(`Pages fetched: ${fetchedPages}`);
  console.log(`Emails found in HTML: ${emailsFoundInHTML}`);
  console.log(`Contacts after filtering: ${contacts.length}`);
  console.log(`Applied filters: ${targetNames.length > 0 ? `names (${targetNames.slice(0, 3).join(', ')}...)` : 'none'}`);
  console.log(`========================\n`);
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

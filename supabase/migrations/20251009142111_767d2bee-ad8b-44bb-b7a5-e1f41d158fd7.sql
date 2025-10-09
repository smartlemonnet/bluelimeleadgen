-- Create searches table to store user queries
CREATE TABLE public.searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  query TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contacts table to store extracted contact information
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
  name TEXT,
  organization TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  social_links JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anyone to read and insert (public tool)
CREATE POLICY "Anyone can view searches"
ON public.searches FOR SELECT
USING (true);

CREATE POLICY "Anyone can create searches"
ON public.searches FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view contacts"
ON public.contacts FOR SELECT
USING (true);

CREATE POLICY "Anyone can create contacts"
ON public.contacts FOR INSERT
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_searches_created_at ON public.searches(created_at DESC);
CREATE INDEX idx_contacts_search_id ON public.contacts(search_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
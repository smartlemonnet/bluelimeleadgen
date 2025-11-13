-- Add country column to search_jobs table
ALTER TABLE public.search_jobs 
ADD COLUMN country text DEFAULT 'it';

-- Add comment to explain the column
COMMENT ON COLUMN public.search_jobs.country IS 'Country code for geo-targeting (it, de, uk, us, fr, es, etc.)';
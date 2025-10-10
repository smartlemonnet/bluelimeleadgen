-- Add target_names column to search_jobs table
ALTER TABLE search_jobs 
ADD COLUMN target_names text[] DEFAULT NULL;
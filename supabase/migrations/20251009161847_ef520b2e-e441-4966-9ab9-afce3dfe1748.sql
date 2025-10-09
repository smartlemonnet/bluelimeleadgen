-- Add user_id to search_batches and search_jobs
ALTER TABLE search_batches ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE search_jobs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id NOT NULL in searches (after we'll add a default)
-- First, update existing rows without user_id
UPDATE searches SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE search_batches SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
UPDATE search_jobs SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;

-- Now make them NOT NULL
ALTER TABLE searches ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE search_batches ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE search_jobs ALTER COLUMN user_id SET NOT NULL;

-- Update contacts to link to user via search
-- (contacts already has search_id, we'll use that to find the user)

-- Drop old public policies
DROP POLICY IF EXISTS "Anyone can view searches" ON searches;
DROP POLICY IF EXISTS "Anyone can create searches" ON searches;
DROP POLICY IF EXISTS "Anyone can view contacts" ON contacts;
DROP POLICY IF EXISTS "Anyone can create contacts" ON contacts;
DROP POLICY IF EXISTS "Anyone can view batches" ON search_batches;
DROP POLICY IF EXISTS "Anyone can create batches" ON search_batches;
DROP POLICY IF EXISTS "Anyone can update batches" ON search_batches;
DROP POLICY IF EXISTS "Anyone can delete batches" ON search_batches;
DROP POLICY IF EXISTS "Anyone can view jobs" ON search_jobs;
DROP POLICY IF EXISTS "Anyone can create jobs" ON search_jobs;
DROP POLICY IF EXISTS "Anyone can update jobs" ON search_jobs;
DROP POLICY IF EXISTS "Anyone can delete jobs" ON search_jobs;

-- Create secure RLS policies for searches
CREATE POLICY "Users can view their own searches"
  ON searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own searches"
  ON searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create secure RLS policies for contacts
CREATE POLICY "Users can view their own contacts"
  ON contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = contacts.search_id
      AND searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create contacts"
  ON contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = contacts.search_id
      AND searches.user_id = auth.uid()
    )
  );

-- Create secure RLS policies for search_batches
CREATE POLICY "Users can view their own batches"
  ON search_batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own batches"
  ON search_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batches"
  ON search_batches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batches"
  ON search_batches FOR DELETE
  USING (auth.uid() = user_id);

-- Create secure RLS policies for search_jobs
CREATE POLICY "Users can view their own jobs"
  ON search_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs"
  ON search_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON search_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON search_jobs FOR DELETE
  USING (auth.uid() = user_id);
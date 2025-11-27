-- Add column to track Truelist batch ID
ALTER TABLE public.validation_lists 
ADD COLUMN truelist_batch_id text;

-- Add index for faster lookups
CREATE INDEX idx_validation_lists_truelist_batch_id 
ON public.validation_lists(truelist_batch_id);
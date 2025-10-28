-- Create validation_queue table for managing email validation tasks
CREATE TABLE IF NOT EXISTS public.validation_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_list_id uuid NOT NULL REFERENCES public.validation_lists(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.validation_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own queue items"
ON public.validation_queue
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.validation_lists
  WHERE validation_lists.id = validation_queue.validation_list_id
  AND validation_lists.user_id = auth.uid()
));

CREATE POLICY "Service role can manage queue"
ON public.validation_queue
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster queue queries
CREATE INDEX idx_validation_queue_status ON public.validation_queue(status, created_at);
CREATE INDEX idx_validation_queue_list_id ON public.validation_queue(validation_list_id);

-- Create helper function to increment validation counters
CREATE OR REPLACE FUNCTION public.increment_validation_counter(
  list_id uuid,
  counter_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'UPDATE validation_lists SET %I = %I + 1, processed_emails = processed_emails + 1 WHERE id = $1',
    counter_name, counter_name
  ) USING list_id;
END;
$$;
-- Allow "processing" status and speed up queue reads
ALTER TABLE public.validation_queue
DROP CONSTRAINT IF EXISTS validation_queue_status_check;

ALTER TABLE public.validation_queue
ADD CONSTRAINT validation_queue_status_check
CHECK (status IN ('pending','processing','completed','failed'));

-- Performance index for the worker query
CREATE INDEX IF NOT EXISTS idx_validation_queue_status_created_at 
ON public.validation_queue (status, created_at);
-- Fix validation_queue.status allowed values
ALTER TABLE public.validation_queue
DROP CONSTRAINT IF EXISTS validation_queue_status_check;

ALTER TABLE public.validation_queue
ADD CONSTRAINT validation_queue_status_check
CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Create validation_lists table to store validation jobs
CREATE TABLE public.validation_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  total_emails INTEGER NOT NULL DEFAULT 0,
  processed_emails INTEGER NOT NULL DEFAULT 0,
  deliverable_count INTEGER NOT NULL DEFAULT 0,
  undeliverable_count INTEGER NOT NULL DEFAULT 0,
  risky_count INTEGER NOT NULL DEFAULT 0,
  unknown_count INTEGER NOT NULL DEFAULT 0
);

-- Create validation_results table to store individual email validation results
CREATE TABLE public.validation_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_list_id UUID NOT NULL REFERENCES public.validation_lists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  result TEXT, -- deliverable, undeliverable, risky, unknown
  reason TEXT, -- accepted_email, invalid_format, invalid_domain, rejected_email, etc.
  format_valid BOOLEAN,
  domain_valid BOOLEAN,
  smtp_valid BOOLEAN,
  deliverable BOOLEAN,
  catch_all BOOLEAN,
  disposable BOOLEAN,
  free_email BOOLEAN,
  full_response JSONB, -- store complete API response
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.validation_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;

-- Create policies for validation_lists
CREATE POLICY "Users can view their own validation lists"
  ON public.validation_lists
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own validation lists"
  ON public.validation_lists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own validation lists"
  ON public.validation_lists
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own validation lists"
  ON public.validation_lists
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for validation_results
CREATE POLICY "Users can view their own validation results"
  ON public.validation_results
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.validation_lists
    WHERE validation_lists.id = validation_results.validation_list_id
    AND validation_lists.user_id = auth.uid()
  ));

CREATE POLICY "Users can create validation results"
  ON public.validation_results
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.validation_lists
    WHERE validation_lists.id = validation_results.validation_list_id
    AND validation_lists.user_id = auth.uid()
  ));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_validation_lists_updated_at
  BEFORE UPDATE ON public.validation_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_validation_results_list_id ON public.validation_results(validation_list_id);
CREATE INDEX idx_validation_results_result ON public.validation_results(result);
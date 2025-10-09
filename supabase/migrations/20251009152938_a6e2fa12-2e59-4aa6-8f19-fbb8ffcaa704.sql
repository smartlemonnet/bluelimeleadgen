-- Tabella per le code di ricerche (batch jobs)
CREATE TABLE public.search_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'paused', 'failed')),
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  delay_seconds INTEGER NOT NULL DEFAULT 120, -- 2 minuti default tra una ricerca e l'altra
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabella per i singoli job di ricerca nella coda
CREATE TABLE public.search_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.search_batches(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  location TEXT,
  pages INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  search_id UUID REFERENCES public.searches(id),
  result_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Tabella per salvare template di query riutilizzabili
CREATE TABLE public.query_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  query_pattern TEXT NOT NULL, -- Es: "{business_type} {city}"
  default_pages INTEGER NOT NULL DEFAULT 10,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (pubbliche per semplicità - puoi restringerle dopo)
CREATE POLICY "Anyone can view batches" ON public.search_batches FOR SELECT USING (true);
CREATE POLICY "Anyone can create batches" ON public.search_batches FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update batches" ON public.search_batches FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete batches" ON public.search_batches FOR DELETE USING (true);

CREATE POLICY "Anyone can view jobs" ON public.search_jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can create jobs" ON public.search_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update jobs" ON public.search_jobs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete jobs" ON public.search_jobs FOR DELETE USING (true);

CREATE POLICY "Anyone can view templates" ON public.query_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can create templates" ON public.query_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update templates" ON public.query_templates FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete templates" ON public.query_templates FOR DELETE USING (true);

-- Indici per performance
CREATE INDEX idx_search_jobs_batch_id ON public.search_jobs(batch_id);
CREATE INDEX idx_search_jobs_status ON public.search_jobs(status);
CREATE INDEX idx_search_batches_status ON public.search_batches(status);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_batches_updated_at
  BEFORE UPDATE ON public.search_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_query_templates_updated_at
  BEFORE UPDATE ON public.query_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
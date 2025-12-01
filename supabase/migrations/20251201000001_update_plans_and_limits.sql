
-- Add monthly_search_limit to plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS monthly_search_limit INTEGER DEFAULT 100;

-- Add searches_performed_count to usage_records table
ALTER TABLE public.usage_records 
ADD COLUMN IF NOT EXISTS searches_performed_count INTEGER DEFAULT 0;

-- Update plans with new limits and prices
-- Free
UPDATE public.plans 
SET monthly_price = 0,
    monthly_email_limit = 5000,
    validation_limit = 5000,
    monthly_search_limit = 100,
    features = '["Validazione base", "Export CSV/XLSX"]'
WHERE id = 'free';

-- Basic
UPDATE public.plans 
SET monthly_price = 9.9,
    monthly_email_limit = 10000,
    validation_limit = 10000,
    monthly_search_limit = 250,
    features = '["Validazione avanzata", "Export CSV/XLSX/JSON", "Supporto prioritario"]'
WHERE id = 'basic';

-- Pro
UPDATE public.plans 
SET monthly_price = 19.9,
    monthly_email_limit = 25000,
    validation_limit = 25000,
    monthly_search_limit = 500,
    features = '["Validazione avanzata", "Tutti i formati export", "Accesso API", "Supporto prioritario"]'
WHERE id = 'pro';

-- Elite
UPDATE public.plans 
SET monthly_price = 29.9,
    monthly_email_limit = 100000,
    validation_limit = 100000,
    monthly_search_limit = 1000,
    features = '["Validazione avanzata", "Tutti i formati export", "Accesso API", "Supporto dedicato", "Integrazione custom"]'
WHERE id = 'elite';

-- VIP (formerly Unlimited, now 49.9)
INSERT INTO public.plans (id, name, monthly_price, monthly_email_limit, max_lists, max_emails_per_list, validation_limit, speed_limit, features, monthly_search_limit)
VALUES ('vip', 'VIP', 49.9, 500000, 250, 100000, 500000, 10, '["Validazione avanzata", "Tutti i formati export", "Accesso API completo", "Supporto dedicato", "Integrazione custom"]', 50000)
ON CONFLICT (id) DO UPDATE 
SET name = 'VIP',
    monthly_price = 49.9,
    monthly_email_limit = 500000,
    validation_limit = 500000,
    monthly_search_limit = 50000,
    features = '["Validazione avanzata", "Tutti i formati export", "Accesso API completo", "Supporto dedicato", "Integrazione custom"]';

-- Unlimited (New plan at 99.9)
INSERT INTO public.plans (id, name, monthly_price, monthly_email_limit, max_lists, max_emails_per_list, validation_limit, speed_limit, features, monthly_search_limit)
VALUES ('unlimited', 'Unlimited', 99.9, -1, 500, 500000, -1, 20, '["Tutto illimitato", "Validazione avanzata", "Tutti i formati export", "Accesso API completo", "Supporto dedicato", "Integrazione custom"]', -1)
ON CONFLICT (id) DO UPDATE 
SET name = 'Unlimited',
    monthly_price = 99.9,
    monthly_email_limit = -1,
    validation_limit = -1,
    monthly_search_limit = -1,
    features = '["Tutto illimitato", "Validazione avanzata", "Tutti i formati export", "Accesso API completo", "Supporto dedicato", "Integrazione custom"]';


-- Update check_usage_limit function to handle 'searches' metric
CREATE OR REPLACE FUNCTION public.check_usage_limit(
  p_user_id UUID, 
  p_metric TEXT, 
  p_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_id TEXT;
  v_limit BIGINT;
  v_current_usage BIGINT;
  v_period_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user plan
  SELECT plan_id INTO v_plan_id FROM public.profiles WHERE id = p_user_id;
  
  -- Get current period start
  SELECT current_period_start INTO v_period_start FROM public.profiles WHERE id = p_user_id;
  
  -- Get limit based on metric
  IF p_metric = 'emails_found' THEN
    SELECT monthly_email_limit INTO v_limit FROM public.plans WHERE id = v_plan_id;
    SELECT emails_found_count INTO v_current_usage FROM public.usage_records 
    WHERE user_id = p_user_id AND period_start = v_period_start;
  ELSIF p_metric = 'validations' THEN
    SELECT validation_limit INTO v_limit FROM public.plans WHERE id = v_plan_id;
    SELECT validations_performed_count INTO v_current_usage FROM public.usage_records 
    WHERE user_id = p_user_id AND period_start = v_period_start;
  ELSIF p_metric = 'searches' THEN
    SELECT monthly_search_limit INTO v_limit FROM public.plans WHERE id = v_plan_id;
    SELECT searches_performed_count INTO v_current_usage FROM public.usage_records 
    WHERE user_id = p_user_id AND period_start = v_period_start;
  END IF;
  
  -- Check if unlimited (-1) or within limit
  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  IF (v_current_usage + p_amount) > v_limit THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update increment_usage function to handle 'searches' metric
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID, 
  p_metric TEXT, 
  p_amount INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_period_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current period start
  SELECT current_period_start INTO v_period_start FROM public.profiles WHERE id = p_user_id;
  
  -- Update usage
  IF p_metric = 'emails_found' THEN
    UPDATE public.usage_records 
    SET emails_found_count = emails_found_count + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND period_start = v_period_start;
  ELSIF p_metric = 'validations' THEN
    UPDATE public.usage_records 
    SET validations_performed_count = validations_performed_count + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND period_start = v_period_start;
  ELSIF p_metric = 'searches' THEN
    UPDATE public.usage_records 
    SET searches_performed_count = searches_performed_count + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND period_start = v_period_start;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

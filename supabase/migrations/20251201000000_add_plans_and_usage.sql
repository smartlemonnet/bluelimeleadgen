-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price NUMERIC,
  monthly_email_limit BIGINT, -- -1 for unlimited
  max_lists INTEGER,
  max_emails_per_list INTEGER,
  validation_limit BIGINT, -- -1 for unlimited
  speed_limit INTEGER, -- emails per second
  features JSONB
);

-- Insert default plans
INSERT INTO public.plans (id, name, monthly_price, monthly_email_limit, max_lists, max_emails_per_list, validation_limit, speed_limit, features)
VALUES
  ('free', 'Free', 0, 5000, 10, 1000, 5000, 10, '["Basic validation", "CSV/XLSX export"]'),
  ('basic', 'Basic', 9.9, 10000, 20, 2500, 10000, 10, '["Advanced validation", "CSV/XLSX/JSON export", "Priority support"]'),
  ('pro', 'Pro', 19.9, 25000, 50, 5000, 25000, 10, '["Advanced validation", "All export formats", "API access", "Priority support"]'),
  ('elite', 'Elite', 29.9, 100000, 100, 25000, 100000, 10, '["Advanced validation", "All export formats", "API access", "Dedicated support", "Custom integration"]'),
  ('unlimited', 'Unlimited', 49.9, -1, 250, 100000, -1, 10, '["Advanced validation", "All export formats", "Full API access", "Dedicated support", "Custom integration"]');

-- Create profiles table if it doesn't exist (or ensure columns exist)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add plan columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES public.plans(id) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 month');

-- Create usage_records table to track monthly usage
CREATE TABLE IF NOT EXISTS public.usage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  emails_found_count BIGINT DEFAULT 0,
  validations_performed_count BIGINT DEFAULT 0,
  lists_created_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- Policies for plans (Public read)
CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT USING (true);

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for usage_records
CREATE POLICY "Users can view own usage" ON public.usage_records FOR SELECT USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, plan_id)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'free');
  
  INSERT INTO public.usage_records (user_id, period_start, period_end)
  VALUES (new.id, now(), now() + interval '1 month');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check limits (can be called from other functions)
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

-- Function to increment usage
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
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill profiles for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT * FROM auth.users LOOP
    -- Create profile if not exists
    INSERT INTO public.profiles (id, email, full_name, plan_id)
    VALUES (
      user_record.id, 
      user_record.email, 
      user_record.raw_user_meta_data->>'full_name', 
      'free'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create usage record if not exists
    INSERT INTO public.usage_records (user_id, period_start, period_end)
    VALUES (
      user_record.id, 
      now(), 
      now() + interval '1 month'
    )
    ON CONFLICT (user_id, period_start) DO NOTHING;
  END LOOP;
END;
$$;

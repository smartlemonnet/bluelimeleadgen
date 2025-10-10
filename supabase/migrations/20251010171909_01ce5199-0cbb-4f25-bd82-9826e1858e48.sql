-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a cron job that runs every minute to process the search queue
SELECT cron.schedule(
  'process-search-queue-job',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://wyxaheklcmomfdhpjkdn.supabase.co/functions/v1/process-search-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5eGFoZWtsY21vbWZkaHBqa2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NTE2MjYsImV4cCI6MjA3NTUyNzYyNn0.lE4fGGdaFt5Tc0w6FTFMvBe6U83tT1S4It0GcoTSY_w"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
-- FASE 1: Correzione Critica - Sicurezza Template

-- Aggiungi user_id per tracciare la proprietà dei template
ALTER TABLE query_templates 
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Imposta il default per i nuovi template
ALTER TABLE query_templates 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Elimina le politiche pubbliche pericolose
DROP POLICY IF EXISTS "Anyone can create templates" ON query_templates;
DROP POLICY IF EXISTS "Anyone can update templates" ON query_templates;
DROP POLICY IF EXISTS "Anyone can delete templates" ON query_templates;
DROP POLICY IF EXISTS "Anyone can view templates" ON query_templates;

-- Crea politiche RLS sicure

-- Tutti possono visualizzare i template (lettura pubblica)
CREATE POLICY "Anyone can view templates"
  ON query_templates FOR SELECT
  USING (true);

-- Solo utenti autenticati possono creare i propri template
CREATE POLICY "Authenticated users can create their own templates"
  ON query_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Gli utenti possono aggiornare solo i propri template
CREATE POLICY "Users can update their own templates"
  ON query_templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Gli utenti possono eliminare solo i propri template
CREATE POLICY "Users can delete their own templates"
  ON query_templates FOR DELETE
  USING (auth.uid() = user_id);
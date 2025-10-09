-- FASE 2: Aggiungi Permessi DELETE e UPDATE per Dati Utente

-- Permetti agli utenti di eliminare i propri contatti
CREATE POLICY "Users can delete their own contacts"
  ON contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = contacts.search_id
      AND searches.user_id = auth.uid()
    )
  );

-- Permetti agli utenti di aggiornare i propri contatti
CREATE POLICY "Users can update their own contacts"
  ON contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = contacts.search_id
      AND searches.user_id = auth.uid()
    )
  );

-- Permetti agli utenti di eliminare le proprie ricerche
CREATE POLICY "Users can delete their own searches"
  ON searches FOR DELETE
  USING (auth.uid() = user_id);

-- Permetti agli utenti di aggiornare le proprie ricerche
CREATE POLICY "Users can update their own searches"
  ON searches FOR UPDATE
  USING (auth.uid() = user_id);
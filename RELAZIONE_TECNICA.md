# Relazione Tecnica - Sistema di Lead Generation

## 📋 Panoramica del Sistema

Applicazione web full-stack per la ricerca automatizzata e validazione di contatti email tramite scraping intelligente di motori di ricerca, con gestione batch, deduplicazione globale e validazione email.

---

## 🏗️ Architettura Tecnologica

### Frontend
- **Framework**: React 18.3.1 + TypeScript
- **Routing**: React Router DOM 6.30.1
- **UI Library**: Radix UI (componenti headless)
- **Styling**: Tailwind CSS 3.x + shadcn/ui
- **State Management**: React Query (TanStack Query 5.x)
- **Forms**: React Hook Form 7.x + Zod validation
- **Charts**: Recharts 2.15.4
- **File Handling**: XLSX 0.18.5 (parsing CSV/Excel)

### Backend (Lovable Cloud - Supabase)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (email/password)
- **Edge Functions**: Deno (serverless)
- **Storage**: Supabase Storage (potenziale per file uploads)
- **API**: Supabase REST API + Realtime

### Servizi Esterni
- **Serper API**: Ricerca web organica (Google Search)
- **Mails.so API**: Validazione email (verificatore SMTP)

---

## 🗄️ Schema Database

### Tabella: `searches`
Storico ricerche effettuate dall'utente.

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK a auth.users |
| query | TEXT | Query di ricerca |
| location | TEXT | Filtro geografico |
| pages | INTEGER | Numero pagine scansionate |
| email_providers | TEXT[] | Provider email filtrati |
| websites | TEXT[] | Domini whitelisted |
| target_names | TEXT | Nomi target (pipe-separated) |
| created_at | TIMESTAMP | Data creazione |

**RLS Policy**: Utenti vedono solo le proprie ricerche.

---

### Tabella: `contacts`
Contatti email estratti con metadati.

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK a auth.users |
| search_id | UUID | FK a searches (opzionale) |
| email | TEXT | Email univoca (UNIQUE per user_id) |
| name | TEXT | Nome estratto |
| organization | TEXT | Organizzazione |
| phone | TEXT | Telefono |
| website | TEXT | URL sorgente |
| validation_status | TEXT | Stato validazione (valid/invalid/pending) |
| validation_result | JSONB | Dettagli validazione |
| created_at | TIMESTAMP | Data estrazione |

**Constraint**: `UNIQUE(user_id, email)` - previene duplicati.

**RLS Policy**: Utenti gestiscono solo i propri contatti.

---

### Tabella: `search_batches`
Gestione job batch automatizzati.

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK a auth.users |
| name | TEXT | Nome batch |
| description | TEXT | Descrizione |
| status | TEXT | pending/running/completed/paused |
| total_jobs | INTEGER | Totale job |
| completed_jobs | INTEGER | Job completati |
| failed_jobs | INTEGER | Job falliti |
| delay_between_jobs | INTEGER | Delay in secondi (default: 5) |
| created_at | TIMESTAMP | Data creazione |
| updated_at | TIMESTAMP | Ultimo aggiornamento |

**RLS Policy**: Utenti vedono solo i propri batch.

---

### Tabella: `search_jobs`
Job individuali all'interno di un batch.

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | UUID | Primary key |
| batch_id | UUID | FK a search_batches |
| query | TEXT | Query specifica |
| location | TEXT | Location |
| pages | INTEGER | Pagine da scansionare |
| target_names | TEXT | Nomi target |
| status | TEXT | pending/running/completed/failed |
| error_message | TEXT | Messaggio errore (se failed) |
| results_count | INTEGER | Contatti trovati |
| created_at | TIMESTAMP | Data creazione |
| started_at | TIMESTAMP | Inizio esecuzione |
| completed_at | TIMESTAMP | Fine esecuzione |

**RLS Policy**: Accesso tramite batch_id (user_id indiretto).

---

## ⚙️ Edge Functions

### 1. `search-contacts`
**Funzione principale** di scraping e estrazione contatti.

#### Input
```typescript
{
  query: string;           // Query di ricerca
  location?: string;       // Filtro geografico
  pages?: number;          // Pagine da scansionare (default: 1)
  emailProviders?: string[]; // Es: ["gmail.com", "yahoo.it"]
  websites?: string[];     // Whitelist domini
  targetNames?: string;    // "ANNA|MARIA|GIULIA" (pipe-separated)
  user_id?: string;        // User ID (da auth header o body)
}
```

#### Processo
1. **Validazione query** e parsing parametri
2. **Inizializzazione deduplicazione globale**:
   - Carica TUTTE le email esistenti dell'utente dal DB
   - Popola `seenEmails` Set per evitare duplicati cross-search
3. **Loop paginazione** (1 a N pagine):
   - Chiama Serper API con query + location + page offset
   - Filtra risultati organici
4. **Estrazione contatti** per ogni risultato:
   - **Fetch HTML** (timeout 5s, skip social media)
   - **Regex email**: `/[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}/g` (con accenti)
   - **Filter email**: validazione formato + blacklist (placeholder, noreply, etc.)
   - **Filter provider**: se specificato (es: solo Gmail)
   - **Filter target names**: email deve contenere uno dei nomi target
   - **Estrazione nome**: da title/snippet con pattern "Nome Cognome"
   - **Estrazione organizzazione**: pattern aziendali
   - **Estrazione telefono**: regex internazionale
5. **Salvataggio DB** (se userId):
   - **Check duplicato**: query DB per email esistente
   - **Insert**: solo se email nuova
   - **Associazione**: link a `search_id` se ricerca salvata
6. **Response**: array contatti con metadati

#### Deduplicazione (CRITICA)
- ✅ **Globale**: carica tutte le email utente prima del loop
- ✅ **In-memory**: `Set<string>` per check O(1)
- ✅ **DB-level**: UNIQUE constraint su (user_id, email)
- ✅ **Pre-insert check**: doppia verifica prima di salvare

#### Output
```typescript
{
  contacts: [
    {
      email: string;
      name: string | null;
      organization: string | null;
      phone: string | null;
      website: string;
    }
  ]
}
```

---

### 2. `validate-emails`
Validazione SMTP tramite API Mails.so.

#### Input
```typescript
{
  emails: string[];  // Max 100 email per chiamata
}
```

#### Processo
1. Batch di max 100 email
2. Chiamata API Mails.so (POST /v1/validate)
3. Parsing risultati:
   - `valid`: email attiva
   - `invalid`: email inesistente/malformata
   - `unknown`: server non risponde
4. Salvataggio su DB: aggiorna `validation_status` + `validation_result` (JSONB)

#### Output
```typescript
{
  results: [
    {
      email: string;
      status: "valid" | "invalid" | "unknown";
      details: object;
    }
  ]
}
```

---

### 3. `process-search-queue`
**Processore automatico** per batch (cron-like).

#### Trigger
- Invocazione manuale o scheduled (ogni 60s)
- Verifica batch con status `running`

#### Processo
1. **Fetch batch running**: `SELECT * FROM search_batches WHERE status = 'running'`
2. Per ogni batch:
   - **Fetch prossimo job pending**: `ORDER BY created_at LIMIT 1`
   - Se no job → marca batch `completed`
   - Se job trovato:
     - Aggiorna job → `running`
     - **Invoca `search-contacts`** con parametri job
     - Attende risposta
     - Aggiorna job → `completed` o `failed`
     - Incrementa contatori batch (`completed_jobs`, `failed_jobs`)
     - **Delay**: attende `delay_between_jobs` secondi
3. **Error handling**: marca job failed se eccezione

#### Automazione
- Sistema self-healing: riprende da dove si era fermato
- Rate limiting: delay configurabile per batch
- Resilienza: errori singoli non bloccano batch

---

## 🎯 Funzionalità Principali

### 1. Ricerca Manuale (Single Search)
- Form avanzato con filtri:
  - Query testuale
  - Location geografica
  - Numero pagine (1-20)
  - Provider email (multiselect)
  - Whitelisted websites
  - Target names (pipe-separated)
- Esecuzione immediata
- Visualizzazione risultati real-time
- Export CSV/XLSX

### 2. Batch Processing
- **Upload CSV/XLSX**: parsing automatico colonne
  - `query`, `location`, `pages`, `target_names`
- **Creazione batch**: nome + descrizione + CSV
- **Parsing job**: una riga CSV = un job
- **Avvio batch**: status `pending` → `running`
- **Processore automatico**: esegue job sequenzialmente con delay
- **Pause/Resume**: controllo esecuzione
- **Monitoraggio**: progress bar + statistiche real-time
- **Export risultati**: download CSV per batch specifico

### 3. Gestione Contatti
- **Tabella paginata**: visualizzazione contatti con filtri
- **Ricerca**: full-text su email, nome, organizzazione
- **Validazione email**: batch validation con API
- **Status tracking**: pending/valid/invalid
- **Export**: CSV/XLSX selettivo
- **Delete**: eliminazione singola o multipla

### 4. Email Validation
- **Integrazione Mails.so**: verifica SMTP real-time
- **Batch validation**: max 100 email/chiamata
- **Caching risultati**: salva su DB (evita re-validazione)
- **Status badge**: visual indicator (verde/rosso/grigio)
- **Dettagli**: JSONB con metadata (MX record, SMTP response, etc.)

### 5. Dashboard & Analytics
- **Statistiche generali**:
  - Totale ricerche
  - Totale contatti
  - Tasso validazione
- **Grafici**: distribuzione provider, timeline estrazioni
- **Ultime ricerche**: quick access
- **Batch attivi**: monitoraggio job running

---

## 🔒 Sicurezza

### Row Level Security (RLS)
Tutte le tabelle hanno RLS abilitato:
- `searches`: `user_id = auth.uid()`
- `contacts`: `user_id = auth.uid()`
- `search_batches`: `user_id = auth.uid()`
- `search_jobs`: verifica via `batch_id.user_id`

### Autenticazione
- **Supabase Auth**: email/password
- **Auto-confirm**: email verification disabilitata (dev mode)
- **Protected routes**: redirect a `/auth` se non autenticato
- **Session persistence**: localStorage

### Secrets Management
- **Supabase Secrets**: `SERPER_API_KEY`, `MAILS_SO_API_KEY`
- **Environment variables**: mai esposti nel frontend
- **Edge functions**: accesso sicuro tramite `Deno.env.get()`

---

## 📊 Strategia di Diversificazione Query

### Esempio CSV Ottimizzato
```csv
query,location,pages,target_names
"crossfit email @gmail.com",Milano,5,"ANNA|MARIA|GIULIA"
"yoga contatti @libero.it",Roma,5,"SARA|CHIARA|FRANCESCA"
"pilates @yahoo.it",Torino,5,"FEDERICA|SILVIA|ELENA"
"site:instagram.com fitness email Milano",,5,"GIORGIA|ILARIA"
```

### Principi Chiave
1. **Variare query**: crossfit, yoga, pilates, running, palestra
2. **Variare location**: Milano, Roma, Torino, etc.
3. **Variare provider**: @gmail.com, @libero.it, @yahoo.it
4. **Target names**: ruotare nomi tra query (evita duplicati)
5. **Social scraping**: Instagram/Facebook per influencer
6. **Pagine ottimali**: 5 pagine (dopo degrada qualità)

### Risultati Attesi
- **20 query × 5 pagine × 10 risultati/pagina** = ~1000 contatti potenziali
- Deduplicazione riduce a ~300-500 email uniche (stima 30-50% duplicati)

---

## 🚀 Deployment & Scalabilità

### Hosting
- **Frontend**: Lovable (Vercel-like)
- **Backend**: Supabase (Postgres + Edge Functions)
- **CDN**: automatico per static assets

### Performance
- **Edge Functions**: cold start ~300ms, warm <50ms
- **Database**: indexed su `user_id`, `email`, `batch_id`
- **Query optimization**: `LIMIT` su fetch, batch processing
- **Caching**: validation results in JSONB (no re-fetch)

### Limiti & Rate Limiting
- **Serper API**: 2500 ricerche/mese (free tier)
- **Mails.so**: limiti API da verificare
- **Batch delay**: default 5s (evita ban)
- **Concurrent jobs**: 1 job alla volta per batch (sequenziale)

### Scalabilità
- **Horizontal**: Supabase auto-scaling
- **Vertical**: aumentare `delay_between_jobs` per batch grandi
- **Cost optimization**: caching aggressivo, deduplicazione DB-level

---

## 🐛 Debugging & Monitoring

### Logs
- **Edge Functions**: `console.log` visibili in Supabase Dashboard
- **Frontend**: React DevTools + console
- **Network**: Supabase logs per query lente

### Error Handling
- **Edge Functions**: try/catch + response errors
- **Frontend**: React Error Boundaries (da implementare)
- **Batch**: job failures tracciati con `error_message`

### Testing
- **CSV esempi**: `/public/examples/` con casi test
- **Unit tests**: non presenti (TODO)
- **E2E tests**: non presenti (TODO)

---

## 📈 Potenziali Miglioramenti

### Funzionalità
1. **AI Lead Scoring**: Gemini 2.5 per qualificare lead
2. **Email Personalization**: generazione messaggi con AI
3. **Data Enrichment**: estrazione job title, company size, etc.
4. **CRM Integration**: export Salesforce, HubSpot
5. **Webhook notifications**: alert batch completati

### Performance
1. **Parallel batch processing**: job concorrenti (con rate limit)
2. **Incremental scraping**: resume da last offset
3. **Cache HTTP responses**: evita re-fetch pagine
4. **Compression**: gzip risultati grandi

### UX
1. **Real-time updates**: Supabase Realtime per batch progress
2. **Bulk actions**: select-all + delete/export
3. **Filtering**: advanced filters su tabelle
4. **Dark mode**: già supportato (Tailwind)

---

## 📝 Note Legali

### GDPR Compliance
⚠️ **ATTENZIONE**: Scraping email senza consenso è **ILLEGALE** in UE.

Raccomandazioni:
- Uso **solo interno** (ricerca mercato)
- **Non inviare email** senza opt-in
- **Privacy policy** chiara
- **Data retention**: auto-delete vecchi contatti
- **Right to be forgotten**: endpoint per rimuovere email

### Terms of Service
- **Serper API**: rispettare rate limits
- **Mails.so**: non abusare validazione
- **Google**: robots.txt compliance (future)

---

## 🔧 Setup & Installazione

### Requisiti
- Node.js 18+
- Account Lovable Cloud (Supabase incluso)
- API Keys: Serper, Mails.so

### Secrets da Configurare
```bash
SERPER_API_KEY=your_key_here
MAILS_SO_API_KEY=your_key_here
```

### Primo Avvio
1. Clone repo (via GitHub export)
2. `npm install`
3. Configura secrets in Lovable Cloud
4. Deploy automatico edge functions
5. Accedi a `/auth` per registrazione

---

## 👥 Credits

- **Sviluppo**: Sistema AI-assisted (Lovable)
- **Database**: Supabase (Postgres)
- **Scraping**: Serper API
- **Validation**: Mails.so
- **UI**: shadcn/ui + Radix UI

---

## 📅 Versione
**v1.0.0** - Ottobre 2025
Sistema completo con batch processing, deduplicazione globale, validazione email.

---

**Fine Relazione Tecnica**

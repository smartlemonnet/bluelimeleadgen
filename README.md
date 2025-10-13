# 🎯 Lead Generation System - Email Scraper & Validator

Sistema automatizzato di ricerca e validazione contatti email tramite scraping intelligente dei motori di ricerca.

---

## ✨ Caratteristiche Principali

### 🔍 Ricerca Avanzata
- **Scraping multi-pagina** via Serper API (Google Search)
- **Filtri intelligenti**: location, provider email, domini, nomi target
- **Deduplicazione globale**: zero duplicati cross-search
- **Estrazione metadati**: nome, organizzazione, telefono, website

### 📦 Batch Processing
- **Upload CSV/XLSX**: carica liste query massive
- **Processamento automatico**: job sequenziali con delay configurabile
- **Monitoraggio real-time**: progress bar + statistiche
- **Pause/Resume**: controllo completo esecuzione

### ✅ Validazione Email
- **Verifica SMTP** tramite Mails.so API
- **Batch validation**: fino a 100 email per chiamata
- **Status tracking**: valid/invalid/pending
- **Caching risultati**: evita re-validazioni

### 📊 Dashboard & Analytics
- Statistiche ricerche e contatti
- Grafici distribuzione provider
- Timeline estrazioni
- Export CSV/XLSX

---

## 🚀 Quick Start

### 1. Accesso
Vai su `/auth` per registrarti o accedere.

### 2. Ricerca Manuale
1. Clicca **"Nuova Ricerca"** in homepage
2. Inserisci query (es: `crossfit email @gmail.com`)
3. Aggiungi filtri opzionali (location, target names)
4. Clicca **"Cerca"**
5. Visualizza risultati in tempo reale

### 3. Batch Automatizzato
1. Vai su **"Batch Manager"**
2. Clicca **"Crea Nuovo Batch"**
3. Scarica template CSV o usa il tuo
4. Upload file CSV con colonne:
   - `query`: query di ricerca
   - `location`: città (opzionale)
   - `pages`: numero pagine (1-20)
   - `target_names`: nomi separati da pipe (es: `ANNA|MARIA|GIULIA`)
5. Clicca **"Avvia Batch"**
6. Monitora progress nella dashboard

### 4. Validazione Email
1. Vai su **"Contatti"**
2. Seleziona contatti con status "Pending"
3. Clicca **"Valida Email"**
4. Attendi risultati (verde = valid, rosso = invalid)

---

## 📄 Formato CSV per Batch

### Template Minimo
```csv
query,location,pages,target_names
"crossfit email @gmail.com",Milano,5,"ANNA|MARIA|GIULIA"
"yoga contatti @libero.it",Roma,5,"SARA|CHIARA|FRANCESCA"
```

### Colonne
| Colonna | Obbligatoria | Descrizione | Esempio |
|---------|--------------|-------------|---------|
| `query` | ✅ | Query di ricerca | `"pilates email @gmail.com"` |
| `location` | ❌ | Filtro geografico | `Milano`, `Roma` |
| `pages` | ❌ | Pagine da scansionare (default: 5) | `5`, `10` |
| `target_names` | ❌ | Nomi target separati da pipe | `"ANNA\|MARIA\|GIULIA"` |

### Best Practices
✅ **DO**:
- Variare query (crossfit, yoga, pilates, running)
- Variare location (Milano, Roma, Torino)
- Variare provider (@gmail.com, @libero.it, @yahoo.it)
- Usare 5 pagine (qualità ottimale)
- Ruotare target_names tra query

❌ **DON'T**:
- Query troppo generiche (`"email"`, `"contatti"`)
- Superare 10 pagine (degrada qualità)
- Ripetere stesse query (genera duplicati)
- Usare parole ridondanti (`"donna"` già nei nomi)

---

## 🎓 Esempi d'Uso

### Caso 1: Fitness/Yoga (B2C)
**Obiettivo**: trovare praticanti fitness per vendere abbigliamento sportivo.

```csv
query,location,pages,target_names
"crossfit email @gmail.com",Milano,5,"ANNA|MARIA|GIULIA"
"yoga contatti @libero.it",Roma,5,"SARA|CHIARA|FRANCESCA"
"pilates @yahoo.it",Torino,5,"FEDERICA|SILVIA|ELENA"
"running email @gmail.com",Bologna,5,"GIORGIA|ILARIA|CRISTINA"
"site:instagram.com fitness email Milano",,5,"CLAUDIA|STEFANIA|PAOLA"
```

**Risultati attesi**: 200-400 email uniche praticanti fitness.

---

### Caso 2: Agenzie Web (B2B)
**Obiettivo**: lead generation per servizio sviluppo software.

```csv
query,location,pages,target_names
"agenzia web email",Milano,5,
"sviluppo siti web contatti",Roma,5,
"web design agency",Torino,5,
"digital agency email",Firenze,5,
"site:linkedin.com web developer Milano",,5,
```

**Risultati attesi**: 150-300 contatti agenzie/freelance.

---

### Caso 3: Ristoranti (Local Marketing)
**Obiettivo**: database ristoranti per servizio delivery.

```csv
query,location,pages,target_names
"ristorante email",Milano,10,
"pizzeria contatti",Roma,10,
"trattoria email",Napoli,10,
"osteria contatti",Firenze,8,
```

**Risultati attesi**: 300-600 contatti ristoranti.

---

## 🛠️ Tecnologie

### Frontend
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- React Router DOM
- React Query (TanStack)
- XLSX (parsing CSV/Excel)

### Backend
- Lovable Cloud (Supabase)
- PostgreSQL (database)
- Deno Edge Functions (serverless)
- Supabase Auth

### API Esterne
- **Serper API**: scraping Google Search
- **Mails.so**: validazione SMTP email

---

## 📊 Limiti & Performance

### Rate Limits
- **Serper API**: 2500 ricerche/mese (free tier)
- **Mails.so**: verifica limiti nel tuo piano
- **Batch delay**: 5 secondi tra job (configurabile)

### Performance
- **Ricerca singola**: 5-15s per query (5 pagine)
- **Batch**: ~10s per job (con delay)
- **Validazione**: ~2s per 100 email

### Scalabilità
- **Database**: auto-scaling Supabase
- **Deduplicazione**: ~1ms per check (in-memory Set)
- **Concurrent batches**: supportato (1 job/batch alla volta)

---

## 🔐 Sicurezza & Privacy

### Row Level Security (RLS)
Ogni utente vede solo i propri dati:
- Ricerche
- Contatti
- Batch

### GDPR Compliance ⚠️
**ATTENZIONE**: Questo tool è pensato per **uso interno** (ricerca mercato).

**NON USARE PER**:
- Invio email massive senza opt-in
- Spam
- Violazione privacy

**CONSIGLIATO**:
- Privacy policy chiara
- Consenso prima di contattare
- Right to be forgotten (rimozione su richiesta)

---

## 📖 Documentazione Completa

Per dettagli tecnici completi, consulta `RELAZIONE_TECNICA.md`.

---

## 🐛 Troubleshooting

### Problema: "Pochi risultati trovati"
**Soluzione**:
- Usa query più specifiche (`"crossfit email"` invece di `"email"`)
- Aggiungi provider nella query (`@gmail.com`)
- Varia location per evitare duplicati
- Riduci pagine a 5 (qualità > quantità)

### Problema: "Molti duplicati"
**Soluzione**:
- Sistema ha deduplicazione automatica ✅
- Varia target_names tra query
- Usa provider diversi (@gmail, @libero, @yahoo)
- Evita query troppo simili

### Problema: "Batch non parte"
**Soluzione**:
- Verifica status batch = `running` (non `pending`)
- Controlla Edge Function logs in dashboard
- Aumenta `delay_between_jobs` se timeout
- Verifica API keys (Serper)

---

## 📞 Support & Links

### Esempi CSV
Trovi esempi pronti in `/public/examples/`:
- `strategia-ottimizzata.csv` - Template ottimizzato fitness
- `web-agencies-italy.csv` - Agenzie web Italia
- `restaurants-france.csv` - Ristoranti Francia
- `test-*.csv` - Vari test cases

### Lovable Project
**URL**: https://lovable.dev/projects/0de50f5d-1439-4aa7-ad76-8b94ade6072f

### Deployment
Clicca su **Publish** in Lovable per deployare.

### Custom Domain
Vai su Project > Settings > Domains per connettere il tuo dominio.

### Export Codice
Settings → GitHub → Export per scaricare tutto il codice.

---

## 📝 Changelog

### v1.0.0 - Ottobre 2025
- ✅ Ricerca manuale con filtri avanzati
- ✅ Batch processing CSV/XLSX
- ✅ Deduplicazione globale (DB + in-memory)
- ✅ Validazione email SMTP
- ✅ Dashboard & analytics
- ✅ Export CSV/XLSX
- ✅ RLS policies complete
- ✅ Edge functions ottimizzate

---

## 🎯 Roadmap

### v1.1 (Planned)
- AI Lead Scoring (Gemini 2.5)
- Email personalization
- Webhook notifications
- Real-time updates

---

## 📄 License

Proprietario. Non distribuire senza autorizzazione.

---

**🚀 Buon scraping!**

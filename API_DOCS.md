# 📚 API Documentation - LeadsMap

## Base URL
```
https://wyxaheklcmomfdhpjkdn.supabase.co/functions/v1
```

## Authentication
Tutte le richieste richiedono un header di autenticazione:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🔍 Endpoint: Search Contacts

Ricerca contatti da Google Maps con scraping intelligente delle email.

### Request
```http
POST /search-contacts
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body Parameters
```json
{
  "query": "ristoranti Milano",
  "location": "Milano, Italy",
  "pages": 10,
  "targetNames": ["Giovanni Rossi", "Marco Bianchi"]
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | ✅ | Query di ricerca (es: "ristoranti", "palestre") |
| `location` | string | ❌ | Località target (es: "Milano, Italy") |
| `pages` | number | ❌ | Numero pagine da processare (default: 10, max: 100) |
| `targetNames` | array | ❌ | Lista nomi specifici da cercare |

### Response Success (200)
```json
{
  "success": true,
  "searchId": "uuid-search-id",
  "totalResults": 150,
  "contactsFound": 127,
  "emailsFound": 89,
  "executionTime": "45.2s"
}
```

### Response Fields
- `searchId`: ID univoco della ricerca per riferimenti futuri
- `totalResults`: Totale risultati trovati su Google Maps
- `contactsFound`: Contatti salvati nel database
- `emailsFound`: Email estratte tramite web scraping
- `executionTime`: Tempo totale di esecuzione

### Features
✅ **Deduplicazione intelligente**: Evita duplicati per email/website/phone  
✅ **Web scraping automatico**: Estrae email da website aziendali  
✅ **Rate limiting**: Gestione automatica limiti API  
✅ **Retry logic**: 3 tentativi con backoff esponenziale  

### Error Responses
```json
{
  "error": "Authentication required",
  "code": 401
}
```

```json
{
  "error": "Rate limit exceeded. Retry after 60s",
  "code": 429,
  "retryAfter": 60
}
```

---

## ✉️ Endpoint: Validate Emails

Valida liste di email usando Mails.so API.

### Request
```http
POST /validate-emails
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body Parameters
```json
{
  "emails": [
    "contact@example.com",
    "info@company.it",
    "admin@test.com"
  ],
  "listName": "Q1 2025 Campaign"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `emails` | array | ✅ | Lista email da validare (max 10,000) |
| `listName` | string | ✅ | Nome identificativo della lista |

### Response Success (200)
```json
{
  "success": true,
  "listId": "uuid-list-id",
  "summary": {
    "total": 1000,
    "processed": 1000,
    "deliverable": 847,
    "undeliverable": 102,
    "risky": 38,
    "unknown": 13
  },
  "processingTime": "2m 15s"
}
```

### Email Validation Results
Ogni email viene classificata in:

| Status | Description | Action Recommended |
|--------|-------------|-------------------|
| `deliverable` | ✅ Email valida e attiva | **Usa per campagne** |
| `undeliverable` | ❌ Email non esistente/invalida | **Rimuovi dalla lista** |
| `risky` | ⚠️ Catch-all, temporanea, free email | **Verifica manualmente** |
| `unknown` | ❓ Impossibile verificare | **Testa con cautela** |

### Validation Details
Per ogni email ottieni:
```json
{
  "email": "contact@example.com",
  "result": "deliverable",
  "format_valid": true,
  "domain_valid": true,
  "smtp_valid": true,
  "disposable": false,
  "catch_all": false,
  "free_email": false,
  "reason": "Mailbox exists and is accepting mail"
}
```

### Features
✅ **Batch processing**: Valida fino a 10,000 email in una request  
✅ **Deduplicazione automatica**: Rimuove duplicati prima della validazione  
✅ **Progress tracking**: Monitora avanzamento in real-time  
✅ **Retry con rate limiting**: Gestione automatica code 429  
✅ **SMTP verification**: Verifica esistenza mailbox reale  

### Error Responses
```json
{
  "error": "Invalid email format in list",
  "code": 400,
  "invalidEmails": ["not-an-email", "missing@domain"]
}
```

---

## 🤖 Endpoint: Process Search Queue

Esegue batch di ricerche in coda con ritardi configurabili.

### Request
```http
POST /process-search-queue
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body Parameters
```json
{
  "batchId": "uuid-batch-id"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `batchId` | string | ✅ | ID del batch da processare |

### Response Success (200)
```json
{
  "success": true,
  "batchId": "uuid-batch-id",
  "jobsProcessed": 47,
  "totalContacts": 3421,
  "totalEmails": 2987,
  "failedJobs": 2,
  "executionTime": "1h 23m"
}
```

### Batch Processing Flow
1. Carica tutti i job dal batch
2. Esegue ogni ricerca con delay configurabile
3. Salva risultati nel database
4. Aggiorna stato batch in real-time

### Features
✅ **Delay configurabile**: Evita rate limiting (default 120s)  
✅ **Error recovery**: Continua anche se alcuni job falliscono  
✅ **Progress updates**: Stato aggiornato dopo ogni job  
✅ **Atomic operations**: Ogni job è isolato  

---

## 🔐 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| search-contacts | 100 req/hour | Rolling |
| validate-emails | 50 req/hour | Rolling |
| process-search-queue | 10 batch/day | Fixed |

### Handling Rate Limits
```javascript
// Esempio gestione 429
try {
  const response = await fetch('/search-contacts', options);
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    // Retry request
  }
} catch (error) {
  console.error('API Error:', error);
}
```

---

## 📊 Best Practices

### 1. Batch Operations
```javascript
// ✅ GOOD: Batch da 100-500 email
const batch1 = emails.slice(0, 500);
await validateEmails(batch1);

// ❌ BAD: Singole chiamate
for (const email of emails) {
  await validateEmails([email]); // Inefficiente!
}
```

### 2. Error Handling
```javascript
// ✅ GOOD: Gestione completa errori
try {
  const result = await searchContacts(query);
  if (!result.success) {
    handleError(result.error);
  }
} catch (error) {
  logError(error);
  notifyUser("Errore temporaneo, riprova");
}
```

### 3. Deduplicazione
```javascript
// ✅ GOOD: Deduplica prima della validazione
const uniqueEmails = [...new Set(emailList)];
await validateEmails(uniqueEmails);
```

---

## 🧪 Testing

### Test Endpoint Availability
```bash
curl -X POST https://wyxaheklcmomfdhpjkdn.supabase.co/functions/v1/search-contacts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","pages":1}'
```

### Expected Response
```json
{
  "success": true,
  "searchId": "...",
  "totalResults": 10
}
```

---

## 🆘 Support

### Common Issues

**401 Unauthorized**
- Verifica token JWT valido
- Controlla scadenza token

**429 Rate Limit**
- Riduci frequenza richieste
- Implementa exponential backoff

**500 Internal Error**
- Controlla formato parametri
- Verifica logs Supabase

### Contact
Per supporto tecnico: [Apri issue su GitHub]

---

## 📝 Changelog

### v1.0.0 (2025-01)
- ✅ Search contacts con Google Maps
- ✅ Email validation via Mails.so
- ✅ Batch processing queue
- ✅ Deduplicazione automatica
- ✅ Rate limiting intelligente

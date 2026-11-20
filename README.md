# Garage Condiviso — Frontend

PWA React + TypeScript (Vite) per la mappa dei pezzi "da parte", i diari di restauro e i profili.

## Local-first
I dati privati vivono **solo nel browser** (IndexedDB via Dexie, `src/local/`): targa, telaio,
budget, spese e bozze. Al server arriva solo ciò che l'utente pubblica (pezzi, voci di diario,
foto ridimensionate/senza EXIF, recensioni). Poiché i dati locali sono l'unica copia, il
Profilo offre **backup/ripristino JSON** (`src/local/backup.ts`).

## Avvio
```bash
npm install
cp .env.example .env     # VITE_API_URL del backend
npm run dev              # http://localhost:5173
npm test && npm run build
```
Dopo ogni modifica al backend: copiare `openapi.json` qui e lanciare `npm run gen:api`
(tipi in `src/api/schema.d.ts`).

## Struttura
```
src/api/     client fetch tipizzato, endpoint, tipi generati da OpenAPI
src/auth/    sessione (JWT in localStorage, magic link)
src/local/   Dexie: veicoli, spese, bozze + backup
src/lib/     budget, immagini (resize canvas→WebP), geo
src/pages/   Mappa, Restauro, Diario veicolo, Da parte, Profilo, Profilo pubblico, Login, Claim, Admin
```
Rotte: `/`, `/restauro`, `/restauro/:id`, `/da-parte`, `/profilo`, `/p/:handle`,
`/login`, `/auth/verify?token=`, `/claim?token=`, `/admin`.

## Note
- Il limite di 2 diari veicolo si legge da `GET /v1/config` (e il server lo impone comunque).
- Le **tile OSM pubbliche** non sono adatte a traffico di produzione: usare un provider
  (MapTiler, Stadia) o tile self-hosted, cambiando l'URL in `MapPage.tsx`.
- Gli **importi** delle spese non sono mai inviati: l'opzione "Mostra importo" della roadmap
  richiederebbe un campo pubblico esplicito, non incluso nella beta.
- Non è presente ESLint; la qualità è presidiata da `tsc` strict + vitest.
- Da verificare su dispositivo reale: installazione PWA, geolocalizzazione, upload foto.

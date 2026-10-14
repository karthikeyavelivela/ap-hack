# FYRO — Voice-of-Store Engine (frontend)

React 18 + Vite + TypeScript (strict) + Tailwind. **The backend is fully mocked in the browser with MSW** (300–900 ms latency, ~1.5% random 503s on reads, and a "Simulate API errors" switch in Settings → Developer).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Environment (optional, `.env.local`):

| Var | Purpose |
|---|---|
| `VITE_SARVAM_API_KEY` | Sarvam AI key for Tara TTS (`bulbul:v3`) and STT. Without it Tara uses the device voice and shows a "Using device voice" chip. |
| `VITE_SARVAM_CHAT=1` | Switch Tara's brain from the mock to Sarvam chat (OpenAI-compatible `/v1/chat/completions`). |

> **Warning:** any `VITE_*` key is bundled into the client and visible to every user. In production, proxy Sarvam calls through your backend.

## Demo credentials (password `Fyro@123` for all)

| Role | Email |
|---|---|
| Head Office | head@fyro.in |
| Regional Manager (Rayalaseema) | region@fyro.in |
| Function Owner (Store Ops) | function@fyro.in |
| Store Manager (ATP-07 Anantapur) | store@fyro.in |
| Analyst | analyst@fyro.in |

OTP code for sign-up and password reset: `123456`. On the login page, the "Try a demo role" chips pre-fill these.

## Architecture

```
src/
  app/            router, nav + role permissions
  layouts/        PublicLayout (marketing) and AppLayout (shell, sidebar, ⌘K, tour, Tara)
  features/       auth, marketing, dashboard, inbox, incidents, emerging, briefs, routing,
                  stores, map, layers (10 demos), evaluation, explorer, admin, account, tara, tour
  components/     ui kit, charts, APMap (SVG, 26 districts), Orb (Three.js, lazy), shell controls
  mocks/          seeded data generator (40k records in a Web Worker), NLP layers, detector
                  (EARS C2/C3 + Poisson + space-time scan), MSW handlers, in-memory DB
  services/       api client, voice (Sarvam + browser fallback), Tara provider interface
  store/          zustand (auth, ui, tara, tour) · i18n/ (en, te, hi, ta, mr)
```

Mock-data notes: three planted incidents (freezer failure ATP-07, allergen mislabel TPT-03, staff misconduct VSP-03) plus Dasara queue, cyclone power-cut and Rayalaseema heat effects. State changes (incident edits, comments, users, policy, routing) persist in `localStorage`; Settings → Reset demo data clears them.

Tara's chat is behind a `TaraProvider` interface (`src/services/tara.ts`) so a real LLM can replace the mock brain.

## i18n

English text is the translation key. `scripts/build-locales.py` holds the Telugu/Hindi/Tamil/Marathi core UI vocabulary (navigation, auth, dashboards, Tara, settings). Long explanatory copy (layer explainers, docs, legal) is English only and falls back automatically.

## Assets

Illustration sheets in `public/assets` are pre-sliced into `public/assets/sliced` by `scripts/slice.py`.

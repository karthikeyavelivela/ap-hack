<div align="center">

# 🔥 FYRO

### Voice-of-Store Engine for Andhra Pradesh retail

**Turn thousands of scattered customer complaints into a handful of prioritised, routed, explainable incidents — before they become headlines.**

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss&logoColor=white)
![MSW](https://img.shields.io/badge/API-mocked%20with%20MSW-ff6a33)
![i18n](https://img.shields.io/badge/languages-EN%20·%20తెలుగు%20·%20हिन्दी%20·%20தமிழ்%20·%20मराठी-success)

</div>

---

## 💡 The problem

A retail chain across 26 districts receives feedback through calls, WhatsApp, app reviews, emails and in-store forms — in five languages. Head office drowns in noise: a failing freezer in Anantapur, an allergen mislabel in Tirupati and a staff-misconduct report in Visakhapatnam all look like "just another complaint" until someone connects the dots.

## ✅ The solution

**FYRO** ingests every channel, classifies and clusters feedback with an NLP pipeline, **detects emerging incidents statistically**, and routes each one to the right owner with an explainable severity score. Every role — from head office to the store floor — gets a view built for their job. A voice assistant, **Tara**, answers questions in the user's own language.

## ✨ Features

| | Feature | What it does |
|---|---|---|
| 📊 | **Dashboard** | Role-aware KPIs, trends, hotspots and sentiment at a glance |
| 📥 | **Feedback inbox** | 40,000 seeded records, virtualised list, URL-synced filters |
| 🚨 | **Incidents** | Auto-detected incidents with severity, timeline, comments and ownership |
| 📡 | **Emerging radar** | Surfaces anomalies *before* they cross escalation thresholds |
| 📝 | **Regional briefs** | Auto-written summaries per region for managers |
| 🔀 | **Routing & escalation** | Configurable policy: who gets what, how fast, and when it escalates |
| 🏪 | **Stores & AP map** | Store profiles plus an interactive SVG map of all 26 districts |
| 🧪 | **Pipeline layers** | 10 interactive demos that open the NLP pipeline up — nothing is a black box |
| 🎯 | **Evaluation** | Precision / recall of the detector against planted ground truth |
| 🔎 | **Data explorer** | Slice and dice raw records |
| 🗣️ | **Tara (voice AI)** | Ask questions by voice or text; TTS/STT via Sarvam AI with a device-voice fallback |
| 🌐 | **5 languages** | English, Telugu, Hindi, Tamil, Marathi |
| 🧭 | **Guided tour & ⌘K** | Onboarding tour and a command palette |
| 🔐 | **Role-based access** | Head Office · Regional Manager · Function Owner · Store Manager · Analyst |

## 🧠 How detection works

```
 raw feedback ──► language ID ──► taxonomy tagging ──► sentiment / severity cues
                                                              │
        routed incident ◄── severity policy ◄── clustering ◄──┘
                                   ▲
              EARS C2/C3  +  Poisson spike test  +  space-time scan
```

- **EARS (C2 / C3)** — rolling-baseline anomaly detection per category and store
- **Poisson test** — is today's count statistically unusual for this store?
- **Space-time scan** — finds clusters across nearby stores and days
- Results are scored against **three planted incidents** (freezer failure at ATP-07, allergen mislabel at TPT-03, staff misconduct at VSP-03), plus realistic confounders: Dasara queues, a cyclone power-cut and Rayalaseema heat.

## 🚀 Quick start

```bash
git clone https://github.com/karthikeyavelivela/ap-hack.git
cd ap-hack/fyro
npm install
npm run dev          # → http://localhost:5173
```

```bash
npm run build        # typecheck + production build
npm run preview      # serve the production build
```

### Demo logins

Password for all: `Fyro@123` · OTP for sign-up / reset: `123456`

| Role | Email |
|---|---|
| Head Office | `head@fyro.in` |
| Regional Manager (Rayalaseema) | `region@fyro.in` |
| Function Owner (Store Ops) | `function@fyro.in` |
| Store Manager (ATP-07 Anantapur) | `store@fyro.in` |
| Analyst | `analyst@fyro.in` |

Tip: the login page has **"Try a demo role"** chips that pre-fill these.

### Optional environment (`fyro/.env.local`)

| Variable | Purpose |
|---|---|
| `VITE_SARVAM_API_KEY` | Sarvam AI key for Tara's voice (`bulbul:v3` TTS + STT). Without it, Tara uses the device voice. |
| `VITE_SARVAM_CHAT=1` | Swap Tara's mock brain for Sarvam chat. |

> ⚠️ Any `VITE_*` variable is bundled into the client. In production, proxy Sarvam through your own backend.

## 🏗️ Architecture

```
fyro/src/
├── app/          router, nav, role permissions
├── layouts/      PublicLayout (marketing) · AppLayout (shell, sidebar, ⌘K, tour, Tara)
├── features/     auth · marketing · dashboard · inbox · incidents · emerging · briefs
│                 routing · stores · map · layers · evaluation · explorer · admin
│                 account · tara · tour
├── components/   UI kit, charts, APMap (SVG), Orb (Three.js, lazy-loaded)
├── mocks/        data generator (Web Worker) · NLP layers · detector · MSW handlers · in-memory DB
├── services/     API client · voice (Sarvam + browser fallback) · Tara provider interface
├── store/        zustand (auth, ui, tara, tour)
└── i18n/         en · te · hi · ta · mr
```

**Key design choices**

- **Fully mocked backend** — MSW intercepts requests in the browser with 300–900 ms latency and ~1.5 % random 503s. Flip *Settings → Developer → Simulate API errors* to test failure states.
- **Heavy work off the main thread** — 40k records are generated in a Web Worker.
- **Swappable AI** — Tara sits behind a `TaraProvider` interface (`src/services/tara.ts`); plug in any LLM.
- **Persistence** — edits, comments, users, policy and routing live in `localStorage`; *Settings → Reset demo data* wipes them.
- **i18n** — English text is the key; missing translations fall back gracefully.

## 🛠️ Tech stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS · React Router · TanStack Query · Zustand · Recharts · Three.js / R3F · Framer Motion · Lenis · driver.js · i18next · MSW · d3-delaunay · faker

## 🗺️ Roadmap

- [ ] Real backend + auth in place of MSW
- [ ] Live WhatsApp / call-centre ingestion
- [ ] Server-side Sarvam proxy
- [ ] Full long-form translations (currently core UI only)
- [ ] Mobile app for store managers

## 🤝 Contributing

Fork, branch, `npm run typecheck`, open a PR.

---

<div align="center">

Built for the **AP Hackathon** · Made with ☕ by [@karthikeyavelivela](https://github.com/karthikeyavelivela)

</div>

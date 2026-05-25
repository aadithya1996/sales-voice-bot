# Pipeline Pilot — AI Sales Voice Assistant

An AI-powered voice assistant that reviews your HubSpot CRM pipeline via voice, suggests CRM actions, and writes them back automatically.

## Features

- **Voice-first pipeline review** — Talk to "Alex" about your deals, no typing needed
- **AI prioritization** — GPT-4o scores deals by urgency, value, and sentiment
- **HubSpot integration** — Reads live pipeline data, writes back notes, stage moves, and risk flags
- **Post-call summary** — Auto-generated email with transcript, actions, and CRM sync status
- **Demo mode** — Seed 4 realistic B2B deals with one click for testing

## Architecture

| Component | Tech | Port | Description |
|---|---|---|---|
| Dashboard | Next.js 14 | 3000 | React UI + API routes |
| Voice Server | Node + ws | 8080 | Retell Custom LLM WebSocket |
| Database | SQLite | — | Local file-based, shared across processes |
| AI Engine | OpenAI GPT-4o | — | Prompts + classification |
| CRM | HubSpot REST API | — | Read/write deals, contacts, notes |

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env with your real API keys

# 3. Start the WebSocket server (in terminal 1)
npm run ws

# 4. Start the Next.js app (in terminal 2)
npm run dev

# 5. Open http://localhost:3000
```

### Required API Keys

- **HubSpot**: Create a Private App at `Settings → Integrations → Private Apps`. Scopes: `crm.objects.contacts.read/write`, `crm.objects.deals.read/write`, `crm.schemas.deals.read`, `crm.objects.owners.read`
- **Retell AI**: Get from [dashboard.retellai.com](https://dashboard.retellai.com)
- **OpenAI**: Get from [platform.openai.com](https://platform.openai.com)

For local voice calls, expose port 8080 via ngrok:
```bash
ngrok http 8080
# Then set RETELL_WS_URL=wss://xxxx.ngrok-free.app/llm-websocket in .env
```

## Deployment (Railway)

Railway is recommended because this app requires **two persistent processes** (Next.js + WebSocket server) and a **persistent SQLite volume**.

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sales-voice-bot.git
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select your `sales-voice-bot` repo

### Step 3: Add Services (2 services from 1 repo)

**Service 1 — Dashboard (Web)**
- Source: Your GitHub repo
- Start Command: `npm run start` (or leave blank, Railway auto-detects)
- Port: `3000`
- Healthcheck Path: `/api/crm/focus-list`

**Service 2 — Voice Server (WebSocket)**
- Source: Same GitHub repo
- Start Command: `npm run ws`
- Port: `8080`

### Step 4: Add Environment Variables

In Railway dashboard → Project Variables, add:

```
HUBSPOT_ACCESS_TOKEN=your_token
RETELL_API_KEY=your_key
RETELL_AGENT_ID=your_agent_id
OPENAI_API_KEY=your_key
PORT=3000
WS_PORT=8080
RETELL_WS_URL=wss://your-voice-service-domain.railway.app/llm-websocket
BRIDGE_SECRET=your_random_secret
```

> **Important**: `RETELL_WS_URL` must point to Service 2's public domain. Get it from Railway after Service 2 deploys.

### Step 5: Add Persistent Volume (for SQLite)

1. In Railway dashboard → Service 1 (Dashboard) → Settings → Volumes
2. Add Volume:
   - Mount Path: `/app`
   - Size: 1 GB (plenty for SQLite)
3. Redeploy

### Step 6: Configure Retell Agent

1. Go to [Retell Dashboard](https://dashboard.retellai.com)
2. Find your "Pipeline Pilot Agent"
3. Set **LLM WebSocket URL** to your Service 2 Railway domain:
   ```
   wss://your-voice-service-domain.railway.app/llm-websocket
   ```
4. Save

### Step 7: Test

1. Open your Dashboard service domain (Service 1)
2. Complete setup modal → Seed demo → Sync → Classify → Start voice review
3. After call ends, verify CRM actions and transcript notes in HubSpot

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `HUBSPOT_ACCESS_TOKEN` | Yes | HubSpot Private App token |
| `RETELL_API_KEY` | Yes | Retell API key |
| `RETELL_AGENT_ID` | Auto | Set automatically on first run |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `PORT` | Yes | Next.js port (default 3000) |
| `WS_PORT` | Yes | WebSocket server port (default 8080) |
| `RETELL_WS_URL` | Yes | Public URL of ws-server (wss://...) |
| `BRIDGE_SECRET` | Yes | Random string for internal auth |

## Data Flow

```
HubSpot CRM ←→ Seed API / Sync API ←→ SQLite (local cache)
                                    ↓
                              Classify API (GPT-4o scores deals)
                                    ↓
                          Retell Voice Call (Alex reads focus list)
                                    ↓
                         User speaks → Actions queued in SQLite
                                    ↓
                         Execute API → HubSpot write-back + transcript notes
                                    ↓
                           Email preview → Copy/Download/Mailto
```

## License

MIT

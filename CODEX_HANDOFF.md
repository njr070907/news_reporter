# News Reporter Project - Codex Handoff Document

## Project Overview
Automated news briefing system that collects news from multiple sources, generates easy-to-read reports with source verification.

**Production URL**: https://news-reporter-web-production.up.railway.app  
**GitHub Repo**: https://github.com/njr070907/news_reporter  
**Railway Project ID**: c1ed143f-82f5-47df-899e-5a95961035d1

---

## Current Status

### Completed Features
- [x] Google News + Bing News dual source collection
- [x] Multi-keyword independent queries (30 articles per source, 40 max global)
- [x] Content extraction with cheerio + og:image images
- [x] LLM report generation with three-part template
- [x] Daily/Weekly/Custom range reports (1/7/14 days)
- [x] Web UI with login, topic management, report viewing
- [x] Per-section images, thumbs up/down, daily rating
- [x] Password authentication with scrypt hashing
- [x] Railway deployment with GitHub Actions cron
- [x] Async cron execution with status polling
- [x] Beijing time (UTC+8) for dates and display

### In Progress: Local LLM Integration
- [x] Ollama installed with models:
  - `qwen3.5:0.8b` (1.0 GB) - Working, Chinese support good
  - `qwen3.5:4b` (3.4 GB) - Installed but slow response
  - `gpt-oss:20b` (13 GB) - Installed but Chinese encoding issues
- [x] `src/lib/llm.ts` updated to support local/remote provider switching
- [x] `.env.local` updated with `LLM_PROVIDER=local`
- [ ] Full integration testing needed

---

## Architecture

### Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite (local) / PostgreSQL (production)
- **LLM**: DeepSeek API (remote) / Ollama (local)
- **Deployment**: Railway + GitHub Actions

### Key Files

```
src/
├── lib/
│   ├── llm.ts              # LLM client (supports local/remote)
│   ├── date.ts             # Beijing time (UTC+8)
│   ├── db.ts               # Database abstraction
│   ├── schema.ts           # DDL (users, topics, reports, feedback)
│   ├── password.ts         # Scrypt hash/verify
│   ├── auth.ts             # HMAC session cookie
│   ├── presets.ts          # 8 preset topics
│   ├── sources/
│   │   ├── google-news.ts  # Google News RSS (30 per source)
│   │   └── bing-news.ts    # Bing News RSS (30 per source)
│   ├── collect.ts          # Dedup + merge + multi-keyword queries
│   ├── enrich.ts           # Content extraction + og:image
│   ├── report.ts           # LLM prompt (three-part template)
│   └── pipeline.ts         # Collect → Extract → Generate pipeline
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts    # Login/Register dual mode
│   │   ├── topics/route.ts        # Topic CRUD + PATCH active
│   │   ├── generate/route.ts      # Report generation (days param)
│   │   ├── feedback/route.ts      # Feedback tracking
│   │   └── cron/generate/route.ts # Async cron + status polling
│   ├── login/               # Login page
│   ├── topics/              # Topic management page
│   └── reports/
│       ├── page.tsx         # Report list (grouped by date)
│       └── [id]/
│           ├── page.tsx     # Server: splitSections + ReportView
│           └── ReportView.tsx # Client: rating/thumbs/images
└── .github/workflows/daily-brief.yml  # GitHub Actions cron
```

---

## Local LLM Integration Details

### Current Configuration (`.env.local`)
```bash
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=qwen3.5:0.8b
```

### How It Works
1. `src/lib/llm.ts` checks `LLM_PROVIDER` environment variable
2. If `local`: uses Ollama native API (`/api/generate`)
3. If `remote`: uses OpenAI-compatible API (`/chat/completions`)

### Test Results
- ✅ Simple English prompts work
- ✅ Simple Chinese prompts work (0.8B model)
- ⚠️ Longer Chinese prompts may timeout (model needs optimization)

### Known Issues
1. **Chinese encoding**: PowerShell has UTF-8 issues, Node.js fetch works correctly
2. **Response speed**: 4B model is slow, 0.8B is faster but less capable
3. **Thinking mode**: Models default to thinking mode, adds latency

---

## Deployment

### Railway Configuration
- **Service**: news-reporter-web
- **Auto-deploy**: Push to main branch triggers 15s deployment
- **Cron**: GitHub Actions runs at UTC 22:00 (Beijing 06:00)

### Environment Variables (Production)
```
DATABASE_URL=postgresql://...
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash-vision-exp
CRON_SECRET=c968180a...
AUTH_SECRET=446c3737...
```

---

## Next Steps for Codex

### Priority 1: Complete Local LLM Integration
1. Test full report generation with local model
2. Optimize model parameters (temperature, context length)
3. Add fallback mechanism (local → remote if timeout)

### Priority 2: Performance Optimization
1. Add caching for repeated queries
2. Implement streaming for long responses
3. Consider using `qwen3.5:4b` with GPU acceleration

### Priority 3: User Experience
1. Add model selection in UI (local vs remote)
2. Show generation time and model used
3. Add progress indicator for long operations

---

## Development Commands

```bash
# Start local dev server
npm run dev

# Start Ollama
ollama serve

# Run tests
npm run lint
npm run build

# Deploy (auto on push to main)
git push origin main
```

---

## Contact
- Railway Project: c1ed143f-82f5-47df-899e-5a95961035d1
- GitHub: njr070907/news_reporter

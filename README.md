# UTM Builder

Enterprise UTM link builder for digital marketing teams: guided single-URL
generation, bulk CSV processing, naming governance, templates, history,
QR codes and short links — built API-first for GA4 / Adobe Analytics /
Tealium / GTM workflows.

## Stack

| Layer    | Technology                                            |
| -------- | ----------------------------------------------------- |
| Frontend | React 18 + TypeScript + Tailwind CSS 4 (Vite)         |
| Backend  | Python FastAPI (SQLAlchemy 2, Pydantic 2)             |
| Database | PostgreSQL (SQLite fallback for local development)    |

## Quick start

```powershell
# Backend (http://localhost:8000, OpenAPI docs at /docs)
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

# Frontend (http://localhost:5173, proxies /api to the backend)
cd frontend
npm install
npm run dev
```

Run backend tests: `cd backend; .venv\Scripts\python -m pytest`

## Configuration (environment variables / `backend/.env`)

| Variable            | Default                       | Purpose                              |
| ------------------- | ----------------------------- | ------------------------------------ |
| `DATABASE_URL`      | `sqlite:///./utm_builder.db`  | Use `postgresql+psycopg2://user:pass@host:5432/utm` in production |
| `CORS_ORIGINS`      | `http://localhost:5173`       | Comma-separated allowed origins      |
| `BITLY_TOKEN`       | _(empty)_                     | Enables the Bitly shortener          |
| `ANTHROPIC_API_KEY` | _(empty)_                     | Upgrades the AI naming assistant from the offline rules engine to Claude |
| `MAX_URL_LENGTH`    | `2048`                        | Long-URL warning threshold           |

## Features

- **Builder** — destination URL input (existing query strings and `#fragments`
  preserved), dropdowns for source/medium with custom values, unlimited custom
  parameters (`cid`, `channel`, `audience`, …), live validation.
- **Smart campaign names** — `AnalyticsTool + India + Q3 + 2026` →
  `analytics_tool_india_q3_2026` (lowercase, underscores, no special chars).
- **AI naming assistant** — free text → suggested UTMs with mandatory user
  approval. Works offline via a rules engine; uses Claude when an API key is set.
- **Validation engine** — missing source/medium, duplicate parameters, invalid
  characters, mixed casing, pre-existing UTMs, over-long URLs.
- **Governance** — admin-defined combination rules (e.g. `utm_source=google ⇒
  utm_medium ∈ [cpc, organic]`); `error` rules block generation, with an
  explicit override. Defaults for Google Ads, Email and LinkedIn are seeded.
- **Bulk CSV** — upload `URL,Source,Medium,Campaign,Content,Term` (extra
  columns become custom params); per-row validation; export CSV or Excel.
- **Templates** — save/reuse team presets (LinkedIn Lead Gen, Google Search, …).
- **History** — every generated URL with user, date, campaign; search + filters.
- **Short links** — TinyURL (no key) and Bitly (token).
- **QR codes** — PNG and SVG download, copy-to-clipboard.
- **Copy utilities** — full URL, parameters only, CSV row, QR image.
- **GA4 preview** — shows how source/medium/campaign will appear in reports.
- **Enterprise** — role-based access (admin vs member), audit log
  (`GET /api/audit-logs`, admin only), campaign ownership on every record.

## API

All routes are under `/api`; interactive docs at `http://localhost:8000/docs`.

| Method | Path                     | Description                                  |
| ------ | ------------------------ | -------------------------------------------- |
| POST   | `/api/generate-utm`      | Validate + govern + build URL + record history |
| POST   | `/api/validate`          | Validation preview without generating        |
| POST   | `/api/campaign-name`     | Slugify name parts into a campaign name      |
| POST   | `/api/ai-suggest`        | Free text → suggested UTM parameters         |
| POST   | `/api/bulk-generate`     | CSV upload → generated rows                  |
| POST   | `/api/bulk-export`       | Rows → CSV / XLSX download                   |
| GET    | `/api/templates`         | List templates                               |
| POST   | `/api/save-template`     | Create/update a template                     |
| DELETE | `/api/templates/{id}`    | Delete a template                            |
| GET    | `/api/history`           | Search/filter generated URLs                 |
| DELETE | `/api/history/{id}`      | Remove a history entry                       |
| GET    | `/api/governance-rules`  | List rules                                   |
| POST   | `/api/governance-rules`  | Create rule (admin)                          |
| DELETE | `/api/governance-rules/{id}` | Delete rule (admin)                      |
| POST   | `/api/shorten`           | TinyURL / Bitly short link                   |
| GET    | `/api/qr`                | QR code (`?url=…&fmt=png|svg&scale=…`)       |
| GET    | `/api/audit-logs`        | Audit trail (admin)                          |

**Identity:** requests carry `X-User` / `X-Role` headers. The demo UI exposes
a user/role switcher; in production these headers are injected by your SSO or
reverse-proxy layer (OAuth2 proxy, Entra ID, etc.) so the API slots behind any
identity provider unchanged.

## Architecture

```
backend/app
├── main.py          FastAPI app, CORS, router registration
├── config.py        env-driven settings
├── database.py      SQLAlchemy engine/session (PostgreSQL or SQLite)
├── models.py        UtmLink, Template, GovernanceRule, AuditLog
├── schemas.py       Pydantic request/response contracts
├── services/        pure business logic (unit-tested)
│   ├── utm_builder.py     URL construction + edge cases
│   ├── validator.py       validation engine
│   ├── campaign_namer.py  naming convention slugifier
│   ├── ai_assistant.py    rules engine + optional Claude
│   ├── governance.py      combination rules
│   ├── bulk.py            CSV parse / CSV + XLSX export
│   ├── shortener.py       TinyURL / Bitly
│   └── qr_generator.py    PNG / SVG QR codes
└── routers/         thin HTTP layer per domain
frontend/src
├── api.ts           typed API client (identity headers)
├── constants.ts     dropdown taxonomies
├── tabs/            Builder, Bulk CSV, Templates, History, Governance
└── components/      campaign namer, AI assistant, custom params,
                     validation list, result panel (copy/QR/shortener/GA4)
```

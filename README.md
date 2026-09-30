# DevPulse AI

**AI-Powered Engineering Operations Platform**

DevPulse AI is an intelligent operations platform designed for software engineering teams. It bridges repositories, pull requests, issue tracking, and deployment logs with AI assistance to help engineering managers and developers maintain high velocity, review code changes, and triage deployment failures quickly.

---

## 📌 Project Status

**Current Phase: Step 14 — GitHub Actions CI/CD Pipeline (Backend • Frontend • Docker • PostgreSQL)**

- [x] Full-stack directory structure (`frontend/` and `backend/`)
- [x] FastAPI backend setup with health check endpoint (`GET /api/health`)
- [x] FastAPI dashboard endpoint (`GET /api/dashboard`) using typed Pydantic models
- [x] Professional SaaS-style developer dashboard UI (React 19 + TypeScript + Tailwind CSS)
- [x] Sidebar navigation with active state, dynamic repository count badge, and dedicated views
- [x] Top header with search, notifications, demo profile, and live backend connection badge
- [x] **Summary Metrics Integration:** Projects card dynamically bound to live GitHub repository count (4 repositories)
- [x] Clearly labeled mock data for upcoming phases (PRs, deployments, and AI insights)
- [x] **Official GitHub App Integration (Step 6)**:
  - App Name: `DevPulse AI Platform` (App ID: `5118991`)
  - Authenticated via RS256 private key (`backend/secrets/devpulse-ai.private-key.pem`)
  - Server-side RS256 JWT generation with strict 10-minute expiry window
  - Short-lived installation access tokens cached securely in-memory
  - Target Account: `prachiraut711`
  - 4 Selected Repositories:
    - `prachiraut711/coding-questions`
    - `prachiraut711/voice-restaurant-agent`
    - `prachiraut711/Event-Booking-Web-App`
    - `prachiraut711/accident-damage-detection`
  - Read-Only Permissions: Actions, Contents, Deployments, Issues, Metadata, Pull requests
  - Zero secrets/private keys exposed to browser or logged
- [x] **Live Repository Integration (`GET /api/github/repos`)**:
  - Filtered Pydantic response models (`name`, `description`, `stars`, `forks`, `language`, `updated_at`, etc.)
  - Real repository cards with language indicators, star/fork counts, and read-only "View on GitHub" links
  - Comprehensive UI states: Loading, Error, Disconnected, and Selected Repositories
- [x] **Live Pull Request Analytics (`GET /api/github/pull-requests`)**
- [x] **Live Issues Analytics (`GET /api/github/issues`)**
- [x] **AI Pull Request Reviewer (`POST /api/ai/review-pr`)**:
  - Google Gemini AI integration for senior code review
  - Risk assessment, bugs, security, quality, performance, and testing insights
  - Strictly read-only GitHub analysis with size limits & truncation handling
- [x] **AI Deployment Failure Analyzer (`POST /api/ai/analyze-deployment` & `GET /api/github/workflow-runs`)**:
  - Google Gemini AI integration for diagnosing CI/CD workflow run failures
  - Root cause analysis, failed step evidence, suggested developer checks, actionable fixes, and confidence ratings
  - Strictly read-only GitHub Actions inspection (zero reruns, triggers, or mutations)
- [x] **PostgreSQL Integration & Persistence (Step 12)**:
  - SQLAlchemy 2.x ORM with psycopg 3 binary driver
  - Database schema: `platform_connections`, `ai_review_history`, `deployment_analysis_history`
  - Automatic persistence of successful AI code reviews and deployment failure diagnoses
  - Dedicated history API endpoints: `GET /api/ai/reviews` and `GET /api/ai/deployment-analyses`
  - Database health and configuration check: `GET /api/database/status`
  - Graceful degradation: operates smoothly even when local PostgreSQL is offline
  - Zero secrets stored in database (no private keys, tokens, or Gemini keys)
- [x] **Complete Application Dockerization (Step 13)**:
  - Multi-stage production `frontend/Dockerfile` (Node.js 20 build -> Nginx Alpine serve)
  - Production `backend/Dockerfile` with healthcheck (`python:3.12-slim`)
  - Root `docker-compose.yml` orchestrating `frontend`, `backend`, and `postgres`
  - Persistent named volume for PostgreSQL data (`postgres_data`)
  - Safe read-only secret mounting (`./backend/secrets:/app/secrets:ro`)
  - Nginx reverse proxy configuration for seamless `/api/` forwarding without CORS
- [x] **GitHub Actions CI/CD Pipeline (Step 14)**:
  - Automated workflow `.github/workflows/ci.yml` triggered on push and pull requests targeting default branch
  - Ephemeral PostgreSQL 16 container service for live backend database integration testing
  - Python 3.12 dependency caching, import validation, and automated smoke test suite
  - Node.js 20 dependency caching, TypeScript strict checking, and Vite production bundle build
  - Docker Compose configuration validation and container image builds (`backend` and `frontend`)
  - Strictly read-only GitHub permissions (`contents: read`) with zero secrets logged or committed
- [ ] *Upcoming:* Kubernetes orchestration & cloud deployment pipelines

---

## 🤖 AI Pull Request Reviewer (Step 10)

- **Read-Only GitHub App Integration:** DevPulse retrieves Pull Request metadata, changed files, and code diffs using the official read-only GitHub App.
- **Backend AI Processing:** The FastAPI backend securely packages PR context and sends it to Google Gemini (`gemini-1.5-flash` or configurable model) using the official `google-genai` Python SDK.
- **Advisory Code Insights:** The AI generates a structured engineering review containing:
  - **Change Summary:** High-level summary of the PR purpose and scope.
  - **AI Risk Assessment:** Advisory risk rating (`Low`, `Medium`, `High`).
  - **Potential Bugs:** Correctness issues, logic flaws, and null references.
  - **Security Concerns:** Input sanitization, auth loopholes, secret leakage checks.
  - **Code Quality & Maintainability:** Modularity, naming, and error handling advice.
  - **Performance Considerations:** Inefficient iterations and bottleneck warnings.
  - **Testing Recommendations:** Suggested unit and integration test scenarios.
- **Zero GitHub Mutations:** No PRs are created, modified, closed, merged, or commented on. The AI feature operates strictly on retrieved data.
- **Private Gemini Key Storage:** `GEMINI_API_KEY` is kept exclusively on the backend (`backend/.env`) and is never sent to the browser or client.

---

## 🛠️ AI Deployment Failure Analyzer (Step 11)

- **Read-Only CI/CD Telemetry:** DevPulse AI inspects GitHub Actions workflow runs across installed repositories via `GET /api/github/workflow-runs` using the read-only GitHub App.
- **Zero GitHub Mutations:** DevPulse AI **NEVER** reruns, triggers, cancels, approves, or modifies GitHub Actions workflows. All interactions are strictly HTTP `GET` requests.
- **Network-Efficient Failure Extraction:** Rather than downloading multi-megabyte raw log zip archives over mobile data, DevPulse queries `/actions/runs/{run_id}/jobs` directly to pinpoint failed jobs and failing step names with error status.
- **Gemini-Powered Diagnosis (`POST /api/ai/analyze-deployment`):**
  - **Executive Summary:** Explains what workflow failed, in which job/step, and on what branch.
  - **Likely Root Cause:** Diagnoses the failure origin (e.g. dependency conflict, missing environment variable, syntax error, failed unit tests, permission issue).
  - **Evidence & Failed Steps:** Chronological list of failing steps and status indicators.
  - **Suggested Developer Checks:** Actionable debugging tasks for engineering teams.
  - **Possible Fixes:** Concrete recommendations for workflow YAML or codebase modifications.
  - **Confidence Indicator:** Rated `High`, `Medium`, or `Low`.
  - **Advisory Disclaimer:** Explicit notice that AI diagnoses are advisory and must be verified against actual code before making changes.
- **Privacy & Security:** Gemini API keys and GitHub App private keys are secured on the backend and never exposed to the frontend. Errors are sanitized to prevent credential leakage.

---

## 🗄️ PostgreSQL Integration & Persistence (Step 12)

- **SQLAlchemy 2.x & Psycopg 3:** Standard relational persistence layer using PostgreSQL driver (`postgresql+psycopg://username:password@localhost:5432/devpulse`).
- **Database Schema Models:**
  - `platform_connections`: Basic metadata on the connected GitHub App installation (account login, app ID, auth type) without storing any secrets.
  - `ai_review_history`: Historical AI Pull Request reviews including repository, PR number, title, author, full review JSON, and timestamp.
  - `deployment_analysis_history`: Historical AI deployment failure analyses including repository, workflow run ID, workflow name, branch, conclusion, diagnosis JSON, and timestamp.
- **Strict Security Rules:**
  - Zero private keys, access tokens, JWTs, or Gemini API keys are persisted in PostgreSQL.
  - Credentials in connection URLs are sanitized/masked before logging or reporting in status responses.
  - `.env` and `backend/secrets/` remain ignored by source control.
- **Graceful Degradation:**
  - If local PostgreSQL is not currently running on port 5432, the FastAPI server logs the connection error safely and continues operating smoothly without crashing.
  - Endpoints gracefully handle database connectivity state.
- **History Endpoints:**
  - `GET /api/database/status` — Checks PostgreSQL connection health and returns driver telemetry with sanitized connection strings.
  - `GET /api/ai/reviews` — Retrieves saved PR code reviews from PostgreSQL.
  - `GET /api/ai/deployment-analyses` — Retrieves saved CI/CD deployment failure analyses from PostgreSQL.

---

## 🐙 Official GitHub App Architecture (Step 6)

DevPulse AI uses an official GitHub App (`DevPulse AI Platform`, App ID: `5118991`) installed on GitHub account `prachiraut711`.

### Strict Read-Only Policy
- **DevPulse connects to GitHub using strictly read-only access:** Only HTTP `GET` operations are used to query the GitHub REST API.
- **Repositories are restricted to selected repositories:** DevPulse only accesses the 4 authorized repositories.
- **GitHub App credentials remain on the backend:** The private key (`backend/secrets/devpulse-ai.private-key.pem`) is stored locally and protected by `.gitignore`. The React frontend never receives raw tokens or private keys.
- **Repository information is displayed in the DevPulse dashboard:** Cards show repository names, descriptions, programming languages, public/private tags, stars, forks, and last-updated timestamps.
- **DevPulse does not modify GitHub repositories:** DevPulse cannot push commits, merge PRs, delete files, modify branches, or change repository settings.

### GitHub App Data Flow

```text
GitHub App (DevPulse AI Platform, App ID: 5118991)
       │
       ▼ (RS256 JWT generated with backend/secrets/devpulse-ai.private-key.pem)
GitHub Installations API (GET /app/installations -> Installation ID: 166069234)
       │
       ▼ (POST /app/installations/166069234/access_tokens)
Short-Lived Installation Access Token (cached in-memory on backend)
       │
       ▼ (GET /installation/repositories)
FastAPI GitHub App Service (app/services/github_app_service.py)
       │ (Filters raw JSON into clean Pydantic response objects)
       ▼
FastAPI API Routes (GET /api/github/status & GET /api/github/repos)
       │ (Sends safe JSON payload over CORS without secrets)
       ▼
React (frontend/src/App.tsx)
       │ (Stores repositories in React component state)
       ▼
DevPulse Dashboard (<RepositoryList /> & <SummaryCards />)
```

---

## 🔒 Security & Privacy Guarantees

1. **Private Key Protection:**
   The private key (`backend/secrets/devpulse-ai.private-key.pem`) is ignored by `.gitignore` (`secrets/`, `*.pem`). It is NEVER returned in API responses, NEVER rendered in HTML/React, and NEVER logged.
2. **Short-Lived Tokens:**
   Access tokens are generated on-demand by the backend and cached in-memory. They expire automatically.
3. **No Write Access:**
   Permissions granted to the App are strictly Read-only:
   - `Actions: Read-only`
   - `Contents: Read-only`
   - `Deployments: Read-only`
   - `Issues: Read-only`
   - `Metadata: Read-only`
   - `Pull requests: Read-only`
4. **Limited Repository Scope:**
   The App only has access to the 4 explicitly selected repositories. It cannot view any other repositories.


---

## 🛠️ Technology Stack

### Frontend
- **Framework:** [React 19](https://react.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vite.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
- **Runtime:** [Python 3.11+](https://www.python.org/)
- **ASGI Server:** [Uvicorn](https://www.uvicorn.org/)
- **HTTP Client:** [HTTPX](https://www.python-httpx.org/)
- **Data Validation:** [Pydantic v2](https://docs.pydantic.dev/)

---

## 📂 Project Structure

```text
devpulse-ai/
├── .github/
│   └── workflows/
│       └── ci.yml                   # GitHub Actions CI workflow (Backend, Frontend, Docker)
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── __init__.py          # Routes package initializer
│   │   │   ├── github_auth.py       # OAuth flow: /auth, /callback, /status, /disconnect
│   │   │   ├── github.py            # Read-only data endpoints: repos, commits, PRs, issues, actions, deployments
│   │   │   └── ai.py                # AI review, deployment analysis, and history endpoints
│   │   ├── services/
│   │   │   ├── __init__.py          # Services package initializer
│   │   │   ├── github_service.py    # Read-only GitHub REST API client & error handling
│   │   │   ├── gemini_service.py    # Google Gemini AI prompt generation & inference
│   │   │   └── session_service.py   # In-memory CSRF states and server session store
│   │   ├── database.py              # PostgreSQL engine, sessionmaker, init_db, health test
│   │   ├── models.py                # SQLAlchemy persistence models (connections, AI reviews)
│   │   ├── config.py                # Environment configuration loader
│   │   ├── main.py                  # FastAPI app instance, CORS, & router registration
│   │   └── schemas.py               # Pydantic models for dashboard, GitHub, & AI responses
│   ├── secrets/                     # Local GitHub App RS256 private key (.pem, ignored by git)
│   ├── tests/
│   │   ├── __init__.py              # Tests package initializer
│   │   └── test_smoke.py            # Automated smoke tests for core API endpoints & DB
│   ├── .dockerignore                # Excludes venv, pycache, .env, and secrets from image
│   ├── .env                         # Local environment secrets (IGNORED by git)
│   ├── .env.example                 # Example template for backend environment variables
│   ├── Dockerfile                   # Production Python 3.12-slim FastAPI image with healthcheck
│   ├── requirements.txt             # Backend Python dependencies
│   └── venv/                        # Python virtual environment (ignored in git)
├── frontend/
│   ├── public/                      # Static assets & favicon
│   ├── src/
│   │   ├── components/              # Modular UI components (Dashboard, PRs, Issues, AI, etc.)
│   │   ├── mock/                    # Fallback data structures
│   │   ├── types/                   # TypeScript interfaces matching backend schemas
│   │   ├── App.tsx                  # Main application orchestrator & data fetching
│   │   ├── index.css                # Tailwind CSS directives & global styling
│   │   └── main.tsx                 # React application entry point
│   ├── .dockerignore                # Excludes node_modules and local dist from build context
│   ├── Dockerfile                   # Multi-stage production image (Node 20 build -> Nginx Alpine)
│   ├── nginx.conf                   # Nginx reverse proxy configuration for /api and SPA fallback
│   ├── index.html                   # Main HTML template
│   ├── package.json                 # Frontend dependencies & scripts
│   ├── postcss.config.js            # PostCSS configuration for Tailwind
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   ├── tsconfig.json                # TypeScript configuration
│   └── vite.config.ts               # Vite config with /api proxy to FastAPI
├── .dockerignore                    # Root ignore for docker build context
├── .env.example                     # Root environment template for Docker Compose
├── .gitignore                       # Git ignore rules for Python, Node, and .env files
├── docker-compose.yml               # Multi-container orchestration (postgres, backend, frontend)
└── README.md                        # Project documentation
```

---

## 🔌 API Endpoints Summary

### System Endpoints
- `GET /api/health` — Verifies backend connectivity.
- `GET /api/dashboard` — Returns dashboard summary metrics, repository health, and activity.

### GitHub Authentication
- `GET /api/github/auth` — Generates authorization URL with CSRF state token.
- `GET /api/github/callback` — Handles GitHub OAuth redirect, code exchange, and sets session cookie.
- `GET /api/github/status` — Returns connection status and username without exposing tokens.
- `POST /api/github/disconnect` — Clears local session (purely local, zero GitHub write calls).

### GitHub Read-Only Data (GitHub App)
- `GET /api/github/user` — Authenticated profile.
- `GET /api/github/repos` — List accessible repositories (real GitHub data).
- `GET /api/github/pull-requests` — Live Pull Requests across installed repositories (filtered read-only).
- `GET /api/github/issues` — Live Issues across installed repositories (filtered read-only).
- `GET /api/github/workflow-runs` — Live GitHub Actions workflow runs across installed repositories (filtered read-only).
- `GET /api/github/repos/{owner}/{repo}` — Repository details.
- `GET /api/github/repos/{owner}/{repo}/commits` — Recent commits.
- `GET /api/github/repos/{owner}/{repo}/pulls` — Pull requests.
- `GET /api/github/repos/{owner}/{repo}/issues` — Issues.
- `GET /api/github/repos/{owner}/{repo}/actions/runs` — GitHub Actions CI/CD runs.
- `GET /api/github/repos/{owner}/{repo}/deployments` — Deployment logs.

### AI Engineering Insights (Strictly Read-Only Analysis)
- `GET /api/ai/status` — Checks if Google Gemini AI is configured without exposing keys.
- `POST /api/ai/review-pr` — AI Pull Request review analyzing diffs for bugs, security, quality, performance, and testing.
- `POST /api/ai/analyze-deployment` — AI Deployment Failure analysis diagnosing root causes, failed steps, and fixes.

---

## 🚀 Getting Started Locally

### 1. Start the FastAPI Backend
```powershell
cd d:\prachi\Antigravity-Projects\devpulse-ai\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
- Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Start the React Frontend
```powershell
cd d:\prachi\Antigravity-Projects\devpulse-ai\frontend
npm run dev
```
- Frontend: [http://localhost:5173](http://localhost:5173)

---

## 🐳 Docker Deployment & Orchestration (Step 13)

DevPulse AI includes a production-ready, multi-container Docker configuration orchestrated via Docker Compose.

### Container Architecture

| Service | Technology | Internal Port | Host Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`postgres`** | PostgreSQL 16 Alpine | `5432` | `5432` | Persistent relational storage for connections and AI history |
| **`backend`** | Python 3.12-slim + FastAPI | `8000` | `8000` | REST API, read-only GitHub App client, Gemini AI analysis |
| **`frontend`** | Node 20 build -> Nginx Alpine | `80` | `5173` | Production React SPA with `/api/` reverse proxy |

### Quick Start with Docker Compose

1. **Start all services in detached mode with automatic build:**
   ```bash
   docker compose up --build -d
   ```

2. **Check container status and health:**
   ```bash
   docker compose ps
   ```

3. **Stream logs from all services:**
   ```bash
   docker compose logs -f
   ```
   *(Or for a specific service: `docker compose logs -f backend`)*

4. **Rebuild after code changes:**
   ```bash
   docker compose up --build
   ```

5. **Stop and remove all containers:**
   ```bash
   docker compose down
   ```
   *(To also erase the persistent database volume, use: `docker compose down -v`)*

### Key Security & Architecture Highlights

- **Named Persistent Volume:** PostgreSQL data is saved to `devpulse_postgres_data` (`/var/lib/postgresql/data`), guaranteeing persistent storage across container restarts.
- **Safe Secrets Handling:** GitHub App private keys (`backend/secrets/`) are mounted read-only (`./backend/secrets:/app/secrets:ro`) at runtime and are never baked into image layers. Both `.dockerignore` and `.gitignore` prevent credential leaks.
- **Nginx Reverse Proxy:** Client browsers connect to `http://localhost:5173`. Nginx directly serves the compiled React bundle and proxies all `/api/*` requests internally to `http://backend:8000/api/*`, eliminating CORS hurdles and avoiding exposed hostnames.
- **Healthchecks & Startup Ordering:** Compose uses `depends_on` with `condition: service_healthy` so `backend` waits until PostgreSQL is fully accepting connections (`pg_isready`), and `frontend` waits until FastAPI healthcheck passes (`GET /api/health`).

---

## 🧪 GitHub Actions CI/CD Pipeline (Step 14)

DevPulse AI implements continuous integration via GitHub Actions configured in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Automated Triggers
Every commit pushed or pull request opened targeting default branches (`main`, `master`) automatically triggers three concurrent CI validation jobs:

| Job | Environment | Caching | Automated Validation Performed |
| :--- | :--- | :--- | :--- |
| **`backend`** | Python 3.12 + PostgreSQL 16 Service | `pip` (`requirements.txt`) | • Application import & router initialization<br>• Ephemeral PostgreSQL 16 container provisioning<br>• Automated smoke test suite (`/api/health`, `/api/dashboard`, `/api/github/status`, `/api/ai/status`, `/api/database/status`) |
| **`frontend`** | Node.js 20 (Ubuntu) | `npm` (`package-lock.json`) | • Clean dependency install (`npm ci`)<br>• Strict TypeScript typechecking (`tsc -b`)<br>• Production Vite bundle compilation |
| **`docker`** | Docker Buildx (Ubuntu) | Layer caching | • `docker-compose.yml` schema & service validation<br>• Backend Docker container image build (`python:3.12-slim`)<br>• Frontend multi-stage container image build (`node:20-alpine` $\rightarrow$ `nginx:1.27-alpine`) |

### Security & Compliance Guarantees
- **Strictly Read-Only Access:** The workflow runs under minimal permissions (`permissions: contents: read`).
- **No Secrets Exposure:** The test suite uses synthetic mock tokens for baseline endpoint testing; no production GitHub App private keys, Gemini API keys, or PostgreSQL production credentials are required or exposed.
- **True Database Verification:** Rather than stubbing with SQLite or relying on developer-local databases, CI dynamically runs a native `postgres:16-alpine` service container to guarantee complete psycopg 3 and PostgreSQL 16 compatibility.
- **Zero Write Automation:** CI does NOT push code, create releases, merge PRs, publish Docker images, or mutate remote environments.



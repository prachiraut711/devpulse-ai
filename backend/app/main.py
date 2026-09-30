from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import DashboardResponse, DatabaseStatusResponse
from app.routes.github_auth import router as github_auth_router
from app.routes.github import router as github_router
from app.routes.ai import router as ai_router
from app.database import init_db, check_db_connection

# Initialize the FastAPI application
app = FastAPI(
    title="DevPulse AI API",
    description="Backend API for DevPulse AI - Engineering Operations Platform",
    version="0.1.0",
)

# Startup event: Initialize PostgreSQL tables (Step 12)
@app.on_event("startup")
def on_startup():
    """Initializes PostgreSQL tables if database is available."""
    init_db()

# Configure CORS (Cross-Origin Resource Sharing)
# This allows the React frontend (running on localhost:5173) to communicate with this backend.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(github_auth_router)
app.include_router(github_router)
app.include_router(ai_router)


@app.get("/")
def read_root():
    """Root endpoint welcoming developers to the API."""
    return {
        "name": "DevPulse AI API",
        "version": "0.1.0",
        "docs_url": "/docs",
    }


@app.get("/api/health")
def health_check():
    """
    Health check endpoint.
    Used by frontend and monitoring systems to verify backend connectivity.
    """
    return {
        "status": "ok",
        "message": "DevPulse AI backend is running",
    }


@app.get("/api/database/status", response_model=DatabaseStatusResponse)
def get_database_status():
    """
    Returns PostgreSQL database connectivity and configuration status.
    Passwords and sensitive credentials are fully masked.
    """
    return check_db_connection()


@app.get("/api/dashboard", response_model=DashboardResponse)
def get_dashboard():
    """
    Returns dashboard overview metrics, engineering health,
    recent activity, and AI insights.

    Note: Currently returns structured mock data.
    In upcoming steps, these will be populated from PostgreSQL, GitHub API,
    and Gemini AI log analysis.
    """
    return {
        "summary": {
            "projects": 3,
            "open_pull_requests": 7,
            "deployments": 24,
            "failed_deployments": 2,
        },
        "engineering_health": [
            {
                "id": "proj-1",
                "name": "EventSphere",
                "health_score": 91,
                "status": "Healthy",
                "branch": "main",
            },
            {
                "id": "proj-2",
                "name": "SmartStudyAI",
                "health_score": 84,
                "status": "Stable",
                "branch": "main",
            },
            {
                "id": "proj-3",
                "name": "DevPulse API",
                "health_score": 88,
                "status": "Healthy",
                "branch": "prod",
            },
        ],
        "recent_activity": [
            {
                "id": "act-1",
                "type": "pr_merged",
                "title": "PR #24 merged",
                "description": "feat: add webhook event parser for GitHub hooks",
                "author": "prachi raut",
                "timestamp": "12m ago",
            },
            {
                "id": "act-2",
                "type": "deploy_success",
                "title": "Deployment #18 successful",
                "description": "EventSphere staging cluster deployed to v1.4.2",
                "author": "github-actions",
                "timestamp": "45m ago",
            },
            {
                "id": "act-3",
                "type": "pr_opened",
                "title": "PR #23 opened",
                "description": "fix: resolve memory leak in pipeline worker queue",
                "author": "sarahk",
                "timestamp": "2h ago",
            },
            {
                "id": "act-4",
                "type": "deploy_failed",
                "title": "Deployment #17 failed",
                "description": "DevPulse API rollout failure on production cluster",
                "author": "deploy-bot",
                "timestamp": "5h ago",
            },
        ],
        "ai_insights": [
            {
                "id": "ins-1",
                "title": "2 potential engineering risks detected",
                "description": "PR review turnaround time increased by 35% on SmartStudyAI & 2 deployments experienced rollbacks.",
                "severity": "warning",
            },
            {
                "id": "ins-2",
                "title": "Deployment failures increased during the last 7 days",
                "description": "Failure rate rose from 3.8% to 8.3% following dependency updates across microservices.",
                "severity": "info",
            },
        ],
    }

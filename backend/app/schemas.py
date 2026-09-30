"""
Pydantic schemas for DevPulse AI API endpoints.
Defines data structures and guarantees type validation.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    """High-level metrics for projects, PRs, and deployments."""
    projects: int
    open_pull_requests: int
    deployments: int
    failed_deployments: int


class EngineeringHealthItem(BaseModel):
    """Health metrics for an individual repository/project."""
    id: str
    name: str
    health_score: int
    status: str
    branch: str


class RecentActivityItem(BaseModel):
    """Activity log entry for PRs or deployments."""
    id: str
    type: str  # e.g., 'pr_merged', 'deploy_success', 'pr_opened', 'deploy_failed'
    title: str
    description: str
    author: str
    timestamp: str


class AIInsightItem(BaseModel):
    """AI-derived insight or warning (mock data for now)."""
    id: str
    title: str
    description: str
    severity: str  # 'warning', 'info', or 'critical'


class DashboardResponse(BaseModel):
    """Complete response payload for the GET /api/dashboard endpoint."""
    summary: DashboardSummary
    engineering_health: List[EngineeringHealthItem]
    recent_activity: List[RecentActivityItem]
    ai_insights: List[AIInsightItem]


# -------------------------------------------------------------
# GitHub Integration & Read-Only Schemas (Steps 3 & 4)
# -------------------------------------------------------------

class GitHubConnectedUser(BaseModel):
    """Basic profile of connected user."""
    login: str
    name: Optional[str] = None
    avatar_url: str
    html_url: str


class GitHubAppInfo(BaseModel):
    """Details of the connected GitHub App."""
    app_name: str
    app_id: str
    installation_id: Optional[int] = None
    account: Optional[str] = None
    account_avatar_url: Optional[str] = None
    account_html_url: Optional[str] = None
    repository_selection: Optional[str] = None
    repository_count: int = 0
    selected_repositories: List[str] = []
    permissions: dict = {}


class GitHubStatusResponse(BaseModel):
    """Status indicating whether GitHub is connected to DevPulse."""
    connected: bool
    auth_method: Optional[str] = None  # 'github_app', 'oauth', 'env_token'
    user: Optional[GitHubConnectedUser] = None
    app_info: Optional[GitHubAppInfo] = None
    message: str



class GitHubAuthUrlResponse(BaseModel):
    """OAuth URL and CSRF state for initiating GitHub connection."""
    auth_url: str
    state: str


class GitHubDisconnectResponse(BaseModel):
    """Confirmation that local session data has been removed."""
    success: bool
    message: str


class GitHubUserResponse(BaseModel):
    """Filtered user profile returned from GitHub API."""
    login: str
    name: Optional[str] = None
    avatar_url: str
    html_url: str
    bio: Optional[str] = None
    public_repos: int = 0
    followers: int = 0
    following: int = 0


class GitHubRepoResponse(BaseModel):
    """Filtered repository information needed by DevPulse AI."""
    name: str
    full_name: str
    description: Optional[str] = None
    private: bool
    html_url: str
    language: Optional[str] = None
    default_branch: str
    stars: int = 0
    forks: int = 0
    open_issues_count: Optional[int] = 0
    updated_at: Optional[str] = None


class GitHubCommitResponse(BaseModel):
    """Filtered commit information (read-only)."""
    sha: str
    short_sha: str
    message: str
    author_name: str
    author_avatar: Optional[str] = None
    date: str
    html_url: str


class GitHubPullRequestResponse(BaseModel):
    """Filtered pull request information (read-only)."""
    id: int
    number: int
    title: str
    state: str  # 'open', 'closed'
    created_at: str
    updated_at: str
    merged_at: Optional[str] = None
    user_login: str
    user_avatar: str
    html_url: str
    draft: bool = False
    head_branch: str
    base_branch: str


class GitHubPullRequestDetail(BaseModel):
    """
    Detailed, read-only pull request analytics model across repositories.
    Conforms to Step 8 specifications: zero mutation/write operations, safe null handling.
    """
    id: int
    number: int
    title: str
    state: str  # 'open', 'closed', 'merged', 'draft'
    draft: bool = False
    repository_name: str
    repository_full_name: str
    author_username: str
    author_avatar_url: Optional[str] = None
    html_url: str
    created_at: str
    updated_at: str
    closed_at: Optional[str] = None
    merged_at: Optional[str] = None
    head_branch: Optional[str] = None
    base_branch: Optional[str] = None
    comments_count: Optional[int] = 0
    review_comments_count: Optional[int] = 0
    commits_count: Optional[int] = 0
    changed_files_count: Optional[int] = None
    additions: Optional[int] = None
    deletions: Optional[int] = None


class GitHubIssueResponse(BaseModel):
    """Filtered issue information (read-only)."""
    id: int
    number: int
    title: str
    state: str  # 'open', 'closed'
    created_at: str
    updated_at: str
    user_login: str
    user_avatar: str
    html_url: str
    comments_count: int = 0
    labels: List[str] = []


class GitHubIssueDetail(BaseModel):
    """
    Detailed, read-only issue analytics model across repositories.
    Conforms to Step 9 specifications: excludes PRs, zero mutations, safe null handling.
    """
    id: int
    number: int
    title: str
    state: str  # 'open', 'closed'
    repository_name: str
    repository_full_name: str
    author_username: str
    author_avatar_url: Optional[str] = None
    html_url: str
    created_at: str
    updated_at: str
    closed_at: Optional[str] = None
    comments_count: int = 0
    labels: List[str] = []
    milestone: Optional[str] = None
    assignee_username: Optional[str] = None


class GitHubWorkflowRunResponse(BaseModel):
    """Filtered GitHub Actions workflow run information (read-only)."""
    id: int
    name: str
    status: str  # e.g., 'completed', 'in_progress', 'queued'
    conclusion: Optional[str] = None  # e.g., 'success', 'failure', 'cancelled'
    event: str
    branch: str
    commit_sha: str
    created_at: str
    updated_at: str
    html_url: str
    actor_login: str
    actor_avatar: str


class GitHubDeploymentResponse(BaseModel):
    """Filtered deployment information (read-only)."""
    id: int
    environment: str
    state: Optional[str] = None
    created_at: str
    updated_at: str
    creator_login: str
    creator_avatar: str
    description: Optional[str] = None
    ref: str
    task: str


# -------------------------------------------------------------
# AI Pull Request Review Schemas (Step 10)
# -------------------------------------------------------------

class AIReviewPRRequest(BaseModel):
    """
    Request payload for AI Pull Request review.
    Specifies target repository and PR number.
    Strictly read-only downstream operations.
    """
    repository: str
    pull_request_number: int


class AIReviewResult(BaseModel):
    """
    Structured AI code review result.
    Advisory engineering insights generated via Gemini.
    Zero GitHub mutations.
    """
    repository: str
    pull_request_number: int
    title: Optional[str] = None
    author: Optional[str] = None
    summary: str
    risk_level: str  # 'Low', 'Medium', 'High'
    potential_bugs: List[str] = []
    security_concerns: List[str] = []
    code_quality: List[str] = []
    performance: List[str] = []
    testing_recommendations: List[str] = []
    recommendations: List[str] = []
    files_analyzed_count: int = 0
    is_truncated: bool = False
    truncation_reason: Optional[str] = None
    model_used: Optional[str] = None
    disclaimer: str = (
        "AI-generated analysis. AI analysis is advisory and may contain mistakes. "
        "Review the actual code and test results before making engineering decisions."
    )


class GitHubWorkflowRunDetail(BaseModel):
    """
    Detailed, read-only GitHub Actions workflow run analytics model across repositories.
    Conforms to Step 11 specifications: zero mutations, safe null handling.
    """
    id: int
    name: str
    run_number: int
    repository_name: str
    repository_full_name: str
    status: str  # e.g., 'completed', 'in_progress', 'queued'
    conclusion: Optional[str] = None  # e.g., 'success', 'failure', 'cancelled', 'timed_out', 'action_required'
    branch: str
    commit_sha: str
    commit_message: Optional[str] = None
    event: str
    html_url: str
    created_at: str
    updated_at: str
    run_duration_seconds: Optional[int] = None
    actor_username: str
    actor_avatar_url: Optional[str] = None


# -------------------------------------------------------------
# AI Deployment Failure Analyzer Schemas (Step 11)
# -------------------------------------------------------------

class AIAnalyzeDeploymentRequest(BaseModel):
    """
    Request payload for AI deployment / workflow failure analysis.
    Specifies target repository and workflow run ID.
    Strictly read-only downstream operations.
    """
    repository: str
    run_id: int


class FailureAnalysisResult(BaseModel):
    """
    Structured AI deployment failure analysis result.
    Advisory engineering insights generated via Gemini.
    Zero GitHub mutations.
    """
    repository: str
    run_id: int
    workflow_name: Optional[str] = None
    branch: Optional[str] = None
    status: Optional[str] = None
    conclusion: Optional[str] = None
    summary: str
    likely_cause: str
    evidence: List[str] = []
    suggested_checks: List[str] = []
    possible_fixes: List[str] = []
    confidence: str  # 'Low', 'Medium', 'High'
    failed_jobs_count: int = 0
    has_detailed_logs: bool = False
    model_used: Optional[str] = None
    disclaimer: str = (
        "AI-generated analysis. This is advisory and may be incorrect. "
        "Verify the actual workflow logs and code before making changes."
    )


# -------------------------------------------------------------
# Database History & Status Schemas (Step 12)
# -------------------------------------------------------------

class AIReviewHistoryResponse(BaseModel):
    """
    Response model for historical AI pull request review records retrieved from PostgreSQL.
    """
    id: int
    repository: str
    pull_request_number: int
    pull_request_title: Optional[str] = None
    pull_request_author: Optional[str] = None
    review_result: Dict[str, Any]
    created_at: str


class DeploymentAnalysisHistoryResponse(BaseModel):
    """
    Response model for historical AI deployment failure analyses retrieved from PostgreSQL.
    """
    id: int
    repository: str
    workflow_run_id: int
    workflow_name: Optional[str] = None
    branch: Optional[str] = None
    conclusion: Optional[str] = None
    analysis_result: Dict[str, Any]
    created_at: str


class DatabaseStatusResponse(BaseModel):
    """
    Database connection and configuration health check response.
    Never exposes passwords or sensitive credentials.
    """
    configured: bool
    connected: bool
    driver: str
    sanitized_url: str
    error: Optional[str] = None
    tables_created: bool = False



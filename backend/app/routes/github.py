"""
DevPulse AI - GitHub Data API Router
Exposes READ-ONLY endpoints for repositories, commits, PRs, issues, workflow runs, and deployments.
STRICT REQUIREMENT: Only GET requests. No mutation or write calls exist.
Integrated with GitHub App ("DevPulse AI Platform") as primary provider.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Request, status
from app.config import settings
from app.schemas import (
    GitHubUserResponse,
    GitHubRepoResponse,
    GitHubCommitResponse,
    GitHubPullRequestResponse,
    GitHubPullRequestDetail,
    GitHubIssueResponse,
    GitHubIssueDetail,
    GitHubWorkflowRunResponse,
    GitHubWorkflowRunDetail,
    GitHubDeploymentResponse,
)
from app.services.session_service import SessionService
from app.services.github_service import (
    GitHubService,
    GitHubServiceError,
)
from app.services.github_app_service import GitHubAppService

router = APIRouter(prefix="/api/github", tags=["GitHub Data (Read-Only)"])


def get_active_token(request: Request) -> str:
    """
    Retrieves the active GitHub access token from the authenticated session
    or from the local environment fallback when GitHub App is not enabled.
    Never exposes the token in HTTP responses.
    """
    # 1. Check for active OAuth session in HTTP-only cookie
    session_id = request.cookies.get("devpulse_session")
    token = SessionService.get_token(session_id)
    if token:
        return token

    # 2. Check for manual environment token fallback in .env
    if settings.GITHUB_ACCESS_TOKEN:
        return settings.GITHUB_ACCESS_TOKEN

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=(
            "GitHub is not connected. Please ensure GitHub App is configured "
            "or set GITHUB_ACCESS_TOKEN in backend/.env."
        ),
    )


# -----------------------------------------------------------------------------
# 1. User & Repositories
# -----------------------------------------------------------------------------

@router.get(
    "/user",
    response_model=GitHubUserResponse,
    summary="[READ-ONLY] Get Authenticated GitHub User / App Account",
    description="Fetches public profile data for the connected GitHub account or GitHub App installation.",
)
async def get_github_user(request: Request):
    """Returns profile for the connected GitHub account."""
    if settings.is_github_app_configured:
        try:
            status_data = await GitHubAppService.get_status_details()
            return GitHubUserResponse(
                login=status_data["account"],
                name=status_data["app_name"],
                avatar_url=status_data["account_avatar_url"],
                html_url=status_data["account_html_url"],
                bio="DevPulse AI Platform Official GitHub App Integration",
                public_repos=status_data["repository_count"],
            )
        except GitHubServiceError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message)

    token = get_active_token(request)
    try:
        user = await GitHubService.get_authenticated_user(token)
        return user
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get(
    "/repos",
    response_model=List[GitHubRepoResponse],
    summary="[READ-ONLY] List Repositories",
    description="Returns filtered repositories accessible to DevPulse AI (4 selected repositories in GitHub App mode).",
)
async def get_github_repositories(
    request: Request,
    per_page: int = Query(30, ge=1, le=100, description="Results per page (max 100)"),
    page: int = Query(1, ge=1, description="Page number"),
):
    """Returns repository list (strictly read-only)."""
    if settings.is_github_app_configured:
        try:
            repos = await GitHubAppService.get_repositories()
            return repos
        except GitHubServiceError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message)

    token = get_active_token(request)
    try:
        repos = await GitHubService.get_user_repositories(
            token, per_page=per_page, page=page
        )
        return repos
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get(
    "/repos/{owner}/{repo}",
    response_model=GitHubRepoResponse,
    summary="[READ-ONLY] Get Repository Details",
    description="Fetches details for a specific repository by owner and name.",
)
async def get_github_repository(owner: str, repo: str, request: Request):
    """Returns details for a single repository."""
    if settings.is_github_app_configured:
        try:
            repo_data = await GitHubAppService.get_repository(owner, repo)
            return repo_data
        except GitHubServiceError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message)

    token = get_active_token(request)
    try:
        repo_data = await GitHubService.get_repository(owner, repo, token)
        return repo_data
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


# -----------------------------------------------------------------------------
# 2. Commits, Pull Requests & Issues
# -----------------------------------------------------------------------------

@router.get(
    "/repos/{owner}/{repo}/commits",
    response_model=List[GitHubCommitResponse],
    summary="[READ-ONLY] List Repository Commits",
    description="Fetches recent commit history for a repository.",
)
async def get_repo_commits(
    owner: str,
    repo: str,
    request: Request,
    per_page: int = Query(15, ge=1, le=50, description="Number of commits to return"),
):
    """Returns recent commits."""
    if settings.is_github_app_configured:
        try:
            commits = await GitHubAppService.get_commits(owner, repo, per_page=per_page)
            return commits
        except GitHubServiceError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message)

    token = get_active_token(request)
    try:
        commits = await GitHubService.get_commits(owner, repo, token, per_page=per_page)
        return commits
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get(
    "/pull-requests",
    response_model=List[GitHubPullRequestDetail],
    summary="[READ-ONLY] List Pull Requests Across Repositories",
    description=(
        "Retrieves real-time Pull Requests across all selected repositories installed for DevPulse AI "
        "(or a specific repository if filtered) using the GitHub App integration. "
        "Strictly read-only. Supports filtering by state ('open', 'closed', 'merged', 'all') "
        "and by repository name."
    ),
)
async def get_all_pull_requests(
    request: Request,
    state: str = Query("all", pattern="^(open|closed|all|merged)$", description="PR state: open, closed, all, or merged"),
    repository: Optional[str] = Query(None, description="Optional repository name or full name filter"),
    per_page: int = Query(30, ge=1, le=50, description="Number of PRs to query per repository"),
):
    """Returns live pull requests across repositories (strictly read-only)."""
    if settings.is_github_app_configured:
        try:
            prs = await GitHubAppService.get_all_pull_requests(
                state=state, repository_filter=repository, per_page=per_page
            )
            return prs
        except GitHubServiceError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message)

    token = get_active_token(request)
    try:
        repos = await GitHubService.get_user_repositories(token, per_page=10)
        all_prs: List[GitHubPullRequestDetail] = []
        for r in repos:
            if repository and (r.name.lower() != repository.lower() and r.full_name.lower() != repository.lower()):
                continue
            owner = r.full_name.split("/")[0] if "/" in r.full_name else ""
            repo_name = r.name
            prs_list = await GitHubService.get_pull_requests(owner, repo_name, token, state=state, per_page=per_page)
            for p in prs_list:
                all_prs.append(
                    GitHubPullRequestDetail(
                        id=p.id,
                        number=p.number,
                        title=p.title,
                        state=p.state,
                        draft=p.draft,
                        repository_name=repo_name,
                        repository_full_name=r.full_name,
                        author_username=p.user_login,
                        author_avatar_url=p.user_avatar,
                        html_url=p.html_url,
                        created_at=p.created_at,
                        updated_at=p.updated_at,
                        merged_at=p.merged_at,
                        head_branch=p.head_branch,
                        base_branch=p.base_branch,
                    )
                )
        return all_prs
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get(
    "/repos/{owner}/{repo}/pulls",
    response_model=List[GitHubPullRequestResponse],
    summary="[READ-ONLY] List Pull Requests",
    description="Fetches pull requests for a repository.",
)
async def get_repo_pull_requests(
    owner: str,
    repo: str,
    request: Request,
    state: str = Query("all", pattern="^(open|closed|all)$", description="PR state: open, closed, or all"),
    per_page: int = Query(15, ge=1, le=50, description="Number of PRs to return"),
):
    """Returns pull requests."""
    if settings.is_github_app_configured:
        try:
            pulls = await GitHubAppService.get_pull_requests(
                owner, repo, state=state, per_page=per_page
            )
            return pulls
        except GitHubServiceError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message)

    token = get_active_token(request)
    try:
        pulls = await GitHubService.get_pull_requests(
            owner, repo, token, state=state, per_page=per_page
        )
        return pulls
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get(
    "/issues",
    response_model=List[GitHubIssueDetail],
    summary="[READ-ONLY] List Issues Across Installed Repositories",
    description=(
        "Retrieves real-time GitHub Issues across all selected repositories installed for DevPulse AI "
        "(or a specific repository if filtered) using the GitHub App integration. "
        "Strictly read-only. Excludes Pull Requests. Supports filtering by state ('open', 'closed', 'all') "
        "and by repository name."
    ),
)
async def get_all_issues(
    request: Request,
    state: str = Query("all", pattern="^(open|closed|all)$", description="Issue state: open, closed, or all"),
    repository: Optional[str] = Query(None, description="Optional repository name or full name filter"),
    per_page: int = Query(30, ge=1, le=50, description="Number of issues to query per repository"),
):
    """Returns live GitHub issues across repositories (strictly read-only, excludes PRs)."""
    if settings.is_github_app_configured:
        try:
            issues = await GitHubAppService.get_all_issues(
                state=state, repository_filter=repository, per_page=per_page
            )
            return issues
        except GitHubServiceError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message)

    token = get_active_token(request)
    try:
        repos = await GitHubService.get_user_repositories(token, per_page=10)
        all_issues: List[GitHubIssueDetail] = []
        for r in repos:
            if repository and (r.name.lower() != repository.lower() and r.full_name.lower() != repository.lower()):
                continue
            owner = r.full_name.split("/")[0] if "/" in r.full_name else ""
            repo_name = r.name
            raw_issues = await GitHubService.get_issues(owner, repo_name, token, state=state, per_page=per_page)
            for iss in raw_issues:
                all_issues.append(
                    GitHubIssueDetail(
                        id=iss.id,
                        number=iss.number,
                        title=iss.title,
                        state=iss.state,
                        repository_name=repo_name,
                        repository_full_name=r.full_name,
                        author_username=iss.user_login,
                        author_avatar_url=iss.user_avatar,
                        html_url=iss.html_url,
                        created_at=iss.created_at,
                        updated_at=iss.updated_at,
                        comments_count=iss.comments_count,
                        labels=iss.labels,
                    )
                )
        return all_issues
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get(
    "/repos/{owner}/{repo}/issues",
    response_model=List[GitHubIssueResponse],
    summary="[READ-ONLY] List Issues",
    description="Fetches issues for a repository (excluding pull requests).",
)
async def get_repo_issues(
    owner: str,
    repo: str,
    request: Request,
    state: str = Query("open", pattern="^(open|closed|all)$", description="Issue state"),
    per_page: int = Query(15, ge=1, le=50, description="Number of issues to return"),
):
    """Returns issues."""
    if settings.is_github_app_configured:
        try:
            issues = await GitHubAppService.get_issues(
                owner, repo, state=state, per_page=per_page
            )
            return issues
        except GitHubServiceError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message)

    token = get_active_token(request)
    try:
        issues = await GitHubService.get_issues(
            owner, repo, token, state=state, per_page=per_page
        )
        return issues
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


# -----------------------------------------------------------------------------
# 3. Actions / Workflow Runs & Deployments
# -----------------------------------------------------------------------------

@router.get(
    "/repos/{owner}/{repo}/actions/runs",
    response_model=List[GitHubWorkflowRunResponse],
    summary="[READ-ONLY] List GitHub Actions Workflow Runs",
    description="Fetches CI/CD workflow pipeline runs for a repository.",
)
async def get_repo_workflow_runs(
    owner: str,
    repo: str,
    request: Request,
    per_page: int = Query(10, ge=1, le=30, description="Number of runs to return"),
):
    """Returns workflow runs."""
    if settings.is_github_app_configured:
        try:
            runs = await GitHubAppService.get_workflow_runs(
                owner, repo, per_page=per_page
            )
            return runs
        except GitHubServiceError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message)

    token = get_active_token(request)
    try:
        runs = await GitHubService.get_workflow_runs(
            owner, repo, token, per_page=per_page
        )
        return runs
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get(
    "/repos/{owner}/{repo}/deployments",
    response_model=List[GitHubDeploymentResponse],
    summary="[READ-ONLY] List Deployments",
    description="Fetches read-only deployment records for a repository.",
)
async def get_repo_deployments(
    owner: str,
    repo: str,
    request: Request,
    per_page: int = Query(10, ge=1, le=30, description="Number of deployments to return"),
):
    """Returns deployments."""
    if settings.is_github_app_configured:
        try:
            deployments = await GitHubAppService.get_deployments(
                owner, repo, per_page=per_page
            )
            return deployments
        except GitHubServiceError as err:
            raise HTTPException(status_code=err.status_code, detail=err.message)

    token = get_active_token(request)
    try:
        deployments = await GitHubService.get_deployments(
            owner, repo, token, per_page=per_page
        )
        return deployments
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get(
    "/workflow-runs",
    response_model=List[GitHubWorkflowRunDetail],
    summary="[READ-ONLY] List GitHub Actions Workflow Runs",
    description="Fetches live GitHub Actions workflow runs across all installed repositories with optional status and repository filtering. Strictly read-only.",
)
async def list_all_workflow_runs(
    status: str = Query("all", description="Filter by status: 'all', 'success', 'failure', 'in_progress'"),
    repository: Optional[str] = Query(None, description="Filter by repository name (e.g., 'coding-questions')"),
    per_page: int = Query(30, ge=1, le=50, description="Max runs to fetch per repository"),
):
    """
    Returns live GitHub Actions workflow runs across installed repositories.
    STRICT READ-ONLY: zero mutations, zero writes.
    """
    try:
        runs = await GitHubAppService.get_all_workflow_runs(
            status_filter=status,
            repository_filter=repository,
            per_page=per_page,
        )
        return runs
    except GitHubServiceError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to fetch workflow runs from GitHub.")


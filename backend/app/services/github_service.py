"""
DevPulse AI - GitHub API Service
Responsible for external HTTP communication with the GitHub REST API.
STRICT REQUIREMENT: All repository and user data endpoints are strictly READ-ONLY (HTTP GET).
DevPulse AI never performs write operations (no code pushes, no PR merges, no mutations).
"""
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings
from app.schemas import (
    GitHubUserResponse,
    GitHubRepoResponse,
    GitHubCommitResponse,
    GitHubPullRequestResponse,
    GitHubIssueResponse,
    GitHubWorkflowRunResponse,
    GitHubDeploymentResponse,
)

GITHUB_API_BASE_URL = "https://api.github.com"
GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_VERSION = "2022-11-28"


class GitHubServiceError(Exception):
    """Base exception for GitHub service errors."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class GitHubAuthError(GitHubServiceError):
    """Raised when GitHub credentials are invalid, expired, or lacking permissions."""
    def __init__(self, message: str = "Invalid or expired GitHub credentials"):
        super().__init__(message, status_code=401)


class GitHubRateLimitError(GitHubServiceError):
    """Raised when GitHub API rate limits are exceeded."""
    def __init__(self, message: str = "GitHub API rate limit exceeded. Please try again later."):
        super().__init__(message, status_code=429)


class GitHubNotFoundError(GitHubServiceError):
    """Raised when the requested GitHub user or repository is not found."""
    def __init__(self, message: str = "Requested GitHub resource was not found"):
        super().__init__(message, status_code=404)


class GitHubService:
    """
    Service class encapsulating GitHub REST API interactions.
    Enforces read-only operations for all data fetching.
    """

    @staticmethod
    def _get_headers(access_token: str) -> Dict[str, str]:
        """Construct standard HTTP headers required by GitHub API."""
        return {
            "Authorization": f"Bearer {access_token.strip()}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": GITHUB_API_VERSION,
            "User-Agent": "DevPulse-AI-Platform-ReadOnly",
        }

    @classmethod
    async def _handle_response(cls, response: httpx.Response) -> Any:
        """Centralized HTTP response and error status handler."""
        if response.status_code == 200:
            return response.json()

        # Handle specific error status codes
        if response.status_code == 401:
            raise GitHubAuthError("Invalid or expired GitHub credentials.")

        if response.status_code == 403:
            # Check for GitHub Rate Limit header or body
            rate_limit_remaining = response.headers.get("x-ratelimit-remaining")
            if rate_limit_remaining == "0":
                raise GitHubRateLimitError("GitHub API rate limit exceeded. Wait until reset.")
            raise GitHubServiceError(
                "Access forbidden by GitHub. Verify token permissions.",
                status_code=403,
            )

        if response.status_code == 404:
            raise GitHubNotFoundError("Requested repository or resource was not found on GitHub.")

        # Any other upstream error
        raise GitHubServiceError(
            f"GitHub API error (HTTP {response.status_code}): {response.text}",
            status_code=response.status_code,
        )

    # -------------------------------------------------------------------------
    # Authentication Token Exchange
    # -------------------------------------------------------------------------

    @classmethod
    async def exchange_code_for_token(cls, code: str, redirect_uri: str) -> str:
        """
        Exchanges an OAuth temporary code for an access token.
        Calls: POST https://github.com/login/oauth/access_token
        """
        payload = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        }
        headers = {
            "Accept": "application/json",
            "User-Agent": "DevPulse-AI-Platform",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(GITHUB_OAUTH_TOKEN_URL, json=payload, headers=headers)
                data = response.json()

                if "error" in data:
                    error_desc = data.get("error_description", data["error"])
                    raise GitHubAuthError(f"GitHub OAuth failed: {error_desc}")

                token = data.get("access_token")
                if not token:
                    raise GitHubAuthError("GitHub did not return an access token.")

                return token
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub OAuth server timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error during GitHub OAuth: {str(exc)}", status_code=502)

    # -------------------------------------------------------------------------
    # READ-ONLY Data Retrieval Methods (HTTP GET ONLY)
    # -------------------------------------------------------------------------

    @classmethod
    async def get_authenticated_user(cls, access_token: str) -> GitHubUserResponse:
        """
        [READ-ONLY] Fetches the authenticated GitHub user profile.
        Calls: GET https://api.github.com/user
        """
        headers = cls._get_headers(access_token)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{GITHUB_API_BASE_URL}/user", headers=headers)
                data = await cls._handle_response(response)

                return GitHubUserResponse(
                    login=data.get("login", ""),
                    name=data.get("name"),
                    avatar_url=data.get("avatar_url", ""),
                    html_url=data.get("html_url", ""),
                    bio=data.get("bio"),
                    public_repos=data.get("public_repos", 0),
                    followers=data.get("followers", 0),
                    following=data.get("following", 0),
                )
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub API timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error while contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_user_repositories(
        cls, access_token: str, per_page: int = 30, page: int = 1
    ) -> List[GitHubRepoResponse]:
        """
        [READ-ONLY] Fetches repositories accessible to the authenticated user.
        Calls: GET https://api.github.com/user/repos
        """
        headers = cls._get_headers(access_token)
        params = {
            "per_page": min(per_page, 100),
            "page": page,
            "sort": "updated",
            "direction": "desc",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{GITHUB_API_BASE_URL}/user/repos", headers=headers, params=params
                )
                data = await cls._handle_response(response)

                repos = []
                for item in data:
                    repos.append(
                        GitHubRepoResponse(
                            name=item.get("name", ""),
                            full_name=item.get("full_name", ""),
                            description=item.get("description"),
                            private=item.get("private", False),
                            html_url=item.get("html_url", ""),
                            language=item.get("language"),
                            default_branch=item.get("default_branch", "main"),
                            stars=item.get("stargazers_count", 0),
                            forks=item.get("forks_count", 0),
                            open_issues_count=item.get("open_issues_count", 0),
                            updated_at=item.get("updated_at"),
                        )
                    )
                return repos
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub API timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error while contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_repository(
        cls, owner: str, repo: str, access_token: str
    ) -> GitHubRepoResponse:
        """
        [READ-ONLY] Fetches details for a specific repository by owner and name.
        Calls: GET https://api.github.com/repos/{owner}/{repo}
        """
        headers = cls._get_headers(access_token)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}", headers=headers
                )
                item = await cls._handle_response(response)

                return GitHubRepoResponse(
                    name=item.get("name", ""),
                    full_name=item.get("full_name", ""),
                    description=item.get("description"),
                    private=item.get("private", False),
                    html_url=item.get("html_url", ""),
                    language=item.get("language"),
                    default_branch=item.get("default_branch", "main"),
                    stars=item.get("stargazers_count", 0),
                    forks=item.get("forks_count", 0),
                    open_issues_count=item.get("open_issues_count", 0),
                    updated_at=item.get("updated_at"),
                )
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub API timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error while contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_commits(
        cls, owner: str, repo: str, access_token: str, per_page: int = 15
    ) -> List[GitHubCommitResponse]:
        """
        [READ-ONLY] Fetches recent commit history for a repository.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/commits
        """
        headers = cls._get_headers(access_token)
        params = {"per_page": min(per_page, 50)}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/commits",
                    headers=headers,
                    params=params,
                )
                data = await cls._handle_response(response)

                commits = []
                for item in data:
                    commit_obj = item.get("commit", {})
                    author_obj = item.get("author") or {}
                    commits.append(
                        GitHubCommitResponse(
                            sha=item.get("sha", ""),
                            short_sha=item.get("sha", "")[:7],
                            message=commit_obj.get("message", "").split("\n")[0],
                            author_name=commit_obj.get("author", {}).get("name", "Unknown"),
                            author_avatar=author_obj.get("avatar_url"),
                            date=commit_obj.get("author", {}).get("date", ""),
                            html_url=item.get("html_url", ""),
                        )
                    )
                return commits
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub API timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error while contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_pull_requests(
        cls, owner: str, repo: str, access_token: str, state: str = "all", per_page: int = 15
    ) -> List[GitHubPullRequestResponse]:
        """
        [READ-ONLY] Fetches pull requests for a repository.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/pulls
        """
        headers = cls._get_headers(access_token)
        params = {"state": state, "per_page": min(per_page, 50), "sort": "updated", "direction": "desc"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/pulls",
                    headers=headers,
                    params=params,
                )
                data = await cls._handle_response(response)

                pulls = []
                for item in data:
                    user_obj = item.get("user") or {}
                    head_obj = item.get("head") or {}
                    base_obj = item.get("base") or {}
                    pulls.append(
                        GitHubPullRequestResponse(
                            id=item.get("id", 0),
                            number=item.get("number", 0),
                            title=item.get("title", ""),
                            state=item.get("state", "open"),
                            created_at=item.get("created_at", ""),
                            updated_at=item.get("updated_at", ""),
                            merged_at=item.get("merged_at"),
                            user_login=user_obj.get("login", "unknown"),
                            user_avatar=user_obj.get("avatar_url", ""),
                            html_url=item.get("html_url", ""),
                            draft=item.get("draft", False),
                            head_branch=head_obj.get("ref", ""),
                            base_branch=base_obj.get("ref", ""),
                        )
                    )
                return pulls
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub API timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error while contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_issues(
        cls, owner: str, repo: str, access_token: str, state: str = "open", per_page: int = 15
    ) -> List[GitHubIssueResponse]:
        """
        [READ-ONLY] Fetches issues for a repository (filtering out pull requests).
        Calls: GET https://api.github.com/repos/{owner}/{repo}/issues
        """
        headers = cls._get_headers(access_token)
        params = {"state": state, "per_page": min(per_page, 50)}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/issues",
                    headers=headers,
                    params=params,
                )
                data = await cls._handle_response(response)

                issues = []
                for item in data:
                    # GitHub API includes pull requests in /issues; filter them out
                    if "pull_request" in item:
                        continue
                    user_obj = item.get("user") or {}
                    labels = [lbl.get("name", "") for lbl in item.get("labels", []) if isinstance(lbl, dict)]
                    issues.append(
                        GitHubIssueResponse(
                            id=item.get("id", 0),
                            number=item.get("number", 0),
                            title=item.get("title", ""),
                            state=item.get("state", "open"),
                            created_at=item.get("created_at", ""),
                            updated_at=item.get("updated_at", ""),
                            user_login=user_obj.get("login", "unknown"),
                            user_avatar=user_obj.get("avatar_url", ""),
                            html_url=item.get("html_url", ""),
                            comments_count=item.get("comments", 0),
                            labels=labels,
                        )
                    )
                return issues
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub API timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error while contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_workflow_runs(
        cls, owner: str, repo: str, access_token: str, per_page: int = 10
    ) -> List[GitHubWorkflowRunResponse]:
        """
        [READ-ONLY] Fetches recent GitHub Actions workflow runs for a repository.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/actions/runs
        """
        headers = cls._get_headers(access_token)
        params = {"per_page": min(per_page, 30)}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/actions/runs",
                    headers=headers,
                    params=params,
                )
                data = await cls._handle_response(response)

                runs = []
                for item in data.get("workflow_runs", []):
                    actor = item.get("actor") or {}
                    runs.append(
                        GitHubWorkflowRunResponse(
                            id=item.get("id", 0),
                            name=item.get("name", "Workflow"),
                            status=item.get("status", "completed"),
                            conclusion=item.get("conclusion"),
                            event=item.get("event", "push"),
                            branch=item.get("head_branch", "main"),
                            commit_sha=item.get("head_sha", "")[:7],
                            created_at=item.get("created_at", ""),
                            updated_at=item.get("updated_at", ""),
                            html_url=item.get("html_url", ""),
                            actor_login=actor.get("login", "unknown"),
                            actor_avatar=actor.get("avatar_url", ""),
                        )
                    )
                return runs
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub API timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error while contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_deployments(
        cls, owner: str, repo: str, access_token: str, per_page: int = 10
    ) -> List[GitHubDeploymentResponse]:
        """
        [READ-ONLY] Fetches recent deployments for a repository.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/deployments
        """
        headers = cls._get_headers(access_token)
        params = {"per_page": min(per_page, 30)}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/deployments",
                    headers=headers,
                    params=params,
                )
                data = await cls._handle_response(response)

                deployments = []
                for item in data:
                    creator = item.get("creator") or {}
                    deployments.append(
                        GitHubDeploymentResponse(
                            id=item.get("id", 0),
                            environment=item.get("environment", "production"),
                            state=item.get("task", "deploy"),
                            created_at=item.get("created_at", ""),
                            updated_at=item.get("updated_at", ""),
                            creator_login=creator.get("login", "unknown"),
                            creator_avatar=creator.get("avatar_url", ""),
                            description=item.get("description"),
                            ref=item.get("ref", "main"),
                            task=item.get("task", "deploy"),
                        )
                    )
                return deployments
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub API timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error while contacting GitHub: {str(exc)}", status_code=502)

"""
DevPulse AI - GitHub App Service (Step 6)
Integrates with the official GitHub App ("DevPulse AI Platform", App ID: 5118991).
Enforces STRICT READ-ONLY access.
Zero write capabilities (no pushes, no commits, no merges, no deletes, no mutations).
Private keys and installation tokens are NEVER exposed or logged.
"""
import time
import asyncio
from typing import List, Dict, Any, Optional
import httpx
import jwt
from app.config import settings
from app.schemas import (
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
from app.services.github_service import (
    GitHubServiceError,
    GitHubAuthError,
    GitHubNotFoundError,
    GitHubRateLimitError,
)

GITHUB_API_BASE_URL = "https://api.github.com"
GITHUB_API_VERSION = "2022-11-28"


class GitHubAppService:
    """
    Manages GitHub App authentication (RS256 JWT) and short-lived installation access tokens.
    Provides read-only access to selected repositories.
    """
    _cached_token: Optional[str] = None
    _cached_token_expires_at: float = 0.0
    _cached_installation: Optional[Dict[str, Any]] = None
    _cached_raw_repos: Optional[Dict[str, Any]] = None
    _cached_repos_expires_at: float = 0.0

    @classmethod
    def generate_jwt(cls) -> str:
        """
        Generates an RS256-signed JWT for GitHub App authentication.
        Valid for 9 minutes (iat is backdated by 60s to handle clock drift).
        Never logs or outputs the private key.
        """
        if not settings.is_github_app_configured:
            raise GitHubAuthError(
                "GitHub App is not configured. Missing App ID or private key file."
            )

        now = int(time.time())
        payload = {
            "iat": now - 60,
            "exp": now + (9 * 60),  # exp - iat = 600s max per GitHub specification
            "iss": str(settings.GITHUB_APP_ID),
        }

        try:
            private_key = settings.get_private_key_bytes()
            return jwt.encode(payload, private_key, algorithm="RS256")
        except Exception as exc:
            raise GitHubAuthError(f"Failed to generate GitHub App JWT: {str(exc)}")

    @classmethod
    def _jwt_headers(cls) -> Dict[str, str]:
        """Headers authenticated with GitHub App JWT."""
        return {
            "Authorization": f"Bearer {cls.generate_jwt()}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": GITHUB_API_VERSION,
            "User-Agent": "DevPulse-AI-Platform-GitHubApp",
        }

    @classmethod
    def _token_headers(cls, token: str) -> Dict[str, str]:
        """Headers authenticated with short-lived Installation Access Token."""
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": GITHUB_API_VERSION,
            "User-Agent": "DevPulse-AI-Platform-GitHubApp",
        }

    @classmethod
    async def get_installations(cls) -> List[Dict[str, Any]]:
        """
        [READ-ONLY] Fetches installations of this GitHub App.
        Calls: GET https://api.github.com/app/installations
        """
        headers = cls._jwt_headers()
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{GITHUB_API_BASE_URL}/app/installations", headers=headers)
                if resp.status_code == 200:
                    return resp.json()
                if resp.status_code == 401:
                    raise GitHubAuthError("GitHub App authentication failed. Check App ID and private key.")
                raise GitHubServiceError(f"GitHub App error ({resp.status_code}): {resp.text}", status_code=resp.status_code)
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_installation_access_token(cls) -> str:
        """
        Obtains or returns cached installation access token.
        Token is cached in-memory and refreshed when close to expiration.
        """
        now = time.time()
        if cls._cached_token and cls._cached_token_expires_at > (now + 60):
            return cls._cached_token

        installations = await cls.get_installations()
        if not installations:
            raise GitHubNotFoundError(
                "No installations found for GitHub App. Please install the App on your GitHub account."
            )

        # Select target installation (prefer prachiraut711 or first available)
        selected_inst = None
        for inst in installations:
            account = inst.get("account", {})
            if account.get("login") == "prachiraut711":
                selected_inst = inst
                break
        if not selected_inst:
            selected_inst = installations[0]

        cls._cached_installation = selected_inst
        installation_id = selected_inst["id"]

        headers = cls._jwt_headers()
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{GITHUB_API_BASE_URL}/app/installations/{installation_id}/access_tokens",
                    headers=headers,
                )
                if resp.status_code != 201:
                    raise GitHubAuthError(f"Failed to create installation access token: {resp.status_code} {resp.text}")

                data = resp.json()
                token = data.get("token")
                if not token:
                    raise GitHubAuthError("GitHub did not return an installation access token.")

                cls._cached_token = token
                cls._cached_token_expires_at = now + 3500  # Default to ~58 minutes
                return token
        except httpx.TimeoutException:
            raise GitHubServiceError("Installation token request timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error during installation token request: {str(exc)}", status_code=502)

    @classmethod
    async def get_status_details(cls) -> Dict[str, Any]:
        """
        Retrieves status summary of the GitHub App installation and repository count.
        Does NOT expose tokens or private keys.
        """
        token = await cls.get_installation_access_token()
        inst = cls._cached_installation or {}
        account = inst.get("account", {})

        # Fetch accessible repositories to count and verify selection
        repos_data = await cls.get_raw_repositories(token)
        total_count = repos_data.get("total_count", 0)
        repo_names = [r.get("full_name") for r in repos_data.get("repositories", [])]

        return {
            "app_name": settings.GITHUB_APP_NAME,
            "app_id": settings.GITHUB_APP_ID,
            "installation_id": inst.get("id"),
            "account": account.get("login", "prachiraut711"),
            "account_avatar_url": account.get("avatar_url", ""),
            "account_html_url": account.get("html_url", ""),
            "repository_selection": inst.get("repository_selection", "selected"),
            "repository_count": total_count,
            "selected_repositories": repo_names,
            "permissions": inst.get("permissions", {
                "actions": "read",
                "contents": "read",
                "deployments": "read",
                "issues": "read",
                "metadata": "read",
                "pull_requests": "read",
            }),
        }

    @classmethod
    async def get_raw_repositories(cls, token: str) -> Dict[str, Any]:
        """
        [READ-ONLY] Calls GET /installation/repositories (cached for 120s)
        """
        now = time.time()
        if cls._cached_raw_repos and cls._cached_repos_expires_at > now:
            return cls._cached_raw_repos

        headers = cls._token_headers(token)
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{GITHUB_API_BASE_URL}/installation/repositories", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    cls._cached_raw_repos = data
                    cls._cached_repos_expires_at = now + 120.0
                    return data
                if resp.status_code == 401:
                    # Token might have expired early, invalidate cache
                    cls._cached_token = None
                    cls._cached_raw_repos = None
                    raise GitHubAuthError("Installation token expired or invalid.")
                if resp.status_code == 403:
                    if resp.headers.get("x-ratelimit-remaining") == "0":
                        raise GitHubRateLimitError()
                    raise GitHubServiceError("Access forbidden to installation repositories.", status_code=403)
                raise GitHubServiceError(f"GitHub API error ({resp.status_code}): {resp.text}", status_code=resp.status_code)
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_repositories(cls) -> List[GitHubRepoResponse]:
        """
        [READ-ONLY] Fetches the 4 selected repositories installed for DevPulse AI.
        """
        token = await cls.get_installation_access_token()
        data = await cls.get_raw_repositories(token)
        items = data.get("repositories", [])

        repos = []
        for item in items:
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

    @classmethod
    async def get_repository(cls, owner: str, repo: str) -> GitHubRepoResponse:
        """
        [READ-ONLY] Fetches metadata for a single repository.
        Calls: GET https://api.github.com/repos/{owner}/{repo}
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return GitHubRepoResponse(
                        name=data.get("name", ""),
                        full_name=data.get("full_name", ""),
                        description=data.get("description"),
                        private=data.get("private", False),
                        html_url=data.get("html_url", ""),
                        language=data.get("language"),
                        default_branch=data.get("default_branch", "main"),
                        stars=data.get("stargazers_count", 0),
                        forks=data.get("forks_count", 0),
                        open_issues_count=data.get("open_issues_count", 0),
                        updated_at=data.get("updated_at"),
                    )
                if resp.status_code == 404:
                    raise GitHubNotFoundError(f"Repository {owner}/{repo} not found in GitHub App installation.")
                raise GitHubServiceError(f"GitHub API error ({resp.status_code}): {resp.text}", status_code=resp.status_code)
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_commits(cls, owner: str, repo: str, per_page: int = 15) -> List[GitHubCommitResponse]:
        """
        [READ-ONLY] Fetches commit history for a repository.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/commits
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)
        params = {"per_page": min(per_page, 50)}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/commits",
                    headers=headers,
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    commits = []
                    for item in data:
                        commit_obj = item.get("commit", {})
                        author_obj = commit_obj.get("author", {})
                        author_user = item.get("author") or {}
                        sha = item.get("sha", "")
                        commits.append(
                            GitHubCommitResponse(
                                sha=sha,
                                short_sha=sha[:7] if sha else "",
                                message=commit_obj.get("message", "").split("\n")[0],
                                author_name=author_obj.get("name", "Unknown"),
                                author_avatar=author_user.get("avatar_url"),
                                date=author_obj.get("date", ""),
                                html_url=item.get("html_url", ""),
                            )
                        )
                    return commits
                if resp.status_code == 404:
                    raise GitHubNotFoundError(f"Commits for {owner}/{repo} not found.")
                raise GitHubServiceError(f"GitHub API error ({resp.status_code}): {resp.text}", status_code=resp.status_code)
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_pull_requests(
        cls, owner: str, repo: str, state: str = "all", per_page: int = 15
    ) -> List[GitHubPullRequestResponse]:
        """
        [READ-ONLY] Fetches pull requests for a repository.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/pulls
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)
        params = {"state": state, "per_page": min(per_page, 50)}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/pulls",
                    headers=headers,
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    pulls = []
                    for item in data:
                        user = item.get("user") or {}
                        head = item.get("head") or {}
                        base = item.get("base") or {}
                        pulls.append(
                            GitHubPullRequestResponse(
                                id=item.get("id", 0),
                                number=item.get("number", 0),
                                title=item.get("title", ""),
                                state=item.get("state", "open"),
                                created_at=item.get("created_at", ""),
                                updated_at=item.get("updated_at", ""),
                                merged_at=item.get("merged_at"),
                                user_login=user.get("login", "unknown"),
                                user_avatar=user.get("avatar_url", ""),
                                html_url=item.get("html_url", ""),
                                draft=item.get("draft", False),
                                head_branch=head.get("ref", ""),
                                base_branch=base.get("ref", ""),
                            )
                        )
                    return pulls
                if resp.status_code == 404:
                    raise GitHubNotFoundError(f"Pull requests for {owner}/{repo} not found.")
                raise GitHubServiceError(f"GitHub API error ({resp.status_code}): {resp.text}", status_code=resp.status_code)
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_all_pull_requests(
        cls,
        state: str = "all",
        repository_filter: Optional[str] = None,
        per_page: int = 30,
    ) -> List[GitHubPullRequestDetail]:
        """
        [READ-ONLY] Fetches pull requests across all selected repositories installed for DevPulse AI
        (or a specific repository if repository_filter is provided).
        STRICT READ-ONLY: zero mutations, zero writes.
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)

        # 1. Fetch installed repositories
        repos_data = await cls.get_raw_repositories(token)
        repo_items = repos_data.get("repositories", [])

        # 2. Filter repositories if specified
        if repository_filter:
            target_filter = repository_filter.strip().lower()
            filtered_repos = [
                r for r in repo_items
                if r.get("name", "").lower() == target_filter
                or r.get("full_name", "").lower() == target_filter
            ]
            if not filtered_repos:
                return []
            target_repos = filtered_repos
        else:
            target_repos = repo_items

        # 3. Determine GitHub state parameter
        # GitHub REST API accepts: 'open', 'closed', 'all'.
        if state == "merged":
            gh_state = "closed"
        elif state in ("open", "closed", "all"):
            gh_state = state
        else:
            gh_state = "all"

        # 4. Concurrently query each repository for its pull requests
        async def fetch_repo_prs(client: httpx.AsyncClient, repo_item: Dict[str, Any]) -> List[Dict[str, Any]]:
            full_name = repo_item.get("full_name")
            if not full_name:
                return []
            try:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{full_name}/pulls",
                    headers=headers,
                    params={"state": gh_state, "per_page": min(per_page, 50)},
                )
                if resp.status_code == 200:
                    raw_pulls = resp.json()
                    for p in raw_pulls:
                        p["_repo_name"] = repo_item.get("name", "")
                        p["_repo_full_name"] = full_name
                    return raw_pulls
                return []
            except Exception:
                return []

        async with httpx.AsyncClient(timeout=12.0) as client:
            tasks = [fetch_repo_prs(client, repo) for repo in target_repos]
            results = await asyncio.gather(*tasks)

        all_raw_prs = [pr for sublist in results for pr in sublist]

        # 5. Filter and map to GitHubPullRequestDetail
        details: List[GitHubPullRequestDetail] = []
        for item in all_raw_prs:
            is_merged = bool(item.get("merged_at"))
            is_draft = bool(item.get("draft", False))
            raw_state = item.get("state", "open")

            # Determine normalized display state
            if is_merged:
                computed_state = "merged"
            elif is_draft and raw_state == "open":
                computed_state = "draft"
            else:
                computed_state = raw_state

            # Apply state filtering
            if state == "open" and raw_state != "open":
                continue
            if state == "closed" and raw_state != "closed":
                continue
            if state == "merged" and not is_merged:
                continue

            user = item.get("user") or {}
            head = item.get("head") or {}
            base = item.get("base") or {}

            details.append(
                GitHubPullRequestDetail(
                    id=item.get("id", 0),
                    number=item.get("number", 0),
                    title=item.get("title", ""),
                    state=computed_state,
                    draft=is_draft,
                    repository_name=item.get("_repo_name") or base.get("repo", {}).get("name", ""),
                    repository_full_name=item.get("_repo_full_name") or base.get("repo", {}).get("full_name", ""),
                    author_username=user.get("login", "unknown"),
                    author_avatar_url=user.get("avatar_url"),
                    html_url=item.get("html_url", ""),
                    created_at=item.get("created_at", ""),
                    updated_at=item.get("updated_at", ""),
                    closed_at=item.get("closed_at"),
                    merged_at=item.get("merged_at"),
                    head_branch=head.get("ref"),
                    base_branch=base.get("ref"),
                    comments_count=item.get("comments", 0),
                    review_comments_count=item.get("review_comments", 0),
                    commits_count=item.get("commits", 0),
                    changed_files_count=item.get("changed_files"),
                    additions=item.get("additions"),
                    deletions=item.get("deletions"),
                )
            )

        # 6. Enrich top PRs with additions/deletions if available
        async def enrich_pr(client: httpx.AsyncClient, pr: GitHubPullRequestDetail):
            if pr.additions is not None:
                return
            try:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{pr.repository_full_name}/pulls/{pr.number}",
                    headers=headers,
                )
                if resp.status_code == 200:
                    d = resp.json()
                    pr.additions = d.get("additions")
                    pr.deletions = d.get("deletions")
                    pr.changed_files_count = d.get("changed_files")
                    pr.commits_count = d.get("commits", pr.commits_count)
                    pr.comments_count = d.get("comments", pr.comments_count)
                    pr.review_comments_count = d.get("review_comments", pr.review_comments_count)
            except Exception:
                pass

        if details:
            async with httpx.AsyncClient(timeout=8.0) as client:
                enrich_tasks = [enrich_pr(client, pr) for pr in details[:10]]
                await asyncio.gather(*enrich_tasks)

        # 7. Sort by updated_at descending
        details.sort(key=lambda x: x.updated_at, reverse=True)
        return details

    @classmethod
    async def resolve_repo_owner_and_name(cls, repository: str) -> tuple[str, str]:
        """
        [READ-ONLY HELPER] Resolves repository into (owner, repo_name) from the installed repositories.
        Supports both 'owner/repo' and 'repo'.
        """
        repo_clean = repository.strip()
        if "/" in repo_clean:
            parts = repo_clean.split("/", 1)
            return parts[0], parts[1]

        token = await cls.get_installation_access_token()
        repos_data = await cls.get_raw_repositories(token)
        for r in repos_data.get("repositories", []):
            if r.get("name", "").lower() == repo_clean.lower():
                owner = (r.get("owner") or {}).get("login", "prachiraut711")
                return owner, r.get("name", repo_clean)

        return "prachiraut711", repo_clean

    @classmethod
    async def get_pull_request_full(cls, owner: str, repo: str, pull_number: int) -> Dict[str, Any]:
        """
        [READ-ONLY] Fetches full metadata for a single pull request.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}
        Zero write capabilities.
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/pulls/{pull_number}",
                    headers=headers,
                )
                if resp.status_code == 200:
                    return resp.json()
                if resp.status_code == 404:
                    raise GitHubNotFoundError(
                        f"Pull Request #{pull_number} not found in repository {owner}/{repo}."
                    )
                if resp.status_code == 403:
                    if resp.headers.get("x-ratelimit-remaining") == "0":
                        raise GitHubRateLimitError()
                    raise GitHubServiceError(
                        f"Access forbidden to pull request #{pull_number}.", status_code=403
                    )
                raise GitHubServiceError(
                    f"GitHub API error ({resp.status_code}): {resp.text}",
                    status_code=resp.status_code,
                )
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_pull_request_files(
        cls, owner: str, repo: str, pull_number: int, per_page: int = 30
    ) -> List[Dict[str, Any]]:
        """
        [READ-ONLY] Fetches list of changed files and diff patches for a pull request.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}/files
        Zero write capabilities.
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/pulls/{pull_number}/files",
                    headers=headers,
                    params={"per_page": min(per_page, 100)},
                )
                if resp.status_code == 200:
                    return resp.json()
                if resp.status_code == 404:
                    raise GitHubNotFoundError(
                        f"Changed files for PR #{pull_number} in {owner}/{repo} not found."
                    )
                if resp.status_code == 403:
                    if resp.headers.get("x-ratelimit-remaining") == "0":
                        raise GitHubRateLimitError()
                    raise GitHubServiceError(
                        f"Access forbidden to pull request files.", status_code=403
                    )
                raise GitHubServiceError(
                    f"GitHub API error ({resp.status_code}): {resp.text}",
                    status_code=resp.status_code,
                )
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_issues(
        cls, owner: str, repo: str, state: str = "open", per_page: int = 15
    ) -> List[GitHubIssueResponse]:
        """
        [READ-ONLY] Fetches issues for a repository (excluding PRs).
        Calls: GET https://api.github.com/repos/{owner}/{repo}/issues
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)
        params = {"state": state, "per_page": min(per_page, 50)}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/issues",
                    headers=headers,
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    issues = []
                    for item in data:
                        # Exclude pull requests returned by GitHub's issues endpoint
                        if "pull_request" in item:
                            continue
                        user = item.get("user") or {}
                        labels = [lbl.get("name", "") for lbl in item.get("labels", []) if isinstance(lbl, dict)]
                        issues.append(
                            GitHubIssueResponse(
                                id=item.get("id", 0),
                                number=item.get("number", 0),
                                title=item.get("title", ""),
                                state=item.get("state", "open"),
                                created_at=item.get("created_at", ""),
                                updated_at=item.get("updated_at", ""),
                                user_login=user.get("login", "unknown"),
                                user_avatar=user.get("avatar_url", ""),
                                html_url=item.get("html_url", ""),
                                comments_count=item.get("comments", 0),
                                labels=labels,
                            )
                        )
                    return issues
                if resp.status_code == 404:
                    raise GitHubNotFoundError(f"Issues for {owner}/{repo} not found.")
                raise GitHubServiceError(f"GitHub API error ({resp.status_code}): {resp.text}", status_code=resp.status_code)
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_all_issues(
        cls,
        state: str = "all",
        repository_filter: Optional[str] = None,
        per_page: int = 30,
    ) -> List[GitHubIssueDetail]:
        """
        [READ-ONLY] Fetches issues across all selected repositories installed for DevPulse AI
        (or a specific repository if repository_filter is provided).
        CRUCIAL: Explicitly excludes pull requests returned by GitHub's issues endpoint.
        STRICT READ-ONLY: zero mutations, zero writes.
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)

        # 1. Fetch installed repositories (cached)
        repos_data = await cls.get_raw_repositories(token)
        repo_items = repos_data.get("repositories", [])

        # 2. Filter repositories if specified
        if repository_filter:
            target_filter = repository_filter.strip().lower()
            filtered_repos = [
                r for r in repo_items
                if r.get("name", "").lower() == target_filter
                or r.get("full_name", "").lower() == target_filter
            ]
            if not filtered_repos:
                return []
            target_repos = filtered_repos
        else:
            target_repos = repo_items

        # 3. Determine GitHub state parameter: 'open', 'closed', 'all'
        gh_state = state if state in ("open", "closed", "all") else "all"

        # 4. Concurrently query each repository for its issues
        async def fetch_repo_issues(client: httpx.AsyncClient, repo_item: Dict[str, Any]) -> List[Dict[str, Any]]:
            full_name = repo_item.get("full_name")
            if not full_name:
                return []
            try:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{full_name}/issues",
                    headers=headers,
                    params={"state": gh_state, "per_page": min(per_page, 50)},
                )
                if resp.status_code == 200:
                    raw_items = resp.json()
                    issues_only = []
                    for item in raw_items:
                        # Exclude pull requests returned by GitHub's issues endpoint
                        if "pull_request" in item:
                            continue
                        item["_repo_name"] = repo_item.get("name", "")
                        item["_repo_full_name"] = full_name
                        issues_only.append(item)
                    return issues_only
                return []
            except Exception:
                return []

        async with httpx.AsyncClient(timeout=12.0) as client:
            tasks = [fetch_repo_issues(client, repo) for repo in target_repos]
            results = await asyncio.gather(*tasks)

        all_raw_issues = [issue for sublist in results for issue in sublist]

        # 5. Map to GitHubIssueDetail
        details: List[GitHubIssueDetail] = []
        for item in all_raw_issues:
            user = item.get("user") or {}
            labels_raw = item.get("labels", [])
            labels = [
                lbl.get("name", "") if isinstance(lbl, dict) else str(lbl)
                for lbl in labels_raw
                if lbl
            ]
            milestone_obj = item.get("milestone")
            milestone_title = milestone_obj.get("title") if isinstance(milestone_obj, dict) else None
            assignee_obj = item.get("assignee")
            assignee_user = assignee_obj.get("login") if isinstance(assignee_obj, dict) else None

            details.append(
                GitHubIssueDetail(
                    id=item.get("id", 0),
                    number=item.get("number", 0),
                    title=item.get("title", ""),
                    state=item.get("state", "open"),
                    repository_name=item.get("_repo_name", ""),
                    repository_full_name=item.get("_repo_full_name", ""),
                    author_username=user.get("login", "unknown"),
                    author_avatar_url=user.get("avatar_url"),
                    html_url=item.get("html_url", ""),
                    created_at=item.get("created_at", ""),
                    updated_at=item.get("updated_at", ""),
                    closed_at=item.get("closed_at"),
                    comments_count=item.get("comments", 0),
                    labels=labels,
                    milestone=milestone_title,
                    assignee_username=assignee_user,
                )
            )

        # 6. Sort by updated_at descending
        details.sort(key=lambda x: x.updated_at, reverse=True)
        return details

    @classmethod
    async def get_workflow_runs(
        cls, owner: str, repo: str, per_page: int = 10
    ) -> List[GitHubWorkflowRunResponse]:
        """
        [READ-ONLY] Fetches GitHub Actions workflow runs for a repository.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/actions/runs
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)
        params = {"per_page": min(per_page, 30)}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/actions/runs",
                    headers=headers,
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    runs_data = data.get("workflow_runs", [])
                    runs = []
                    for item in runs_data:
                        actor = item.get("actor") or {}
                        head_commit = item.get("head_commit") or {}
                        runs.append(
                            GitHubWorkflowRunResponse(
                                id=item.get("id", 0),
                                name=item.get("name", "Workflow"),
                                status=item.get("status", "unknown"),
                                conclusion=item.get("conclusion"),
                                event=item.get("event", "push"),
                                branch=item.get("head_branch", "main"),
                                commit_sha=head_commit.get("id", item.get("head_sha", "")),
                                created_at=item.get("created_at", ""),
                                updated_at=item.get("updated_at", ""),
                                html_url=item.get("html_url", ""),
                                actor_login=actor.get("login", "unknown"),
                                actor_avatar=actor.get("avatar_url", ""),
                            )
                        )
                    return runs
                if resp.status_code == 404:
                    return []
                raise GitHubServiceError(f"GitHub API error ({resp.status_code}): {resp.text}", status_code=resp.status_code)
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_deployments(
        cls, owner: str, repo: str, per_page: int = 10
    ) -> List[GitHubDeploymentResponse]:
        """
        [READ-ONLY] Fetches read-only deployment records for a repository.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/deployments
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)
        params = {"per_page": min(per_page, 30)}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/deployments",
                    headers=headers,
                    params=params,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    deployments = []
                    for item in data:
                        creator = item.get("creator") or {}
                        deployments.append(
                            GitHubDeploymentResponse(
                                id=item.get("id", 0),
                                environment=item.get("environment", "production"),
                                state=None,
                                created_at=item.get("created_at", ""),
                                updated_at=item.get("updated_at", ""),
                                creator_login=creator.get("login", "unknown"),
                                creator_avatar=creator.get("avatar_url", ""),
                                description=item.get("description"),
                                ref=item.get("ref", ""),
                                task=item.get("task", "deploy"),
                            )
                        )
                    return deployments
                if resp.status_code == 404:
                    return []
                raise GitHubServiceError(f"GitHub API error ({resp.status_code}): {resp.text}", status_code=resp.status_code)
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_all_workflow_runs(
        cls,
        status_filter: str = "all",
        repository_filter: Optional[str] = None,
        per_page: int = 30,
    ) -> List[GitHubWorkflowRunDetail]:
        """
        [READ-ONLY] Fetches GitHub Actions workflow runs across all installed repositories
        (or a specific repository if repository_filter is provided).
        STRICT READ-ONLY: zero mutations, zero writes.
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)

        # 1. Fetch installed repositories
        repos_data = await cls.get_raw_repositories(token)
        repo_items = repos_data.get("repositories", [])

        # 2. Filter repositories if specified
        if repository_filter:
            target_filter = repository_filter.strip().lower()
            filtered_repos = [
                r for r in repo_items
                if r.get("name", "").lower() == target_filter
                or r.get("full_name", "").lower() == target_filter
            ]
            if not filtered_repos:
                return []
            target_repos = filtered_repos
        else:
            target_repos = repo_items

        # 3. Concurrently query each repository for its workflow runs
        async def fetch_repo_runs(client: httpx.AsyncClient, repo_item: Dict[str, Any]) -> List[Dict[str, Any]]:
            full_name = repo_item.get("full_name")
            if not full_name:
                return []
            try:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{full_name}/actions/runs",
                    headers=headers,
                    params={"per_page": min(per_page, 50)},
                )
                if resp.status_code == 200:
                    raw_runs = resp.json().get("workflow_runs", [])
                    for run in raw_runs:
                        run["_repo_name"] = repo_item.get("name", "")
                        run["_repo_full_name"] = full_name
                    return raw_runs
                return []
            except Exception:
                return []

        async with httpx.AsyncClient(timeout=12.0) as client:
            tasks = [fetch_repo_runs(client, repo) for repo in target_repos]
            results = await asyncio.gather(*tasks)

        all_raw_runs = [run for sublist in results for run in sublist]

        # 4. Map to GitHubWorkflowRunDetail & filter by status
        details: List[GitHubWorkflowRunDetail] = []
        filter_lower = status_filter.strip().lower()

        for item in all_raw_runs:
            status_val = item.get("status", "unknown")
            conclusion_val = item.get("conclusion")

            # Check status filter
            if filter_lower == "success" and conclusion_val != "success":
                continue
            elif filter_lower == "failure" and conclusion_val not in (
                "failure", "cancelled", "timed_out", "action_required", "startup_failure"
            ):
                continue
            elif filter_lower == "in_progress" and status_val not in (
                "in_progress", "queued", "waiting", "pending"
            ):
                continue

            actor = item.get("actor") or {}
            head_commit = item.get("head_commit") or {}

            # Calculate duration in seconds if timestamps exist
            duration_secs = None
            try:
                created_ts = item.get("run_started_at") or item.get("created_at")
                updated_ts = item.get("updated_at")
                if created_ts and updated_ts and status_val == "completed":
                    from datetime import datetime
                    t_start = datetime.fromisoformat(created_ts.replace("Z", "+00:00"))
                    t_end = datetime.fromisoformat(updated_ts.replace("Z", "+00:00"))
                    duration_secs = max(0, int((t_end - t_start).total_seconds()))
            except Exception:
                pass

            details.append(
                GitHubWorkflowRunDetail(
                    id=item.get("id", 0),
                    name=item.get("name", "Workflow"),
                    run_number=item.get("run_number", 0),
                    repository_name=item.get("_repo_name", ""),
                    repository_full_name=item.get("_repo_full_name", ""),
                    status=status_val,
                    conclusion=conclusion_val,
                    branch=item.get("head_branch", "main"),
                    commit_sha=str(head_commit.get("id", item.get("head_sha", "")))[:7],
                    commit_message=head_commit.get("message", "").split("\n")[0] if head_commit else None,
                    event=item.get("event", "push"),
                    html_url=item.get("html_url", ""),
                    created_at=item.get("created_at", ""),
                    updated_at=item.get("updated_at", ""),
                    run_duration_seconds=duration_secs,
                    actor_username=actor.get("login", "unknown"),
                    actor_avatar_url=actor.get("avatar_url"),
                )
            )

        # 5. Sort by created_at descending
        details.sort(key=lambda x: x.created_at, reverse=True)
        return details

    @classmethod
    async def get_workflow_run_full(cls, owner: str, repo: str, run_id: int) -> Dict[str, Any]:
        """
        [READ-ONLY] Fetches full metadata for a single GitHub Actions workflow run.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}
        Zero write capabilities.
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/actions/runs/{run_id}",
                    headers=headers,
                )
                if resp.status_code == 200:
                    return resp.json()
                if resp.status_code == 404:
                    raise GitHubNotFoundError(
                        f"Workflow run #{run_id} not found in repository {owner}/{repo}."
                    )
                if resp.status_code == 403:
                    if resp.headers.get("x-ratelimit-remaining") == "0":
                        raise GitHubRateLimitError()
                    raise GitHubServiceError(
                        f"Access forbidden to workflow run #{run_id}.", status_code=403
                    )
                raise GitHubServiceError(
                    f"GitHub API error ({resp.status_code}): {resp.text}",
                    status_code=resp.status_code,
                )
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)

    @classmethod
    async def get_workflow_run_jobs(cls, owner: str, repo: str, run_id: int) -> List[Dict[str, Any]]:
        """
        [READ-ONLY] Fetches jobs and steps for a workflow run.
        Calls: GET https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}/jobs
        Zero write capabilities.
        """
        token = await cls.get_installation_access_token()
        headers = cls._token_headers(token)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{GITHUB_API_BASE_URL}/repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
                    headers=headers,
                )
                if resp.status_code == 200:
                    return resp.json().get("jobs", [])
                if resp.status_code == 404:
                    return []
                if resp.status_code == 403:
                    if resp.headers.get("x-ratelimit-remaining") == "0":
                        raise GitHubRateLimitError()
                    raise GitHubServiceError(
                        f"Access forbidden to workflow jobs.", status_code=403
                    )
                raise GitHubServiceError(
                    f"GitHub API error ({resp.status_code}): {resp.text}",
                    status_code=resp.status_code,
                )
        except httpx.TimeoutException:
            raise GitHubServiceError("Connection to GitHub timed out.", status_code=504)
        except httpx.RequestError as exc:
            raise GitHubServiceError(f"Network error contacting GitHub: {str(exc)}", status_code=502)


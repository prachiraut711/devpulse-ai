"""
DevPulse AI - GitHub Authentication Routes
Handles OAuth authorization redirect, code exchange callback, session status, and disconnect.
STRICT REQUIREMENT: Disconnect only clears local session data and never calls GitHub write APIs.
"""
from typing import Optional
from urllib.parse import urlencode
from fastapi import APIRouter, Request, Response, HTTPException, Query, status
from fastapi.responses import RedirectResponse, JSONResponse
from app.config import settings
from app.schemas import (
    GitHubStatusResponse,
    GitHubConnectedUser,
    GitHubAppInfo,
    GitHubAuthUrlResponse,
    GitHubDisconnectResponse,
)
from app.services.session_service import SessionService
from app.services.github_service import GitHubService, GitHubServiceError
from app.services.github_app_service import GitHubAppService

router = APIRouter(prefix="/api/github", tags=["GitHub Authentication"])



@router.get(
    "/auth",
    response_model=GitHubAuthUrlResponse,
    summary="Initiate GitHub OAuth Authorization",
    description="Generates a CSRF-protected GitHub authorization URL for user login.",
)
async def get_github_auth_url(
    auto_redirect: bool = Query(
        False,
        description="If True, directly returns a 307 redirect to GitHub instead of JSON URL.",
    )
):
    """
    Constructs the GitHub OAuth authorization URL with minimum read-only permissions.
    """
    if not settings.is_github_oauth_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and "
                "GITHUB_CLIENT_SECRET in backend/.env to enable OAuth login."
            ),
        )

    # Generate a cryptographically secure CSRF state token
    state = SessionService.create_oauth_state()

    # Query parameters for GitHub OAuth
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": settings.GITHUB_OAUTH_SCOPES,
        "state": state,
        "allow_signup": "true",
    }

    auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"

    if auto_redirect:
        return RedirectResponse(url=auth_url)

    return GitHubAuthUrlResponse(auth_url=auth_url, state=state)


@router.get(
    "/callback",
    summary="GitHub OAuth Callback",
    description="Receives authorization code from GitHub, exchanges it for token, and creates a secure session.",
)
async def github_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
):
    """
    Handles the redirect from GitHub after user authorizes access.
    Validates CSRF state, exchanges code for access token, establishes session, and redirects to frontend.
    """
    # 1. Handle user cancellation or GitHub errors
    if error:
        redirect_err = f"{settings.FRONTEND_URL}/?github_error={error}"
        return RedirectResponse(url=redirect_err)

    if not code or not state:
        redirect_err = f"{settings.FRONTEND_URL}/?github_error=missing_code_or_state"
        return RedirectResponse(url=redirect_err)

    # 2. Verify and consume the CSRF state token
    if not SessionService.verify_and_consume_oauth_state(state):
        redirect_err = f"{settings.FRONTEND_URL}/?github_error=invalid_csrf_state"
        return RedirectResponse(url=redirect_err)

    try:
        # 3. Exchange temporary code for access token (server-to-server POST to GitHub OAuth)
        access_token = await GitHubService.exchange_code_for_token(
            code=code, redirect_uri=settings.GITHUB_REDIRECT_URI
        )

        # 4. Fetch the authenticated user's profile to store in the session
        user_profile = await GitHubService.get_authenticated_user(access_token)

        # 5. Create local server-side session (token never leaves backend)
        session_id = SessionService.create_session(
            access_token=access_token,
            user_data=user_profile.model_dump(),
        )

        # 6. Redirect to frontend with HTTP-only session cookie
        frontend_redirect = f"{settings.FRONTEND_URL}/?github_connected=true"
        response = RedirectResponse(url=frontend_redirect)
        
        # Set HTTP-only, SameSite cookie
        response.set_cookie(
            key="devpulse_session",
            value=session_id,
            httponly=True,
            samesite="lax",
            max_age=60 * 60 * 24 * 7,  # 7 days
            secure=False,  # Set to False for local HTTP development
            path="/",
        )
        return response

    except GitHubServiceError as err:
        redirect_err = f"{settings.FRONTEND_URL}/?github_error={err.message}"
        return RedirectResponse(url=redirect_err)


@router.get(
    "/status",
    response_model=GitHubStatusResponse,
    summary="Get GitHub Connection Status",
    description="Returns whether the current DevPulse session is connected to GitHub without exposing tokens.",
)
async def get_github_status(request: Request):
    """
    Checks GitHub App, active OAuth session, or environment PAT to determine GitHub connection status.
    Never exposes access tokens or private keys.
    """
    # 1. Primary Method: GitHub App (DevPulse AI Platform, App ID: 5118991)
    if settings.is_github_app_configured:
        try:
            app_details = await GitHubAppService.get_status_details()
            return GitHubStatusResponse(
                connected=True,
                auth_method="github_app",
                user=GitHubConnectedUser(
                    login=app_details["account"],
                    name=app_details["app_name"],
                    avatar_url=app_details["account_avatar_url"],
                    html_url=app_details["account_html_url"],
                ),
                app_info=GitHubAppInfo(**app_details),
                message=f"Connected to GitHub App '{app_details['app_name']}' (Read-Only access to {app_details['repository_count']} selected repositories).",
            )
        except Exception as exc:
            return GitHubStatusResponse(
                connected=False,
                auth_method="github_app",
                user=None,
                app_info=None,
                message=f"GitHub App configured but unable to connect: {str(exc)}",
            )

    # 2. Legacy / Fallback: Active OAuth cookie session
    session_id = request.cookies.get("devpulse_session")
    session = SessionService.get_session(session_id)

    if session:
        user_info = session.get("user", {})
        return GitHubStatusResponse(
            connected=True,
            auth_method="oauth",
            user=GitHubConnectedUser(
                login=user_info.get("login", ""),
                name=user_info.get("name"),
                avatar_url=user_info.get("avatar_url", ""),
                html_url=user_info.get("html_url", ""),
            ),
            message="Connected to GitHub via OAuth session.",
        )

    # 3. Developer Testing Fallback: Environment access token
    if settings.GITHUB_ACCESS_TOKEN:
        try:
            user = await GitHubService.get_authenticated_user(settings.GITHUB_ACCESS_TOKEN)
            return GitHubStatusResponse(
                connected=True,
                auth_method="env_token",
                user=GitHubConnectedUser(
                    login=user.login,
                    name=user.name,
                    avatar_url=user.avatar_url,
                    html_url=user.html_url,
                ),
                message="Connected to GitHub via environment access token.",
            )
        except Exception:
            return GitHubStatusResponse(
                connected=False,
                auth_method=None,
                user=None,
                message="Environment token present but failed validation with GitHub.",
            )

    return GitHubStatusResponse(
        connected=False,
        auth_method=None,
        user=None,
        message="GitHub is not connected.",
    )



@router.post(
    "/disconnect",
    response_model=GitHubDisconnectResponse,
    summary="Disconnect GitHub Session",
    description="Clears local DevPulse authentication session. STRICTLY LOCAL: Does NOT call GitHub write APIs.",
)
async def disconnect_github(request: Request, response: Response):
    """
    Disconnects the user by clearing server-side session memory and expiring cookie.
    Guaranteed to NEVER execute any GitHub write/delete/mutation operations.
    """
    session_id = request.cookies.get("devpulse_session")
    if session_id:
        SessionService.destroy_session(session_id)

    # Expire cookie
    response.delete_cookie(key="devpulse_session", path="/")

    return GitHubDisconnectResponse(
        success=True,
        message="Disconnected from GitHub. Local DevPulse session cleared.",
    )

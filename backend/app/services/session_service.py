"""
DevPulse AI - In-Memory Session and CSRF State Service
Safely manages server-side OAuth state tokens and active user sessions.
Never exposes raw access tokens to the frontend client.
"""
import secrets
import time
from typing import Dict, Any, Optional

# Expiration window for OAuth CSRF state (10 minutes)
STATE_EXPIRATION_SECONDS = 600

# Expiration window for user sessions (7 days)
SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7


class SessionService:
    """Manages secure in-memory OAuth CSRF states and backend sessions."""

    # In-memory stores
    _oauth_states: Dict[str, float] = {}
    _sessions: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def create_oauth_state(cls) -> str:
        """
        Generates a cryptographically secure random state parameter for OAuth.
        Protects against Cross-Site Request Forgery (CSRF).
        """
        cls._cleanup_expired_states()
        state = secrets.token_urlsafe(32)
        cls._oauth_states[state] = time.time()
        return state

    @classmethod
    def verify_and_consume_oauth_state(cls, state: str) -> bool:
        """
        Verifies that the incoming state matches an existing non-expired state token,
        then immediately consumes it to prevent replay attacks.
        """
        cls._cleanup_expired_states()
        if not state or state not in cls._oauth_states:
            return False

        created_at = cls._oauth_states.pop(state)
        return (time.time() - created_at) <= STATE_EXPIRATION_SECONDS

    @classmethod
    def create_session(cls, access_token: str, user_data: Dict[str, Any]) -> str:
        """
        Creates a new server-side session mapping a secure session_id to the GitHub token.
        Only the session_id is returned and stored in an HTTP-only cookie.
        """
        session_id = secrets.token_urlsafe(48)
        cls._sessions[session_id] = {
            "access_token": access_token.strip(),
            "user": {
                "login": user_data.get("login", ""),
                "name": user_data.get("name"),
                "avatar_url": user_data.get("avatar_url", ""),
                "html_url": user_data.get("html_url", ""),
            },
            "created_at": time.time(),
        }
        return session_id

    @classmethod
    def get_session(cls, session_id: Optional[str]) -> Optional[Dict[str, Any]]:
        """Retrieves an active session by its ID, checking expiration."""
        if not session_id or session_id not in cls._sessions:
            return None

        session = cls._sessions[session_id]
        if time.time() - session["created_at"] > SESSION_EXPIRATION_SECONDS:
            del cls._sessions[session_id]
            return None

        return session

    @classmethod
    def get_token(cls, session_id: Optional[str]) -> Optional[str]:
        """Retrieves the access token associated with a session ID."""
        session = cls.get_session(session_id)
        if session:
            return session.get("access_token")
        return None

    @classmethod
    def destroy_session(cls, session_id: Optional[str]) -> bool:
        """
        Destroys a local session.
        IMPORTANT: Only modifies local server memory and deletes session data.
        Does NOT invoke any GitHub write APIs.
        """
        if session_id and session_id in cls._sessions:
            del cls._sessions[session_id]
            return True
        return False

    @classmethod
    def _cleanup_expired_states(cls) -> None:
        """Removes expired CSRF states."""
        now = time.time()
        expired = [
            s for s, created in cls._oauth_states.items()
            if now - created > STATE_EXPIRATION_SECONDS
        ]
        for s in expired:
            del cls._oauth_states[s]

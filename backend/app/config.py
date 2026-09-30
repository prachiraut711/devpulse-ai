"""
DevPulse AI - Application Configuration
Loads environment variables from backend/.env safely.
Never hardcodes secrets in code.
"""
from pathlib import Path
import os
from dotenv import load_dotenv

# Locate backend root directory and load .env if present
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)
else:
    load_dotenv()  # Fallback to system env or default search


class Settings:
    """Central configuration for DevPulse AI backend."""
    
    # GitHub App Credentials (Step 6)
    GITHUB_APP_ID: str = os.getenv("GITHUB_APP_ID", "5118991").strip()
    GITHUB_APP_NAME: str = "DevPulse AI Platform"
    GITHUB_APP_PRIVATE_KEY_PATH: str = os.getenv(
        "GITHUB_APP_PRIVATE_KEY_PATH", "secrets/devpulse-ai.private-key.pem"
    ).strip()

    # GitHub OAuth Settings (Legacy / Fallback)
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "").strip()
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
    GITHUB_ACCESS_TOKEN: str = os.getenv("GITHUB_ACCESS_TOKEN", "").strip()
    
    GITHUB_REDIRECT_URI: str = os.getenv(
        "GITHUB_REDIRECT_URI", "http://localhost:8000/api/github/callback"
    ).strip()
    
    GITHUB_OAUTH_SCOPES: str = os.getenv("GITHUB_OAUTH_SCOPES", "read:user repo").strip()
    
    # Frontend URL for post-OAuth redirect
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()
    
    # Gemini AI Configuration (Step 10 - AI Pull Request Reviewer)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

    # PostgreSQL Database Configuration (Step 12)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://username:password@localhost:5432/devpulse",
    ).strip()

    # App Settings
    APP_ENV: str = os.getenv("APP_ENV", "development").strip()
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    @property
    def is_gemini_configured(self) -> bool:
        """Returns True if a non-empty Gemini API key is configured."""
        return bool(self.GEMINI_API_KEY)

    @property
    def is_database_configured(self) -> bool:
        """Returns True if a non-empty database URL is configured."""
        return bool(self.DATABASE_URL)

    @property
    def private_key_file_path(self) -> Path:
        """Resolves the absolute path to the GitHub App private key."""
        path = Path(self.GITHUB_APP_PRIVATE_KEY_PATH)
        if not path.is_absolute():
            path = BASE_DIR / path
        return path

    @property
    def is_github_app_configured(self) -> bool:
        """Returns True if GitHub App ID is set and the private key file exists."""
        return bool(self.GITHUB_APP_ID and self.private_key_file_path.is_file())

    def get_private_key_bytes(self) -> bytes:
        """
        Safely reads the private key bytes.
        Raises FileNotFoundError if missing. Never logs or outputs the key.
        """
        key_path = self.private_key_file_path
        if not key_path.is_file():
            raise FileNotFoundError(f"GitHub App private key not found at {key_path}")
        return key_path.read_bytes()

    @property
    def is_github_oauth_configured(self) -> bool:
        """Returns True if GitHub OAuth client ID and secret are configured."""
        return bool(self.GITHUB_CLIENT_ID and self.GITHUB_CLIENT_SECRET)

    @property
    def is_github_configured(self) -> bool:
        """Returns True if GitHub App, OAuth credentials, or a PAT are available."""
        return bool(self.is_github_app_configured or self.is_github_oauth_configured or self.GITHUB_ACCESS_TOKEN)



# Global settings singleton
settings = Settings()

"""
DevPulse AI - PostgreSQL Database Configuration & Session Management (Step 12)
Manages SQLAlchemy engine, session maker, declarative base, and connection testing.
IMPORTANT SECURITY RULES:
- Credentials (username/password) are NEVER hardcoded in source.
- Sanitized URLs are used in logs and API status responses (passwords masked).
- Graceful degradation: handles PostgreSQL connection failures without crashing the application.
"""
import logging
from typing import Dict, Any, Optional
from urllib.parse import urlsplit, urlunsplit
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.config import settings

logger = logging.getLogger("devpulse.database")

# Declarative base for SQLAlchemy models
Base = declarative_base()


def sanitize_database_url(url_str: str) -> str:
    """
    Masks credentials in database URL to prevent sensitive password exposure in logs or API responses.
    Example: postgresql+psycopg://user:password@localhost:5432/devpulse -> postgresql+psycopg://user:***@localhost:5432/devpulse
    """
    if not url_str:
        return "not-configured"
    try:
        parts = urlsplit(url_str)
        if parts.password:
            netloc = parts.netloc.replace(f":{parts.password}@", ":***@")
            return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))
        return url_str
    except Exception:
        return "postgresql://***"


# Create SQLAlchemy Engine
# pool_pre_ping=True checks liveness of connections before vending them from the pool
# connect_timeout=3 avoids long TCP connection timeouts when PostgreSQL is offline
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
    connect_args={"connect_timeout": 3},
)

# Session factory for handling transactional scopes safely
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    """
    FastAPI dependency yielding an isolated SQLAlchemy session per request.
    Ensures safe session closing in finally block.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> Dict[str, Any]:
    """
    Tests database connectivity using a lightweight query (SELECT 1).
    Returns sanitized status dictionary.
    Never throws unhandled exceptions; reports exact error message safely.
    """
    sanitized = sanitize_database_url(settings.DATABASE_URL)
    result: Dict[str, Any] = {
        "configured": settings.is_database_configured,
        "connected": False,
        "driver": "psycopg3",
        "sanitized_url": sanitized,
        "error": None,
        "tables_created": False,
    }

    if not settings.is_database_configured:
        result["error"] = "DATABASE_URL is not configured."
        return result

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        result["connected"] = True
    except Exception as exc:
        err_msg = str(exc).strip()
        # Clean common driver noise for clean display
        result["error"] = err_msg
        logger.warning("PostgreSQL connection check failed: %s", err_msg)

    return result


def init_db() -> bool:
    """
    Initializes PostgreSQL tables defined in Base metadata.
    Suitable for local development schema creation.
    Returns True if successful, False if database is offline.
    """
    sanitized = sanitize_database_url(settings.DATABASE_URL)
    logger.info("Initializing PostgreSQL schema at %s...", sanitized)

    try:
        # Import models so Base.metadata knows about all tables
        from app import models  # noqa: F401

        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL database tables verified and created successfully.")
        return True
    except Exception as exc:
        logger.warning(
            "PostgreSQL database is currently unreachable (%s). "
            "DevPulse AI will start with graceful degradation. "
            "Please ensure PostgreSQL is running at %s.",
            str(exc),
            sanitized,
        )
        return False

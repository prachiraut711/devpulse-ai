"""
DevPulse AI - SQLAlchemy Database Models (Step 12)
Defines PostgreSQL persistence models for DevPulse application data.

IMPORTANT SECURITY RULES:
- Never stores GitHub private keys, JWTs, or installation tokens.
- Never stores Gemini API keys.
- Uses JSON columns for structured, portable AI analysis records.
"""
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Boolean,
    DateTime,
    JSON,
    func,
)
from app.database import Base


class PlatformConnection(Base):
    """
    Stores basic DevPulse connection and integration state.
    Strictly metadata: zero private keys, access tokens, or secrets stored.
    """
    __tablename__ = "platform_connections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    auth_type = Column(String(50), nullable=False, default="github_app")  # 'github_app', 'github_oauth'
    account_login = Column(String(100), nullable=False, index=True)       # e.g., 'prachiraut711'
    account_id = Column(String(50), nullable=True)                        # GitHub user or installation ID
    app_name = Column(String(100), nullable=False, default="DevPulse AI Platform")
    app_id = Column(String(50), nullable=False, default="5118991")
    target_type = Column(String(50), nullable=True, default="User")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<PlatformConnection(id={self.id}, account='{self.account_login}', type='{self.auth_type}')>"


class AIReviewHistory(Base):
    """
    Stores historical record of AI-assisted Pull Request code reviews.
    Enables developers to retrieve, audit, and compare prior AI reviews.
    """
    __tablename__ = "ai_review_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    repository = Column(String(255), nullable=False, index=True)
    pull_request_number = Column(Integer, nullable=False, index=True)
    pull_request_title = Column(String(500), nullable=True)
    pull_request_author = Column(String(100), nullable=True)
    review_result = Column(JSON, nullable=False)  # Structured AIReviewResult dictionary
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)

    def __repr__(self) -> str:
        return f"<AIReviewHistory(id={self.id}, repo='{self.repository}', pr={self.pull_request_number})>"


class DeploymentAnalysisHistory(Base):
    """
    Stores historical record of AI-assisted CI/CD deployment failure analyses.
    Enables engineering teams to track recurring root causes and triage patterns.
    """
    __tablename__ = "deployment_analysis_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    repository = Column(String(255), nullable=False, index=True)
    workflow_run_id = Column(BigInteger, nullable=False, index=True)
    workflow_name = Column(String(255), nullable=True)
    branch = Column(String(255), nullable=True)
    conclusion = Column(String(50), nullable=True)
    analysis_result = Column(JSON, nullable=False)  # Structured FailureAnalysisResult dictionary
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)

    def __repr__(self) -> str:
        return f"<DeploymentAnalysisHistory(id={self.id}, repo='{self.repository}', run_id={self.workflow_run_id})>"

"""
DevPulse AI - AI Analysis API Router (Step 10)
Exposes endpoints for AI-powered engineering insights using Google Gemini.
IMPORTANT SECURITY RULES:
- Internal DevPulse POST endpoint only: strictly READ-ONLY GitHub access.
- Zero GitHub write/mutation operations (no PR comments, merges, pushes, or edits).
- Gemini API key is kept securely on the backend and never exposed.
"""
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import AIReviewHistory, DeploymentAnalysisHistory
from app.schemas import (
    AIReviewPRRequest,
    AIReviewResult,
    AIAnalyzeDeploymentRequest,
    FailureAnalysisResult,
    AIReviewHistoryResponse,
    DeploymentAnalysisHistoryResponse,
)
from app.services.ai_service import AIService, AIServiceError
from app.services.github_app_service import GitHubAppService
from app.services.github_service import (
    GitHubNotFoundError,
    GitHubRateLimitError,
    GitHubAuthError,
    GitHubServiceError,
)

logger = logging.getLogger("devpulse.routes.ai")

router = APIRouter(prefix="/api/ai", tags=["AI Engineering Operations"])


@router.get("/status")
async def get_ai_status():
    """
    Returns AI service readiness status.
    Never exposes API keys or internal configuration values.
    """
    return {
        "configured": settings.is_gemini_configured,
        "model": settings.GEMINI_MODEL or "gemini-1.5-flash",
    }


@router.get("/reviews", response_model=List[AIReviewHistoryResponse])
def get_ai_reviews_history(
    repository: Optional[str] = Query(default=None, description="Filter by repository name"),
    limit: int = Query(default=20, ge=1, le=100, description="Max records to retrieve"),
    db: Session = Depends(get_db),
):
    """
    Retrieves historical AI-assisted pull request code reviews saved in PostgreSQL.
    Ordered by most recent first.
    Gracefully returns empty list if database is unreachable.
    """
    try:
        query = db.query(AIReviewHistory)
        if repository:
            repo_clean = repository.strip()
            query = query.filter(
                (AIReviewHistory.repository == repo_clean)
                | (AIReviewHistory.repository.ilike(f"%/{repo_clean}"))
            )
        records = query.order_by(AIReviewHistory.created_at.desc()).limit(limit).all()
        return [
            AIReviewHistoryResponse(
                id=r.id,
                repository=r.repository,
                pull_request_number=r.pull_request_number,
                pull_request_title=r.pull_request_title,
                pull_request_author=r.pull_request_author,
                review_result=r.review_result,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
            for r in records
        ]
    except Exception as exc:
        logger.warning("Could not retrieve AI review history from PostgreSQL: %s", str(exc))
        return []


@router.get("/deployment-analyses", response_model=List[DeploymentAnalysisHistoryResponse])
def get_ai_deployment_analyses_history(
    repository: Optional[str] = Query(default=None, description="Filter by repository name"),
    limit: int = Query(default=20, ge=1, le=100, description="Max records to retrieve"),
    db: Session = Depends(get_db),
):
    """
    Retrieves historical AI deployment failure diagnoses saved in PostgreSQL.
    Ordered by most recent first.
    Gracefully returns empty list if database is unreachable.
    """
    try:
        query = db.query(DeploymentAnalysisHistory)
        if repository:
            repo_clean = repository.strip()
            query = query.filter(
                (DeploymentAnalysisHistory.repository == repo_clean)
                | (DeploymentAnalysisHistory.repository.ilike(f"%/{repo_clean}"))
            )
        records = query.order_by(DeploymentAnalysisHistory.created_at.desc()).limit(limit).all()
        return [
            DeploymentAnalysisHistoryResponse(
                id=r.id,
                repository=r.repository,
                workflow_run_id=r.workflow_run_id,
                workflow_name=r.workflow_name,
                branch=r.branch,
                conclusion=r.conclusion,
                analysis_result=r.analysis_result,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
            for r in records
        ]
    except Exception as exc:
        logger.warning("Could not retrieve AI deployment analysis history from PostgreSQL: %s", str(exc))
        return []


@router.post("/review-pr", response_model=AIReviewResult)
async def review_pull_request(
    payload: AIReviewPRRequest,
    db: Session = Depends(get_db),
):
    """
    [READ-ONLY GITHUB ANALYSIS]
    Analyzes a GitHub Pull Request using Google Gemini AI.
    Downstream operations are STRICTLY READ-ONLY GET requests to GitHub.
    Zero mutations: never creates, modifies, closes, comments, or merges PRs.
    Persists successful reviews to PostgreSQL.
    """
    # 1. Validate Gemini configuration
    if not settings.is_gemini_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Gemini AI is not configured. Please add GEMINI_API_KEY to backend/.env."
            ),
        )

    # 2. Validate input parameters
    repo_input = payload.repository.strip()
    if not repo_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository name is required.",
        )

    if payload.pull_request_number <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pull request number must be a positive integer.",
        )

    # 3. Resolve repository into (owner, repo_name)
    try:
        owner, repo_name = await GitHubAppService.resolve_repo_owner_and_name(repo_input)
    except Exception as exc:
        logger.error("Failed to resolve repository %s: %s", repo_input, str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to resolve repository '{repo_input}'.",
        )

    # 4. Fetch PR metadata from GitHub (READ-ONLY GET)
    try:
        pr_raw = await GitHubAppService.get_pull_request_full(owner, repo_name, payload.pull_request_number)
    except GitHubNotFoundError as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pull Request #{payload.pull_request_number} was not found in repository {owner}/{repo_name}.",
        )
    except GitHubRateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="GitHub API rate limit reached. Please try again later.",
        )
    except (GitHubAuthError, GitHubServiceError) as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub API error retrieving PR: {err.message}",
        )
    except Exception as exc:
        logger.error("Unexpected error retrieving PR #%s: %s", payload.pull_request_number, str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pull request details from GitHub.",
        )

    # 5. Fetch PR changed files and diff patches from GitHub (READ-ONLY GET)
    try:
        files = await GitHubAppService.get_pull_request_files(owner, repo_name, payload.pull_request_number)
    except Exception as exc:
        logger.warning("Could not fetch changed files for PR #%s: %s", payload.pull_request_number, str(exc))
        files = []

    # 6. Extract structured PR metadata for the AI prompt
    user_info = pr_raw.get("user") or {}
    pr_metadata: Dict[str, Any] = {
        "repository": f"{owner}/{repo_name}",
        "number": pr_raw.get("number", payload.pull_request_number),
        "title": pr_raw.get("title", ""),
        "author": user_info.get("login", "unknown"),
        "body": pr_raw.get("body", ""),
        "state": pr_raw.get("state", "open"),
        "additions": pr_raw.get("additions", 0),
        "deletions": pr_raw.get("deletions", 0),
        "changed_files_count": pr_raw.get("changed_files", len(files)),
    }

    # 7. Execute AI review with Gemini
    try:
        review_result = await AIService.review_pull_request(pr_metadata, files)

        # 8. Persist successful review to PostgreSQL (Step 12)
        try:
            result_dict = (
                review_result.model_dump()
                if hasattr(review_result, "model_dump")
                else review_result.dict()
            )
            history_record = AIReviewHistory(
                repository=pr_metadata["repository"],
                pull_request_number=pr_metadata["number"],
                pull_request_title=pr_metadata.get("title") or f"PR #{pr_metadata['number']}",
                pull_request_author=pr_metadata.get("author"),
                review_result=result_dict,
            )
            db.add(history_record)
            db.commit()
            db.refresh(history_record)
            logger.info("Persisted AI review to PostgreSQL (id=%s, pr=#%s)", history_record.id, payload.pull_request_number)
        except Exception as db_exc:
            logger.warning("Could not persist AI review to PostgreSQL: %s", str(db_exc))
            db.rollback()

        return review_result
    except AIServiceError as err:
        raise HTTPException(
            status_code=err.status_code,
            detail=err.message,
        )
    except Exception as exc:
        logger.error("Unhandled error in review_pull_request: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating the AI Pull Request review.",
        )


@router.post("/analyze-deployment", response_model=FailureAnalysisResult)
async def analyze_deployment_failure(
    payload: AIAnalyzeDeploymentRequest,
    db: Session = Depends(get_db),
):
    """
    [READ-ONLY GITHUB ANALYSIS]
    Analyzes a failed GitHub Actions CI/CD workflow run using Google Gemini AI.
    Downstream operations are STRICTLY READ-ONLY GET requests to GitHub.
    Zero mutations: never triggers, reruns, cancels, or modifies workflows.
    Persists successful diagnoses to PostgreSQL.
    """
    # 1. Validate Gemini configuration
    if not settings.is_gemini_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini AI is not configured. Please add GEMINI_API_KEY to backend/.env.",
        )

    # 2. Validate input parameters
    repo_input = payload.repository.strip()
    if not repo_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository name is required.",
        )

    if payload.run_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow run ID must be a positive integer.",
        )

    # 3. Resolve repository into (owner, repo_name)
    try:
        owner, repo_name = await GitHubAppService.resolve_repo_owner_and_name(repo_input)
    except Exception as exc:
        logger.error("Failed to resolve repository %s: %s", repo_input, str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to resolve repository '{repo_input}'.",
        )

    # 4. Fetch workflow run metadata from GitHub (READ-ONLY GET)
    try:
        run_raw = await GitHubAppService.get_workflow_run_full(owner, repo_name, payload.run_id)
    except GitHubNotFoundError as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow run #{payload.run_id} was not found in repository {owner}/{repo_name}.",
        )
    except GitHubRateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="GitHub API rate limit reached. Please try again later.",
        )
    except (GitHubAuthError, GitHubServiceError) as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub API error retrieving workflow run: {err.message}",
        )
    except Exception as exc:
        logger.error("Unexpected error retrieving workflow run #%s: %s", payload.run_id, str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workflow run details from GitHub.",
        )

    # 5. Fetch jobs and steps from GitHub (READ-ONLY GET)
    try:
        jobs = await GitHubAppService.get_workflow_run_jobs(owner, repo_name, payload.run_id)
    except Exception as exc:
        logger.warning("Could not fetch workflow jobs for run #%s: %s", payload.run_id, str(exc))
        jobs = []

    # 6. Extract structured run metadata for the AI prompt
    head_commit = run_raw.get("head_commit") or {}
    run_metadata: Dict[str, Any] = {
        "repository": f"{owner}/{repo_name}",
        "run_id": payload.run_id,
        "name": run_raw.get("name", "Workflow"),
        "branch": run_raw.get("head_branch", "main"),
        "status": run_raw.get("status", "completed"),
        "conclusion": run_raw.get("conclusion", "failure"),
        "event": run_raw.get("event", "push"),
        "commit_message": head_commit.get("message", "") if head_commit else "",
    }

    # 7. Execute AI failure analysis with Gemini
    try:
        analysis_result = await AIService.analyze_deployment_failure(
            run_metadata=run_metadata,
            jobs_data=jobs,
            has_detailed_logs=False,
        )

        # 8. Persist successful diagnosis to PostgreSQL (Step 12)
        try:
            result_dict = (
                analysis_result.model_dump()
                if hasattr(analysis_result, "model_dump")
                else analysis_result.dict()
            )
            history_record = DeploymentAnalysisHistory(
                repository=run_metadata["repository"],
                workflow_run_id=run_metadata["run_id"],
                workflow_name=run_metadata.get("name"),
                branch=run_metadata.get("branch"),
                conclusion=run_metadata.get("conclusion"),
                analysis_result=result_dict,
            )
            db.add(history_record)
            db.commit()
            db.refresh(history_record)
            logger.info("Persisted AI deployment analysis to PostgreSQL (id=%s, run_id=%s)", history_record.id, payload.run_id)
        except Exception as db_exc:
            logger.warning("Could not persist AI deployment analysis to PostgreSQL: %s", str(db_exc))
            db.rollback()

        return analysis_result
    except AIServiceError as err:
        raise HTTPException(
            status_code=err.status_code,
            detail=err.message,
        )
    except Exception as exc:
        logger.error("Unhandled error in analyze_deployment_failure: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating the AI deployment failure analysis.",
        )



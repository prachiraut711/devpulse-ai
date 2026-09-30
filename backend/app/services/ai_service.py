"""
DevPulse AI - AI Review Service (Step 10)
Integrates Google Gemini to analyze Pull Request metadata and code diffs.
STRICTLY READ-ONLY: Never creates, modifies, closes, comments, or merges PRs.
Gemini API key is kept securely on the backend only.
"""
import json
import logging
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types

from app.config import settings
from app.schemas import AIReviewResult, FailureAnalysisResult

logger = logging.getLogger("devpulse.ai_service")

# Safety limits for prompt payload to prevent context overflow & excessive token consumption
MAX_FILES_ANALYZED = 10
MAX_PATCH_CHARS_PER_FILE = 3000
MAX_TOTAL_DIFF_CHARS = 12000


class AIServiceError(Exception):
    """Exception for AI Service operations with user-safe error messages."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AIService:
    """
    AI-powered engineering code reviewer using Google Gemini.
    Provides structured, advisory code reviews for GitHub Pull Requests.
    """

    @classmethod
    def _build_prompt(
        cls,
        pr_metadata: Dict[str, Any],
        files: List[Dict[str, Any]],
        truncated_files: bool,
    ) -> tuple[str, bool]:
        """
        Builds a structured prompt for senior software code review.
        Instructs Gemini to provide advisory engineering analysis.
        """
        repo_name = pr_metadata.get("repository", "unknown")
        pr_number = pr_metadata.get("number", 0)
        title = pr_metadata.get("title", "Untitled PR")
        author = pr_metadata.get("author", "unknown")
        body = pr_metadata.get("body") or "No description provided."
        state = pr_metadata.get("state", "open")
        additions = pr_metadata.get("additions", 0)
        deletions = pr_metadata.get("deletions", 0)

        # Build diff context safely with size limits
        diff_chunks = []
        total_diff_chars = 0
        diff_truncated = False

        for f in files[:MAX_FILES_ANALYZED]:
            fname = f.get("filename", "unknown")
            status = f.get("status", "modified")
            patch = f.get("patch") or ""
            f_add = f.get("additions", 0)
            f_del = f.get("deletions", 0)

            if not patch:
                patch_text = f"[{status} - binary file, deleted, renamed, or diff omitted by GitHub]"
            elif len(patch) > MAX_PATCH_CHARS_PER_FILE:
                patch_text = patch[:MAX_PATCH_CHARS_PER_FILE] + "\n... [diff truncated for length]"
                diff_truncated = True
            else:
                patch_text = patch

            chunk = f"File: {fname} ({status}, +{f_add} -{f_del})\n```\n{patch_text}\n```"
            if total_diff_chars + len(chunk) > MAX_TOTAL_DIFF_CHARS:
                diff_chunks.append("... [Remaining files omitted due to size constraints]")
                diff_truncated = True
                break

            diff_chunks.append(chunk)
            total_diff_chars += len(chunk)

        diff_summary = "\n\n".join(diff_chunks) if diff_chunks else "No file diffs provided in PR."

        prompt = f"""You are DevPulse AI, an expert senior software engineering code reviewer.
Analyze the following GitHub Pull Request and provide an advisory code review.

### PULL REQUEST METADATA
- Repository: {repo_name}
- PR #{pr_number}: {title}
- Author: {author}
- State: {state}
- Additions: +{additions} | Deletions: -{deletions}
- Description:
{body[:1500]}

### CODE CHANGES & DIFFS
{diff_summary}

### REVIEW INSTRUCTIONS
1. Summary: Briefly explain what this Pull Request appears to change.
2. Potential Bugs: Identify possible correctness, logic, null-reference, or runtime issues based on the provided changes.
3. Security Concerns: Identify potential security issues (e.g., injection, secret leakage, auth flaws, missing input validation).
4. Code Quality: Review maintainability, readability, naming conventions, modularity, and error handling.
5. Performance: Identify potential performance bottlenecks, redundant iterations, or inefficient operations.
6. Testing Recommendations: Suggest specific unit/integration test cases that should accompany these changes.
7. Recommendations: Provide actionable, constructive engineering advice.
8. Risk Level: Provide an overall AI assessment of risk ("Low", "Medium", or "High").
   - Low: Minor edits, documentation, simple formatting, trivial bug fixes.
   - Medium: Feature additions, logic modifications, dependency changes.
   - High: Architectural alterations, security-sensitive code, complex concurrency, database/API contracts.

CRITICAL GUIDELINES:
- Distinguish confirmed facts in code from potential issues and suggestions.
- Do NOT claim something is definitely a bug when the provided code is insufficient to prove it. Use cautious, professional language: "Potential issue", "Consider", "This may cause...", "Based on the provided changes...".
- Avoid exaggerated claims.
- Return ONLY a valid JSON object matching the exact schema below.

### REQUIRED JSON SCHEMA:
{{
  "summary": "Clear, concise 2-3 sentence explanation of the PR changes",
  "risk_level": "Low" | "Medium" | "High",
  "potential_bugs": ["Point 1...", "Point 2..."],
  "security_concerns": ["Point 1...", "Point 2..."],
  "code_quality": ["Point 1...", "Point 2..."],
  "performance": ["Point 1...", "Point 2..."],
  "testing_recommendations": ["Point 1...", "Point 2..."],
  "recommendations": ["Point 1...", "Point 2..."]
}}
"""
        is_overall_truncated = truncated_files or diff_truncated
        return prompt, is_overall_truncated

    @classmethod
    async def review_pull_request(
        cls,
        pr_metadata: Dict[str, Any],
        files: List[Dict[str, Any]],
    ) -> AIReviewResult:
        """
        Executes an AI review for a Pull Request via Google Gemini.
        Zero GitHub write operations: operates strictly on retrieved data.
        Returns a validated AIReviewResult.
        """
        if not settings.is_gemini_configured:
            raise AIServiceError(
                "Gemini API key is not configured. Please add GEMINI_API_KEY to backend/.env.",
                status_code=400,
            )

        truncated_files = len(files) > MAX_FILES_ANALYZED
        prompt, is_truncated = cls._build_prompt(pr_metadata, files, truncated_files)

        model_name = settings.GEMINI_MODEL or "gemini-1.5-flash"

        try:
            # Initialize official Google GenAI client (backend only, never leaks key)
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            )

            # Asynchronous call to Gemini API
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )

            if not response.text:
                raise AIServiceError("Gemini returned an empty response. Please try again.", status_code=502)

            # Safely parse JSON response
            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError as jde:
                logger.error("Failed to decode JSON from Gemini: %s", str(jde))
                raise AIServiceError("AI returned an unparseable response format. Please try again.", status_code=502)

            # Validate risk level
            raw_risk = str(data.get("risk_level", "Medium")).strip().capitalize()
            if raw_risk not in ("Low", "Medium", "High"):
                raw_risk = "Medium"

            def ensure_string_list(items: Any) -> List[str]:
                if not isinstance(items, list):
                    return []
                return [str(item).strip() for item in items if str(item).strip()]

            summary = str(data.get("summary", "")).strip() or "No summary provided by AI."

            truncation_reason = None
            if is_truncated:
                truncation_reason = (
                    f"Analyzed {min(len(files), MAX_FILES_ANALYZED)} of {len(files)} files. "
                    "Diffs were truncated to fit safe AI processing limits."
                )

            return AIReviewResult(
                repository=str(pr_metadata.get("repository", "")),
                pull_request_number=int(pr_metadata.get("number", 0)),
                title=pr_metadata.get("title"),
                author=pr_metadata.get("author"),
                summary=summary,
                risk_level=raw_risk,
                potential_bugs=ensure_string_list(data.get("potential_bugs")),
                security_concerns=ensure_string_list(data.get("security_concerns")),
                code_quality=ensure_string_list(data.get("code_quality")),
                performance=ensure_string_list(data.get("performance")),
                testing_recommendations=ensure_string_list(data.get("testing_recommendations")),
                recommendations=ensure_string_list(data.get("recommendations")),
                files_analyzed_count=min(len(files), MAX_FILES_ANALYZED),
                is_truncated=is_truncated,
                truncation_reason=truncation_reason,
                model_used=model_name,
            )

        except AIServiceError:
            raise
        except Exception as exc:
            err_str = str(exc)
            logger.error("Error during Gemini AI PR review: %s", err_str)

            # Sanitize error messages so keys or tracebacks are never exposed
            if "API_KEY_INVALID" in err_str or "api_key not valid" in err_str.lower():
                raise AIServiceError(
                    "Invalid Gemini API key. Please check GEMINI_API_KEY in backend/.env.",
                    status_code=400,
                )
            if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
                raise AIServiceError(
                    "Gemini API rate limit or quota exceeded. Please wait a few moments and try again.",
                    status_code=429,
                )
            if "NOT_FOUND" in err_str or "model" in err_str.lower() and "found" in err_str.lower():
                raise AIServiceError(
                    f"Configured Gemini model '{model_name}' was not found. Please verify GEMINI_MODEL.",
                    status_code=400,
                )

            raise AIServiceError(
                "Failed to analyze Pull Request with AI. Please ensure the backend configuration is correct and try again.",
                status_code=502,
            )

    @classmethod
    async def analyze_deployment_failure(
        cls,
        run_metadata: Dict[str, Any],
        jobs_data: List[Dict[str, Any]],
        has_detailed_logs: bool = False,
    ) -> FailureAnalysisResult:
        """
        Analyzes a failed GitHub Actions workflow run using Google Gemini.
        Zero GitHub write operations: operates strictly on retrieved data.
        Returns a validated FailureAnalysisResult.
        """
        if not settings.is_gemini_configured:
            raise AIServiceError(
                "Gemini API key is not configured. Please add GEMINI_API_KEY to backend/.env.",
                status_code=400,
            )

        repo_name = run_metadata.get("repository", "unknown")
        run_id = run_metadata.get("run_id", 0)
        wf_name = run_metadata.get("name", "Workflow")
        branch = run_metadata.get("branch", "main")
        status_val = run_metadata.get("status", "completed")
        conclusion = run_metadata.get("conclusion", "failure")
        event = run_metadata.get("event", "push")
        commit_msg = run_metadata.get("commit_message", "")

        # Format job and step failures
        failed_jobs = []
        for job in jobs_data:
            j_name = job.get("name", "job")
            j_conclusion = job.get("conclusion")
            j_status = job.get("status")

            failed_steps = [
                f"Step #{s.get('number', '?')}: '{s.get('name', 'step')}' (conclusion: {s.get('conclusion')})"
                for s in job.get("steps", [])
                if s.get("conclusion") in ("failure", "cancelled", "timed_out", "action_required")
            ]

            if j_conclusion in ("failure", "cancelled", "timed_out", "action_required") or failed_steps:
                steps_desc = "; ".join(failed_steps) if failed_steps else "No specific step failure reported"
                failed_jobs.append(f"- Job '{j_name}' ({j_conclusion or j_status}): {steps_desc}")

        failed_jobs_str = "\n".join(failed_jobs) if failed_jobs else "No specific failed jobs or steps reported."
        log_status_note = (
            "Detailed step logs were analyzed."
            if has_detailed_logs
            else "Detailed raw container logs were not available, so this analysis is based on workflow run metadata and step failure records."
        )

        prompt = f"""You are DevPulse AI, an expert DevOps and Site Reliability Engineering assistant.
Analyze the following failed GitHub Actions CI/CD workflow run and explain what happened.

### WORKFLOW RUN METADATA
- Repository: {repo_name}
- Workflow Name: {wf_name}
- Run ID: {run_id}
- Branch: {branch}
- Status: {status_val}
- Conclusion: {conclusion}
- Trigger Event: {event}
- Triggering Commit: {commit_msg}
- Log Status: {log_status_note}

### FAILED JOBS & STEPS
{failed_jobs_str}

### ANALYSIS INSTRUCTIONS
1. Summary: Clearly explain what failed during the workflow run.
2. Likely Cause: Identify the most likely root cause based ONLY on the supplied workflow run information and failed steps.
3. Evidence: Quote or cite short, relevant failure indicators (e.g. failed step names, job conclusions, triggers). Do NOT fabricate error messages.
4. Suggested Checks: Provide actionable things the developer should check (e.g. environment variables, secrets, dependencies, test scripts).
5. Possible Fixes: Give reasonable, practical fixes to resolve this CI/CD failure.
6. Confidence: State your confidence level in this assessment ("Low", "Medium", or "High").
   - Low: Sparse information available, multiple ambiguous possibilities.
   - Medium: Specific failed step known (e.g. test step or build step failed), but exact stack trace not provided.
   - High: Obvious error, specific failed command identified with clear trigger context.

CRITICAL GUIDELINES:
- This is an advisory engineering analysis, not guaranteed root-cause identification.
- If the information provided is insufficient to pinpoint the exact failure line, explicitly acknowledge that.
- Return ONLY a valid JSON object matching the exact schema below.

### REQUIRED JSON SCHEMA:
{{
  "summary": "Clear explanation of what failed during the CI/CD pipeline",
  "likely_cause": "The most probable reason why this step or workflow failed",
  "evidence": ["Evidence point 1...", "Evidence point 2..."],
  "suggested_checks": ["Check 1...", "Check 2..."],
  "possible_fixes": ["Fix 1...", "Fix 2..."],
  "confidence": "Low" | "Medium" | "High"
}}
"""

        model_name = settings.GEMINI_MODEL or "gemini-1.5-flash"

        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            )

            response = await client.aio.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )

            if not response.text:
                raise AIServiceError("Gemini returned an empty response. Please try again.", status_code=502)

            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError as jde:
                logger.error("Failed to decode JSON from Gemini: %s", str(jde))
                raise AIServiceError("AI returned an unparseable response format. Please try again.", status_code=502)

            raw_conf = str(data.get("confidence", "Medium")).strip().capitalize()
            if raw_conf not in ("Low", "Medium", "High"):
                raw_conf = "Medium"

            def ensure_string_list(items: Any) -> List[str]:
                if not isinstance(items, list):
                    return []
                return [str(item).strip() for item in items if str(item).strip()]

            summary = str(data.get("summary", "")).strip() or "No summary provided by AI."
            likely_cause = str(data.get("likely_cause", "")).strip() or "Unable to determine root cause from available metadata."

            return FailureAnalysisResult(
                repository=str(repo_name),
                run_id=int(run_id),
                workflow_name=wf_name,
                branch=branch,
                status=status_val,
                conclusion=conclusion,
                summary=summary,
                likely_cause=likely_cause,
                evidence=ensure_string_list(data.get("evidence")),
                suggested_checks=ensure_string_list(data.get("suggested_checks")),
                possible_fixes=ensure_string_list(data.get("possible_fixes")),
                confidence=raw_conf,
                failed_jobs_count=len(failed_jobs),
                has_detailed_logs=has_detailed_logs,
                model_used=model_name,
            )

        except AIServiceError:
            raise
        except Exception as exc:
            err_str = str(exc)
            logger.error("Error during Gemini AI deployment failure analysis: %s", err_str)

            if "API_KEY_INVALID" in err_str or "api_key not valid" in err_str.lower():
                raise AIServiceError(
                    "Invalid Gemini API key. Please check GEMINI_API_KEY in backend/.env.",
                    status_code=400,
                )
            if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
                raise AIServiceError(
                    "Gemini API rate limit or quota exceeded. Please wait a few moments and try again.",
                    status_code=429,
                )
            if "NOT_FOUND" in err_str or "model" in err_str.lower() and "found" in err_str.lower():
                raise AIServiceError(
                    f"Configured Gemini model '{model_name}' was not found. Please verify GEMINI_MODEL.",
                    status_code=400,
                )

            raise AIServiceError(
                "Failed to analyze deployment failure with AI. Please ensure the backend configuration is correct and try again.",
                status_code=502,
            )


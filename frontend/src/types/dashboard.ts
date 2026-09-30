/**
 * TypeScript type definitions for DevPulse AI Dashboard.
 * These match the FastAPI backend response schemas.
 */

export interface DashboardSummary {
  projects: number
  open_pull_requests: number
  deployments: number
  failed_deployments: number
}

export interface EngineeringHealthItem {
  id: string
  name: string
  health_score: number
  status: string
  branch: string
}

export interface RecentActivityItem {
  id: string
  type: 'pr_merged' | 'deploy_success' | 'pr_opened' | 'deploy_failed' | string
  title: string
  description: string
  author: string
  timestamp: string
}

export interface AIInsightItem {
  id: string
  title: string
  description: string
  severity: 'warning' | 'info' | 'critical' | string
}

export interface DashboardData {
  summary: DashboardSummary
  engineering_health: EngineeringHealthItem[]
  recent_activity: RecentActivityItem[]
  ai_insights: AIInsightItem[]
}

export interface BackendHealthResponse {
  status: string
  message: string
}

// -------------------------------------------------------------
// GitHub Integration Types (Steps 3 & 4)
// -------------------------------------------------------------

export interface GitHubConnectedUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

export interface GitHubAppInfo {
  app_name: string
  app_id: string
  installation_id?: number | null
  account?: string | null
  account_avatar_url?: string | null
  account_html_url?: string | null
  repository_selection?: string | null
  repository_count: number
  selected_repositories: string[]
  permissions: Record<string, string>
}

export interface GitHubStatusResponse {
  connected: boolean
  auth_method: 'github_app' | 'oauth' | 'env_token' | null
  user: GitHubConnectedUser | null
  app_info?: GitHubAppInfo | null
  message: string
}


export interface GitHubRepoItem {
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  language: string | null
  default_branch: string
  stars: number
  forks: number
  open_issues_count?: number
  updated_at?: string | null
}

export interface GitHubPullRequestDetail {
  id: number
  number: number
  title: string
  state: 'open' | 'closed' | 'merged' | 'draft' | string
  draft: boolean
  repository_name: string
  repository_full_name: string
  author_username: string
  author_avatar_url: string | null
  html_url: string
  created_at: string
  updated_at: string
  closed_at: string | null
  merged_at: string | null
  head_branch?: string | null
  base_branch?: string | null
  comments_count?: number | null
  review_comments_count?: number | null
  commits_count?: number | null
  changed_files_count?: number | null
  additions?: number | null
  deletions?: number | null
}

export interface GitHubIssueDetail {
  id: number
  number: number
  title: string
  state: 'open' | 'closed' | string
  repository_name: string
  repository_full_name: string
  author_username: string
  author_avatar_url: string | null
  html_url: string
  created_at: string
  updated_at: string
  closed_at: string | null
  comments_count: number
  labels: string[]
  milestone?: string | null
  assignee_username?: string | null
}

export interface AIReviewPRRequest {
  repository: string
  pull_request_number: number
}

export interface AIReviewResult {
  repository: string
  pull_request_number: number
  title?: string | null
  author?: string | null
  summary: string
  risk_level: 'Low' | 'Medium' | 'High' | string
  potential_bugs: string[]
  security_concerns: string[]
  code_quality: string[]
  performance: string[]
  testing_recommendations: string[]
  recommendations: string[]
  files_analyzed_count: number
  is_truncated: boolean
  truncation_reason?: string | null
  model_used?: string | null
  disclaimer: string
}

export interface GitHubWorkflowRunDetail {
  id: number
  name: string
  run_number: number
  repository_name: string
  repository_full_name: string
  status: string // 'completed', 'in_progress', 'queued'
  conclusion: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | string | null
  branch: string
  commit_sha: string
  commit_message?: string | null
  event: string
  html_url: string
  created_at: string
  updated_at: string
  run_duration_seconds?: number | null
  actor_username: string
  actor_avatar_url: string | null
}

export interface AIAnalyzeDeploymentRequest {
  repository: string
  run_id: number
}

export interface FailureAnalysisResult {
  repository: string
  run_id: number
  workflow_name?: string | null
  branch?: string | null
  status?: string | null
  conclusion?: string | null
  summary: string
  likely_cause: string
  evidence: string[]
  suggested_checks: string[]
  possible_fixes: string[]
  confidence: 'Low' | 'Medium' | 'High' | string
  failed_jobs_count: number
  has_detailed_logs: boolean
  model_used?: string | null
  disclaimer: string
}

export interface AIReviewHistoryItem {
  id: number
  repository: string
  pull_request_number: number
  pull_request_title?: string | null
  pull_request_author?: string | null
  review_result: AIReviewResult
  created_at: string
}

export interface AIDeploymentHistoryItem {
  id: number
  repository: string
  workflow_run_id: number
  workflow_name?: string | null
  branch?: string | null
  conclusion?: string | null
  analysis_result: FailureAnalysisResult
  created_at: string
}

export interface DatabaseStatusResponse {
  configured: boolean
  connected: boolean
  driver: string
  sanitized_url: string
  error?: string | null
  tables_created?: boolean
}





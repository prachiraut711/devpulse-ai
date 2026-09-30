import type { DashboardData } from '../types/dashboard'

/**
 * Fallback / reference mock data structure for the DevPulse AI Dashboard.
 * In production or live development, this data is fetched from FastAPI (GET /api/dashboard).
 */
export const defaultDashboardData: DashboardData = {
  summary: {
    projects: 3,
    open_pull_requests: 7,
    deployments: 24,
    failed_deployments: 2,
  },
  engineering_health: [
    {
      id: 'proj-1',
      name: 'EventSphere',
      health_score: 91,
      status: 'Healthy',
      branch: 'main',
    },
    {
      id: 'proj-2',
      name: 'SmartStudyAI',
      health_score: 84,
      status: 'Stable',
      branch: 'main',
    },
    {
      id: 'proj-3',
      name: 'DevPulse API',
      health_score: 88,
      status: 'Healthy',
      branch: 'prod',
    },
  ],
  recent_activity: [
    {
      id: 'act-1',
      type: 'pr_merged',
      title: 'PR #24 merged',
      description: 'feat: add webhook event parser for GitHub hooks',
      author: 'prachi raut',
      timestamp: '12m ago',
    },
    {
      id: 'act-2',
      type: 'deploy_success',
      title: 'Deployment #18 successful',
      description: 'EventSphere staging cluster deployed to v1.4.2',
      author: 'github-actions',
      timestamp: '45m ago',
    },
    {
      id: 'act-3',
      type: 'pr_opened',
      title: 'PR #23 opened',
      description: 'fix: resolve memory leak in pipeline worker queue',
      author: 'sarahk',
      timestamp: '2h ago',
    },
    {
      id: 'act-4',
      type: 'deploy_failed',
      title: 'Deployment #17 failed',
      description: 'DevPulse API rollout failure on production cluster',
      author: 'deploy-bot',
      timestamp: '5h ago',
    },
  ],
  ai_insights: [
    {
      id: 'ins-1',
      title: '2 potential engineering risks detected',
      description: 'PR review turnaround time increased by 35% on SmartStudyAI & 2 deployments experienced rollbacks.',
      severity: 'warning',
    },
    {
      id: 'ins-2',
      title: 'Deployment failures increased during the last 7 days',
      description: 'Failure rate rose from 3.8% to 8.3% following dependency updates across microservices.',
      severity: 'info',
    },
  ],
}

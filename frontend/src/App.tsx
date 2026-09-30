import { useState, useEffect, useCallback } from 'react'
import { Sidebar, type NavItemKey } from './components/Sidebar'
import { Header } from './components/Header'
import { SummaryCards } from './components/SummaryCards'
import { RepositoryList } from './components/RepositoryList'
import { RecentActivity } from './components/RecentActivity'
import { AIInsights } from './components/AIInsights'
import { EngineeringHealth } from './components/EngineeringHealth'
import { PullRequestsView } from './components/PullRequestsView'
import { IssuesView } from './components/IssuesView'
import { DeploymentsView } from './components/DeploymentsView'
import { AIInsightsView } from './components/AIInsightsView'
import { SettingsView } from './components/SettingsView'
import { ComingSoon } from './components/ComingSoon'
import { GitHubModal } from './components/GitHubModal'
import type {
  DashboardData,
  GitHubStatusResponse,
  GitHubRepoItem,
  GitHubPullRequestDetail,
  GitHubIssueDetail,
  GitHubWorkflowRunDetail,
} from './types/dashboard'
import { defaultDashboardData } from './mock/defaultDashboard'
import {
  AlertCircle,
  RefreshCw,
  Layers,
  CheckCircle2,
  X,
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export default function App() {
  const [activeTab, setActiveTab] = useState<NavItemKey>(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') as NavItemKey
    if (tab && ['dashboard', 'projects', 'pull-requests', 'issues', 'deployments', 'ai-insights', 'settings'].includes(tab)) {
      return tab
    }
    return 'dashboard'
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Backend connectivity state (from GET /api/health)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(false)

  // GitHub integration state (from GET /api/github/status)
  const [githubStatus, setGitHubStatus] = useState<GitHubStatusResponse | null>(null)
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false)
  const [githubAlert, setGithubAlert] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // GitHub repositories state (from GET /api/github/repos)
  const [repositories, setRepositories] = useState<GitHubRepoItem[]>([])
  const [isReposLoading, setIsReposLoading] = useState<boolean>(false)
  const [reposError, setReposError] = useState<string | null>(null)

  // GitHub Pull Requests state (from GET /api/github/pull-requests)
  const [pullRequests, setPullRequests] = useState<GitHubPullRequestDetail[]>([])
  const [isPRsLoading, setIsPRsLoading] = useState<boolean>(false)
  const [prsError, setPrsError] = useState<string | null>(null)
  const [prStateFilter, setPrStateFilter] = useState<string>('all')
  const [prRepoFilter, setPrRepoFilter] = useState<string>('all')

  // GitHub Issues state (from GET /api/github/issues)
  const [issues, setIssues] = useState<GitHubIssueDetail[]>([])
  const [isIssuesLoading, setIsIssuesLoading] = useState<boolean>(false)
  const [issuesError, setIssuesError] = useState<string | null>(null)
  const [issueStateFilter, setIssueStateFilter] = useState<string>('all')
  const [issueRepoFilter, setIssueRepoFilter] = useState<string>('all')

  // GitHub Workflow Runs state (from GET /api/github/workflow-runs)
  const [workflowRuns, setWorkflowRuns] = useState<GitHubWorkflowRunDetail[]>([])
  const [isWorkflowsLoading, setIsWorkflowsLoading] = useState<boolean>(false)
  const [workflowsError, setWorkflowsError] = useState<string | null>(null)
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<string>('all')
  const [workflowRepoFilter, setWorkflowRepoFilter] = useState<string>('all')

  // Check backend health endpoint: GET /api/health
  const checkBackendHealth = useCallback(async () => {
    setIsCheckingBackend(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`)
      if (response.ok) {
        setBackendOnline(true)
      } else {
        setBackendOnline(false)
      }
    } catch {
      setBackendOnline(false)
    } finally {
      setIsCheckingBackend(false)
    }
  }, [])

  // Check GitHub integration status: GET /api/github/status
  const checkGitHubStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/github/status`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data: GitHubStatusResponse = await response.json()
        setGitHubStatus(data)
        return data
      }
    } catch {
      // Backend not running or error ignored
    }
    return null
  }, [])

  // Fetch real repositories from GitHub: GET /api/github/repos
  const fetchRepositories = useCallback(async () => {
    setIsReposLoading(true)
    setReposError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/github/repos`, {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          // GitHub not connected
          setRepositories([])
          return
        }
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Unable to load GitHub repositories.')
      }

      const data: GitHubRepoItem[] = await response.json()
      setRepositories(data)
    } catch (err) {
      console.error('Error fetching /api/github/repos:', err)
      setReposError(
        err instanceof Error ? err.message : 'Unable to load GitHub repositories.'
      )
    } finally {
      setIsReposLoading(false)
    }
  }, [])

  // Fetch live Pull Requests across installed repositories: GET /api/github/pull-requests
  const fetchPullRequests = useCallback(
    async (stateFilter = 'all', repoFilter = 'all') => {
      setIsPRsLoading(true)
      setPrsError(null)

      try {
        let url = `${API_BASE_URL}/api/github/pull-requests?state=${encodeURIComponent(stateFilter)}`
        if (repoFilter && repoFilter !== 'all') {
          url += `&repository=${encodeURIComponent(repoFilter)}`
        }

        const response = await fetch(url, { credentials: 'include' })
        if (!response.ok) {
          if (response.status === 401) {
            setPullRequests([])
            return
          }
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.detail || 'Unable to load GitHub pull requests.')
        }

        const data: GitHubPullRequestDetail[] = await response.json()
        setPullRequests(data)
      } catch (err) {
        console.error('Error fetching /api/github/pull-requests:', err)
        setPrsError(
          err instanceof Error ? err.message : 'Unable to load GitHub pull requests.'
        )
      } finally {
        setIsPRsLoading(false)
      }
    },
    []
  )

  // Calculated live Open PR count across connected repositories
  const liveOpenPrCount = pullRequests.filter((pr) => pr.state === 'open').length

  // Fetch live Issues across installed repositories: GET /api/github/issues
  const fetchIssues = useCallback(
    async (stateFilter = 'all', repoFilter = 'all') => {
      setIsIssuesLoading(true)
      setIssuesError(null)

      try {
        let url = `${API_BASE_URL}/api/github/issues?state=${encodeURIComponent(stateFilter)}`
        if (repoFilter && repoFilter !== 'all') {
          url += `&repository=${encodeURIComponent(repoFilter)}`
        }

        const response = await fetch(url, { credentials: 'include' })
        if (!response.ok) {
          if (response.status === 401) {
            setIssues([])
            return
          }
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.detail || 'Unable to load GitHub issues.')
        }

        const data: GitHubIssueDetail[] = await response.json()
        setIssues(data)
      } catch (err) {
        console.error('Error fetching /api/github/issues:', err)
        setIssuesError(
          err instanceof Error ? err.message : 'Unable to load GitHub issues.'
        )
      } finally {
        setIsIssuesLoading(false)
      }
    },
    []
  )

  // Calculated live Open Issue count across connected repositories
  const liveOpenIssueCount = issues.filter((issue) => issue.state === 'open').length

  // Fetch live GitHub Actions workflow runs: GET /api/github/workflow-runs
  const fetchWorkflowRuns = useCallback(
    async (statusFilter = 'all', repoFilter = 'all') => {
      setIsWorkflowsLoading(true)
      setWorkflowsError(null)

      try {
        let url = `${API_BASE_URL}/api/github/workflow-runs?status=${encodeURIComponent(statusFilter)}`
        if (repoFilter && repoFilter !== 'all') {
          url += `&repository=${encodeURIComponent(repoFilter)}`
        }

        const response = await fetch(url, { credentials: 'include' })
        if (!response.ok) {
          if (response.status === 401) {
            setWorkflowRuns([])
            return
          }
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.detail || 'Unable to load GitHub workflow runs.')
        }

        const data: GitHubWorkflowRunDetail[] = await response.json()
        setWorkflowRuns(data)
      } catch (err) {
        console.error('Error fetching /api/github/workflow-runs:', err)
        setWorkflowsError(
          err instanceof Error ? err.message : 'Unable to load GitHub workflow runs.'
        )
      } finally {
        setIsWorkflowsLoading(false)
      }
    },
    []
  )

  // Calculated live workflow run & failure counts across connected repositories
  const liveWorkflowRunCount = workflowRuns.length
  const liveFailedWorkflowRunCount = workflowRuns.filter(
    (r) => r.conclusion === 'failure' || r.conclusion === 'timed_out'
  ).length

  // Fetch dashboard summary data from FastAPI: GET /api/dashboard
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard`)
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data (HTTP ${response.status})`)
      }
      const data: DashboardData = await response.json()
      setDashboardData(data)
    } catch (err) {
      console.error('Error fetching /api/dashboard:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to the DevPulse API server. Ensure the backend is running.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Trigger repositories, pull requests, issues & workflow runs fetch whenever GitHub connection status changes
  useEffect(() => {
    if (githubStatus?.connected) {
      fetchRepositories()
      fetchPullRequests(prStateFilter, prRepoFilter)
      fetchIssues(issueStateFilter, issueRepoFilter)
      fetchWorkflowRuns(workflowStatusFilter, workflowRepoFilter)
    } else {
      setRepositories([])
      setPullRequests([])
      setIssues([])
      setWorkflowRuns([])
    }
  }, [
    githubStatus?.connected,
    fetchRepositories,
    fetchPullRequests,
    fetchIssues,
    fetchWorkflowRuns,
    prStateFilter,
    prRepoFilter,
    issueStateFilter,
    issueRepoFilter,
    workflowStatusFilter,
    workflowRepoFilter,
  ])

  // Initial loading on component mount
  useEffect(() => {
    checkBackendHealth()
    fetchDashboardData()
    checkGitHubStatus()

    // Handle OAuth redirect notifications from query parameters
    const params = new URLSearchParams(window.location.search)
    if (params.get('github_connected') === 'true') {
      setGithubAlert({
        type: 'success',
        message: 'Successfully connected with GitHub! Repositories are synchronized.',
      })
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (params.get('github_error')) {
      const err = params.get('github_error')
      setGithubAlert({
        type: 'error',
        message: `GitHub Authentication error: ${err}`,
      })
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    // Periodic heartbeat check for backend connectivity (every 30 seconds)
    const interval = setInterval(() => {
      checkBackendHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [checkBackendHealth, fetchDashboardData, checkGitHubStatus])

  // Refresh all dashboard metrics, repositories, pull requests, issues, and workflow runs
  const handleRefreshAll = () => {
    checkBackendHealth()
    fetchDashboardData()
    checkGitHubStatus().then((status) => {
      if (status?.connected) {
        fetchRepositories()
        fetchPullRequests(prStateFilter, prRepoFilter)
        fetchIssues(issueStateFilter, issueRepoFilter)
        fetchWorkflowRuns(workflowStatusFilter, workflowRepoFilter)
      }
    })
  }

  // Get current page display title for header
  const getPageTitle = (tab: NavItemKey) => {
    switch (tab) {
      case 'dashboard':
        return 'Engineering Operations Dashboard'
      case 'projects':
        return 'Repositories & Projects'
      case 'pull-requests':
        return 'Pull Requests'
      case 'issues':
        return 'GitHub Issue Analytics'
      case 'deployments':
        return 'Deployment Pipelines'
      case 'ai-insights':
        return 'AI Analysis & Insights'
      case 'settings':
        return 'Platform Settings'
    }
  }

  // Get concise mobile display title for header
  const getMobilePageTitle = (tab: NavItemKey) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard'
      case 'projects':
        return 'Repositories'
      case 'pull-requests':
        return 'Pull Requests'
      case 'issues':
        return 'Issues'
      case 'deployments':
        return 'Deployments'
      case 'ai-insights':
        return 'AI Insights'
      case 'settings':
        return 'Settings'
    }
  }

  // Fallback handler to load mock data if backend is offline during manual testing
  const handleUseMockFallback = () => {
    setDashboardData(defaultDashboardData)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-sky-500/30 w-full min-w-0">
      {/* Responsive Sidebar Navigation (Desktop persistent + Mobile slide-over drawer) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab)
          setIsMobileMenuOpen(false)
        }}
        projectCount={githubStatus?.connected ? repositories.length : null}
        pullRequestCount={githubStatus?.connected ? liveOpenPrCount : null}
        issueCount={githubStatus?.connected ? liveOpenIssueCount : null}
        deploymentCount={githubStatus?.connected ? liveWorkflowRunCount : null}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">
        {/* Top Header */}
        <Header
          currentPageTitle={getPageTitle(activeTab)}
          mobilePageTitle={getMobilePageTitle(activeTab)}
          backendOnline={backendOnline}
          isCheckingBackend={isCheckingBackend}
          githubStatus={githubStatus}
          onConnectGitHub={() => setIsGitHubModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Dynamic Page Views */}
        <main className="px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-7xl w-full mx-auto flex-1 min-w-0">
          {/* GitHub OAuth Alert Notification */}
          {githubAlert && (
            <div
              className={`mb-6 p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-fade-in ${
                githubAlert.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {githubAlert.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{githubAlert.message}</span>
              </div>
              <button
                onClick={() => setGithubAlert(null)}
                aria-label="Dismiss message"
                className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === 'dashboard' ? (
            <div className="space-y-6 sm:space-y-8 w-full min-w-0">
              {/* Welcome & Subtitle Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    DevPulse AI Overview
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    AI-Powered Engineering Operations Platform &bull; Live workspace pulse
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* GitHub Action in Banner */}
                  {githubStatus?.connected && githubStatus.user ? (
                    <button
                      onClick={() => setIsGitHubModalOpen(true)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 border border-emerald-800/50 text-xs font-medium transition-colors shadow-sm cursor-pointer min-h-[36px]"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate">GitHub Connected (@{githubStatus.user.login})</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsGitHubModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer min-h-[36px]"
                    >
                      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        />
                      </svg>
                      <span>Connect GitHub</span>
                    </button>
                  )}

                  <button
                    onClick={handleRefreshAll}
                    disabled={isLoading || isReposLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer min-h-[36px]"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isLoading || isReposLoading ? 'animate-spin' : ''
                      }`}
                    />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && !dashboardData && (
                <div className="py-24 text-center space-y-4">
                  <div className="inline-flex p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
                  </div>
                  <div className="text-sm font-medium text-slate-300">
                    Loading DevPulse AI dashboard data...
                  </div>
                  <p className="text-xs text-slate-500">
                    Fetching metrics from <code className="text-sky-400">GET /api/dashboard</code>
                  </p>
                </div>
              )}

              {/* Error State with friendly message and Fallback option */}
              {error && !dashboardData && (
                <div className="p-6 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-200 max-w-2xl mx-auto space-y-4 text-center my-12">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-rose-100">
                      Backend Connection Error
                    </h3>
                    <p className="text-xs text-rose-300/90 mt-1">{error}</p>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Make sure your FastAPI server is running on port 8000.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={fetchDashboardData}
                      className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Try Reconnecting
                    </button>
                    <button
                      onClick={handleUseMockFallback}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      View with Offline Mock Data
                    </button>
                  </div>
                </div>
              )}

              {/* Dashboard Content (Populated from FastAPI or Mock) */}
              {dashboardData && (
                <>
                  {/* 1. Summary Metrics Cards (Projects, PRs, Issues, and Deployments display real GitHub count when connected) */}
                  <section aria-label="Summary Metrics">
                    <SummaryCards
                      summary={dashboardData.summary}
                      realProjectCount={githubStatus?.connected ? repositories.length : null}
                      realOpenPrCount={githubStatus?.connected ? liveOpenPrCount : null}
                      realOpenIssueCount={githubStatus?.connected ? liveOpenIssueCount : null}
                      realWorkflowRunCount={githubStatus?.connected ? liveWorkflowRunCount : null}
                      realFailedWorkflowRunCount={githubStatus?.connected ? liveFailedWorkflowRunCount : null}
                      isGitHubConnected={!!githubStatus?.connected}
                    />
                  </section>

                  {/* 2. AI Insights Card */}
                  <section aria-label="AI Insights">
                    <AIInsights insights={dashboardData.ai_insights} />
                  </section>

                  {/* 3. GitHub Repositories & Recent Activity Grid */}
                  <section
                    aria-label="Repositories and Feed"
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 w-full"
                  >
                    <RepositoryList
                      repositories={repositories}
                      isLoading={isReposLoading}
                      error={reposError}
                      isConnected={!!githubStatus?.connected}
                      authMethod={githubStatus?.auth_method}
                      onConnectGitHub={() => setIsGitHubModalOpen(true)}
                      onRefreshRepos={fetchRepositories}
                    />
                    <RecentActivity activities={dashboardData.recent_activity} />
                  </section>

                  {/* 4. Engineering Health Overview */}
                  <section aria-label="Engineering Health">
                    <EngineeringHealth projects={dashboardData.engineering_health} />
                  </section>

                  {/* Architecture & Future Roadmap Footer Info */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="break-words">
                        Architecture: React 19 + TypeScript + Tailwind CSS &bull; FastAPI + Uvicorn
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 self-start sm:self-auto shrink-0">
                      Step 11: AI Deployment Failure Analyzer (Strictly Read-Only &bull; GitHub App &bull; Gemini AI)
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : activeTab === 'projects' ? (
            /* Dedicated Projects View */
            <div className="space-y-6 w-full min-w-0">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Connected Repositories</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Selected repositories synchronized via DevPulse AI Platform (GitHub App &bull; Read-Only)
                </p>
              </div>

              <RepositoryList
                repositories={repositories}
                isLoading={isReposLoading}
                error={reposError}
                isConnected={!!githubStatus?.connected}
                authMethod={githubStatus?.auth_method}
                onConnectGitHub={() => setIsGitHubModalOpen(true)}
                onRefreshRepos={fetchRepositories}
              />
            </div>
          ) : activeTab === 'pull-requests' ? (
            /* Dedicated Pull Requests View with Live GitHub App Analytics */
            <PullRequestsView
              pullRequests={pullRequests}
              isLoading={isPRsLoading}
              error={prsError}
              onRefresh={() => fetchPullRequests(prStateFilter, prRepoFilter)}
              isGitHubConnected={!!githubStatus?.connected}
              installedRepos={repositories}
              activeStateFilter={prStateFilter}
              onChangeStateFilter={(st) => {
                setPrStateFilter(st)
                fetchPullRequests(st, prRepoFilter)
              }}
              activeRepoFilter={prRepoFilter}
              onChangeRepoFilter={(rp) => {
                setPrRepoFilter(rp)
                fetchPullRequests(prStateFilter, rp)
              }}
            />
          ) : activeTab === 'issues' ? (
            /* Dedicated Issues View with Live GitHub App Analytics */
            <IssuesView
              issues={issues}
              isLoading={isIssuesLoading}
              error={issuesError}
              onRefresh={() => fetchIssues(issueStateFilter, issueRepoFilter)}
              isGitHubConnected={!!githubStatus?.connected}
              installedRepos={repositories}
              activeStateFilter={issueStateFilter}
              onChangeStateFilter={(st) => {
                setIssueStateFilter(st)
                fetchIssues(st, issueRepoFilter)
              }}
              activeRepoFilter={issueRepoFilter}
              onChangeRepoFilter={(rp) => {
                setIssueRepoFilter(rp)
                fetchIssues(issueStateFilter, rp)
              }}
            />
          ) : activeTab === 'deployments' ? (
            /* Dedicated Deployments View with Live GitHub Actions & AI Failure Analyzer */
            <DeploymentsView
              workflowRuns={workflowRuns}
              isLoading={isWorkflowsLoading}
              error={workflowsError}
              onRefresh={() => fetchWorkflowRuns(workflowStatusFilter, workflowRepoFilter)}
              isGitHubConnected={!!githubStatus?.connected}
              installedRepos={repositories}
              activeStatusFilter={workflowStatusFilter}
              onChangeStatusFilter={(st) => {
                setWorkflowStatusFilter(st)
                fetchWorkflowRuns(st, workflowRepoFilter)
              }}
              activeRepoFilter={workflowRepoFilter}
              onChangeRepoFilter={(rp) => {
                setWorkflowRepoFilter(rp)
                fetchWorkflowRuns(workflowStatusFilter, rp)
              }}
            />
          ) : activeTab === 'ai-insights' ? (
            /* Dedicated AI Insights View with PostgreSQL Archive */
            <AIInsightsView
              insights={dashboardData?.ai_insights}
              onOpenPRReviewer={() => setActiveTab('pull-requests')}
              onOpenDeploymentAnalyzer={() => setActiveTab('deployments')}
            />
          ) : activeTab === 'settings' ? (
            /* Dedicated Settings View */
            <SettingsView
              githubStatus={githubStatus}
              onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
            />
          ) : (
            /* Fallback Coming Soon state */
            <ComingSoon
              title={getPageTitle(activeTab)}
              description={`The ${getPageTitle(activeTab)} interface will connect to live engineering pipelines.`}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}
        </main>
      </div>

      {/* GitHub Integration Modal */}
      <GitHubModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        status={githubStatus}
        onRefreshStatus={checkGitHubStatus}
      />
    </div>
  )
}

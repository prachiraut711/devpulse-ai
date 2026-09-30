import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Zap,
  Database,
  History,
  RefreshCw,
  GitPullRequest,
  Rocket,
  Clock,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react'
import type {
  AIInsightItem,
  AIReviewHistoryItem,
  AIDeploymentHistoryItem,
  DatabaseStatusResponse,
} from '../types/dashboard'

interface AIInsightsViewProps {
  insights?: AIInsightItem[]
  onOpenPRReviewer?: () => void
  onOpenDeploymentAnalyzer?: () => void
}

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({
  insights = [],
  onOpenPRReviewer,
  onOpenDeploymentAnalyzer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'signals' | 'database'>('history')
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'prs' | 'deployments'>('all')

  // PostgreSQL AI History States
  const [reviewsHistory, setReviewsHistory] = useState<AIReviewHistoryItem[]>([])
  const [deploymentsHistory, setDeploymentsHistory] = useState<AIDeploymentHistoryItem[]>([])
  const [dbStatus, setDbStatus] = useState<DatabaseStatusResponse | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Inspection Modal States
  const [selectedReview, setSelectedReview] = useState<AIReviewHistoryItem | null>(null)
  const [selectedDeployment, setSelectedDeployment] = useState<AIDeploymentHistoryItem | null>(null)

  const defaultInsights: AIInsightItem[] = [
    {
      id: 'ins-1',
      title: '2 potential engineering risks detected',
      description:
        'PR review turnaround time increased by 35% on SmartStudyAI & 2 deployments experienced rollbacks.',
      severity: 'warning',
    },
    {
      id: 'ins-2',
      title: 'Deployment failures increased during the last 7 days',
      description:
        'Failure rate rose from 3.8% to 8.3% following dependency updates across microservices.',
      severity: 'info',
    },
    {
      id: 'ins-3',
      title: 'Flaky test execution detected in coding-questions suite',
      description:
        'Test suite failure rate of 4.2% attributed to asynchronous timeout assertions in dynamic programming tests.',
      severity: 'warning',
    },
    {
      id: 'ins-4',
      title: 'Code review turnaround velocity optimal on Event-Booking-Web-App',
      description:
        'Average review turnaround reached 1.2 days, exceeding team SLA by 40% over the last sprint.',
      severity: 'info',
    },
  ]

  const displayInsights = insights.length > 0 ? insights : defaultInsights

  // Fetch PostgreSQL database status
  const fetchDbStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/database/status')
      if (res.ok) {
        const data: DatabaseStatusResponse = await res.json()
        setDbStatus(data)
      }
    } catch {
      setDbStatus(null)
    }
  }, [])

  // Fetch saved AI reviews and deployment diagnoses from PostgreSQL
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    setHistoryError(null)

    try {
      const [reviewsRes, deploymentsRes] = await Promise.all([
        fetch('/api/ai/reviews'),
        fetch('/api/ai/deployment-analyses'),
      ])

      if (reviewsRes.ok) {
        const reviewsData: AIReviewHistoryItem[] = await reviewsRes.json()
        setReviewsHistory(reviewsData)
      }

      if (deploymentsRes.ok) {
        const deploysData: AIDeploymentHistoryItem[] = await deploymentsRes.json()
        setDeploymentsHistory(deploysData)
      }
    } catch (err) {
      console.error('Error fetching AI history:', err)
      setHistoryError(
        err instanceof Error ? err.message : 'Unable to connect to PostgreSQL database history.'
      )
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchDbStatus()
    fetchHistory()
  }, [fetchDbStatus, fetchHistory])

  // Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'recently'
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 30) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch {
      return dateStr
    }
  }

  // Combined and sorted history feed
  const combinedHistory = [
    ...reviewsHistory.map((r) => ({ ...r, entryType: 'pr_review' as const })),
    ...deploymentsHistory.map((d) => ({ ...d, entryType: 'deployment_analysis' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filteredHistory = combinedHistory.filter((item) => {
    if (historyTypeFilter === 'prs') return item.entryType === 'pr_review'
    if (historyTypeFilter === 'deployments') return item.entryType === 'deployment_analysis'
    return true
  })

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header & Database Status Badge */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>AI Engineering Operations & History</span>
            </h2>

            {/* PostgreSQL Liveness Pill */}
            {dbStatus?.connected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>PostgreSQL Connected</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-950/60 text-amber-300 border border-amber-800/50 cursor-pointer"
                onClick={() => setActiveSubTab('database')}
                title="Click to view database setup telemetry"
              >
                <Database className="w-3 h-3 text-amber-400" />
                <span>PostgreSQL (Local Setup)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated PR code reviews, CI/CD failure diagnoses, and persistent engineering analysis archive
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start md:self-auto shrink-0 flex-wrap">
          <button
            onClick={() => setActiveSubTab('history')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer min-h-[36px] sm:min-h-0 ${
              activeSubTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>AI History ({combinedHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('signals')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer min-h-[36px] sm:min-h-0 ${
              activeSubTab === 'signals'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Risk Signals</span>
          </button>

          <button
            onClick={() => setActiveSubTab('database')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer min-h-[36px] sm:min-h-0 ${
              activeSubTab === 'database'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>PostgreSQL Config</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: AI History Archive (PostgreSQL Persistence) */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          {/* Controls: Filter Pills & Refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'all', label: `All History (${combinedHistory.length})` },
                { id: 'prs', label: `PR Reviews (${reviewsHistory.length})` },
                { id: 'deployments', label: `Deployment Analyses (${deploymentsHistory.length})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setHistoryTypeFilter(pill.id as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 min-h-[36px] sm:min-h-0 ${
                    historyTypeFilter === pill.id
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                fetchDbStatus()
                fetchHistory()
              }}
              disabled={isLoadingHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto shrink-0 min-h-[36px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>{isLoadingHistory ? 'Syncing...' : 'Sync Database'}</span>
            </button>
          </div>

          {/* Database Offline Warning Notice if PostgreSQL is not reachable */}
          {dbStatus && !dbStatus.connected && (
            <div className="p-4 sm:p-5 rounded-xl bg-amber-950/20 border border-amber-900/40 text-amber-200 space-y-2">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    PostgreSQL Local Setup Status
                  </h3>
                  <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                    DevPulse AI is configured to persist AI reviews and deployment diagnoses to PostgreSQL at{' '}
                    <code className="bg-slate-900 px-1.5 py-0.5 rounded text-sky-300 font-mono text-[11px]">
                      {dbStatus.sanitized_url}
                    </code>
                    . The local PostgreSQL service is currently not running on port 5432. DevPulse AI operates normally with graceful fallback.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {historyError && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{historyError}</span>
              </div>
              <button
                onClick={fetchHistory}
                className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoadingHistory && combinedHistory.length === 0 && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="p-5 rounded-xl bg-slate-900/50 border border-slate-800/80 animate-pulse space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-slate-800 rounded w-1/4" />
                    <div className="h-5 bg-slate-800 rounded w-20" />
                  </div>
                  <div className="h-5 bg-slate-800/70 rounded w-2/3" />
                  <div className="h-4 bg-slate-800/40 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoadingHistory && filteredHistory.length === 0 && (
            <div className="p-8 sm:p-12 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                <History className="w-7 h-7" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  No Saved AI Analyses in PostgreSQL Yet
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Whenever you analyze a Pull Request or diagnose a failed CI/CD workflow run with DevPulse AI, the structured diagnosis is automatically saved to PostgreSQL for team auditing and historical velocity tracking.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {onOpenPRReviewer && (
                  <button
                    onClick={onOpenPRReviewer}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-200" />
                    <span>Run AI Pull Request Review</span>
                  </button>
                )}
                {onOpenDeploymentAnalyzer && (
                  <button
                    onClick={onOpenDeploymentAnalyzer}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-200" />
                    <span>Diagnose Deployment Failure</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Populated History Cards Feed */}
          {filteredHistory.length > 0 && (
            <div className="space-y-3 w-full">
              {filteredHistory.map((item) => {
                const isPR = item.entryType === 'pr_review'
                const prItem = isPR ? (item as AIReviewHistoryItem) : null
                const deployItem = !isPR ? (item as AIDeploymentHistoryItem) : null

                return (
                  <div
                    key={`${item.entryType}-${item.id}`}
                    className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm flex flex-col justify-between gap-3 min-w-0"
                  >
                    {/* Top Row: Type Pill, Repo Name, PR # / Run #, and View Button */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 min-w-0">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Type Pill */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border shrink-0 ${
                              isPR
                                ? 'bg-indigo-950/50 text-indigo-300 border-indigo-800/50'
                                : 'bg-rose-950/50 text-rose-300 border-rose-800/50'
                            }`}
                          >
                            {isPR ? (
                              <GitPullRequest className="w-3 h-3 text-indigo-400" />
                            ) : (
                              <Rocket className="w-3 h-3 text-rose-400" />
                            )}
                            <span>{isPR ? 'PR Code Review' : 'Deployment Triage'}</span>
                          </span>

                          {/* Reference Number */}
                          <span className="text-xs font-mono text-slate-300 font-semibold">
                            {isPR ? `PR #${prItem?.pull_request_number}` : `Run #${deployItem?.workflow_run_id}`}
                          </span>

                          {/* Repository Badge */}
                          <span className="text-xs font-mono text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[200px] sm:max-w-none">
                            {item.repository}
                          </span>

                          {/* Risk / Confidence Badge */}
                          {isPR && prItem?.review_result && (
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                prItem.review_result.risk_level?.toLowerCase() === 'low'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                                  : prItem.review_result.risk_level?.toLowerCase() === 'high'
                                  ? 'bg-rose-950/60 text-rose-300 border-rose-800/50'
                                  : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                              }`}
                            >
                              Risk: {prItem.review_result.risk_level}
                            </span>
                          )}

                          {!isPR && deployItem?.analysis_result && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-sky-950/60 text-sky-300 border-sky-800/50">
                              Confidence: {deployItem.analysis_result.confidence}
                            </span>
                          )}
                        </div>

                        {/* Title or Workflow Name */}
                        <h3 className="text-sm font-semibold text-white break-words pt-0.5">
                          {isPR
                            ? prItem?.pull_request_title || `Pull Request #${prItem?.pull_request_number}`
                            : deployItem?.workflow_name || `Workflow Run #${deployItem?.workflow_run_id}`}
                        </h3>

                        {/* Summary Excerpt */}
                        <p className="text-xs text-slate-300/90 line-clamp-2 leading-relaxed">
                          {isPR ? prItem?.review_result.summary : deployItem?.analysis_result.summary}
                        </p>
                      </div>

                      {/* View Full Report Button */}
                      <button
                        onClick={() => {
                          if (isPR) setSelectedReview(prItem)
                          else setSelectedDeployment(deployItem)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto shrink-0 min-h-[36px]"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>View Saved Report</span>
                      </button>
                    </div>

                    {/* Bottom Row: Timestamp and Database Persistence Tag */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800/70 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] font-mono text-slate-400">
                          Saved in PostgreSQL &bull; Record ID #{item.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatTimeAgo(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Risk Signals */}
      {activeSubTab === 'signals' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                label: 'Identified Risks',
                val: '2 Warning Signals',
                icon: ShieldAlert,
                color: 'text-amber-400',
                bg: 'bg-amber-950/30 border-amber-800/40',
              },
              {
                label: 'Review Turnaround SLA',
                val: '94% On-Track',
                icon: Zap,
                color: 'text-emerald-400',
                bg: 'bg-emerald-950/30 border-emerald-800/40',
              },
              {
                label: 'CI/CD Stability Index',
                val: '88.5 / 100',
                icon: TrendingUp,
                color: 'text-sky-400',
                bg: 'bg-sky-950/30 border-sky-800/40',
              },
            ].map((kpi, idx) => {
              const Icon = kpi.icon
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex items-center gap-3 ${kpi.bg}`}
                >
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 shrink-0">
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block truncate">
                      {kpi.label}
                    </span>
                    <span className="text-base font-bold text-white tracking-tight font-mono">
                      {kpi.val}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detailed Insights Feed */}
          <div className="space-y-3 w-full">
            {displayInsights.map((item) => {
              const isWarning = item.severity === 'warning'
              const Icon = isWarning ? AlertTriangle : TrendingUp

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    isWarning
                      ? 'bg-amber-950/15 border-amber-800/40 text-amber-200'
                      : 'bg-indigo-950/15 border-indigo-800/30 text-indigo-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isWarning
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-100 break-words">
                          {item.title}
                        </h3>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border font-mono ${
                            isWarning
                              ? 'bg-amber-900/50 text-amber-300 border-amber-700/50'
                              : 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300/90 leading-relaxed break-words">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Database Telemetry & Setup Details */}
      {activeSubTab === 'database' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  PostgreSQL Persistence Telemetry (Step 12)
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                  dbStatus?.connected
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                }`}
              >
                {dbStatus?.connected ? 'Online & Synced' : 'Awaiting Local Connection'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-slate-500 uppercase text-[10px] block">Database Connection URL</span>
                <span className="text-sky-300 break-all">{dbStatus?.sanitized_url || 'postgresql+psycopg://username:***@localhost:5432/devpulse'}</span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-slate-500 uppercase text-[10px] block">ORM & Driver Engine</span>
                <span className="text-slate-200">SQLAlchemy 2.x &bull; psycopg (v3 binary)</span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-slate-500 uppercase text-[10px] block">Database Schemas Managed</span>
                <span className="text-emerald-300">platform_connections, ai_review_history, deployment_analysis_history</span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-slate-500 uppercase text-[10px] block">Security Isolation</span>
                <span className="text-emerald-400">Zero GitHub tokens, private keys, or Gemini keys stored</span>
              </div>
            </div>

            {dbStatus?.error && (
              <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200 space-y-1">
                <span className="font-semibold text-amber-300 block">Connection Diagnostic Output:</span>
                <p className="font-mono text-[11px] text-amber-200/90 break-words">{dbStatus.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historical Report Inspection Modal: PR Review */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-indigo-400" />
                    <span>Saved AI Review &bull; PR #{selectedReview.pull_request_number}</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                    PostgreSQL Record #{selectedReview.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {selectedReview.repository} &bull; {formatTimeAgo(selectedReview.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Executive Summary</span>
                <p className="text-slate-200 leading-relaxed font-sans">{selectedReview.review_result.summary}</p>
              </div>

              {selectedReview.review_result.potential_bugs?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="font-semibold text-rose-300 uppercase text-[10px]">Potential Bugs & Logic Concerns</span>
                  <ul className="space-y-1 list-disc list-inside text-slate-300">
                    {selectedReview.review_result.potential_bugs.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedReview.review_result.recommendations?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="font-semibold text-emerald-300 uppercase text-[10px]">Actionable Recommendations</span>
                  <ul className="space-y-1 list-disc list-inside text-slate-300">
                    {selectedReview.review_result.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={() => setSelectedReview(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Report Inspection Modal: Deployment Analysis */}
      {selectedDeployment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-rose-400" />
                    <span>Saved Diagnosis &bull; Run #{selectedDeployment.workflow_run_id}</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                    PostgreSQL Record #{selectedDeployment.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {selectedDeployment.repository} &bull; {formatTimeAgo(selectedDeployment.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-400 uppercase text-[10px]">Failure Summary</span>
                <p className="text-slate-200 leading-relaxed font-sans">{selectedDeployment.analysis_result.summary}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-1">
                <span className="font-semibold text-rose-300 uppercase text-[10px]">Likely Root Cause</span>
                <p className="text-rose-200 leading-relaxed font-sans">{selectedDeployment.analysis_result.likely_cause}</p>
              </div>

              {selectedDeployment.analysis_result.possible_fixes?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="font-semibold text-emerald-300 uppercase text-[10px]">Suggested Fixes</span>
                  <ul className="space-y-1 list-disc list-inside text-slate-300">
                    {selectedDeployment.analysis_result.possible_fixes.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={() => setSelectedDeployment(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

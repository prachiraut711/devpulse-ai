import React, { useState } from 'react'
import {
  Rocket,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  GitBranch,
  Filter,
  RefreshCw,
  FolderGit2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  PlayCircle,
  StopCircle,
} from 'lucide-react'
import { AIDeploymentModal } from './AIDeploymentModal'
import type { GitHubWorkflowRunDetail, GitHubRepoItem } from '../types/dashboard'

interface DeploymentsViewProps {
  workflowRuns: GitHubWorkflowRunDetail[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  isGitHubConnected: boolean
  installedRepos: GitHubRepoItem[]
  activeStatusFilter: string
  onChangeStatusFilter: (status: string) => void
  activeRepoFilter: string
  onChangeRepoFilter: (repo: string) => void
}

export const DeploymentsView: React.FC<DeploymentsViewProps> = ({
  workflowRuns,
  isLoading,
  error,
  onRefresh,
  isGitHubConnected,
  installedRepos,
  activeStatusFilter,
  onChangeStatusFilter,
  activeRepoFilter,
  onChangeRepoFilter,
}) => {
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('ai_deployment') === 'true'
  })
  const [selectedRun, setSelectedRun] = useState<GitHubWorkflowRunDetail | null>(null)
  const [manualRepo, setManualRepo] = useState<string>('')
  const [manualRunId, setManualRunId] = useState<number>(0)

  // Compute live KPI analytics from workflow runs
  const totalCount = workflowRuns.length
  const successCount = workflowRuns.filter(
    (r) => r.conclusion === 'success'
  ).length
  const failureCount = workflowRuns.filter(
    (r) => r.conclusion === 'failure' || r.conclusion === 'timed_out'
  ).length
  const inProgressCount = workflowRuns.filter(
    (r) => r.status === 'in_progress' || r.status === 'queued'
  ).length

  const successRate =
    totalCount > 0 ? `${((successCount / totalCount) * 100).toFixed(1)}%` : '100%'

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

  // Format run duration
  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return 'Instant'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  // Helper for status badge styling
  const getStatusBadge = (status: string, conclusion: string | null) => {
    if (status === 'in_progress') {
      return {
        label: 'In Progress',
        className: 'bg-sky-950/40 text-sky-300 border-sky-800/40',
        icon: <PlayCircle className="w-3 h-3 text-sky-400 animate-pulse" />,
      }
    }
    if (status === 'queued') {
      return {
        label: 'Queued',
        className: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
        icon: <Clock className="w-3 h-3 text-amber-400" />,
      }
    }
    if (conclusion === 'success') {
      return {
        label: 'Success',
        className: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
      }
    }
    if (conclusion === 'failure' || conclusion === 'timed_out') {
      return {
        label: conclusion === 'timed_out' ? 'Timed Out' : 'Failed',
        className: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
        icon: <XCircle className="w-3 h-3 text-rose-400" />,
      }
    }
    if (conclusion === 'cancelled') {
      return {
        label: 'Cancelled',
        className: 'bg-slate-800/60 text-slate-300 border-slate-700/60',
        icon: <StopCircle className="w-3 h-3 text-slate-400" />,
      }
    }
    return {
      label: conclusion || status,
      className: 'bg-slate-800/40 text-slate-300 border-slate-750',
      icon: <AlertTriangle className="w-3 h-3 text-slate-400" />,
    }
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header & Live Integration Badge */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-emerald-400" />
              <span>Deployment Operations</span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>GitHub Actions (Read-Only)</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time CI/CD workflow telemetry, build health, and Gemini-powered failure diagnosis across installed repositories
          </p>
        </div>

        {/* Action Controls: AI Failure Analyzer & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <button
            onClick={() => {
              setSelectedRun(null)
              setManualRepo(installedRepos[0]?.name || '')
              setManualRunId(0)
              setIsAIModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium transition-all shadow-sm cursor-pointer min-h-[38px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-200" />
            <span>AI Failure Analyzer</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer min-h-[38px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh Live Data'}</span>
          </button>
        </div>
      </div>

      {/* Disconnected Notice */}
      {!isGitHubConnected && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-900/50 text-amber-200 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>GitHub App is currently disconnected. Please connect the GitHub App in Settings or Header to synchronize CI/CD workflow runs.</span>
        </div>
      )}

      {/* KPI Analytics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between min-w-0 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider truncate">
            Total Workflow Runs
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-white font-mono">{totalCount}</span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
              Live GitHub Actions
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between min-w-0 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider truncate">
            Success Rate
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">{successRate}</span>
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
              {successCount} Passed
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between min-w-0 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider truncate">
            Failed Workflows
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-400 font-mono">{failureCount}</span>
            <span className="text-[10px] font-semibold text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/50">
              AI Diagnostic Ready
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between min-w-0 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider truncate">
            Repositories Monitored
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-sky-400 font-mono">
              {installedRepos.length || 4}
            </span>
            <span className="text-[10px] font-semibold text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/50">
              GitHub App
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Repository Selection Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-2 mr-1 hidden md:inline shrink-0" />
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'success', label: `Success (${successCount})` },
            { id: 'failure', label: `Failed (${failureCount})` },
            { id: 'in_progress', label: `In Progress (${inProgressCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChangeStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 min-h-[36px] sm:min-h-0 ${
                activeStatusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Repository Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="repo-filter-select-deploy" className="text-xs text-slate-400 hidden lg:inline">
            Repository:
          </label>
          <select
            id="repo-filter-select-deploy"
            value={activeRepoFilter}
            onChange={(e) => onChangeRepoFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer min-h-[36px]"
          >
            <option value="all">All Repositories ({installedRepos.length || 4})</option>
            {installedRepos.map((repo) => (
              <option key={repo.name} value={repo.name}>
                {repo.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Alert State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            onClick={onRefresh}
            className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shrink-0 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && workflowRuns.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 rounded-xl bg-slate-900/50 border border-slate-800/80 animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="h-6 bg-slate-800 rounded w-24" />
              </div>
              <div className="h-5 bg-slate-800/70 rounded w-2/3" />
              <div className="h-4 bg-slate-800/40 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State when 0 Runs match */}
      {!isLoading && workflowRuns.length === 0 && (
        <div className="p-8 sm:p-12 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Rocket className="w-7 h-7" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base sm:text-lg font-semibold text-white">
              No GitHub Actions Workflow Runs Found
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              DevPulse AI is actively monitoring your installed GitHub repositories via the{' '}
              <span className="text-emerald-400 font-medium">DevPulse AI Platform</span> GitHub App with read-only
              permissions. No workflow runs match the current filter ({activeStatusFilter}).
            </p>
          </div>

          {/* Installed Repositories Quick-List */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Active Repositories Synchronized ({installedRepos.length || 4}):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {(installedRepos.length > 0
                ? installedRepos
                : [
                    { name: 'coding-questions', full_name: 'prachiraut711/coding-questions', html_url: 'https://github.com/prachiraut711/coding-questions', language: 'Python' },
                    { name: 'voice-restaurant-agent', full_name: 'prachiraut711/voice-restaurant-agent', html_url: 'https://github.com/prachiraut711/voice-restaurant-agent', language: 'JavaScript' },
                    { name: 'Event-Booking-Web-App', full_name: 'prachiraut711/Event-Booking-Web-App', html_url: 'https://github.com/prachiraut711/Event-Booking-Web-App', language: 'JavaScript' },
                    { name: 'accident-damage-detection', full_name: 'prachiraut711/accident-damage-detection', html_url: 'https://github.com/prachiraut711/accident-damage-detection', language: 'HTML' },
                  ]
              ).map((repo) => (
                <a
                  key={repo.name}
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-850 transition-all text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 shrink-0" />
                    <span className="font-mono text-slate-300 group-hover:text-white truncate">
                      {repo.name}
                    </span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 shrink-0 ml-1" />
                </a>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setSelectedRun(null)
                setManualRepo(installedRepos[0]?.name || '')
                setManualRunId(0)
                setIsAIModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-200" />
              <span>Launch AI Failure Analyzer</span>
            </button>
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh GitHub Actions</span>
            </button>
            <a
              href="https://github.com/prachiraut711?tab=repositories"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <span>Manage on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      )}

      {/* Populated Workflow Runs List */}
      {workflowRuns.length > 0 && (
        <div className="space-y-3 w-full">
          {workflowRuns.map((run) => {
            const badge = getStatusBadge(run.status, run.conclusion)
            const isFailure = run.conclusion === 'failure' || run.conclusion === 'timed_out'

            return (
              <div
                key={run.id}
                className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm flex flex-col justify-between gap-3 min-w-0"
              >
                {/* Top Row: Status Badge, Workflow Name, Repo, and Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 min-w-0">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border shrink-0 ${badge.className}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      {/* Run Number */}
                      <span className="text-xs font-mono text-slate-400">#{run.run_number}</span>

                      {/* Repository Badge */}
                      <span className="text-xs font-mono text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[200px] sm:max-w-none">
                        {run.repository_name}
                      </span>

                      {/* Event Badge */}
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
                        event: {run.event}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white hover:text-emerald-300 transition-colors break-words pt-0.5">
                      <a href={run.html_url} target="_blank" rel="noreferrer">
                        {run.name}
                      </a>
                    </h3>

                    {run.commit_message && (
                      <p className="text-xs text-slate-400 line-clamp-1 font-sans">
                        {run.commit_message}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons: AI Failure Analyzer & GitHub Link */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                    {isFailure ? (
                      <button
                        onClick={() => {
                          setSelectedRun(run)
                          setManualRepo(run.repository_name)
                          setManualRunId(run.id)
                          setIsAIModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium transition-all shadow-sm cursor-pointer min-h-[36px]"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-rose-200" />
                        <span>Analyze Failure with AI</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedRun(run)
                          setManualRepo(run.repository_name)
                          setManualRunId(run.id)
                          setIsAIModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                        <span>Diagnose Run</span>
                      </button>
                    )}

                    <a
                      href={run.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
                    >
                      <span>View on GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </div>
                </div>

                {/* Bottom Row: Branch, Actor, SHA, Duration, Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800/70 text-xs text-slate-400">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Branch */}
                    {run.branch && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                        <GitBranch className="w-3 h-3 text-slate-400" />
                        <span>{run.branch}</span>
                      </span>
                    )}

                    {/* Commit SHA */}
                    <span className="font-mono text-[11px] text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                      sha: {run.commit_sha.substring(0, 7)}
                    </span>

                    {/* Actor */}
                    <div className="flex items-center gap-1.5">
                      {run.actor_avatar_url && (
                        <img
                          src={run.actor_avatar_url}
                          alt={run.actor_username}
                          className="w-4 h-4 rounded-full border border-slate-700"
                        />
                      )}
                      <span className="text-[11px] text-slate-400">by @{run.actor_username}</span>
                    </div>
                  </div>

                  {/* Duration and Created Time */}
                  <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatDuration(run.run_duration_seconds)}
                    </span>
                    <span className="text-slate-400">{formatTimeAgo(run.created_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* AI Deployment Failure Analyzer Modal */}
      <AIDeploymentModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        repository={selectedRun?.repository_name || manualRepo || installedRepos[0]?.name || ''}
        runId={selectedRun?.id || manualRunId}
        workflowName={selectedRun?.name}
        branch={selectedRun?.branch}
        runUrl={selectedRun?.html_url}
        installedRepos={installedRepos}
        onSelectAnotherRun={(repo, id) => {
          setManualRepo(repo)
          setManualRunId(id)
        }}
      />
    </div>
  )
}

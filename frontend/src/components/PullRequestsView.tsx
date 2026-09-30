import React, { useState } from 'react'
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitBranch,
  Filter,
  RefreshCw,
  FolderGit2,
  AlertCircle,
  ShieldCheck,
  GitMerge,
  FileCode,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { AIReviewModal } from './AIReviewModal'
import type { GitHubPullRequestDetail, GitHubRepoItem } from '../types/dashboard'

interface PullRequestsViewProps {
  pullRequests: GitHubPullRequestDetail[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  isGitHubConnected: boolean
  installedRepos: GitHubRepoItem[]
  activeStateFilter: string
  onChangeStateFilter: (state: string) => void
  activeRepoFilter: string
  onChangeRepoFilter: (repo: string) => void
}

export const PullRequestsView: React.FC<PullRequestsViewProps> = ({
  pullRequests,
  isLoading,
  error,
  onRefresh,
  isGitHubConnected,
  installedRepos,
  activeStateFilter,
  onChangeStateFilter,
  activeRepoFilter,
  onChangeRepoFilter,
}) => {
  const [isAIReviewOpen, setIsAIReviewOpen] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('ai_review') === 'true'
  })
  const [selectedReviewPR, setSelectedReviewPR] = useState<GitHubPullRequestDetail | null>(null)
  const [manualRepo, setManualRepo] = useState<string>('')
  const [manualPRNumber, setManualPRNumber] = useState<number>(1)
  // Compute analytics from current pull request data
  const totalCount = pullRequests.length
  const openCount = pullRequests.filter((pr) => pr.state === 'open').length
  const mergedCount = pullRequests.filter((pr) => pr.state === 'merged' || pr.merged_at).length
  const closedCount = pullRequests.filter((pr) => pr.state === 'closed' && !pr.merged_at).length

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

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header & Live Integration Badge */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <GitPullRequest className="w-5 h-5 text-indigo-400" />
              <span>Pull Request Analytics</span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>GitHub App (Read-Only)</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time PR queue, review velocity, and branch status across installed repositories
          </p>
        </div>

        {/* Action Controls: AI Reviewer & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <button
            onClick={() => {
              setSelectedReviewPR(null)
              setManualRepo(installedRepos[0]?.name || '')
              setManualPRNumber(1)
              setIsAIReviewOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-medium transition-all shadow-sm cursor-pointer min-h-[38px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-200" />
            <span>AI PR Reviewer</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer min-h-[38px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh Live Data'}</span>
          </button>
        </div>
      </div>

      {/* Disconnected Notice */}
      {!isGitHubConnected && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-900/50 text-amber-200 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>GitHub App is currently disconnected. Please connect the GitHub App in Settings or Header to synchronize Pull Requests.</span>
        </div>
      )}

      {/* KPI Analytics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between min-w-0 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider truncate">
            Total Pull Requests
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-white font-mono">{totalCount}</span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
              Cross-Repo
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between min-w-0 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider truncate">
            Open / In Review
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">{openCount}</span>
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
              Active
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between min-w-0 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider truncate">
            Merged
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-indigo-400 font-mono">{mergedCount}</span>
            <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/50">
              Shipped
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
        {/* State Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-2 mr-1 hidden md:inline shrink-0" />
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'open', label: `Open (${openCount})` },
            { id: 'merged', label: `Merged (${mergedCount})` },
            { id: 'closed', label: `Closed (${closedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChangeStateFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 min-h-[36px] sm:min-h-0 ${
                activeStateFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Repository Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="repo-filter-select" className="text-xs text-slate-400 hidden lg:inline">
            Repository:
          </label>
          <select
            id="repo-filter-select"
            value={activeRepoFilter}
            onChange={(e) => onChangeRepoFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer min-h-[36px]"
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
      {isLoading && pullRequests.length === 0 && (
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

      {/* Empty State when 0 PRs match */}
      {!isLoading && pullRequests.length === 0 && (
        <div className="p-8 sm:p-12 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <GitPullRequest className="w-7 h-7" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base sm:text-lg font-semibold text-white">
              No Pull Requests in Selected Repositories
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              DevPulse AI is actively monitoring your installed GitHub repositories via the{' '}
              <span className="text-emerald-400 font-medium">DevPulse AI Platform</span> GitHub App with read-only
              permissions. No pull requests match the current filter ({activeStateFilter}).
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
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-850 transition-all text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 shrink-0" />
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
                setSelectedReviewPR(null)
                setManualRepo(installedRepos[0]?.name || '')
                setManualPRNumber(1)
                setIsAIReviewOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-200" />
              <span>Launch AI Code Reviewer</span>
            </button>
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh GitHub PRs</span>
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

      {/* Populated PR Cards List */}
      {pullRequests.length > 0 && (
        <div className="space-y-3 w-full">
          {pullRequests.map((pr) => {
            const isMerged = pr.state === 'merged' || Boolean(pr.merged_at)
            const isClosed = pr.state === 'closed' && !isMerged
            const isOpen = pr.state === 'open'
            const isDraft = pr.draft || pr.state === 'draft'

            return (
              <div
                key={pr.id}
                className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm flex flex-col justify-between gap-3 min-w-0"
              >
                {/* Top Row: State Pill, PR Number, Repository Badge, and Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 min-w-0">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* State Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border shrink-0 ${
                          isMerged
                            ? 'bg-purple-950/50 text-purple-300 border-purple-800/50'
                            : isOpen
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                            : isDraft
                            ? 'bg-slate-800/70 text-slate-300 border-slate-700'
                            : isClosed
                            ? 'bg-rose-950/50 text-rose-300 border-rose-800/50'
                            : 'bg-slate-800/50 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isMerged ? (
                          <GitMerge className="w-3 h-3 text-purple-400" />
                        ) : isOpen ? (
                          <GitPullRequest className="w-3 h-3 text-emerald-400" />
                        ) : isDraft ? (
                          <FileCode className="w-3 h-3 text-slate-400" />
                        ) : isClosed ? (
                          <CheckCircle2 className="w-3 h-3 text-rose-400" />
                        ) : (
                          <GitPullRequest className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{pr.state}</span>
                      </span>

                      <span className="text-xs font-mono text-slate-400 font-semibold">#{pr.number}</span>

                      {/* Repository Badge */}
                      <span className="text-xs font-mono text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[200px] sm:max-w-none">
                        {pr.repository_name}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white hover:text-sky-300 transition-colors break-words pt-0.5">
                      <a href={pr.html_url} target="_blank" rel="noreferrer">
                        {pr.title}
                      </a>
                    </h3>
                  </div>

                  {/* Action Buttons: AI Review and GitHub Link */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedReviewPR(pr)
                        setManualRepo(pr.repository_name)
                        setManualPRNumber(pr.number)
                        setIsAIReviewOpen(true)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-medium transition-all shadow-sm cursor-pointer min-h-[36px]"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-200" />
                      <span>Review with AI</span>
                    </button>

                    <a
                      href={pr.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
                    >
                      <span>View on GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </div>
                </div>

                {/* Bottom Row: Branches, Author, Metrics, Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800/70 text-xs text-slate-400">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Head -> Base Branch */}
                    {pr.head_branch && pr.base_branch && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                        <GitBranch className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-300">{pr.head_branch}</span>
                        <span className="text-slate-500">&rarr;</span>
                        <span className="text-slate-400">{pr.base_branch}</span>
                      </span>
                    )}

                    {/* Author */}
                    <div className="flex items-center gap-1.5">
                      {pr.author_avatar_url && (
                        <img
                          src={pr.author_avatar_url}
                          alt={pr.author_username}
                          className="w-4 h-4 rounded-full border border-slate-700"
                        />
                      )}
                      <span className="text-[11px] text-slate-400">by @{pr.author_username}</span>
                    </div>
                  </div>

                  {/* Additions, Deletions, Commits, Comments, Updated Time */}
                  <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
                    {pr.additions !== null && pr.additions !== undefined && (
                      <span className="text-emerald-400 font-medium">+{pr.additions}</span>
                    )}
                    {pr.deletions !== null && pr.deletions !== undefined && (
                      <span className="text-rose-400 font-medium">-{pr.deletions}</span>
                    )}
                    {Boolean(pr.comments_count) && (
                      <span className="text-slate-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                        {pr.comments_count}
                      </span>
                    )}
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatTimeAgo(pr.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* AI Pull Request Review Modal */}
      <AIReviewModal
        isOpen={isAIReviewOpen}
        onClose={() => setIsAIReviewOpen(false)}
        repository={selectedReviewPR?.repository_name || manualRepo || installedRepos[0]?.name || ''}
        pullRequestNumber={selectedReviewPR?.number || manualPRNumber}
        prTitle={selectedReviewPR?.title}
        prAuthor={selectedReviewPR?.author_username}
        prUrl={selectedReviewPR?.html_url}
        installedRepos={installedRepos}
        onSelectAnotherPR={(repo, num) => {
          setManualRepo(repo)
          setManualPRNumber(num)
        }}
      />
    </div>
  )
}

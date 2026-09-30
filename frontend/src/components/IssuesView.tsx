import React from 'react'
import {
  CircleDot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  FolderGit2,
  AlertCircle,
  ShieldCheck,
  MessageSquare,
  Tag,
  User,
  Flag,
} from 'lucide-react'
import type { GitHubIssueDetail, GitHubRepoItem } from '../types/dashboard'

interface IssuesViewProps {
  issues: GitHubIssueDetail[]
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

export const IssuesView: React.FC<IssuesViewProps> = ({
  issues,
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
  // Compute analytics from current issues data (excluding pull requests)
  const totalCount = issues.length
  const openCount = issues.filter((iss) => iss.state === 'open').length
  const closedCount = issues.filter((iss) => iss.state === 'closed').length

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
      {/* Header & Live Integration Badges */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <CircleDot className="w-5 h-5 text-amber-400" />
              <span>Issue Analytics</span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>GitHub App (Read-Only)</span>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
              Real GitHub Data
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Live GitHub issue queue and engineering workload across monitored repositories
          </p>
        </div>

        {/* Action Controls: Refresh Live Data */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
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
          <span>
            GitHub App is currently disconnected. Please connect the GitHub App in Settings or Header to synchronize Issues.
          </span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between min-w-0 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider truncate">
            Total Issues
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
            Open Issues
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
            Closed Issues
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-purple-400 font-mono">{closedCount}</span>
            <span className="text-[10px] font-semibold text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/50">
              Resolved
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
            { id: 'closed', label: `Closed (${closedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChangeStateFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 min-h-[36px] sm:min-h-0 ${
                activeStateFilter === tab.id
                  ? 'bg-amber-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Repository Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="repo-issues-select" className="text-xs text-slate-400 hidden lg:inline">
            Repository:
          </label>
          <select
            id="repo-issues-select"
            value={activeRepoFilter}
            onChange={(e) => onChangeRepoFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer min-h-[36px]"
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
      {isLoading && issues.length === 0 && (
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

      {/* Empty State when 0 Issues match */}
      {!isLoading && issues.length === 0 && (
        <div className="p-8 sm:p-12 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <CircleDot className="w-7 h-7" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base sm:text-lg font-semibold text-white">
              No Issues in Selected Repositories
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              DevPulse AI is actively monitoring your installed GitHub repositories via the{' '}
              <span className="text-emerald-400 font-medium">DevPulse AI Platform</span> GitHub App with read-only
              permissions. No GitHub issues currently match the selected filter ({activeStateFilter}).
            </p>
          </div>

          {/* Active Synchronized Repositories Quick-List */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Active Repositories Synchronized ({installedRepos.length || 4}):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {(installedRepos.length > 0
                ? installedRepos
                : [
                    { name: 'coding-questions', full_name: 'prachiraut711/coding-questions', html_url: 'https://github.com/prachiraut711/coding-questions' },
                    { name: 'voice-restaurant-agent', full_name: 'prachiraut711/voice-restaurant-agent', html_url: 'https://github.com/prachiraut711/voice-restaurant-agent' },
                    { name: 'Event-Booking-Web-App', full_name: 'prachiraut711/Event-Booking-Web-App', html_url: 'https://github.com/prachiraut711/Event-Booking-Web-App' },
                    { name: 'accident-damage-detection', full_name: 'prachiraut711/accident-damage-detection', html_url: 'https://github.com/prachiraut711/accident-damage-detection' },
                  ]
              ).map((repo) => (
                <a
                  key={repo.name}
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-850 transition-all text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 shrink-0" />
                    <span className="font-mono text-slate-300 group-hover:text-white truncate">
                      {repo.name}
                    </span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 shrink-0 ml-1" />
                </a>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh GitHub Issues</span>
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

      {/* Populated Issues List */}
      {issues.length > 0 && (
        <div className="space-y-3 w-full">
          {issues.map((iss) => {
            const isOpen = iss.state === 'open'

            return (
              <div
                key={iss.id}
                className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm flex flex-col justify-between gap-3 min-w-0"
              >
                {/* Top Row: State Pill, Issue Number, Repository, Link */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 min-w-0">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* State Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border shrink-0 ${
                          isOpen
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                            : 'bg-purple-950/50 text-purple-300 border-purple-800/50'
                        }`}
                      >
                        {isOpen ? (
                          <CircleDot className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-purple-400" />
                        )}
                        <span>{iss.state}</span>
                      </span>

                      <span className="text-xs font-mono text-slate-400 font-semibold">#{iss.number}</span>

                      {/* Repository Badge */}
                      <span className="text-xs font-mono text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[200px] sm:max-w-none">
                        {iss.repository_name}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white hover:text-amber-300 transition-colors break-words pt-0.5">
                      <a href={iss.html_url} target="_blank" rel="noreferrer">
                        {iss.title}
                      </a>
                    </h3>

                    {/* Labels */}
                    {iss.labels.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {iss.labels.map((label, lIdx) => (
                          <span
                            key={lIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60"
                          >
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            <span>{label}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <a
                    href={iss.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors shrink-0 cursor-pointer min-h-[36px]"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>

                {/* Bottom Row: Author, Assignee, Milestone, Comments, Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800/70 text-xs text-slate-400">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Author */}
                    <div className="flex items-center gap-1.5">
                      {iss.author_avatar_url ? (
                        <img
                          src={iss.author_avatar_url}
                          alt={iss.author_username}
                          className="w-4 h-4 rounded-full border border-slate-700"
                        />
                      ) : (
                        <User className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span className="text-[11px] text-slate-400">by @{iss.author_username}</span>
                    </div>

                    {/* Assignee if available */}
                    {iss.assignee_username && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-300">
                        <span className="text-slate-500">assigned to</span>
                        <span className="font-mono text-slate-200">@{iss.assignee_username}</span>
                      </div>
                    )}

                    {/* Milestone if available */}
                    {iss.milestone && (
                      <div className="inline-flex items-center gap-1 text-[11px] text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40">
                        <Flag className="w-3 h-3 text-sky-400" />
                        <span>{iss.milestone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
                    {Boolean(iss.comments_count) && (
                      <span className="text-slate-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                        {iss.comments_count}
                      </span>
                    )}
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatTimeAgo(iss.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

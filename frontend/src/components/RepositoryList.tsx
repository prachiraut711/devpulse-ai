import React from 'react'
import {
  FolderGit2,
  Star,
  GitFork,
  ExternalLink,
  Lock,
  Globe,
  Clock,
  RefreshCw,
  AlertCircle,
  PlusCircle,
} from 'lucide-react'
import type { GitHubRepoItem } from '../types/dashboard'

interface RepositoryListProps {
  repositories: GitHubRepoItem[]
  isLoading: boolean
  error: string | null
  isConnected: boolean
  authMethod?: 'github_app' | 'oauth' | 'env_token' | null
  onConnectGitHub: () => void
  onRefreshRepos: () => void
}

/**
 * Format ISO timestamp into a user-friendly relative or date string
 */
function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Updated recently'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Updated recently'

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Updated just now'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `Updated ${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `Updated ${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `Updated ${diffInDays}d ago`
  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `Updated ${diffInMonths}mo ago`

  return `Updated on ${date.toLocaleDateString()}`
}

/**
 * Color mapping for popular programming languages
 */
function getLanguageColor(language?: string | null): string {
  switch (language?.toLowerCase()) {
    case 'typescript':
      return 'bg-blue-400'
    case 'javascript':
      return 'bg-yellow-400'
    case 'python':
      return 'bg-sky-400'
    case 'go':
      return 'bg-cyan-400'
    case 'rust':
      return 'bg-orange-500'
    case 'html':
      return 'bg-rose-500'
    case 'css':
      return 'bg-indigo-400'
    case 'java':
      return 'bg-amber-600'
    default:
      return 'bg-slate-400'
  }
}

export const RepositoryList: React.FC<RepositoryListProps> = ({
  repositories,
  isLoading,
  error,
  isConnected,
  authMethod,
  onConnectGitHub,
  onRefreshRepos,
}) => {
  return (
    <div className="p-4 sm:p-6 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm flex flex-col justify-between w-full min-w-0">
      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">GitHub Repositories</h2>
              {isConnected ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  {authMethod === 'github_app' ? 'GitHub App (Read-Only)' : 'Live GitHub Data'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isConnected
                ? authMethod === 'github_app'
                  ? `${repositories.length} selected repositories synchronized via GitHub App (Strictly Read-Only)`
                  : `${repositories.length} repositories retrieved from your authenticated GitHub account`
                : 'Connect your GitHub account to sync real repositories'}
            </p>
          </div>
        </div>


        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isConnected && (
            <button
              onClick={onRefreshRepos}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh repositories"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          {!isConnected && (
            <button
              onClick={onConnectGitHub}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Connect GitHub</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Loading State */}
      {isLoading && (
        <div className="py-16 text-center space-y-3">
          <div className="inline-flex p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-300">
            Loading GitHub repositories...
          </p>
          <p className="text-xs text-slate-500">
            Querying GitHub REST API (read-only)
          </p>
        </div>
      )}

      {/* 2. Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-xl bg-rose-950/20 border border-rose-900/40 text-center space-y-3 my-4">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-rose-200">
            Unable to load GitHub repositories.
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {error}
          </p>
          <div className="pt-2">
            <button
              onClick={onRefreshRepos}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* 3. Disconnected State */}
      {!isLoading && !error && !isConnected && (
        <div className="p-8 rounded-xl bg-slate-950/50 border border-slate-800 text-center space-y-4 my-2">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Connect GitHub to view your repositories.
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Once connected with read-only permissions, DevPulse AI will display your live repositories,
              commit timelines, and deployment statistics here.
            </p>
          </div>
          <button
            onClick={onConnectGitHub}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <span>Connect GitHub</span>
          </button>
        </div>
      )}

      {/* 4. Connected but Empty Repositories State */}
      {!isLoading && !error && isConnected && repositories.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-300">
            No repositories found.
          </p>
          <p className="text-xs text-slate-500">
            Your connected GitHub account does not have any accessible repositories yet.
          </p>
        </div>
      )}

      {/* 5. Connected with Repositories List */}
      {!isLoading && !error && isConnected && repositories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
          {repositories.map((repo) => (
            <div
              key={repo.full_name}
              className="p-3.5 sm:p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm min-w-0"
            >
              <div>
                {/* Top: Name & Visibility Badge */}
                <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                  <h3
                    className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors break-words line-clamp-1"
                    title={repo.name}
                  >
                    {repo.name}
                  </h3>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                      repo.private
                        ? 'bg-amber-950/30 text-amber-300 border-amber-800/40'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700'
                    }`}
                  >
                    {repo.private ? (
                      <>
                        <Lock className="w-2.5 h-2.5" />
                        <span>Private</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-2.5 h-2.5 text-slate-400" />
                        <span>Public</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-3 leading-relaxed break-words">
                  {repo.description || 'No description provided.'}
                </p>
              </div>

              <div>
                {/* Metadata Row: Language, Stars, Forks */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400 mb-3 pt-2 border-t border-slate-800/60">
                  {repo.language && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${getLanguageColor(
                          repo.language
                        )}`}
                      />
                      <span className="text-[11px] text-slate-300">
                        {repo.language}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                    <span>{repo.stars}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <GitFork className="w-3 h-3 text-slate-400" />
                    <span>{repo.forks}</span>
                  </div>
                </div>

                {/* Bottom Row: Last Updated & View Repository Link */}
                <div className="flex flex-col xs:flex-row sm:flex-row items-start xs:items-center sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatRelativeTime(repo.updated_at)}
                  </span>

                  {/* READ-ONLY Navigation Link to GitHub */}
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer py-1"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

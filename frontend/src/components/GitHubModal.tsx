import React, { useState } from 'react'
import {
  X,
  CheckCircle,
  ShieldCheck,
  ExternalLink,
  LogOut,
  AlertTriangle,
  Lock,
  Loader2,
  Key,
} from 'lucide-react'
import type { GitHubStatusResponse } from '../types/dashboard'

interface GitHubModalProps {
  isOpen: boolean
  onClose: () => void
  status: GitHubStatusResponse | null
  onRefreshStatus: () => void
}

export const GitHubModal: React.FC<GitHubModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
}) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  // Initiate GitHub OAuth flow
  const handleConnectOAuth = async () => {
    setIsConnecting(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/github/auth')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail ||
            'GitHub OAuth is not configured in backend/.env. Please configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.'
        )
      }

      const data = await response.json()
      if (data.auth_url) {
        // Redirect browser to official GitHub authorization page
        window.location.href = data.auth_url
      } else {
        throw new Error('No authorization URL returned from backend.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start OAuth flow')
      setIsConnecting(false)
    }
  }

  // Handle local disconnect
  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/github/disconnect', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to disconnect GitHub session.')
      }
      onRefreshStatus()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error disconnecting session')
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-6 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5 pr-8">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white shrink-0">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white truncate">GitHub Integration</h3>
            <span className="text-xs text-sky-400 font-mono">Read-Only Operations Engine</span>
          </div>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-3.5 mb-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Configuration Note</span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Connected State */}
        {status?.connected && status.user ? (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* App / Account Info Card */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex flex-col xs:flex-row sm:flex-row items-start xs:items-center sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={status.user.avatar_url}
                  alt={status.user.login}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-emerald-500/30 shadow-md shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-emerald-200 truncate">

                      {status.auth_method === 'github_app'
                        ? status.app_info?.app_name || 'DevPulse AI Platform'
                        : 'GitHub Connected'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                      Read-Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    Account: @{status.user.login}
                  </p>
                  {status.app_info?.app_id && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      App ID: {status.app_info.app_id} • Installation: #{status.app_info.installation_id}
                    </p>
                  )}
                </div>
              </div>

              <a
                href={status.user.html_url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="View on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Selected Repositories Section (GitHub App Mode) */}
            {status.auth_method === 'github_app' && status.app_info?.selected_repositories && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Selected Repositories ({status.app_info.repository_count})
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    Repository Access: Selected Only
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  {status.app_info.selected_repositories.map((repoName) => (
                    <div
                      key={repoName}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 font-mono text-[11px] text-slate-300 flex items-center justify-between"
                    >
                      <span>{repoName}</span>
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-sans font-medium">
                        Read-Only
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Permissions Granted (Read-Only Enforcement) */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
              <span className="font-semibold text-slate-200 block">
                Repository Permissions (Strictly Read-Only)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: 'Actions', perm: 'Read-only' },
                  { label: 'Contents', perm: 'Read-only' },
                  { label: 'Deployments', perm: 'Read-only' },
                  { label: 'Issues', perm: 'Read-only' },
                  { label: 'Metadata', perm: 'Read-only' },
                  { label: 'Pull requests', perm: 'Read-only' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between text-[11px]"
                  >
                    <span className="text-slate-300">{item.label}</span>
                    <span className="text-[9px] text-emerald-400 font-mono font-medium">
                      {item.perm}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Read-Only Guarantee Box */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Strict Security Guarantee</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                DevPulse AI authenticated via official GitHub App RS256 private key. All operations are strictly GET requests. DevPulse AI has zero ability to push code, modify files, create/delete branches, or merge pull requests.
              </p>
            </div>

            {/* Disconnect / Connection Info Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <span className="text-[11px] text-slate-500 font-mono">
                {status.auth_method === 'github_app'
                  ? 'GitHub App (RS256 JWT)'
                  : status.auth_method === 'oauth'
                  ? 'OAuth Session'
                  : 'Environment Token'}
              </span>

              {status.auth_method !== 'github_app' ? (
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isDisconnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  <span>Disconnect</span>
                </button>
              ) : (
                <span className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  App Installed & Authorized
                </span>
              )}
            </div>
          </div>
        ) : (

          /* Disconnected / Not Connected State */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Connect your GitHub Account
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your account via GitHub OAuth to allow DevPulse AI to index repositories, 
                track pull request velocity, and analyze workflow failures.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Read-only repository metrics & commit history</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Read-only pull requests, issues & review timelines</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Read-only GitHub Actions workflow run logs</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Zero write capability (cannot push, commit, merge, or delete)</span>
                </div>
              </div>
            </div>

            {/* Local Token Alternative Info */}
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400 flex items-start gap-2">
              <Key className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-300 font-medium">Local Developer Option:</span> You can also test with a personal token by setting <code className="text-sky-300 font-mono">GITHUB_ACCESS_TOKEN</code> in <code className="font-mono text-slate-300">backend/.env</code>.
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-800">
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                <span>View API Docs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleConnectOAuth}
                disabled={isConnecting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                )}
                <span>Connect with GitHub</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

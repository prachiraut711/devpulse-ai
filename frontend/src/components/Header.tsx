import React from 'react'
import { Search, Bell, Menu } from 'lucide-react'
import type { GitHubStatusResponse } from '../types/dashboard'

interface HeaderProps {
  currentPageTitle: string
  mobilePageTitle?: string
  backendOnline: boolean | null
  isCheckingBackend: boolean
  githubStatus: GitHubStatusResponse | null
  onConnectGitHub: () => void
  onToggleMobileMenu?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  currentPageTitle,
  mobilePageTitle,
  backendOnline,
  isCheckingBackend,
  githubStatus,
  onConnectGitHub,
  onToggleMobileMenu,
}) => {
  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-30 w-full min-w-0">
      {/* Left: Mobile Menu Button & Current Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 mr-2">
        {/* Mobile Hamburger Menu Button (visible on screens < 1024px) */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
          {mobilePageTitle ? (
            <>
              <span className="md:hidden">{mobilePageTitle}</span>
              <span className="hidden md:inline">{currentPageTitle}</span>
            </>
          ) : (
            currentPageTitle
          )}
        </h1>
        <span className="text-xs text-slate-400 border-l border-slate-800 pl-3 hidden 2xl:inline shrink-0">
          Engineering Operations
        </span>
      </div>

      {/* Right: Actions (Search, Backend, GitHub, Bell, Avatar) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Search Field (Wide desktop only) */}
        <div className="relative hidden xl:block w-44 2xl:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search repos, PRs..."
            className="w-full bg-slate-950/70 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Backend Live Status Indicator */}
        <div
          title={
            isCheckingBackend
              ? 'Checking backend connection...'
              : backendOnline === true
              ? 'Backend Online (FastAPI)'
              : 'Backend Offline'
          }
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs shadow-inner shrink-0"
        >
          <span
            className={`w-2 h-2 rounded-full transition-colors shrink-0 ${
              backendOnline === true
                ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50'
                : backendOnline === false
                ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="text-xs font-medium text-slate-300 hidden sm:inline lg:hidden xl:inline">
            {isCheckingBackend
              ? 'Checking...'
              : backendOnline === true
              ? 'Backend Online'
              : 'Backend Offline'}
          </span>
        </div>

        {/* GitHub Connection State Button */}
        {githubStatus?.connected && githubStatus.user ? (
          <button
            onClick={onConnectGitHub}
            title={
              githubStatus.auth_method === 'github_app'
                ? `GitHub App Connected: ${githubStatus.app_info?.app_name || 'DevPulse AI Platform'} (Read-Only)`
                : 'GitHub Connected (Read-Only) - Click to inspect'
            }
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 border border-emerald-800/50 text-xs font-medium transition-colors cursor-pointer shadow-sm shrink-0 min-h-[36px]"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <img
              src={githubStatus.user.avatar_url}
              alt={githubStatus.user.login}
              className="w-4 h-4 rounded-full border border-emerald-500/40 shrink-0"
            />
            <span className="font-mono text-emerald-300 font-semibold text-[11px] hidden sm:inline max-w-[90px] sm:max-w-[130px] truncate">
              @{githubStatus.user.login}
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-900/50 px-1.5 py-0.5 rounded border border-emerald-700/40 hidden xl:inline">
              {githubStatus.auth_method === 'github_app' ? 'GitHub App' : 'Connected'}
            </span>
          </button>
        ) : (
          <button
            onClick={onConnectGitHub}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer shadow-sm shrink-0 min-h-[36px]"
          >
            <svg
              className="w-3.5 h-3.5 fill-current text-white shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span className="hidden sm:inline">Connect GitHub</span>
            <span className="sm:hidden text-xs">Connect</span>
          </button>
        )}

        {/* Notification Bell */}
        <button
          aria-label="Notifications"
          className="relative p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 rounded-full bg-sky-500" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-slate-800 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-xs font-semibold text-white shadow-md shrink-0">
            PR
          </div>
          <div className="hidden xl:block text-left">
            <span className="text-xs font-medium text-slate-200 block leading-tight">prachi raut</span>
            <span className="text-[10px] text-slate-400 block leading-tight">Platform Lead</span>
          </div>
        </div>
      </div>
    </header>
  )
}

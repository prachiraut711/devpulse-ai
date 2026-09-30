import React, { useEffect } from 'react'
import {
  LayoutDashboard,
  FolderGit2,
  GitPullRequest,
  CircleDot,
  Rocket,
  Sparkles,
  Settings,
  Activity,
  X,
} from 'lucide-react'

export type NavItemKey =
  | 'dashboard'
  | 'projects'
  | 'pull-requests'
  | 'issues'
  | 'deployments'
  | 'ai-insights'
  | 'settings'

interface SidebarProps {
  activeTab: NavItemKey
  onSelectTab: (tab: NavItemKey) => void
  projectCount?: number | null
  pullRequestCount?: number | null
  issueCount?: number | null
  deploymentCount?: number | null
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  projectCount,
  pullRequestCount,
  issueCount,
  deploymentCount,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const mainNavItems = [
    { key: 'dashboard' as NavItemKey, label: 'Dashboard', icon: LayoutDashboard },
    {
      key: 'projects' as NavItemKey,
      label: 'Projects',
      icon: FolderGit2,
      badge: projectCount !== undefined && projectCount !== null ? String(projectCount) : '4',
    },
    {
      key: 'pull-requests' as NavItemKey,
      label: 'Pull Requests',
      icon: GitPullRequest,
      badge:
        pullRequestCount !== undefined && pullRequestCount !== null
          ? String(pullRequestCount)
          : '0',
    },
    {
      key: 'issues' as NavItemKey,
      label: 'Issues',
      icon: CircleDot,
      badge:
        issueCount !== undefined && issueCount !== null
          ? String(issueCount)
          : '0',
    },
    {
      key: 'deployments' as NavItemKey,
      label: 'Deployments',
      icon: Rocket,
      badge:
        deploymentCount !== undefined && deploymentCount !== null
          ? String(deploymentCount)
          : undefined,
    },
    { key: 'ai-insights' as NavItemKey, label: 'AI Insights', icon: Sparkles, highlight: true },
  ]

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && onCloseMobile) {
        onCloseMobile()
      }
    }
    if (isMobileOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isMobileOpen, onCloseMobile])

  const handleItemClick = (key: NavItemKey) => {
    onSelectTab(key)
    if (onCloseMobile) {
      onCloseMobile()
    }
  }

  // Reusable Navigation Content (used in both desktop sidebar & mobile drawer)
  const renderNavContent = (isMobile: boolean = false) => (
    <>
      <div>
        {/* Brand Header */}
        <div className="h-16 px-5 sm:px-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                DevPulse <span className="text-sky-400">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">Platform v0.1.0</span>
            </div>
          </div>

          {/* Close button inside mobile header */}
          {isMobile && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="p-2 -mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Main Navigation Items */}
        <div className="px-3 py-5 sm:py-6">
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Overview
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.key

              return (
                <button
                  key={item.key}
                  onClick={() => handleItemClick(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {item.badge}
                      </span>
                    )}
                    {item.highlight && (
                      <span className="px-1.5 py-0.2 text-[9px] font-medium tracking-wide uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        AI
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section: Settings & User Profile */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <button
          onClick={() => handleItemClick('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer min-h-[44px] ${
            activeTab === 'settings'
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Settings</span>
        </button>

        {/* Demo User Info */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-xs font-semibold text-white shadow-inner shrink-0">
            PR
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">prachi raut</p>
            <p className="text-[11px] text-slate-400 truncate">Platform Lead</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* 1. Desktop Persistent Sidebar (Hidden on screens < 1024px) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between shrink-0 h-screen sticky top-0 z-20">
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile/Tablet Drawer (Opened via hamburger menu button on < 1024px) */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          {/* Semi-transparent Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Sidebar */}
          <aside className="relative flex flex-col justify-between w-72 max-w-[85vw] h-full bg-slate-900 border-r border-slate-800 shadow-2xl z-10 overflow-y-auto">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  )
}

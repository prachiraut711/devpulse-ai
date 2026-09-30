import React from 'react'
import { FolderGit2, GitPullRequest, CircleDot, Rocket, AlertOctagon } from 'lucide-react'
import type { DashboardSummary } from '../types/dashboard'

interface SummaryCardsProps {
  summary: DashboardSummary
  realProjectCount?: number | null
  realOpenPrCount?: number | null
  realOpenIssueCount?: number | null
  realWorkflowRunCount?: number | null
  realFailedWorkflowRunCount?: number | null
  isGitHubConnected: boolean
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  realProjectCount,
  realOpenPrCount,
  realOpenIssueCount,
  realWorkflowRunCount,
  realFailedWorkflowRunCount,
  isGitHubConnected,
}) => {
  const hasRealProjects = isGitHubConnected && realProjectCount !== null && realProjectCount !== undefined
  const hasRealPRs = isGitHubConnected && realOpenPrCount !== null && realOpenPrCount !== undefined
  const hasRealIssues = isGitHubConnected && realOpenIssueCount !== null && realOpenIssueCount !== undefined
  const hasRealWorkflows = isGitHubConnected && realWorkflowRunCount !== null && realWorkflowRunCount !== undefined
  const hasRealFailures = isGitHubConnected && realFailedWorkflowRunCount !== null && realFailedWorkflowRunCount !== undefined

  const cards = [
    {
      title: 'Projects',
      value: hasRealProjects ? realProjectCount : summary.projects,
      subtitle: hasRealProjects ? 'Synced from GitHub' : 'Connect GitHub for live count',
      badge: hasRealProjects ? 'Real GitHub Data' : 'Demo Data',
      badgeColor: hasRealProjects
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: FolderGit2,
      iconColor: 'text-sky-400',
      iconBg: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Open Pull Requests',
      value: hasRealPRs ? realOpenPrCount : summary.open_pull_requests,
      subtitle: hasRealPRs
        ? realOpenPrCount === 1
          ? '1 PR pending review'
          : `${realOpenPrCount} PRs across 4 repos`
        : 'Connect GitHub for live PRs',
      badge: hasRealPRs ? 'Real GitHub Data' : 'Demo Data',
      badgeColor: hasRealPRs
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-slate-800 text-slate-400 border-slate-700',
      icon: GitPullRequest,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Issues',
      value: hasRealIssues ? realOpenIssueCount : 0,
      subtitle: hasRealIssues
        ? realOpenIssueCount === 1
          ? '1 open issue active'
          : `${realOpenIssueCount} open issues across 4 repos`
        : 'Connect GitHub for live issues',
      badge: hasRealIssues ? 'Real GitHub Data' : 'Demo Data',
      badgeColor: hasRealIssues
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: CircleDot,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Deployments',
      value: hasRealWorkflows ? realWorkflowRunCount : summary.deployments,
      subtitle: hasRealWorkflows
        ? realWorkflowRunCount === 1
          ? '1 workflow run logged'
          : `${realWorkflowRunCount} runs across 4 repos`
        : 'Total Pipelines (30d)',
      badge: hasRealWorkflows ? 'Real GitHub Actions Data' : 'Demo Data',
      badgeColor: hasRealWorkflows
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-slate-800 text-slate-400 border-slate-700',
      icon: Rocket,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Failed Deployments',
      value: hasRealFailures ? realFailedWorkflowRunCount : summary.failed_deployments,
      subtitle: hasRealFailures
        ? realFailedWorkflowRunCount === 0
          ? 'All workflows passing'
          : `${realFailedWorkflowRunCount} failed run${realFailedWorkflowRunCount > 1 ? 's' : ''}`
        : 'Requiring Triage',
      badge: hasRealFailures ? 'Real GitHub Actions Data' : 'Demo Data',
      badgeColor: hasRealFailures
        ? realFailedWorkflowRunCount === 0
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        : 'bg-slate-800 text-slate-400 border-slate-700',
      icon: AlertOctagon,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 w-full">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-sm flex flex-col justify-between min-w-0"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg border shrink-0 ${card.iconBg}`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-1.5 mb-1.5">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {card.value}
                </span>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-normal break-words text-right ${card.badgeColor}`}
                >
                  {card.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 break-words">{card.subtitle}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

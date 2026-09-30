import React from 'react'
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  History,
} from 'lucide-react'
import type { RecentActivityItem } from '../types/dashboard'

interface RecentActivityProps {
  activities: RecentActivityItem[]
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  // Helper to render activity-specific icons and colors
  const getActivityMeta = (type: string) => {
    switch (type) {
      case 'pr_merged':
        return {
          icon: GitPullRequest,
          iconColor: 'text-indigo-400',
          bgColor: 'bg-indigo-500/10 border-indigo-500/20',
          badgeText: 'Merged',
          badgeStyle: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
        }
      case 'deploy_success':
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10 border-emerald-500/20',
          badgeText: 'Deployed',
          badgeStyle: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
        }
      case 'pr_opened':
        return {
          icon: GitPullRequest,
          iconColor: 'text-sky-400',
          bgColor: 'bg-sky-500/10 border-sky-500/20',
          badgeText: 'Open PR',
          badgeStyle: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
        }
      case 'deploy_failed':
        return {
          icon: XCircle,
          iconColor: 'text-rose-400',
          bgColor: 'bg-rose-500/10 border-rose-500/20',
          badgeText: 'Failed',
          badgeStyle: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
        }
      default:
        return {
          icon: Clock,
          iconColor: 'text-slate-400',
          bgColor: 'bg-slate-800 border-slate-700',
          badgeText: 'Event',
          badgeStyle: 'text-slate-300 bg-slate-800 border-slate-700',
        }
    }
  }

  return (
    <div className="p-4 sm:p-6 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
            <p className="text-xs text-slate-400">Live feed of commits, PRs and deployment pipelines</p>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-mono self-start sm:self-auto">Live stream</span>
      </div>

      <div className="divide-y divide-slate-800/60">
        {activities.map((item) => {
          const meta = getActivityMeta(item.type)
          const Icon = meta.icon

          return (
            <div key={item.id} className="py-3.5 first:pt-1 last:pb-1 flex items-start gap-3 group min-w-0">
              <div className={`p-2 rounded-lg border mt-0.5 shrink-0 ${meta.bgColor}`}>
                <Icon className={`w-4 h-4 ${meta.iconColor}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors break-words">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {item.timestamp}
                  </span>
                </div>

                <p className="text-xs text-slate-400 break-words line-clamp-2 mb-1.5">
                  {item.description}
                </p>


                <div className="flex items-center gap-2 text-[11px]">
                  <span className={`px-1.5 py-0.2 rounded border text-[10px] font-medium ${meta.badgeStyle}`}>
                    {meta.badgeText}
                  </span>
                  <span className="text-slate-400 font-mono">@{item.author}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

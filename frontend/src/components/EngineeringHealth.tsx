import React from 'react'
import { GitBranch, Activity } from 'lucide-react'
import type { EngineeringHealthItem } from '../types/dashboard'

interface EngineeringHealthProps {
  projects: EngineeringHealthItem[]
}

export const EngineeringHealth: React.FC<EngineeringHealthProps> = ({ projects }) => {
  // Helper to choose color scheme based on score
  const getHealthColor = (score: number) => {
    if (score >= 90) {
      return {
        bar: 'bg-emerald-500',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      }
    }
    if (score >= 85) {
      return {
        bar: 'bg-sky-500',
        text: 'text-sky-400',
        badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      }
    }
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    }
  }

  return (
    <div className="p-4 sm:p-6 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm flex flex-col justify-between w-full min-w-0">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Engineering Health</h2>
              <p className="text-xs text-slate-400">CI stability, test coverage & PR velocity</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400 self-start sm:self-auto">
            {projects.length} Repositories Monitored
          </span>
        </div>

        <div className="space-y-5">
          {projects.map((item) => {
            const colors = getHealthColor(item.health_score)
            return (
              <div key={item.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{item.name}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-750">
                      <GitBranch className="w-3 h-3 text-slate-400" />
                      {item.branch}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${colors.badge}`}>
                      {item.status}
                    </span>
                    <span className={`font-mono font-bold text-sm ${colors.text}`}>
                      {item.health_score}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
                    style={{ width: `${item.health_score}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row gap-1 sm:items-center justify-between text-[11px] text-slate-400">
        <span>Target SLA threshold: &gt; 85%</span>
        <span className="text-sky-400 font-medium">All systems operational</span>
      </div>
    </div>
  )
}


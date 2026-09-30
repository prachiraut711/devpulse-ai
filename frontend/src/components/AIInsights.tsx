import React from 'react'
import { Sparkles, AlertTriangle, TrendingUp, Info } from 'lucide-react'
import type { AIInsightItem } from '../types/dashboard'

interface AIInsightsProps {
  insights: AIInsightItem[]
}

export const AIInsights: React.FC<AIInsightsProps> = ({ insights }) => {
  return (
    <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-b from-indigo-950/40 to-slate-900/80 border border-indigo-500/20 shadow-lg relative overflow-hidden w-full">
      {/* Decorative gradient glow in corner */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header with clear Demo/Mock tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-indigo-500/15">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              AI Insights Summary
            </h2>
            <p className="text-xs text-slate-400">Automated PR review signals & deployment anomaly detection</p>
          </div>
        </div>

        {/* Prominent Demo / Mock AI indicator */}
        <span className="self-start sm:self-auto shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Demo / Mock Data
        </span>
      </div>


      {/* Insight Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((item) => {
          const isWarning = item.severity === 'warning'
          const Icon = isWarning ? AlertTriangle : TrendingUp

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                isWarning
                  ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                  : 'bg-indigo-950/20 border-indigo-800/30 text-indigo-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    isWarning
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-100">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Note about upcoming Gemini AI integration */}
      <div className="mt-4 pt-3 border-t border-indigo-500/10 flex items-center gap-2 text-[11px] text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          Gemini AI integration will analyze live PR diffs and deployment container logs in the next phase.
        </span>
      </div>
    </div>
  )
}

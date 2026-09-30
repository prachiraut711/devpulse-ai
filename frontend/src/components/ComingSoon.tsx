import React from 'react'
import { Construction, ArrowLeft } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description: string
  onBackToDashboard: () => void
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  title,
  description,
  onBackToDashboard,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-6 shadow-inner">
        <Construction className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">{title} Module</h2>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        {description} This module is scheduled for development in subsequent phases after the core platform foundation.
      </p>
      <button
        onClick={onBackToDashboard}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Dashboard</span>
      </button>
    </div>
  )
}

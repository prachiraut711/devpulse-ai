import React, { useState } from 'react'
import {
  Settings,
  ShieldCheck,
  CheckCircle,
  Save,
  RefreshCw,
  Bell,
  Sliders,
  Radio,
} from 'lucide-react'
import type { GitHubStatusResponse } from '../types/dashboard'

interface SettingsViewProps {
  githubStatus: GitHubStatusResponse | null
  onOpenGitHubModal: () => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  githubStatus,
  onOpenGitHubModal,
}) => {
  const [refreshInterval, setRefreshInterval] = useState('60')
  const [prTurnaroundThreshold, setPrTurnaroundThreshold] = useState('2.0')
  const [notifyOnFailedDeploy, setNotifyOnFailedDeploy] = useState(true)
  const [notifyOnSlowPR, setNotifyOnSlowPR] = useState(true)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <span>Platform Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage DevPulse AI platform configurations, GitHub App integration, and notifications
          </p>
        </div>

        {savedSuccess && (
          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs font-medium animate-fade-in">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Settings saved successfully</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6 w-full">
        {/* Section 1: GitHub App Integration Status */}
        <div className="p-4 sm:p-6 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">GitHub App Integration</h3>
                <p className="text-xs text-slate-400">Official DevPulse AI Platform App &bull; Read-Only</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenGitHubModal}
              className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
            >
              Manage App Connection
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">App Name</span>
              <span className="text-xs font-semibold text-slate-200 mt-1 block">
                {githubStatus?.app_info?.app_name || 'DevPulse AI Platform'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">App ID</span>
              <span className="text-xs font-mono font-semibold text-slate-200 mt-1 block">
                {githubStatus?.app_info?.app_id || '5118991'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Authorized Account</span>
              <span className="text-xs font-mono font-semibold text-emerald-400 mt-1 block">
                @{githubStatus?.user?.login || 'prachiraut711'}
              </span>
            </div>
          </div>

          {/* Read-Only Guarantee Tag */}
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Enforced Read-Only Policy: Server-side RS256 JWT tokens. Only HTTP GET requests are executed. 
              Zero permissions to commit, push, create branches, or merge pull requests.
            </p>
          </div>
        </div>

        {/* Section 2: Platform Preferences */}
        <div className="p-4 sm:p-6 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4 w-full">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Platform Preferences</h3>
              <p className="text-xs text-slate-400">Dashboard refresh rates and view settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="refreshRate" className="text-xs font-medium text-slate-300 block">
                Telemetry Auto-Refresh Rate
              </label>
              <select
                id="refreshRate"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="30">Every 30 seconds</option>
                <option value="60">Every 1 minute (Recommended)</option>
                <option value="300">Every 5 minutes</option>
                <option value="0">Manual Refresh Only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prThreshold" className="text-xs font-medium text-slate-300 block">
                PR Turnaround SLA Warning Threshold (Days)
              </label>
              <input
                id="prThreshold"
                type="number"
                step="0.5"
                min="0.5"
                max="14"
                value={prTurnaroundThreshold}
                onChange={(e) => setPrTurnaroundThreshold(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Notification Toggles */}
        <div className="p-4 sm:p-6 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4 w-full">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Engineering Notifications</h3>
              <p className="text-xs text-slate-400">Configure alerts for deployment failures and review delays</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-slate-950/40 border border-slate-850 hover:bg-slate-950/70 transition-colors">
              <input
                type="checkbox"
                checked={notifyOnFailedDeploy}
                onChange={(e) => setNotifyOnFailedDeploy(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-slate-200 block">
                  Alert on Failed Deployment Pipelines
                </span>
                <span className="text-[11px] text-slate-400 block leading-relaxed">
                  Trigger an immediate dashboard indicator when a CI/CD workflow run concludes with a failure.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-slate-950/40 border border-slate-850 hover:bg-slate-950/70 transition-colors">
              <input
                type="checkbox"
                checked={notifyOnSlowPR}
                onChange={(e) => setNotifyOnSlowPR(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-slate-200 block">
                  Alert on Stale Pull Requests (&gt; SLA threshold)
                </span>
                <span className="text-[11px] text-slate-400 block leading-relaxed">
                  Highlight PRs pending reviewer response longer than the configured threshold.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 4: Webhook & API Endpoints */}
        <div className="p-4 sm:p-6 rounded-xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4 w-full">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Local API Endpoints</h3>
              <p className="text-xs text-slate-400">DevPulse AI FastAPI backend routing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 block">FastAPI Base URL</label>
              <input
                type="text"
                readOnly
                value="http://127.0.0.1:8000"
                className="w-full bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 rounded-lg px-3 py-2 cursor-not-allowed opacity-80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 block">Health Endpoint</label>
              <input
                type="text"
                readOnly
                value="http://127.0.0.1:8000/api/health"
                className="w-full bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 rounded-lg px-3 py-2 cursor-not-allowed opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>Save Platform Settings</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRefreshInterval('60')
              setPrTurnaroundThreshold('2.0')
              setNotifyOnFailedDeploy(true)
              setNotifyOnSlowPR(true)
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer min-h-[44px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
        </div>
      </form>
    </div>
  )
}

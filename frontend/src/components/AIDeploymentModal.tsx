import React, { useEffect, useState } from 'react'
import {
  Sparkles,
  X,
  AlertCircle,
  ShieldAlert,
  Terminal,
  CheckCircle2,
  RefreshCw,
  FolderGit2,
  ShieldCheck,
  ExternalLink,
  Workflow,
  Wrench,
  Search,
  Activity,
  GitBranch,
} from 'lucide-react'
import type { FailureAnalysisResult, GitHubRepoItem } from '../types/dashboard'

interface AIDeploymentModalProps {
  isOpen: boolean
  onClose: () => void
  repository: string
  runId: number
  workflowName?: string
  branch?: string
  runUrl?: string
  installedRepos?: GitHubRepoItem[]
  onSelectAnotherRun?: (repo: string, runId: number) => void
}

export const AIDeploymentModal: React.FC<AIDeploymentModalProps> = ({
  isOpen,
  onClose,
  repository: initialRepo,
  runId: initialRunId,
  workflowName: initialWorkflowName,
  branch: initialBranch,
  runUrl,
  installedRepos = [],
  onSelectAnotherRun,
}) => {
  const [selectedRepo, setSelectedRepo] = useState(initialRepo)
  const [runIdInput, setRunIdInput] = useState(
    initialRunId > 0 ? String(initialRunId) : ''
  )
  const [analysisResult, setAnalysisResult] = useState<FailureAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Update internal state when props change
  useEffect(() => {
    setSelectedRepo(initialRepo || (installedRepos[0]?.name ?? ''))
    setRunIdInput(initialRunId > 0 ? String(initialRunId) : '')
    setAnalysisResult(null)
    setError(null)

    if (isOpen && initialRepo && initialRunId > 0) {
      runFailureAnalysis(initialRepo, initialRunId)
    }
  }, [isOpen, initialRepo, initialRunId])

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const runFailureAnalysis = async (repo: string, targetRunId: number) => {
    if (!repo || !targetRunId || targetRunId <= 0) {
      setError('Please provide a valid repository and positive Workflow Run ID.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/analyze-deployment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository: repo,
          run_id: targetRunId,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Analysis failed (HTTP ${response.status})`)
      }

      const data: FailureAnalysisResult = await response.json()
      setAnalysisResult(data)
    } catch (err) {
      console.error('AI Deployment Analysis Error:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete AI Deployment Failure analysis. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedId = parseInt(runIdInput.trim(), 10)
    if (isNaN(parsedId) || parsedId <= 0) {
      setError('Please enter a valid positive Workflow Run ID.')
      return
    }
    if (onSelectAnotherRun) {
      onSelectAnotherRun(selectedRepo, parsedId)
    }
    runFailureAnalysis(selectedRepo, parsedId)
  }

  if (!isOpen) return null

  // Helper for confidence badge styling
  const getConfidenceBadge = (confidence: string) => {
    const normalized = confidence.toLowerCase()
    if (normalized === 'high') {
      return {
        label: 'High Confidence',
        className: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
        dotClass: 'bg-emerald-400',
      }
    }
    if (normalized === 'low') {
      return {
        label: 'Low Confidence',
        className: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
        dotClass: 'bg-amber-400',
      }
    }
    return {
      label: 'Medium Confidence',
      className: 'bg-sky-950/70 text-sky-300 border-sky-800/60',
      dotClass: 'bg-sky-400',
    }
  }

  const confidenceBadge = analysisResult
    ? getConfidenceBadge(analysisResult.confidence)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-deployment-title"
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-slate-800/80 bg-slate-900/90 gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="ai-deployment-title"
                  className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2"
                >
                  AI Deployment Failure Analyzer
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-rose-950/60 text-rose-300 border border-rose-800/50">
                  <ShieldCheck className="w-3 h-3 text-rose-400" />
                  <span>Strictly Read-Only</span>
                </span>
                {confidenceBadge && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${confidenceBadge.className}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${confidenceBadge.dotClass}`} />
                    <span>AI Diagnosis: {confidenceBadge.label}</span>
                  </span>
                )}
              </div>

              {/* Run Reference */}
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap font-mono">
                <span className="text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-none">
                  {selectedRepo || initialRepo}
                </span>
                {initialRunId > 0 && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-rose-400 font-semibold">Run #{initialRunId}</span>
                  </>
                )}
                {initialWorkflowName && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-slate-300 font-sans truncate max-w-[220px]" title={initialWorkflowName}>
                      {initialWorkflowName}
                    </span>
                  </>
                )}
                {initialBranch && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="inline-flex items-center gap-1 text-slate-400 font-sans">
                      <GitBranch className="w-3 h-3" />
                      <span>{initialBranch}</span>
                    </span>
                  </>
                )}
                {runUrl && (
                  <a
                    href={runUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors ml-1 font-sans"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close failure analyzer modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Quick Input Bar (for selecting any repo/run ID to analyze) */}
          <form
            onSubmit={handleManualSubmit}
            className="p-3 sm:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FolderGit2 className="w-4 h-4 text-slate-400 shrink-0" />
              <label htmlFor="modal-repo-select-run" className="sr-only">
                Repository
              </label>
              <select
                id="modal-repo-select-run"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                disabled={isLoading}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono w-full sm:w-auto"
              >
                {installedRepos.length > 0 ? (
                  installedRepos.map((repo) => (
                    <option key={repo.name} value={repo.name}>
                      {repo.name}
                    </option>
                  ))
                ) : (
                  <option value={selectedRepo}>{selectedRepo || 'Select repository'}</option>
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 shrink-0">Run ID</span>
              <label htmlFor="modal-run-input" className="sr-only">
                Workflow Run ID
              </label>
              <input
                id="modal-run-input"
                type="number"
                min="1"
                placeholder="e.g. 12345678"
                value={runIdInput}
                onChange={(e) => setRunIdInput(e.target.value)}
                disabled={isLoading}
                className="w-32 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={isLoading || !runIdInput}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Analyzing...' : 'Analyze Run'}</span>
              </button>
            </div>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="py-16 text-center space-y-4">
              <div className="relative inline-flex">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-600 flex items-center justify-center animate-pulse shadow-lg shadow-rose-500/30">
                  <Sparkles className="w-6 h-6 text-white animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Diagnosing CI/CD Failure with Gemini AI...
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Retrieving read-only workflow execution logs and job status from GitHub.
                  Extracting failed steps without heavy log downloads.
                </p>
              </div>

              {/* Skeleton placeholders */}
              <div className="max-w-xl mx-auto space-y-2.5 pt-4">
                <div className="h-4 bg-slate-800/80 rounded w-3/4 mx-auto animate-pulse" />
                <div className="h-4 bg-slate-800/60 rounded w-5/6 mx-auto animate-pulse" />
                <div className="h-4 bg-slate-800/40 rounded w-2/3 mx-auto animate-pulse" />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="p-4 sm:p-5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-200 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-rose-200">
                    AI Deployment Failure Analyzer Error
                  </h4>
                  <p className="text-xs text-rose-300/90">{error}</p>
                </div>
              </div>

              {error.includes('GEMINI_API_KEY') && (
                <div className="mt-2 p-3 rounded-lg bg-slate-950/60 border border-rose-900/40 text-[11px] font-mono text-slate-300">
                  <p className="text-slate-400 mb-1">To enable the AI Deployment Failure Analyzer:</p>
                  <p className="text-rose-300">1. Open backend/.env</p>
                  <p className="text-rose-300">2. Set GEMINI_API_KEY=your_key</p>
                  <p className="text-rose-300">3. Save and re-run this failure analysis</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    const parsed = parseInt(runIdInput, 10)
                    if (!isNaN(parsed) && parsed > 0) {
                      runFailureAnalysis(selectedRepo, parsed)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Analysis</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty Prompt State when no review has run yet */}
          {!analysisResult && !isLoading && !error && (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                <Workflow className="w-6 h-6 text-rose-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Ready to Diagnose CI/CD Workflow Runs
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Select a repository and enter a Workflow Run ID above, or click "Analyze Failure" on any failed run in your deployment list.
                </p>
              </div>
            </div>
          )}

          {/* Analysis Results Display */}
          {analysisResult && !isLoading && (
            <div className="space-y-6">
              {/* Executive Failure Summary Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                      Failure Summary
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    {analysisResult.failed_jobs_count > 0 && (
                      <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50">
                        {analysisResult.failed_jobs_count} Failed Job{analysisResult.failed_jobs_count > 1 ? 's' : ''}
                      </span>
                    )}
                    {analysisResult.model_used && (
                      <span className="text-slate-500">
                        Model: {analysisResult.model_used}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Root Cause / Likely Cause Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                    Likely Root Cause
                  </h3>
                </div>
                <p className="text-sm text-rose-200/90 leading-relaxed font-sans">
                  {analysisResult.likely_cause}
                </p>
              </div>

              {/* Evidence Section */}
              {analysisResult.evidence && analysisResult.evidence.length > 0 && (
                <div className="p-4 sm:p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Evidence & Failed Steps ({analysisResult.evidence.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.evidence.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-slate-300 font-mono bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/60"
                      >
                        <span className="text-rose-400 shrink-0 font-bold">&gt;</span>
                        <span className="leading-relaxed break-words">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Checks Grid */}
              {analysisResult.suggested_checks && analysisResult.suggested_checks.length > 0 && (
                <div className="p-4 sm:p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-sky-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                      Suggested Checks for Developers ({analysisResult.suggested_checks.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.suggested_checks.map((check, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50"
                      >
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{check}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Possible Fixes Grid */}
              {analysisResult.possible_fixes && analysisResult.possible_fixes.length > 0 && (
                <div className="p-4 sm:p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Possible Fixes & Recommendations ({analysisResult.possible_fixes.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.possible_fixes.map((fix, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{fix}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advisory Disclaimer */}
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {analysisResult.disclaimer ||
                    'AI-generated analysis. This diagnosis is advisory and may be incorrect. Verify actual workflow logs and repository code before making changes.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 text-center sm:text-left flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>Strictly Read-Only GitHub App integration. No write actions performed.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

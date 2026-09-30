import React, { useEffect, useState } from 'react'
import {
  Sparkles,
  X,
  AlertCircle,
  ShieldAlert,
  Bug,
  Code2,
  Zap,
  FlaskConical,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  FolderGit2,
  ShieldCheck,
  ExternalLink,
  Layers,
} from 'lucide-react'
import type { AIReviewResult, GitHubRepoItem } from '../types/dashboard'

interface AIReviewModalProps {
  isOpen: boolean
  onClose: () => void
  repository: string
  pullRequestNumber: number
  prTitle?: string
  prAuthor?: string
  prUrl?: string
  installedRepos?: GitHubRepoItem[]
  onSelectAnotherPR?: (repo: string, prNumber: number) => void
}

export const AIReviewModal: React.FC<AIReviewModalProps> = ({
  isOpen,
  onClose,
  repository: initialRepo,
  pullRequestNumber: initialPRNumber,
  prTitle: initialTitle,
  prAuthor: initialAuthor,
  prUrl,
  installedRepos = [],
  onSelectAnotherPR,
}) => {
  const [selectedRepo, setSelectedRepo] = useState(initialRepo)
  const [prNumberInput, setPrNumberInput] = useState(
    initialPRNumber > 0 ? String(initialPRNumber) : ''
  )
  const [reviewResult, setReviewResult] = useState<AIReviewResult | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Update internal state when props change
  useEffect(() => {
    setSelectedRepo(initialRepo || (installedRepos[0]?.name ?? ''))
    setPrNumberInput(initialPRNumber > 0 ? String(initialPRNumber) : '')
    setReviewResult(null)
    setError(null)

    if (isOpen && initialRepo && initialPRNumber > 0) {
      runAIReview(initialRepo, initialPRNumber)
    }
  }, [isOpen, initialRepo, initialPRNumber])

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

  const runAIReview = async (repo: string, prNum: number) => {
    if (!repo || !prNum || prNum <= 0) {
      setError('Please provide a valid repository and positive Pull Request number.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/review-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository: repo,
          pull_request_number: prNum,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Analysis failed (HTTP ${response.status})`)
      }

      const data: AIReviewResult = await response.json()
      setReviewResult(data)
    } catch (err) {
      console.error('AI Review Error:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete AI Pull Request review. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedNum = parseInt(prNumberInput.trim(), 10)
    if (isNaN(parsedNum) || parsedNum <= 0) {
      setError('Please enter a valid positive Pull Request number.')
      return
    }
    if (onSelectAnotherPR) {
      onSelectAnotherPR(selectedRepo, parsedNum)
    }
    runAIReview(selectedRepo, parsedNum)
  }

  if (!isOpen) return null

  // Helper for risk badge styling
  const getRiskBadge = (risk: string) => {
    const normalized = risk.toLowerCase()
    if (normalized === 'low') {
      return {
        label: 'Low Risk',
        className: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
        dotClass: 'bg-emerald-400',
      }
    }
    if (normalized === 'high') {
      return {
        label: 'High Risk',
        className: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
        dotClass: 'bg-rose-400 animate-pulse',
      }
    }
    return {
      label: 'Medium Risk',
      className: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
      dotClass: 'bg-amber-400',
    }
  }

  const riskBadge = reviewResult ? getRiskBadge(reviewResult.risk_level) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-review-title"
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-slate-800/80 bg-slate-900/90 gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="ai-review-title"
                  className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2"
                >
                  AI Pull Request Review
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-sky-950/60 text-sky-300 border border-sky-800/50">
                  <ShieldCheck className="w-3 h-3 text-sky-400" />
                  <span>Strictly Read-Only</span>
                </span>
                {riskBadge && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${riskBadge.className}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${riskBadge.dotClass}`} />
                    <span>AI Assessment: {riskBadge.label}</span>
                  </span>
                )}
              </div>

              {/* PR Reference */}
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap font-mono">
                <span className="text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-none">
                  {selectedRepo || initialRepo}
                </span>
                {initialPRNumber > 0 && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-sky-400 font-semibold">PR #{initialPRNumber}</span>
                  </>
                )}
                {initialTitle && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-slate-300 font-sans truncate max-w-[250px]" title={initialTitle}>
                      "{initialTitle}"
                    </span>
                  </>
                )}
                {initialAuthor && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-slate-400 font-sans">by @{initialAuthor}</span>
                  </>
                )}
                {prUrl && (
                  <a
                    href={prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors ml-1 font-sans"
                  >
                    <span>GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close review modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Quick Input Bar (for selecting any repo/PR to review) */}
          <form
            onSubmit={handleManualSubmit}
            className="p-3 sm:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FolderGit2 className="w-4 h-4 text-slate-400 shrink-0" />
              <label htmlFor="modal-repo-select" className="sr-only">
                Repository
              </label>
              <select
                id="modal-repo-select"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                disabled={isLoading}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono w-full sm:w-auto"
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
              <span className="text-slate-400 shrink-0">PR #</span>
              <label htmlFor="modal-pr-input" className="sr-only">
                Pull Request Number
              </label>
              <input
                id="modal-pr-input"
                type="number"
                min="1"
                placeholder="e.g. 1"
                value={prNumberInput}
                onChange={(e) => setPrNumberInput(e.target.value)}
                disabled={isLoading}
                className="w-24 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={isLoading || !prNumberInput}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Analyzing...' : 'Analyze PR'}</span>
              </button>
            </div>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="py-16 text-center space-y-4">
              <div className="relative inline-flex">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center animate-pulse shadow-lg shadow-sky-500/30">
                  <Sparkles className="w-6 h-6 text-white animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Analyzing Pull Request with Gemini AI...
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Retrieving read-only diffs from GitHub and analyzing code across bugs, security,
                  quality, performance, and testing.
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
                    AI Pull Request Review Error
                  </h4>
                  <p className="text-xs text-rose-300/90">{error}</p>
                </div>
              </div>

              {error.includes('GEMINI_API_KEY') && (
                <div className="mt-2 p-3 rounded-lg bg-slate-950/60 border border-rose-900/40 text-[11px] font-mono text-slate-300">
                  <p className="text-slate-400 mb-1">To enable the AI Pull Request Reviewer:</p>
                  <p className="text-sky-300">1. Open backend/.env</p>
                  <p className="text-sky-300">2. Set GEMINI_API_KEY=your_key</p>
                  <p className="text-sky-300">3. Save and refresh this review</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    const parsed = parseInt(prNumberInput, 10)
                    if (selectedRepo && parsed > 0) {
                      runAIReview(selectedRepo, parsed)
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}

          {/* Populated AI Review Result */}
          {reviewResult && !isLoading && (
            <div className="space-y-5 animate-fade-in">
              {/* Review PR Title Banner */}
              {reviewResult.title && (
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Pull Request #{reviewResult.pull_request_number}
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-0.5">
                      {reviewResult.title}
                    </h3>
                  </div>
                  {riskBadge && (
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 uppercase block">Risk Level</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${riskBadge.className}`}
                      >
                        {riskBadge.label}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 1. Summary Section */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-sky-400">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Change Summary
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {reviewResult.summary}
                </p>
              </div>

              {/* 2. Potential Bugs & Security Concerns (Side by side on desktop) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Potential Bugs */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Bug className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Potential Bugs
                    </h4>
                  </div>
                  {reviewResult.potential_bugs.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-300">
                      {reviewResult.potential_bugs.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400 font-bold shrink-0">&bull;</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>No potential correctness bugs identified in the reviewed changes.</span>
                    </p>
                  )}
                </div>

                {/* Security Concerns */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Security Concerns
                    </h4>
                  </div>
                  {reviewResult.security_concerns.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-300">
                      {reviewResult.security_concerns.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-rose-400 font-bold shrink-0">&bull;</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>No obvious security issues detected in the reviewed changes.</span>
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Code Quality & Performance (Side by side on desktop) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Code Quality */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-sky-400">
                    <Code2 className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Code Quality & Maintainability
                    </h4>
                  </div>
                  {reviewResult.code_quality.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-300">
                      {reviewResult.code_quality.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-sky-400 font-bold shrink-0">&bull;</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Code changes appear clean and well-structured.
                    </p>
                  )}
                </div>

                {/* Performance */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Zap className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Performance Considerations
                    </h4>
                  </div>
                  {reviewResult.performance.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-300">
                      {reviewResult.performance.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-indigo-400 font-bold shrink-0">&bull;</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No noticeable performance bottlenecks identified.
                    </p>
                  )}
                </div>
              </div>

              {/* 4. Testing Recommendations */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-400">
                  <FlaskConical className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Recommended Tests
                  </h4>
                </div>
                {reviewResult.testing_recommendations.length > 0 ? (
                  <ul className="space-y-2 text-xs text-slate-300">
                    {reviewResult.testing_recommendations.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold shrink-0">&bull;</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Verify existing test suite passes without regressions.
                  </p>
                )}
              </div>

              {/* 5. General Recommendations */}
              {reviewResult.recommendations.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Lightbulb className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Engineering Recommendations
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {reviewResult.recommendations.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">&rarr;</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Truncation warning if diff was large */}
              {reviewResult.is_truncated && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 text-[11px] text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {reviewResult.truncation_reason ||
                      'Note: Large change set. Diff was truncated to remain within safe AI processing bounds.'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Bar with AI Disclosure and Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <p className="leading-tight">
              <span className="font-semibold text-slate-400">AI Assessment: </span>
              {reviewResult?.disclaimer ||
                'AI analysis is advisory and may contain mistakes. Review the actual code and test results before making engineering decisions.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {reviewResult && (
              <button
                onClick={() => {
                  const parsed = parseInt(prNumberInput, 10)
                  if (selectedRepo && parsed > 0) {
                    runAIReview(selectedRepo, parsed)
                  }
                }}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Re-run Analysis</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

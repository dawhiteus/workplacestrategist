'use client'

import type { HVSReasoningOutput } from '@/lib/types'

interface Props { hvs: HVSReasoningOutput; metro: string }

function statusColor(score: number) {
  if (score >= 70) return { text: 'text-success', bar: '#28a745', badge: 'bg-green-50 border-green-200 text-success' }
  if (score >= 40) return { text: 'text-warning', bar: '#ffa500', badge: 'bg-orange-50 border-orange-200 text-warning' }
  return { text: 'text-danger', bar: '#dc3545', badge: 'bg-red-50 border-red-200 text-danger' }
}

function SubScore({ label, score, description }: { label: string; score: number; description: string }) {
  const { text, bar } = statusColor(score)
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-subtle uppercase tracking-wider">{label}</span>
        <span className={`text-sm font-bold ${text}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: bar }} />
      </div>
      <div className="text-xs text-subtle mt-1">{description}</div>
    </div>
  )
}

export function HVSScorecard({ hvs, metro }: Props) {
  const { text, bar, badge } = statusColor(hvs.hvs_composite)
  const recLabel = hvs.recommendation.replace(/_/g, ' ')

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-1">Hub Viability Score</div>
          <div className="text-sm text-body">{metro}</div>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-bold leading-none ${text}`}>{hvs.hvs_composite}</div>
          <div className="text-xs text-subtle mt-1">/100</div>
        </div>
      </div>

      <span className={`inline-flex items-center px-2.5 py-1 rounded-pill border text-xs font-semibold mb-4 ${badge}`}>
        {recLabel}
      </span>

      {/* Sub-scores */}
      <div className="flex gap-4 mb-4">
        <SubScore label="DVI" score={hvs.dvi.score} description="Demand Viability" />
        <div className="w-px bg-border" />
        <SubScore label="DCI" score={hvs.dci.score} description="Concentration" />
        <div className="w-px bg-border" />
        <SubScore label="ERI" score={hvs.eri.score} description="Econ. Return" />
      </div>

      {/* Composite bar */}
      <div className="border-t border-border pt-3">
        <div className="flex justify-between text-xs text-subtle mb-1.5">
          <span className="font-medium">Composite</span>
          <span>DVI 40% · DCI 30% · ERI 30%</span>
        </div>
        <div className="h-2.5 bg-border rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${hvs.hvs_composite}%`, backgroundColor: bar }} />
        </div>
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-subtle">0</span>
          <span className="text-danger">40</span>
          <span className="text-warning">70</span>
          <span className="text-success">100</span>
        </div>
      </div>
    </div>
  )
}

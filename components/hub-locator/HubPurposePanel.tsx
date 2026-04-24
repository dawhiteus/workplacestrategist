'use client'

import type { HubPurposeEnum, HWIOutput, CPIOutput } from '@/lib/types'

interface Props {
  hwi: HWIOutput | null
  cpi: CPIOutput | null
  hubPurpose: HubPurposeEnum | null
}

const PURPOSE_CONFIG: Record<HubPurposeEnum, {
  label: string
  desc: string
  bg: string
  text: string
  border: string
  quadrantBg: string
  barColor: string
}> = {
  FULL_COLLABORATION: {
    label: 'Full Collaboration',
    desc: 'Teams regularly converge for collaborative, multi-person work. Prioritise meeting rooms and collaborative seating — a hub here is the primary coordination point.',
    bg: 'bg-green-50', text: 'text-success', border: 'border-green-200',
    quadrantBg: 'bg-green-50', barColor: '#28a745',
  },
  LATENT_COLLABORATION: {
    label: 'Latent Collaboration',
    desc: 'Work patterns are collaboration-shaped but employees rarely appear in the same venue simultaneously. A hub can catalyse convergence by creating a reliable destination.',
    bg: 'bg-ls-50', text: 'text-ls-600', border: 'border-ls-100',
    quadrantBg: 'bg-ls-50', barColor: '#0066cc',
  },
  CULTURAL_ANCHOR: {
    label: 'Cultural Anchor',
    desc: 'Employees co-locate but book individual focus space. Design for open desks and ambient co-presence rather than formal meeting rooms.',
    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200',
    quadrantBg: 'bg-purple-50', barColor: '#7c3aed',
  },
  DISTRIBUTED_WORKFORCE: {
    label: 'Distributed Workforce',
    desc: 'Employees work individually and rarely co-locate. A fixed hub would be underutilised — a governed on-demand program is the recommended alternative.',
    bg: 'bg-orange-50', text: 'text-warning', border: 'border-orange-200',
    quadrantBg: 'bg-orange-50', barColor: '#ffa500',
  },
}

// [topLeft, topRight, bottomLeft, bottomRight]
const QUADRANT_ACTIVE: Record<HubPurposeEnum, [boolean, boolean, boolean, boolean]> = {
  CULTURAL_ANCHOR:       [true,  false, false, false],
  FULL_COLLABORATION:    [false, true,  false, false],
  DISTRIBUTED_WORKFORCE: [false, false, true,  false],
  LATENT_COLLABORATION:  [false, false, false, true],
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  const ragColor = score >= 70 ? '#28a745' : score >= 40 ? '#ffa500' : '#dc3545'
  return (
    <div className="relative h-1.5 bg-border rounded-full my-2">
      <div
        className="absolute top-0 left-0 h-full rounded-full transition-all"
        style={{ width: `${score}%`, backgroundColor: ragColor }}
      />
      {/* Threshold tick at 40 */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-subtle opacity-60"
        style={{ left: '40%' }}
      />
    </div>
  )
}

export function HubPurposePanel({ hwi, cpi, hubPurpose }: Props) {
  if (!hwi || !cpi || !hubPurpose) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Hub Purpose Classification</div>
            <div className="text-[11px] text-subtle mt-0.5">Based on Hybrid Worktype Index (HWI) · Co-Presence Index (CPI)</div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-pill border text-xs font-semibold bg-gray-50 border-gray-200 text-subtle">
            No Data
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center gap-1.5">
          <div className="text-sm text-subtle font-medium">Behavioral data not yet available</div>
          <div className="text-xs text-subtle opacity-70 max-w-md leading-relaxed">
            HWI and CPI are computed from individual booking records. This market is not yet covered by the behavioral dataset.
          </div>
        </div>
      </div>
    )
  }

  const config = PURPOSE_CONFIG[hubPurpose]
  const activeMap = QUADRANT_ACTIVE[hubPurpose]
  const dotX = Math.min(96, Math.max(4, hwi.score))
  const dotY = Math.min(96, Math.max(4, 100 - cpi.score))
  const hwiRag = hwi.score >= 70 ? 'text-success' : hwi.score >= 40 ? 'text-warning' : 'text-danger'
  const cpiRag = cpi.score >= 70 ? 'text-success' : cpi.score >= 40 ? 'text-warning' : 'text-danger'

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Hub Purpose Classification</div>
          <div className="text-[11px] text-subtle mt-0.5">Hybrid Worktype Index (HWI) · Co-Presence Index (CPI)</div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-pill border text-xs font-semibold whitespace-nowrap ${config.bg} ${config.border} ${config.text}`}>
          {config.label}
        </span>
      </div>

      {/* ── 2-column body ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-[168px_1fr] gap-5 items-start">

        {/* Left: quadrant chart */}
        <div>
          <div className="text-[9px] text-subtle text-center mb-1">↑ Convergent</div>
          <div
            className="relative border border-border-strong rounded-lg overflow-hidden"
            style={{ width: 168, height: 168 }}
          >
            {/* Four quadrant cells */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div className={`border-b border-r border-border flex items-start justify-start p-1.5 transition-colors ${activeMap[0] ? config.quadrantBg : 'bg-page'}`}>
                <span className={`text-[8px] font-semibold leading-tight ${activeMap[0] ? config.text : 'text-subtle opacity-30'}`}>Cultural Anchor</span>
              </div>
              <div className={`border-b border-border flex items-start justify-end p-1.5 transition-colors ${activeMap[1] ? config.quadrantBg : 'bg-page'}`}>
                <span className={`text-[8px] font-semibold leading-tight text-right ${activeMap[1] ? config.text : 'text-subtle opacity-30'}`}>Full Collaboration</span>
              </div>
              <div className={`border-r border-border flex items-end justify-start p-1.5 transition-colors ${activeMap[2] ? config.quadrantBg : 'bg-page'}`}>
                <span className={`text-[8px] font-semibold leading-tight ${activeMap[2] ? config.text : 'text-subtle opacity-30'}`}>Distributed WF</span>
              </div>
              <div className={`flex items-end justify-end p-1.5 transition-colors ${activeMap[3] ? config.quadrantBg : 'bg-page'}`}>
                <span className={`text-[8px] font-semibold leading-tight text-right ${activeMap[3] ? config.text : 'text-subtle opacity-30'}`}>Latent Collab</span>
              </div>
            </div>
            {/* Dividers */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border-strong opacity-40" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-border-strong opacity-40" />
            </div>
            {/* Customer dot */}
            <div
              className="absolute w-3 h-3 rounded-full bg-ls-600 border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: `${dotX}%`, top: `${dotY}%` }}
              title={`HWI: ${hwi.score} · CPI: ${cpi.score}`}
            />
          </div>
          <div className="text-[9px] text-subtle text-center mt-1">↓ Individual</div>
          <div className="flex justify-between text-[9px] text-subtle mt-1.5">
            <span>← Conc.</span>
            <span>Collab. →</span>
          </div>
        </div>

        {/* Right: description + scores */}
        <div className="flex flex-col gap-4">

          {/* Description — no repeated label, just the narrative */}
          <p className="text-sm text-body leading-relaxed">{config.desc}</p>

          {/* HWI + CPI score cards side by side */}
          <div className="grid grid-cols-2 gap-3">

            {/* HWI */}
            <div className="bg-page rounded-xl border border-border p-3">
              <div className="flex items-baseline justify-between">
                <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider">HWI</div>
                <div className={`text-2xl font-bold leading-none ${hwiRag}`}>{hwi.score}</div>
              </div>
              <ScoreBar score={hwi.score} color={config.barColor} />
              <div className="text-[10px] text-subtle leading-snug">
                <span className="text-body font-medium">{hwi.collaboration_seat_days.toLocaleString()}</span> collab ·{' '}
                <span className="text-body font-medium">{hwi.concentration_seat_days.toLocaleString()}</span> conc seat-days
              </div>
            </div>

            {/* CPI */}
            <div className="bg-page rounded-xl border border-border p-3">
              <div className="flex items-baseline justify-between">
                <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider">CPI</div>
                <div className={`text-2xl font-bold leading-none ${cpiRag}`}>{cpi.score}</div>
              </div>
              <ScoreBar score={cpi.score} color={config.barColor} />
              <div className="text-[10px] text-subtle leading-snug">
                <span className="text-body font-medium">{cpi.copresence_event_count.toLocaleString()}</span> co-presence events ·{' '}
                <span className="text-body font-medium">{cpi.total_venue_days.toLocaleString()}</span> venue-days
              </div>
            </div>

          </div>

          {/* Threshold — small, contextual, not orphaned */}
          <div className="text-[10px] text-subtle">
            Threshold: HWI ≥ 40 · CPI ≥ 40 · tick mark on each bar shows threshold
          </div>

        </div>
      </div>
    </div>
  )
}

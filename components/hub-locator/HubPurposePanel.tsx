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
}> = {
  FULL_COLLABORATION: {
    label: 'Full Collaboration',
    desc: 'Teams regularly converge for collaborative, multi-person work. A hub functions as the primary coordination point — prioritise meeting rooms and collaborative seating.',
    bg: 'bg-green-50',
    text: 'text-success',
    border: 'border-green-200',
    quadrantBg: 'bg-green-50',
  },
  LATENT_COLLABORATION: {
    label: 'Latent Collaboration',
    desc: 'Work patterns are collaboration-shaped but employees rarely appear in the same venue simultaneously. A hub can catalyse team convergence by creating a reliable destination.',
    bg: 'bg-ls-50',
    text: 'text-ls-600',
    border: 'border-ls-100',
    quadrantBg: 'bg-ls-50',
  },
  CULTURAL_ANCHOR: {
    label: 'Cultural Anchor',
    desc: 'Employees co-locate but primarily book individual focus space. A hub serves as a cultural touchstone — design for open desks and ambient co-presence, not formal meetings.',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    quadrantBg: 'bg-purple-50',
  },
  DISTRIBUTED_WORKFORCE: {
    label: 'Distributed Workforce',
    desc: 'Employees work individually and rarely co-locate. A fixed hub would be underutilised. Consider a governed on-demand program instead.',
    bg: 'bg-orange-50',
    text: 'text-warning',
    border: 'border-orange-200',
    quadrantBg: 'bg-orange-50',
  },
}

// Maps hub purpose to which quadrant cell is active:
// [topLeft, topRight, bottomLeft, bottomRight]
const QUADRANT_ACTIVE: Record<HubPurposeEnum, [boolean, boolean, boolean, boolean]> = {
  CULTURAL_ANCHOR:      [true,  false, false, false],
  FULL_COLLABORATION:   [false, true,  false, false],
  DISTRIBUTED_WORKFORCE:[false, false, true,  false],
  LATENT_COLLABORATION: [false, false, false, true],
}

function QuadrantCell({
  label,
  active,
  activeBg,
  activeText,
  align,
}: {
  label: string
  active: boolean
  activeBg: string
  activeText: string
  align: 'tl' | 'tr' | 'bl' | 'br'
}) {
  const posClass = {
    tl: 'items-start justify-start',
    tr: 'items-start justify-end',
    bl: 'items-end justify-start',
    br: 'items-end justify-end',
  }[align]

  return (
    <div className={`flex ${posClass} p-1.5 transition-colors ${active ? activeBg : 'bg-page'}`}>
      <span className={`text-[9px] font-semibold leading-tight ${active ? activeText : 'text-subtle opacity-40'}`}>
        {label}
      </span>
    </div>
  )
}

export function HubPurposePanel({ hwi, cpi, hubPurpose }: Props) {
  if (!hwi || !cpi || !hubPurpose) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Hub Purpose Classification
            </div>
            <div className="text-[11px] text-subtle mt-0.5">
              Based on Hybrid Worktype Index (HWI) · Co-Presence Index (CPI)
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-pill border text-xs font-semibold bg-gray-50 border-gray-200 text-subtle">
            No Data
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-7 text-center gap-2">
          <div className="text-sm text-subtle font-medium">No booking activity in this metro</div>
          <div className="text-xs text-subtle opacity-70 max-w-md leading-relaxed">
            HWI and CPI require reservation history to compute. Allstate has no LiquidSpace bookings recorded in this market — behavioral classification is not possible until booking activity begins.
          </div>
        </div>
      </div>
    )
  }

  const config = PURPOSE_CONFIG[hubPurpose]
  const activeMap = QUADRANT_ACTIVE[hubPurpose]

  // Dot position: x = hwi (left=0, right=100), y = inverted cpi (top=100, bottom=0)
  const dotX = Math.min(96, Math.max(4, hwi.score))
  const dotY = Math.min(96, Math.max(4, 100 - cpi.score))

  const hwiRag = hwi.score >= 70 ? 'text-success' : hwi.score >= 40 ? 'text-warning' : 'text-danger'
  const cpiRag = cpi.score >= 70 ? 'text-success' : cpi.score >= 40 ? 'text-warning' : 'text-danger'

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs font-semibold text-subtle uppercase tracking-wider">
            Hub Purpose Classification
          </div>
          <div className="text-[11px] text-subtle mt-0.5">
            Based on Hybrid Worktype Index (HWI) · Co-Presence Index (CPI)
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-pill border text-xs font-semibold whitespace-nowrap ml-4 ${config.bg} ${config.border} ${config.text}`}>
          {config.label}
        </span>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-5 items-start">

        {/* ── 2×2 Quadrant chart ─────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          {/* Y-axis top label */}
          <div className="text-[9px] text-subtle text-center whitespace-nowrap">↑ Convergent</div>

          <div className="flex items-center gap-1.5">
            {/* Y-axis title */}
            <div
              className="text-[9px] text-subtle whitespace-nowrap select-none"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.05em' }}
            >
              Co-Presence Index
            </div>

            {/* The 2x2 grid */}
            <div
              className="relative border border-border-strong rounded-lg overflow-hidden"
              style={{ width: 196, height: 196 }}
            >
              {/* Four quadrant cells */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                {/* Top-left: Cultural Anchor */}
                <div className={`border-b border-r border-border ${activeMap[0] ? config.quadrantBg : 'bg-page'} flex items-start justify-start p-1.5 transition-colors`}>
                  <span className={`text-[9px] font-semibold leading-tight ${activeMap[0] ? config.text : 'text-subtle opacity-40'}`}>Cultural Anchor</span>
                </div>
                {/* Top-right: Full Collaboration */}
                <div className={`border-b border-border ${activeMap[1] ? config.quadrantBg : 'bg-page'} flex items-start justify-end p-1.5 transition-colors`}>
                  <span className={`text-[9px] font-semibold leading-tight text-right ${activeMap[1] ? config.text : 'text-subtle opacity-40'}`}>Full Collaboration</span>
                </div>
                {/* Bottom-left: Distributed Workforce */}
                <div className={`border-r border-border ${activeMap[2] ? config.quadrantBg : 'bg-page'} flex items-end justify-start p-1.5 transition-colors`}>
                  <span className={`text-[9px] font-semibold leading-tight ${activeMap[2] ? config.text : 'text-subtle opacity-40'}`}>Distributed WF</span>
                </div>
                {/* Bottom-right: Latent Collaboration */}
                <div className={`${activeMap[3] ? config.quadrantBg : 'bg-page'} flex items-end justify-end p-1.5 transition-colors`}>
                  <span className={`text-[9px] font-semibold leading-tight text-right ${activeMap[3] ? config.text : 'text-subtle opacity-40'}`}>Latent Collab</span>
                </div>
              </div>

              {/* Axis divider lines */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border-strong opacity-50" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-border-strong opacity-50" />
              </div>

              {/* Customer dot */}
              <div
                className="absolute w-3.5 h-3.5 rounded-full bg-ls-600 border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: `${dotX}%`, top: `${dotY}%` }}
                title={`HWI: ${hwi.score} · CPI: ${cpi.score}`}
              />
            </div>
          </div>

          {/* Y-axis bottom label */}
          <div className="text-[9px] text-subtle text-center whitespace-nowrap">↓ Individual</div>

          {/* X-axis labels */}
          <div className="flex justify-between text-[9px] text-subtle px-0.5" style={{ width: 196, marginLeft: 18 }}>
            <span>← Concentration</span>
            <span>Collaboration →</span>
          </div>
          <div className="text-[9px] text-subtle text-center" style={{ marginLeft: 18 }}>
            Hybrid Worktype Index
          </div>
        </div>

        {/* ── Narrative card ───────────────────────────────── */}
        <div className={`rounded-xl border p-4 self-stretch flex flex-col justify-between ${config.bg} ${config.border}`}>
          <div>
            <div className={`text-xs font-semibold mb-1.5 ${config.text}`}>{config.label}</div>
            <div className="text-xs text-body leading-relaxed">{config.desc}</div>
          </div>
          <div className="mt-3 text-[10px] text-subtle">
            Threshold: HWI ≥ 40 · CPI ≥ 40
          </div>
        </div>

        {/* ── HWI metric ───────────────────────────────────── */}
        <div className="bg-page rounded-xl border border-border p-4 min-w-[100px]">
          <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-1">HWI Score</div>
          <div className={`text-3xl font-bold ${hwiRag}`}>{hwi.score}</div>
          <div className="text-[10px] text-subtle mt-2 leading-snug">
            <span className="font-medium text-body">{hwi.collaboration_seat_days.toLocaleString()}</span> collab seat-days
          </div>
          <div className="text-[10px] text-subtle leading-snug">
            <span className="font-medium text-body">{hwi.concentration_seat_days.toLocaleString()}</span> concentration seat-days
          </div>
        </div>

        {/* ── CPI metric ───────────────────────────────────── */}
        <div className="bg-page rounded-xl border border-border p-4 min-w-[100px]">
          <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-1">CPI Score</div>
          <div className={`text-3xl font-bold ${cpiRag}`}>{cpi.score}</div>
          <div className="text-[10px] text-subtle mt-2 leading-snug">
            <span className="font-medium text-body">{cpi.copresence_event_count.toLocaleString()}</span> co-presence events
          </div>
          <div className="text-[10px] text-subtle leading-snug">
            Avg group: <span className="font-medium text-body">{cpi.median_group_size}</span> · {cpi.total_venue_days.toLocaleString()} venue-days
          </div>
        </div>

      </div>
    </div>
  )
}

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
    desc: 'Teams regularly converge for collaborative work. A hub is the primary coordination point — prioritise meeting rooms and collaborative seating.',
    bg: 'bg-green-50', text: 'text-success', border: 'border-green-200', quadrantBg: 'bg-green-50',
  },
  LATENT_COLLABORATION: {
    label: 'Latent Collaboration',
    desc: 'Employees book collaborative space but rarely appear at the same venue on the same day. A hub can catalyse convergence by creating a reliable destination.',
    bg: 'bg-ls-50', text: 'text-ls-600', border: 'border-ls-100', quadrantBg: 'bg-ls-50',
  },
  CULTURAL_ANCHOR: {
    label: 'Cultural Anchor',
    desc: 'Employees co-locate but book individual focus space. Design for open desks and ambient co-presence — not formal meeting rooms.',
    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', quadrantBg: 'bg-purple-50',
  },
  DISTRIBUTED_WORKFORCE: {
    label: 'Distributed Workforce',
    desc: 'Employees work individually and rarely co-locate. A fixed hub would be underutilised — a governed on-demand program is the recommended alternative.',
    bg: 'bg-orange-50', text: 'text-warning', border: 'border-orange-200', quadrantBg: 'bg-orange-50',
  },
}

const QUADRANT_ACTIVE: Record<HubPurposeEnum, [boolean, boolean, boolean, boolean]> = {
  CULTURAL_ANCHOR:       [true,  false, false, false],
  FULL_COLLABORATION:    [false, true,  false, false],
  DISTRIBUTED_WORKFORCE: [false, false, true,  false],
  LATENT_COLLABORATION:  [false, false, false, true],
}

function hwiInterpretation(score: number) {
  if (score >= 70) return 'Collaboration-dominant'
  if (score >= 40) return 'Mixed booking types'
  return 'Concentration-dominant'
}

function cpiInterpretation(score: number) {
  if (score >= 70) return 'Frequent co-presence'
  if (score >= 40) return 'Moderate co-presence'
  return 'Mostly individual visits'
}

function ragColor(score: number) {
  return score >= 70 ? 'text-success' : score >= 40 ? 'text-warning' : 'text-danger'
}

export function HubPurposePanel({ hwi, cpi, hubPurpose }: Props) {
  if (!hwi || !cpi || !hubPurpose) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Hub Purpose Classification</div>
            <div className="text-[11px] text-subtle mt-0.5">Hybrid Worktype Index (HWI) · Co-Presence Index (CPI)</div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-pill border text-xs font-semibold bg-gray-50 border-gray-200 text-subtle">No Data</span>
        </div>
        <div className="flex flex-col items-center justify-center py-5 text-center gap-1.5">
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

  const totalSeatDays = hwi.collaboration_seat_days + hwi.concentration_seat_days
  const collabPct = totalSeatDays > 0 ? Math.round((hwi.collaboration_seat_days / totalSeatDays) * 100) : 0
  const concPct = 100 - collabPct

  const copresenceRate = cpi.total_venue_days > 0
    ? Math.round(cpi.total_venue_days / Math.max(1, cpi.copresence_event_count))
    : null

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Hub Purpose Classification</div>
          <div className="text-[11px] text-subtle mt-0.5">Hybrid Worktype Index (HWI) · Co-Presence Index (CPI)</div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-pill border text-xs font-semibold whitespace-nowrap ${config.bg} ${config.border} ${config.text}`}>
          {config.label}
        </span>
      </div>

      {/* Body: quadrant chart | description + 3 metric tiles */}
      <div className="grid grid-cols-[168px_1fr] gap-5 items-start">

        {/* Left: 2×2 quadrant */}
        <div>
          <div className="text-[9px] text-subtle text-center mb-1">↑ Convergent</div>
          <div className="relative border border-border-strong rounded-lg overflow-hidden" style={{ width: 168, height: 168 }}>
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div className={`border-b border-r border-border flex items-start justify-start p-1.5 ${activeMap[0] ? config.quadrantBg : 'bg-page'}`}>
                <span className={`text-[8px] font-semibold leading-tight ${activeMap[0] ? config.text : 'text-subtle opacity-30'}`}>Cultural Anchor</span>
              </div>
              <div className={`border-b border-border flex items-start justify-end p-1.5 ${activeMap[1] ? config.quadrantBg : 'bg-page'}`}>
                <span className={`text-[8px] font-semibold leading-tight text-right ${activeMap[1] ? config.text : 'text-subtle opacity-30'}`}>Full Collaboration</span>
              </div>
              <div className={`border-r border-border flex items-end justify-start p-1.5 ${activeMap[2] ? config.quadrantBg : 'bg-page'}`}>
                <span className={`text-[8px] font-semibold leading-tight ${activeMap[2] ? config.text : 'text-subtle opacity-30'}`}>Distributed WF</span>
              </div>
              <div className={`flex items-end justify-end p-1.5 ${activeMap[3] ? config.quadrantBg : 'bg-page'}`}>
                <span className={`text-[8px] font-semibold leading-tight text-right ${activeMap[3] ? config.text : 'text-subtle opacity-30'}`}>Latent Collab</span>
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border-strong opacity-40" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-border-strong opacity-40" />
            </div>
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

        {/* Right: description + 3 tiles */}
        <div className="flex flex-col gap-3">

          {/* Description */}
          <p className="text-sm text-body leading-relaxed">{config.desc}</p>

          {/* 3-tile metric row */}
          <div className="grid grid-cols-3 gap-3">

            {/* Tile 1: HWI */}
            <div className="bg-page rounded-xl border border-border p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-subtle uppercase tracking-wider">HWI</span>
                <span className="text-[9px] text-subtle">/ 100</span>
              </div>
              <div className={`text-3xl font-bold leading-none ${ragColor(hwi.score)}`}>{hwi.score}</div>
              <div className="text-[10px] text-subtle font-medium">{hwiInterpretation(hwi.score)}</div>
              {/* Threshold bar — fixed width, score mapped proportionally */}
              <div className="relative h-1 bg-border rounded-full mt-0.5">
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${hwi.score}%`,
                    backgroundColor: hwi.score >= 70 ? '#28a745' : hwi.score >= 40 ? '#ffa500' : '#dc3545',
                  }}
                />
                <div className="absolute top-1/2 -translate-y-1/2 w-px h-2.5 bg-subtle opacity-50" style={{ left: '40%' }} />
              </div>
              <div className="text-[10px] text-subtle mt-0.5">Threshold: 40</div>
            </div>

            {/* Tile 2: CPI */}
            <div className="bg-page rounded-xl border border-border p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-subtle uppercase tracking-wider">CPI</span>
                <span className="text-[9px] text-subtle">/ 100</span>
              </div>
              <div className={`text-3xl font-bold leading-none ${ragColor(cpi.score)}`}>{cpi.score}</div>
              <div className="text-[10px] text-subtle font-medium">{cpiInterpretation(cpi.score)}</div>
              <div className="relative h-1 bg-border rounded-full mt-0.5">
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${cpi.score}%`,
                    backgroundColor: cpi.score >= 70 ? '#28a745' : cpi.score >= 40 ? '#ffa500' : '#dc3545',
                  }}
                />
                <div className="absolute top-1/2 -translate-y-1/2 w-px h-2.5 bg-subtle opacity-50" style={{ left: '40%' }} />
              </div>
              <div className="text-[10px] text-subtle mt-0.5">
                {copresenceRate ? `1 in ${copresenceRate} days had 2+ employees` : `${cpi.copresence_event_count} co-presence events`}
              </div>
            </div>

            {/* Tile 3: Booking mix — the human-readable evidence behind HWI */}
            <div className="bg-page rounded-xl border border-border p-3 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-subtle uppercase tracking-wider">Booking Mix</span>
              <div className="text-[10px] text-subtle font-medium mt-0.5">Seat-day type split</div>

              {/* Split bar */}
              <div className="flex h-3 rounded-full overflow-hidden gap-px mt-1">
                <div
                  className="bg-ls-400 rounded-l-full transition-all"
                  style={{ width: `${collabPct}%`, minWidth: collabPct > 0 ? 2 : 0 }}
                  title={`Collaboration: ${collabPct}%`}
                />
                <div
                  className="bg-border rounded-r-full flex-1"
                  title={`Concentration: ${concPct}%`}
                />
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-ls-400 inline-block" />
                    <span className="text-subtle">Collaboration</span>
                  </span>
                  <span className="font-semibold text-body">{collabPct}%</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-border inline-block" />
                    <span className="text-subtle">Concentration</span>
                  </span>
                  <span className="font-semibold text-body">{concPct}%</span>
                </div>
              </div>

              <div className="text-[10px] text-subtle mt-0.5 border-t border-border pt-1.5">
                {totalSeatDays.toLocaleString()} total seat-days
              </div>
            </div>

          </div>

          <div className="text-[10px] text-subtle">
            Tick mark on each bar shows hub qualification threshold (40). Both indices must exceed 40 for hub-positive classification.
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { StressTestParams } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface Props {
  params: StressTestParams
  onParamsChange: (p: StressTestParams) => void
  annualSpend: number
  isLoading?: boolean
}

function Slider({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number
  format: (v: number) => string; onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-semibold text-subtle uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold text-body">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
        style={{ background: `linear-gradient(to right, #005b94 ${pct}%, #e5e7eb 0%)`, accentColor: '#005b94' }}
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-xs text-subtle">{format(min)}</span>
        <span className="text-xs text-subtle">{format(max)}</span>
      </div>
    </div>
  )
}

export function StressTestPanel({ params, onParamsChange, annualSpend, isLoading }: Props) {
  const [local, setLocal] = useState(params)
  function update(key: keyof StressTestParams, value: number) {
    const next = { ...local, [key]: value }
    setLocal(next)
    onParamsChange(next)
  }

  const hubAnnual = local.hubCostMonthly * 12
  const netSaving = annualSpend * (1 + local.inducedDemandUpliftPct / 100) - hubAnnual
  const isPositive = netSaving > 0

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Stress Test</div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-subtle">
            <Loader2 size={11} className="animate-spin text-ls-500" /> Recalculating
          </div>
        )}
      </div>
      {/* Interactive sliders — hidden in print */}
      <div className="print-sliders flex flex-col gap-4 mb-4">
        <Slider label="Hub Cost / Month" value={local.hubCostMonthly} min={2000} max={25000} step={500}
          format={v => formatCurrency(v, true)} onChange={v => update('hubCostMonthly', v)} />
        <Slider label="Induced Demand Uplift" value={local.inducedDemandUpliftPct} min={0} max={100} step={5}
          format={v => `+${v}%`} onChange={v => update('inducedDemandUpliftPct', v)} />
        <Slider label="Commute Radius" value={local.commuteRadiusMiles} min={5} max={60} step={5}
          format={v => `${v} mi`} onChange={v => update('commuteRadiusMiles', v)} />
      </div>

      {/* Print-only: static parameter summary */}
      <div className="print-stress-static hidden grid-cols-3 gap-2 mb-4 text-center">
        {[
          ['Hub Cost/mo', formatCurrency(local.hubCostMonthly, true)],
          ['Demand Uplift', `+${local.inducedDemandUpliftPct}%`],
          ['Commute Radius', `${local.commuteRadiusMiles} mi`],
        ].map(([label, val]) => (
          <div key={label} className="bg-page rounded-lg p-2 border border-border">
            <div className="text-[10px] text-subtle">{label}</div>
            <div className="text-xs font-bold text-body mt-0.5">{val}</div>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-border">
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Net Economics</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-page rounded-lg p-2.5">
            <div className="text-xs text-subtle">Hub Annual Cost</div>
            <div className="text-sm font-bold text-body mt-0.5">{formatCurrency(hubAnnual, true)}</div>
          </div>
          <div className={`rounded-lg p-2.5 ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="text-xs text-subtle">Net Saving</div>
            <div className={`text-sm font-bold mt-0.5 ${isPositive ? 'text-success' : 'text-danger'}`}>
              {isPositive ? '+' : ''}{formatCurrency(netSaving, true)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

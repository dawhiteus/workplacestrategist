'use client'

import { Users, Info } from 'lucide-react'

interface ProspectModeBannerProps {
  city: string
  enterpriseCount: number
}

export function ProspectModeBanner({ city, enterpriseCount }: ProspectModeBannerProps) {
  return (
    <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-4 no-print">
      <div className="w-7 h-7 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Users size={13} className="text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Prospect Mode</span>
          <span className="text-[10px] font-medium text-purple-600 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-pill">
            Platform Benchmark
          </span>
        </div>
        <p className="text-xs text-purple-700/80 leading-relaxed">
          Scores reflect a <strong>per-enterprise average</strong> based on{' '}
          <strong>{enterpriseCount} enterprise clients</strong> active in {city} on the LiquidSpace platform.
          Use the Stress Test panel to adjust hub cost and demand parameters and model your company's
          specific footprint.
        </p>
      </div>
      <Info size={12} className="text-purple-400 flex-shrink-0 mt-1" />
    </div>
  )
}

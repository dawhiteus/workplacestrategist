'use client'

import type { HVSReasoningOutput } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { MapPin, Users, TrendingUp, AlertCircle } from 'lucide-react'

const REC_STYLES: Record<string, string> = {
  STRONG_BUY: 'bg-green-50 border-green-200 text-success',
  BUY: 'bg-ls-50 border-ls-100 text-ls-600',
  MONITOR: 'bg-orange-50 border-orange-200 text-warning',
  INSUFFICIENT_DATA: 'bg-gray-50 border-gray-200 text-subtle',
  DO_NOT_PROCEED: 'bg-red-50 border-red-200 text-danger',
}

export function RecommendationCard({ hvs }: { hvs: HVSReasoningOutput }) {
  const recStyle = REC_STYLES[hvs.recommendation] || REC_STYLES.INSUFFICIENT_DATA
  const label = hvs.recommendation.replace(/_/g, ' ')
  const netPositive = hvs.economic_roi.net_saving >= 0

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Recommendation</div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-pill border text-xs font-semibold ${recStyle}`}>{label}</span>
      </div>

      <p className="text-sm text-body leading-relaxed mb-5">{hvs.recommendation_narrative}</p>

      {/* Hub specs */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-page rounded-xl border border-border p-3">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-subtle uppercase tracking-wider">
            <MapPin size={11} className="text-ls-500" /> Hub Location
          </div>
          <div className="text-sm font-medium text-body">
            {hvs.recommended_hub_location?.lat != null
              ? `${hvs.recommended_hub_location.lat.toFixed(4)}, ${hvs.recommended_hub_location.lng.toFixed(4)}`
              : 'Location TBD'}
          </div>
          <div className="text-xs text-subtle mt-1">{hvs.recommended_hub_location?.description ?? '—'}</div>
        </div>
        <div className="bg-page rounded-xl border border-border p-3">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-subtle uppercase tracking-wider">
            <Users size={11} className="text-ls-500" /> Hub Size
          </div>
          <div className="text-lg font-bold text-body">
            {hvs.recommended_hub_size.min_seats}–{hvs.recommended_hub_size.max_seats}
            <span className="text-sm font-normal text-subtle ml-1">seats</span>
          </div>
        </div>
      </div>

      {/* ROI grid */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-subtle uppercase tracking-wider">
            <TrendingUp size={11} className="text-success" /> Economic ROI
          </div>
          {[
            ['Baseline Spend', formatCurrency(hvs.economic_roi.annual_spend_baseline, true) + '/yr', 'text-body'],
            ['Hub Annual Cost', formatCurrency(hvs.economic_roi.hub_annual_cost, true) + '/yr', 'text-body'],
            ['Net Saving', (netPositive ? '+' : '') + formatCurrency(hvs.economic_roi.net_saving, true) + '/yr', netPositive ? 'text-success font-semibold' : 'text-danger font-semibold'],
            ['Payback', hvs.economic_roi.payback_months < 999 ? `${hvs.economic_roi.payback_months} months` : 'N/A', 'text-body'],
          ].map(([label, value, cls]) => (
            <div key={label} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
              <span className="text-subtle">{label}</span>
              <span className={cls}>{value}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-subtle uppercase tracking-wider">
            <Users size={11} className="text-ls-500" /> Workforce ROI
          </div>
          {[
            ['Commute Reduction', `−${hvs.workforce_roi.avg_commute_reduction_miles}mi avg`],
            ['Employees Benefited', formatNumber(hvs.workforce_roi.employees_benefited)],
            ['Retention Lift Est.', `+${hvs.workforce_roi.estimated_retention_lift_pct}%`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
              <span className="text-subtle">{label}</span>
              <span className="text-body font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What would change it */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-subtle uppercase tracking-wider">
          <AlertCircle size={11} className="text-warning" /> What Would Change This
        </div>
        <ul className="space-y-1">
          {hvs.what_would_change_it.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-body">
              <span className="text-ls-400 mt-0.5">·</span>{item}
            </li>
          ))}
        </ul>
      </div>

      {/* Critical unknowns */}
      <div>
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Critical Unknowns</div>
        <ul className="space-y-1">
          {hvs.critical_unknowns.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-subtle">
              <span className="font-mono text-xs mt-0.5">?</span>{item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

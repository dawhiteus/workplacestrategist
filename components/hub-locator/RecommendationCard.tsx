'use client'

import { useState } from 'react'
import type { HVSReasoningOutput } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { MapPin, Users, TrendingUp, AlertCircle, CheckCircle2, ExternalLink, Building2, ArrowRight } from 'lucide-react'

const REC_STYLES: Record<string, string> = {
  STRONG_BUY: 'bg-green-50 border-green-200 text-success',
  BUY: 'bg-ls-50 border-ls-100 text-ls-600',
  MONITOR: 'bg-orange-50 border-orange-200 text-warning',
  INSUFFICIENT_DATA: 'bg-gray-50 border-gray-200 text-subtle',
  DO_NOT_PROCEED: 'bg-red-50 border-red-200 text-danger',
  ALTERNATIVE_INTERVENTION: 'bg-purple-50 border-purple-200 text-purple-700',
}

interface Props {
  hvs: HVSReasoningOutput
  metro?: string
  onOriginate?: (reqId: string) => void
}

function generateReqId(): string {
  return `REQ-${Math.floor(1000 + Math.random() * 9000)}`
}

export function RecommendationCard({ hvs, metro, onOriginate }: Props) {
  const [originatedId, setOriginatedId] = useState<string | null>(null)
  const [originatedAt, setOriginatedAt] = useState<Date | null>(null)

  const recStyle = REC_STYLES[hvs.recommendation] || REC_STYLES.INSUFFICIENT_DATA
  const label = hvs.recommendation.replace(/_/g, ' ')
  const netPositive = hvs.economic_roi.net_saving >= 0

  const canOriginate =
    (hvs.recommendation === 'STRONG_BUY' || hvs.recommendation === 'BUY') && !originatedId

  function handleOriginate() {
    const reqId = generateReqId()
    const now = new Date()
    setOriginatedId(reqId)
    setOriginatedAt(now)
    onOriginate?.(reqId)
    // Broadcast for RightRail
    window.dispatchEvent(
      new CustomEvent('hub-originated', {
        detail: { reqId, city: metro ?? 'Unknown', timestamp: now.toISOString() },
      })
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Recommendation</div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-pill border text-xs font-semibold ${recStyle}`}>
          {label}
        </span>
      </div>

      <p className="text-sm text-body leading-relaxed mb-5">{hvs.recommendation_narrative}</p>

      {/* ── Alternative Intervention ─────────────────────────────────────── */}
      {hvs.recommendation === 'ALTERNATIVE_INTERVENTION' && hvs.alternative_intervention && (
        <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 size={12} className="text-purple-600" />
            <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
              Recommended Intervention: {hvs.alternative_intervention.intervention_type.replace(/_/g, ' ')}
            </div>
          </div>
          <p className="text-xs text-body leading-relaxed mb-3">{hvs.alternative_intervention.rationale}</p>
          <div className="flex items-start gap-2 bg-white/60 rounded-lg p-2.5 border border-purple-100">
            <ArrowRight size={11} className="text-purple-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-body leading-relaxed">{hvs.alternative_intervention.suggested_next_step}</p>
          </div>
        </div>
      )}

      {/* ── Hub specs ───────────────────────────────────────────────────── */}
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

      {/* ── Programmatic Hub Configuration ──────────────────────────────── */}
      {hvs.recommended_hub_configuration && (
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-subtle uppercase tracking-wider">
            <Building2 size={11} className="text-ls-500" /> Programmatic Hub Configuration
          </div>
          <div className="bg-page rounded-xl border border-border p-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: 'Private Offices', value: hvs.recommended_hub_configuration.private_offices },
                { label: 'Dedicated Desks', value: hvs.recommended_hub_configuration.dedicated_desks },
                { label: 'Hot Desks', value: hvs.recommended_hub_configuration.hot_desks },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className="text-xl font-bold text-body">{item.value}</div>
                  <div className="text-[10px] text-subtle mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 mb-3">
              <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-1.5">Meeting Rooms</div>
              <div className="flex gap-2 flex-wrap">
                {hvs.recommended_hub_configuration.meeting_rooms.map(mr => (
                  <div key={mr.capacity} className="flex items-center gap-1 bg-ls-50 border border-ls-100 rounded-lg px-2 py-1">
                    <span className="text-xs font-bold text-ls-600">{mr.count}×</span>
                    <span className="text-xs text-body">{mr.capacity}-person</span>
                  </div>
                ))}
                <div className="flex items-center gap-1 bg-gray-50 border border-border rounded-lg px-2 py-1">
                  <span className="text-xs font-bold text-body">{hvs.recommended_hub_configuration.phone_booths}×</span>
                  <span className="text-xs text-subtle">Phone booth</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-border pt-3">
              <span className="text-subtle">Anchor-day capacity factor</span>
              <span className="font-semibold text-body">{hvs.recommended_hub_configuration.anchor_day_capacity_factor}×</span>
            </div>

            <p className="text-[10px] text-subtle leading-relaxed mt-2 italic">
              {hvs.recommended_hub_configuration.configuration_rationale}
            </p>
          </div>
        </div>
      )}

      {/* ── Originate Sourcing Requirement ──────────────────────────────── */}
      {(hvs.recommendation === 'STRONG_BUY' || hvs.recommendation === 'BUY') && (
        <div className="mb-5">
          {originatedId && originatedAt ? (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-3.5">
              <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-success mb-0.5">
                  {originatedId} · Originated in Transaction Manager
                </div>
                <div className="text-[10px] text-subtle">
                  {originatedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
                <a
                  href="http://localhost:5175"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-ls-600 hover:text-ls-700 transition-colors"
                >
                  View in Transaction Manager <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ) : (
            <button
              onClick={handleOriginate}
              className="w-full flex items-center justify-center gap-2 bg-ls-600 hover:bg-ls-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm"
            >
              <Building2 size={14} />
              Originate Sourcing Requirement
            </button>
          )}
        </div>
      )}

      {/* ── ROI grid ────────────────────────────────────────────────────── */}
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
          ].map(([lbl, value, cls]) => (
            <div key={lbl} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
              <span className="text-subtle">{lbl}</span>
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
          ].map(([lbl, value]) => (
            <div key={lbl} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
              <span className="text-subtle">{lbl}</span>
              <span className="text-body font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── What would change it ─────────────────────────────────────────── */}
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

      {/* ── Critical unknowns ────────────────────────────────────────────── */}
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

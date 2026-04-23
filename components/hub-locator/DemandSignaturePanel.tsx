'use client'

import type { DailyDemand } from '@/lib/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface Props { dailyDemand: DailyDemand[]; metro: string }

function aggregateByWeek(demand: DailyDemand[]) {
  const weeks: Record<string, { bookings: number; spend: number }> = {}
  for (const d of demand) {
    const date = new Date(d.day)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const key = weekStart.toISOString().split('T')[0]
    if (!weeks[key]) weeks[key] = { bookings: 0, spend: 0 }
    weeks[key].bookings += d.bookings
    weeks[key].spend += d.spend
  }
  return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).map(([week, data]) => ({
    week,
    bookings: data.bookings,
    spend: data.spend,
    label: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 text-xs shadow-modal">
      <div className="text-subtle mb-1">{label}</div>
      <div className="font-semibold text-body">{payload[0]?.value} bookings</div>
    </div>
  )
}

export function DemandSignaturePanel({ dailyDemand, metro }: Props) {
  const weekly = aggregateByWeek(dailyDemand)
  const totalBookings = weekly.reduce((s, w) => s + w.bookings, 0)
  const avgWeekly = totalBookings / (weekly.length || 1)
  const peakWeek = weekly.reduce((m, w) => w.bookings > m.bookings ? w : m, weekly[0] || { bookings: 0, label: '-' })
  const activeDays = dailyDemand.length
  const spikeDays = dailyDemand.filter(d => d.bookings > (totalBookings / activeDays) * 2).length

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-1">Demand Signature · 12mo</div>
          <div className="text-sm text-body">{metro}</div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-lg font-bold text-body">{totalBookings}</div>
            <div className="text-xs text-subtle">bookings</div>
          </div>
          <div>
            <div className="text-lg font-bold text-warning">{peakWeek.bookings}</div>
            <div className="text-xs text-subtle">peak wk</div>
          </div>
        </div>
      </div>

      {weekly.length > 0 ? (
        <div className="demand-chart-wrapper" style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 4, right: 8, bottom: 0, left: -24 }} barSize={Math.max(2, Math.min(8, 560 / weekly.length - 2))}>
              <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(weekly.length / 5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,91,148,0.05)' }} />
              <ReferenceLine y={avgWeekly} stroke="#6b7280" strokeDasharray="3 3" strokeWidth={1}
                label={{ value: `avg`, fill: '#6b7280', fontSize: 9, position: 'right' }} />
              <ReferenceLine y={avgWeekly * 2} stroke="#ffa500" strokeDasharray="2 4" strokeWidth={1}
                label={{ value: '2×', fill: '#ffa500', fontSize: 9, position: 'right' }} />
              <Bar dataKey="bookings" fill="#005b94" opacity={0.8} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="demand-chart-wrapper flex items-center justify-center text-subtle text-sm" style={{ height: 130 }}>No demand data available</div>
      )}

      <div className="flex gap-5 mt-3 pt-3 border-t border-border">
        {[
          { label: 'Avg Weekly', value: avgWeekly.toFixed(1), unit: 'bookings' },
          { label: 'Spike Days', value: String(spikeDays), unit: 'days >2× avg' },
          { label: 'Active Days', value: String(activeDays), unit: 'with bookings' },
        ].map(s => (
          <div key={s.label}>
            <div className="text-xs font-semibold text-subtle uppercase tracking-wider">{s.label}</div>
            <div className="text-base font-bold text-body mt-0.5">{s.value} <span className="text-xs font-normal text-subtle">{s.unit}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}

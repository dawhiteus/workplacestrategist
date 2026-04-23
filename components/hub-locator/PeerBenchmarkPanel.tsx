'use client'

import type { PeerBenchmark } from '@/lib/types'

interface Props { peers: PeerBenchmark | null; yourScore: number; metro: string }

export function PeerBenchmarkPanel({ peers, yourScore, metro }: Props) {
  if (!peers) return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">
      <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Peer Benchmark</div>
      <div className="text-sm text-subtle text-center py-4">
        Insufficient peer data<br />
        <span className="text-xs opacity-60">Requires ≥5 enterprises in {metro}</span>
      </div>
    </div>
  )

  const scoreColor = yourScore >= 70 ? 'text-success' : yourScore >= 40 ? 'text-warning' : 'text-danger'
  const markers = [
    { label: 'Median', value: peers.median_hvs, color: '#6b7280' },
    { label: 'P75', value: peers.top_quartile_hvs, color: '#ffa500' },
    { label: 'You', value: yourScore, color: yourScore >= 70 ? '#28a745' : yourScore >= 40 ? '#ffa500' : '#dc3545' },
  ]

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider">Peer Benchmark</div>
        <div className="text-xs text-subtle">n={peers.sample_size} · anonymized</div>
      </div>
      <div className="flex items-end gap-3 mb-4">
        <div className={`text-4xl font-bold ${scoreColor}`}>
          {peers.percentile}<span className="text-lg font-normal text-subtle">th</span>
        </div>
        <div className="text-xs text-subtle leading-snug mb-1">
          {peers.percentile >= 75 ? 'Top quartile in market' : peers.percentile >= 50 ? 'Above median' : 'Below median'}
        </div>
      </div>
      {/* Distribution bar */}
      <div className="relative h-2.5 bg-border rounded-full mb-6">
        {markers.map(m => (
          <div key={m.label} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${Math.min(96, Math.max(4, m.value))}%` }}>
            <div className="w-2 h-5 rounded-sm -mt-1" style={{ backgroundColor: m.color, opacity: m.label === 'You' ? 1 : 0.5 }} />
            <div className="absolute text-[9px] font-medium whitespace-nowrap -bottom-5 left-1/2 -translate-x-1/2" style={{ color: m.color }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
        {[
          { label: 'Your HVS', value: String(yourScore), color: scoreColor },
          { label: 'Median', value: String(peers.median_hvs), color: 'text-subtle' },
          { label: 'Top 25%', value: String(peers.top_quartile_hvs), color: 'text-warning' },
        ].map(s => (
          <div key={s.label}>
            <div className="text-xs text-subtle">{s.label}</div>
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import type { MetroSummary } from '@/lib/types'
import { formatCurrency, formatNumber, ragColor, ragStatus } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface PortfolioTableProps {
  metros: MetroSummary[]
  enterprise: string
  selectedCity?: string
  selectedState?: string
}

function hvsProxyScore(metro: MetroSummary): number {
  // Quick proxy score for table — full score computed in detail view
  const volumeScore = Math.min(40, (metro.reservations / 10) * 40)
  const concentrationBonus = metro.reservations / metro.venues > 15 ? 15 : 5
  const memberEfficiency = metro.reservations / metro.members > 5 ? 10 : 0
  return Math.min(100, Math.round(volumeScore + concentrationBonus + memberEfficiency + 20))
}

export function PortfolioTable({
  metros,
  enterprise,
  selectedCity,
  selectedState,
}: PortfolioTableProps) {
  return (
    <div className="bg-surface border border-border-default rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-default">
        <span className="text-[10px] font-mono text-secondary uppercase tracking-widest">
          Portfolio · {metros.length} Markets
        </span>
        <span className="text-[10px] text-muted font-mono">
          {formatCurrency(metros.reduce((s, m) => s + m.total_spend, 0), true)} total spend
        </span>
      </div>

      {/* Table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="text-left px-4 py-2 text-[10px] font-mono text-muted uppercase tracking-widest">Market</th>
            <th className="text-right px-3 py-2 text-[10px] font-mono text-muted uppercase tracking-widest">HVS</th>
            <th className="text-right px-3 py-2 text-[10px] font-mono text-muted uppercase tracking-widest">Reservations</th>
            <th className="text-right px-3 py-2 text-[10px] font-mono text-muted uppercase tracking-widest">Spend</th>
            <th className="text-right px-3 py-2 text-[10px] font-mono text-muted uppercase tracking-widest">Venues</th>
            <th className="text-right px-3 py-2 text-[10px] font-mono text-muted uppercase tracking-widest">Members</th>
            <th className="w-6" />
          </tr>
        </thead>
        <tbody>
          {metros.map((metro, i) => {
            const proxy = hvsProxyScore(metro)
            const status = ragStatus(proxy)
            const color = ragColor(status)
            const isSelected = metro.city === selectedCity && metro.state === selectedState
            const citySlug = encodeURIComponent(metro.city)
            const stateSlug = encodeURIComponent(metro.state)

            return (
              <tr
                key={`${metro.city}-${metro.state}`}
                className={cn(
                  'border-b border-border-subtle transition-colors group',
                  isSelected
                    ? 'bg-accent/5 border-accent/20'
                    : 'hover:bg-hover'
                )}
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/hub-locator/${citySlug}/${stateSlug}?enterprise=${encodeURIComponent(enterprise)}`}
                    className="font-medium text-primary hover:text-accent transition-colors"
                  >
                    {metro.city}
                  </Link>
                  <span className="text-muted ml-1.5 text-[10px] font-mono">{metro.state}</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="font-mono font-semibold text-sm" style={{ color }}>
                    {proxy}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-secondary">
                  {formatNumber(metro.reservations)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-primary">
                  {formatCurrency(metro.total_spend, true)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-secondary">
                  {metro.venues}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-secondary">
                  {metro.members}
                </td>
                <td className="pr-3">
                  <ChevronRight size={12} className="text-muted group-hover:text-accent transition-colors" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

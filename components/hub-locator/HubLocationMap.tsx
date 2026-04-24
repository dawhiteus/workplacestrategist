'use client'

import dynamic from 'next/dynamic'
import type { VenueLocation, HVSReasoningOutput } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

const MapWithNoSSR = dynamic(() => import('./MapInner'), { ssr: false })

interface HubLocationMapProps {
  venues: VenueLocation[]
  hvs: HVSReasoningOutput
  metro: string
}

const HUB_POSITIVE = new Set(['STRONG_BUY', 'BUY'])

export function HubLocationMap({ venues, hvs, metro }: HubLocationMapProps) {
  const hub = hvs.recommended_hub_location
  const showHub = HUB_POSITIVE.has(hvs.recommendation) && hub?.lat != null

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="text-xs font-semibold text-subtle uppercase tracking-wider">
          Hub Location · {metro}
        </div>
        <div className="flex items-center gap-3 text-xs text-subtle">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-ls-500 inline-block" /> Venues
          </span>
          {showHub && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success inline-block" /> Rec. Hub
            </span>
          )}
        </div>
      </div>

      {/* Interactive map — hidden in print (Leaflet tiles don't render) */}
      <div className="print-map-hide h-[280px]">
        <MapWithNoSSR venues={venues} hvs={hvs} showHub={showHub} />
      </div>

      {/* Print-only: hub location summary replaces map */}
      <div className="print-only hidden px-4 py-3 bg-ls-50 border-b border-ls-100">
        <div className="text-xs font-semibold text-ls-600 uppercase tracking-wider mb-1">Recommended Hub Location</div>
        {showHub && hub?.lat != null ? (
          <div className="text-sm font-medium text-body">
            {hub.lat.toFixed(4)}°N, {Math.abs(hub.lng).toFixed(4)}°W
          </div>
        ) : null}
        {hub?.description && (
          <div className="text-xs text-subtle mt-0.5">{hub.description}</div>
        )}
      </div>

      {/* Venue list — first 4 on screen, all in print */}
      <div className="border-t border-border">
        {venues.map((v, i) => (
          <div
            key={v.venue_id}
            className={`flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 hover:bg-page transition-colors${i >= 4 ? ' print-only hidden' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-subtle w-4">{i + 1}</span>
              <div>
                <div className="text-xs font-medium text-body">{v.venue_name}</div>
                <div className="text-[10px] text-subtle mt-0.5">
                  {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-body">{formatCurrency(v.spend, true)}</div>
              <div className="text-[10px] text-subtle">{v.reservations} bkgs</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { VenueLocation, HVSReasoningOutput } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import 'leaflet/dist/leaflet.css'

interface MapInnerProps {
  venues: VenueLocation[]
  hvs: HVSReasoningOutput
  showHub?: boolean
}

function FitBounds({ venues, hvs, showHub }: MapInnerProps) {
  const map = useMap()

  useEffect(() => {
    if (venues.length === 0) return
    const hub = hvs.recommended_hub_location
    const lats = [...venues.map(v => v.latitude), ...(showHub && hub?.lat != null ? [hub.lat] : [])]
    const lngs = [...venues.map(v => v.longitude), ...(showHub && hub?.lng != null ? [hub.lng] : [])]
    const sw: [number, number] = [Math.min(...lats) - 0.02, Math.min(...lngs) - 0.02]
    const ne: [number, number] = [Math.max(...lats) + 0.02, Math.max(...lngs) + 0.02]
    map.fitBounds([sw, ne], { padding: [20, 20] })
  }, [venues, hvs, map])

  return null
}

export default function MapInner({ venues, hvs, showHub }: MapInnerProps) {
  const hub = hvs.recommended_hub_location

  const center: [number, number] =
    venues.length > 0
      ? [venues[0].latitude, venues[0].longitude]
      : hub?.lat != null
        ? [hub.lat, hub.lng]
        : [39.8283, -98.5795] // geographic center of US as fallback

  const maxSpend = Math.max(...venues.map(v => v.spend), 1)

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: '100%', width: '100%', background: '#f8f9fa' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
      />

      <FitBounds venues={venues} hvs={hvs} showHub={showHub} />

      {venues.map(v => {
        const radius = 5 + (v.spend / maxSpend) * 14
        return (
          <CircleMarker
            key={v.venue_id}
            center={[v.latitude, v.longitude]}
            radius={radius}
            pathOptions={{ color: '#005b94', fillColor: '#005b94', fillOpacity: 0.65, weight: 1.5 }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: 4 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#374151' }}>{v.venue_name}</div>
                <div style={{ color: '#6b7280' }}>{formatCurrency(v.spend, true)} · {v.reservations} bookings</div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {showHub && hub?.lat != null && (
        <CircleMarker
          center={[hub.lat, hub.lng]}
          radius={18}
          pathOptions={{ color: '#28a745', fillColor: '#28a745', fillOpacity: 0.15, weight: 2, dashArray: '5 4' }}
        >
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: 4 }}>
              <div style={{ fontWeight: 600, color: '#28a745', marginBottom: 4 }}>Recommended Hub</div>
              {hub.description && <div style={{ color: '#6b7280' }}>{hub.description}</div>}
              <div style={{ color: '#6b7280', marginTop: 4 }}>
                {hvs.recommended_hub_size.min_seats}–{hvs.recommended_hub_size.max_seats} seats
              </div>
            </div>
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  )
}

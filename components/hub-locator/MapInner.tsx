'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
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

// SVG pin icon for the recommended hub location
function makeHubIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z"
        fill="#16a34a" stroke="#fff" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="#fff"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  })
}

export default function MapInner({ venues, hvs, showHub }: MapInnerProps) {
  const hub = hvs.recommended_hub_location

  const center: [number, number] =
    venues.length > 0
      ? [venues[0].latitude, venues[0].longitude]
      : hub?.lat != null
        ? [hub.lat, hub.lng]
        : [39.8283, -98.5795] // geographic center of US as fallback

  const maxReservations = Math.max(...venues.map(v => v.reservations), 1)

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
        // Dot size proportional to booking volume — more bookings = larger dot
        const radius = 5 + (v.reservations / maxReservations) * 14
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
                <div style={{ color: '#6b7280' }}>{v.reservations} bookings · {formatCurrency(v.spend, true)}</div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {showHub && hub?.lat != null && (
        <Marker
          position={[hub.lat, hub.lng]}
          icon={makeHubIcon()}
        >
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: 4 }}>
              <div style={{ fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>Recommended Hub Location</div>
              {hub.description && <div style={{ color: '#6b7280' }}>{hub.description}</div>}
              <div style={{ color: '#6b7280', marginTop: 4 }}>
                {hvs.recommended_hub_size.min_seats}–{hvs.recommended_hub_size.max_seats} seats
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}

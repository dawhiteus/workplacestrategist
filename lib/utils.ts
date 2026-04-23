import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RAGStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ragStatus(score: number): RAGStatus {
  if (score >= 70) return 'green'
  if (score >= 40) return 'amber'
  return 'red'
}

export function ragLabel(status: RAGStatus): string {
  return status.toUpperCase()
}

export function ragColor(status: RAGStatus): string {
  return { green: '#00c96e', amber: '#f0a020', red: '#e84040' }[status]
}

export function formatCurrency(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function weightedCentroid(
  points: Array<{ lat: number; lng: number; weight: number }>
): { lat: number; lng: number } | null {
  if (points.length === 0) return null
  const totalWeight = points.reduce((s, p) => s + p.weight, 0)
  if (totalWeight === 0) return null
  const lat = points.reduce((s, p) => s + p.lat * p.weight, 0) / totalWeight
  const lng = points.reduce((s, p) => s + p.lng * p.weight, 0) / totalWeight
  return { lat, lng }
}

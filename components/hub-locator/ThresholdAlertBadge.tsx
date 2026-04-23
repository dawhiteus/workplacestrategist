'use client'

import type { ThresholdAlert } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react'

interface ThresholdAlertBadgeProps {
  alerts: ThresholdAlert[]
}

const icons = {
  green: AlertCircle,
  amber: AlertTriangle,
  red: XCircle,
}

export function ThresholdAlertBadge({ alerts }: ThresholdAlertBadgeProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs">
        <AlertCircle size={12} className="text-success" />
        <span className="text-success font-medium">All metrics within threshold</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {alerts.map(alert => {
        const Icon = icons[alert.severity]
        return (
          <div
            key={alert.id}
            className={cn(
              'flex items-start gap-2 px-3 py-2 rounded-lg border text-xs',
              alert.severity === 'red' && 'bg-red-50 border-red-200',
              alert.severity === 'amber' && 'bg-orange-50 border-orange-200',
              alert.severity === 'green' && 'bg-green-50 border-green-200'
            )}
          >
            <Icon
              size={12}
              className={cn(
                'mt-0.5 flex-shrink-0',
                alert.severity === 'red' && 'text-danger',
                alert.severity === 'amber' && 'text-warning',
                alert.severity === 'green' && 'text-success'
              )}
            />
            <div>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider mr-2',
                  alert.severity === 'red' && 'text-danger',
                  alert.severity === 'amber' && 'text-warning',
                  alert.severity === 'green' && 'text-success'
                )}
              >
                {alert.metric}
              </span>
              <span className="text-body text-[11px]">{alert.message}</span>
              <div className="text-subtle text-[10px] mt-0.5">
                Score: {alert.value} · Threshold: {alert.threshold}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

import type { Metadata } from 'next'
import './globals.css'
import { Shell } from '@/components/layout/Shell'

export const metadata: Metadata = {
  title: 'Workplace Strategist · LiquidSpace',
  description: 'Smart Office Platform — Strategy Layer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}

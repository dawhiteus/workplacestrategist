import { NextRequest, NextResponse } from 'next/server'
import { getMetroPortfolio } from '@/lib/pulse'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const enterprise = req.nextUrl.searchParams.get('enterprise') || 'Allstate'
  try {
    const metros = await getMetroPortfolio(enterprise)
    return NextResponse.json({ metros })
  } catch (err) {
    console.error('[/api/pulse/metros]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getEnterpriseList } from '@/lib/pulse'

export async function GET() {
  try {
    const enterprises = await getEnterpriseList()
    return NextResponse.json({ enterprises })
  } catch (err) {
    console.error('[GET /api/pulse/enterprises]', err)
    return NextResponse.json({ enterprises: ['Allstate'] })
  }
}

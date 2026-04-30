'use client'

import { createContext, useContext } from 'react'
import type { MetroSummary } from './types'

interface EnterpriseContextValue {
  enterprise: string
  metros: MetroSummary[]
  metrosLoading: boolean
}

export const EnterpriseContext = createContext<EnterpriseContextValue>({
  enterprise: 'Allstate',
  metros: [],
  metrosLoading: true,
})

export function useEnterprise() {
  return useContext(EnterpriseContext)
}

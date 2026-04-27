'use client'
import { createContext, useContext } from 'react'

/** Current enterprise account name, or 'PROSPECT' for platform benchmark mode. */
export const EnterpriseContext = createContext<string>('Allstate')
export function useEnterprise() { return useContext(EnterpriseContext) }

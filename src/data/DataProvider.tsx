import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ClientRecord } from '../types/onboarding'
import { loadCsv } from './csvLoader'
import { readNewRecords, appendRecord } from './storage'
import { evaluate } from '../rules/riskEngine'
import { computeFindings } from '../rules/findingEngine'

interface DataContextValue {
  records: ClientRecord[]
  isLoading: boolean
  error: string | null
  addRecord: (r: ClientRecord) => void
}

const DataContext = createContext<DataContextValue | null>(null)

function enrich(record: ClientRecord): ClientRecord {
  const { tier, reasons } = evaluate(record)
  const enriched = { ...record, computed_risk: tier, reasons }
  return { ...enriched, findings: computeFindings(enriched) }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<ClientRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCsv()
      .then((csvRecords) => {
        const newRecords = readNewRecords()
        const all = [...csvRecords, ...newRecords].map(enrich)
        setRecords(all)
      })
      .catch((err) => {
        setError(String(err))
      })
      .finally(() => setIsLoading(false))
  }, [])

  const addRecord = useCallback((r: ClientRecord) => {
    appendRecord(r)
    const enriched = enrich(r)
    setRecords((prev) => [...prev, enriched])
  }, [])

  return (
    <DataContext.Provider value={{ records, isLoading, error, addRecord }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

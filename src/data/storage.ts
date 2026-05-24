import type { ClientRecord } from '../types/onboarding'

const STORAGE_KEY = 'sentinel_new_records'

export function readNewRecords(): ClientRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ClientRecord[]
  } catch {
    console.warn('SENTINEL: localStorage corrupted, falling back to CSV-only data')
    return []
  }
}

export function appendRecord(r: ClientRecord): void {
  const existing = readNewRecords()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, r]))
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY)
}

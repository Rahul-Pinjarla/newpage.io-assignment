import Papa from 'papaparse'
import type { ClientRecord, Branch, ClientType, KycStatus, RiskTier, SourceOfFunds } from '../types/onboarding'

export async function loadCsv(): Promise<ClientRecord[]> {
  const response = await fetch('/client_onboarding.csv')
  if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`)
  const text = await response.text()

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        try {
          const records = results.data.map((row) => {
            const record: ClientRecord = {
              client_id: row.client_id,
              branch: row.branch as Branch,
              onboarding_date: row.onboarding_date,
              client_name: row.client_name,
              client_type: row.client_type as ClientType,
              country_of_tax_residence: row.country_of_tax_residence,
              annual_income: Number(row.annual_income) || 0,
              source_of_funds: row.source_of_funds as SourceOfFunds,
              pep_status: row.pep_status === 'TRUE',
              sanctions_screening_match: row.sanctions_screening_match === 'TRUE',
              adverse_media_flag: row.adverse_media_flag === 'TRUE',
              risk_classification: row.risk_classification as RiskTier,
              kyc_status: row.kyc_status as KycStatus,
              id_verification_date: row.id_verification_date || null,
              relationship_manager: row.relationship_manager || null,
              documentation_complete: row.documentation_complete === 'TRUE',
            }
            return record
          })
          resolve(records)
        } catch (err) {
          reject(err)
        }
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}

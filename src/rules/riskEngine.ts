import type { ClientRecord, RiskTier } from '../types/onboarding'
import { HIGH_RISK_RULES, MEDIUM_RISK_RULES } from './sentinelRules'

export interface RiskResult {
  tier: RiskTier
  reasons: string[]
}

export function evaluate(r: ClientRecord): RiskResult {
  const reasons: string[] = []
  const country = r.country_of_tax_residence.trim().toLowerCase()

  if (r.pep_status) reasons.push('Politically Exposed Person')
  if (r.sanctions_screening_match) reasons.push('Sanctions screening match')
  if (r.adverse_media_flag) reasons.push('Adverse media flag')
  if (HIGH_RISK_RULES.high_risk_jurisdictions.some((j) => j.toLowerCase() === country)) {
    reasons.push(`High-risk jurisdiction: ${r.country_of_tax_residence}`)
  }

  if (reasons.length > 0) return { tier: 'HIGH', reasons }

  if (r.client_type === MEDIUM_RISK_RULES.entity_client_type) {
    reasons.push('Entity client type')
  }
  if (MEDIUM_RISK_RULES.medium_risk_jurisdictions.some((j) => j.toLowerCase() === country)) {
    reasons.push(`Medium-risk jurisdiction: ${r.country_of_tax_residence}`)
  }
  if (
    r.annual_income > MEDIUM_RISK_RULES.high_income_threshold &&
    MEDIUM_RISK_RULES.high_income_risk_sources.includes(r.source_of_funds)
  ) {
    reasons.push(`High income (£${r.annual_income.toLocaleString()}) from ${r.source_of_funds}`)
  }

  if (reasons.length > 0) return { tier: 'MEDIUM', reasons }

  return { tier: 'LOW', reasons: [] }
}

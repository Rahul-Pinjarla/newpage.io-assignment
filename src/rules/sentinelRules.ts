import type { ClientType, SourceOfFunds } from '../types/onboarding'

export const HIGH_RISK_RULES = {
  pep_status: true,
  sanctions_screening_match: true,
  adverse_media_flag: true,
  high_risk_jurisdictions: ['Russia', 'Belarus', 'Venezuela'] as string[],
}

export const MEDIUM_RISK_RULES = {
  entity_client_type: 'ENTITY' as ClientType,
  medium_risk_jurisdictions: [
    'Brazil',
    'Turkey',
    'South Africa',
    'Mexico',
    'UAE',
    'China',
  ] as string[],
  high_income_threshold: 500_000,
  high_income_risk_sources: ['Inheritance', 'Gift', 'Other'] as SourceOfFunds[],
}

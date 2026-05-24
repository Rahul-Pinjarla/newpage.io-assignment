import type { ClientRecord, FindingType } from '../types/onboarding'

export function computeFindings(record: ClientRecord): FindingType[] {
  const findings: FindingType[] = []

  if (record.computed_risk && record.computed_risk !== record.risk_classification) {
    findings.push('classification_mismatch')
  }

  if (!record.id_verification_date) {
    findings.push('missing_id_verification')
  }

  if (!record.relationship_manager) {
    findings.push('missing_rm')
  }

  if (!record.documentation_complete) {
    findings.push('documentation_incomplete')
  }

  if (record.computed_risk === 'HIGH' && record.kyc_status === 'APPROVED') {
    findings.push('kyc_status_conflict')
  }

  return findings
}

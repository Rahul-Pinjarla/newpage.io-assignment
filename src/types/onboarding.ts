export type RiskTier = 'HIGH' | 'MEDIUM' | 'LOW'
export type KycStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'ENHANCED_DUE_DILIGENCE'
export type ClientType = 'INDIVIDUAL' | 'ENTITY'
export type Branch = 'Canary Wharf' | 'Edinburgh' | 'Mayfair' | 'Manchester'
export type SourceOfFunds =
  | 'Employment'
  | 'Business Income'
  | 'Investment Returns'
  | 'Inheritance'
  | 'Property Sale'
  | 'Pension'
  | 'Gift'
  | 'Other'

export type FindingType =
  | 'classification_mismatch'
  | 'missing_id_verification'
  | 'missing_rm'
  | 'documentation_incomplete'
  | 'kyc_status_conflict'

export interface ClientRecord {
  client_id: string
  branch: Branch
  onboarding_date: string
  client_name: string
  client_type: ClientType
  country_of_tax_residence: string
  annual_income: number
  source_of_funds: SourceOfFunds
  pep_status: boolean
  sanctions_screening_match: boolean
  adverse_media_flag: boolean
  risk_classification: RiskTier
  kyc_status: KycStatus
  id_verification_date: string | null
  relationship_manager: string | null
  documentation_complete: boolean
  computed_risk?: RiskTier
  reasons?: string[]
  findings?: FindingType[]
}

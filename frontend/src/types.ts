export interface RolePersona {
  email: string;
  name: string;
  role: string;
  persona_label: string;
  role_view?: 'OPS_CENTRAL' | 'FIELD_REP';
}

export interface AllocationScoreBreakdown {
  total_score: number;
  max_score: number;
  cutline_status: string;
  recommendation: string;
  has_active_utilization_breach?: boolean;
  breach_obligation_id?: string | null;
  dimensions: {
    commercial_economics_tcv: { score: number; max: number; rationale: string };
    contractual_commitment: { score: number; max: number; rationale: string };
    flexibility_dfe: { score: number; max: number; rationale: string };
    customer_strategic_tier: { score: number; max: number; rationale: string };
    technical_readiness: { score: number; max: number; rationale: string };
    lead_time_realism: { score: number; max: number; rationale: string };
    companion_companion_alignment: { score: number; max: number; rationale: string };
    utilization_breach_penalty?: { score: number; max: number; rationale: string };
  };
  coaching_tips: string[];
}

export interface CompanionCheckResult {
  storage_dependency: string;
  storage_cores: number;
  compute_dependency: string;
  compute_cores: number;
  networking_dependency: string;
  networking_cores: number;
  egress_gbps?: number;
  egress_equivalent_cores?: number;
  total_companion_cores: number;
  regional_net_supply_cores: number;
  companion_pct_of_regional_supply: number;
  requires_companion_escalation: boolean;
  escalation_reason: string;
}

export interface DfeScorecardResult {
  dfe_tier: string;
  dfe_score: number;
  max_score: number;
  summary: string;
  recommendations: string[];
}

export interface AllocationRequest {
  request_id: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  vector_opportunity_id: string;
  registry_cdr_id: string;
  telemetry_plan_id: string;
  sub_region: string;
  account_executive_ldap: string;
  ce_lead_ldap: string;
  specialist_ldap: string;
  rvp_approver_ldap: string;
  chip_name: string;
  requested_chips: number;
  primary_region: string;
  alternate_regions: string[];
  target_delivery_date: string;
  flexible_delivery_window: boolean;
  consumption_model: string;
  deal_tcv_usd_m: number;
  upfront_prepay_pct?: number;
  contract_stage: string;
  contract_duration_months: number;
  customer_tier: string;
  technical_validation_stage: string;
  workload_type: string;
  workload_description: string;
  willing_to_shift_generation: boolean;
  storage_dependency: string;
  storage_cores: number;
  compute_dependency: string;
  compute_cores: number;
  networking_dependency: string;
  networking_cores: number;
  egress_gbps?: number;
  has_active_utilization_breach?: boolean;
  breach_obligation_id?: string | null;
  stage: string;
  stage_step: number;
  council_decision: string;
  allocated_chips: number;
  allocated_region: string;
  allocated_date: string;
  linked_companion_card_id: string | null;
  score_breakdown: AllocationScoreBreakdown;
  companion_check: CompanionCheckResult;
  dfe_scorecard: DfeScorecardResult;
  priority_score: number;
  registry_cca_id?: string;
  registry_url?: string;
  demand_tier?: 'WHALE' | 'TORSO' | 'TAIL';
  ideal_start_date?: string;
  must_have_by_date?: string;
  flexibility_window_days?: number;
  days_until_must_have?: number;
  wave_match_status?: string;
  matched_supply_wave_label?: string;
  is_gtm_elevated?: boolean;
  elevated_by_ldap?: string | null;
  elevated_at?: string | null;
  elevation_rank?: number | null;
  elevation_note?: string;
}

export interface CompanionCard {
  card_id: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  registry_cdr_id: string;
  vector_opportunity_id: string;
  linked_allocation_request_id: string | null;
  stage: string;
  stage_step: number;
  ideal_start_date?: string;
  must_have_by_date?: string;
  flexibility_window_days?: number;
  is_gtm_elevated?: boolean;
  elevated_by_ldap?: string | null;
  elevation_note?: string;
  tab1_account_commercial: {
    customer_tier: string;
    sub_region: string;
    account_executive_ldap: string;
    ce_lead_ldap: string;
    ced_approver_ldap: string;
    ce_vp_nominator_ldap: string;
    commercial_stage: string;
    current_annual_run_rate_usd_m: number;
    incremental_arr_usd_m: number;
    total_deal_tcv_usd_m: number;
  };
  tab2_cdr_line_items: {
    cdr_status: string;
    region: string;
    zone: string;
    machine_family: string;
    pd_ssd_tb: number;
    gross_requested_cores: number;
    current_consumed_cores: number;
    net_incremental_cores: number;
    regional_available_supply_cores: number;
    pct_of_regional_supply: number;
    exceeds_20pct_threshold: boolean;
    target_delivery_date: string;
  };
  tab3_workload_dfe: {
    workload_category: string;
    latency_sensitivity: string;
    multi_zone_tolerant: boolean;
    alternate_region_candidates: string[];
    alternate_machine_families: string[];
    phased_ramp_feasible: boolean;
    spot_or_flex_start_eligible_pct: number;
    dfe_classification: string;
  };
  tab4_strategic_responses: {
    q1_business_justification: string;
    q2_impact_if_delayed_or_denied: string;
    q3_why_specific_region_and_sku: string;
    q4_customer_ramp_and_45day_plan: string;
    q5_dfe_alternatives_exhausted: string;
    q6_associated_with_allocation_approval: string;
  };
  approvals: {
    ce_submitted_by: string;
    ced_endorsed_by: string | null;
    ced_endorsed_at: string | null;
    ce_vp_nominated_by: string | null;
    ce_vp_nominated_at: string | null;
    companion_forum_status: string;
  };
}

export interface SlaObligation {
  obligation_id: string;
  forum_type: string;
  source_record_id: string;
  customer_name: string;
  registry_cdr_id: string;
  telemetry_plan_id: string;
  resource_summary: string;
  region: string;
  owner_ae_ldap: string;
  owner_ce_ldap: string;
  pace_guardian_ldap: string;
  approval_timestamp: string;
  sla_rule_name: string;
  deadline_timestamp: string;
  hours_remaining: number;
  telemetry_verified_ramp_pct: number;
  customer_confirmed: boolean;
  sla_status: string;
  recommended_action: string;
}

export interface ChipSpec {
  chip_name: string;
  hardware_type: string;
  release_stage: string;
  workload_focus: string;
  fp8_tflops: number;
  fp16_bf16_tflops: number;
  memory_size_gb: number;
  memory_bandwidth_tbps: number;
  interconnect_technology: string;
  interconnect_bandwidth_gbps: number;
  max_scale_chips: number;
  typical_use_cases: string;
}

export interface RegionalAvailability {
  chip_name: string;
  hardware_type: string;
  region: string;
  geography: string;
  zone_count: number;
  zones: string;
  availability_status: string;
  consumption_modes: string;
  stockout_risk_tier: string;
  dfe_cold_region_recommended: boolean;
  obfuscated_bucket_chips?: string;
  zonal_rank?: string;
}

export interface SampleRegistryTicket {
  registry_cca_id: string;
  customer_name: string;
  chips: number;
  tcv_usd_m: number;
  ideal_start_date: string;
  must_have_by_date: string;
  owner_ldap: string;
  registry_url: string;
}

export interface RegionalDemandBucket {
  bucket_id: string;
  region: string;
  chip_name: string;
  demand_tier: 'TORSO' | 'TAIL';
  tier_label: string;
  ticket_count: number;
  total_requested_chips: number;
  total_tcv_usd_m: number;
  earliest_ideal_start_date: string;
  earliest_must_have_by_date: string;
  registry_query_url: string;
  recommended_dfe_pathway: string;
  sample_tickets: SampleRegistryTicket[];
}

export interface UniversalTransaction {
  transaction_id: string;
  timestamp: string;
  transaction_type: string;
  actor_ldap: string;
  actor_role: string;
  target_record_id: string;
  customer_name: string;
  registry_cca_id: string;
  region: string;
  sku_or_family: string;
  chips_or_cores_delta: number;
  tcv_usd_m: number;
  summary: string;
  before_state_json: string;
  after_state_json: string;
}

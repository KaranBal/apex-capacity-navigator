"""UI Adapter Router for Apex Capacity Navigator Frontend (100% Synthetic Demo Dataset + Server-Side RBAC + Multi-Tool Agentic Deal Evaluator)."""

from __future__ import annotations
from datetime import datetime, timezone
import json
import os
import re
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Request

from backend.domain_data import (
    load_chip_specs,
    load_regional_availability,
)

router = APIRouter()

RAW_CHIP_SPECS = load_chip_specs()
RAW_REGIONAL_AVAIL = load_regional_availability()

FOUNDATION_LLM_MODEL_PRIMARY = "llm-fast-router"
FOUNDATION_LLM_MODEL_FALLBACK = "llm-pro-reasoner"

# Synthetic accounts assigned to the Demo Field Account Team (FSR / Specialist CE)
FIELD_REP_ASSIGNED_CUSTOMERS = {
    "northstar frontier ai (synthetic)",
    "stratos autonomous robotics (synthetic)",
    "helios quantitative trading (synthetic)",
}

FIELD_REP_ASSIGNED_REQUEST_IDS = {
    "TET-2026-0412",
    "TET-2026-0413",
    "TET-2026-0415",
}


def get_role_view(request: Optional[Request] = None) -> str:
    """Determines whether the request is running in OPS_CENTRAL or FIELD_REP (Need-to-Know RBAC) mode."""
    if request is None:
        return "OPS_CENTRAL"
    hdr = (
        request.headers.get("X-Demo-Role-View")
        or request.query_params.get("role_view")
        or "OPS_CENTRAL"
    ).strip().upper()
    if "FIELD" in hdr or "REP" in hdr or "FSR" in hdr:
        return "FIELD_REP"
    return "OPS_CENTRAL"


def is_assigned_to_field_rep(customer_or_record: Any = "", request_id: str = "", owner_ldap: str = "") -> bool:
    """Checks if a synthetic record belongs to the demo Field Rep's assigned territory.
    Accepts either a dict record or (customer_name, request_id, owner_ldap) strings.
    """
    if isinstance(customer_or_record, dict):
        rec = customer_or_record
        customer_name = str(
            rec.get("customer_name")
            or rec.get("account_name")
            or rec.get("title")
            or ""
        )
        request_id = str(
            rec.get("request_id")
            or rec.get("related_deal_id")
            or rec.get("entity_id")
            or rec.get("source_record_id")
            or rec.get("pursuit_id")
            or request_id
            or ""
        )
        owner_ldap = " ".join(
            str(rec.get(k) or "")
            for k in (
                "owner_ldap",
                "account_executive_ldap",
                "ce_lead_ldap",
                "ae_ldap",
                "specialist_ldap",
                "field_rep_ldap",
                "actor_ldap",
                "owner_ae_ldap",
            )
        )
    else:
        customer_name = str(customer_or_record or "")

    if request_id and request_id in FIELD_REP_ASSIGNED_REQUEST_IDS:
        return True
    c_low = (customer_name or "").strip().lower()
    if c_low:
        for allowed in FIELD_REP_ASSIGNED_CUSTOMERS:
            if allowed in c_low or c_low in allowed:
                return True
    o_low = (owner_ldap or "").lower()
    if "field-specialist-ce@demo.example.com" in o_low or "account-fsr@demo.example.com" in o_low:
        return True
    return False


def resolve_actor_identity(request: Optional[Request] = None, fallback: str = "ops-capacity-lead@demo.example.com") -> str:
    """Derives actor identity from IAP header or role-based demo persona (never hardcoding real leader LDAPs)."""
    if request is not None:
        iap = request.headers.get("X-Goog-Authenticated-User-Email")
        if iap:
            return iap.split(":", 1)[-1].strip().lower()
        role_view = get_role_view(request)
        if role_view == "FIELD_REP":
            return "field-specialist-ce@demo.example.com"
    if fallback and "@cloud.com" in fallback:
        return "ops-capacity-lead@demo.example.com"
    return fallback or "ops-capacity-lead@demo.example.com"


def _has_unresolved_utilization_breach(customer_name: str, explicit_flag: Optional[bool] = None) -> Optional[Dict[str, Any]]:
    """Checks if an account has an active 14-day utilization breach in SLA_OBLIGATIONS."""
    if explicit_flag is True:
        return {
            "obligation_id": "SLA-2026-SIM-BREACH",
            "telemetry_verified_ramp_pct": 14,
            "sla_status": "BREACH — RECLAMATION CANDIDATE",
            "resource_summary": "Existing Allocated Pod (14% Ramp vs. 85% 14-Day Target)",
        }
    if explicit_flag is False:
        return None
    c_low = (customer_name or "").strip().lower()
    if not c_low or "UI_STORE" not in globals():
        return None
    for ob in UI_STORE.get("sla_obligations", []):
        ob_cust = (ob.get("customer_name") or "").strip().lower()
        status = (ob.get("sla_status") or "").upper()
        ramp = int(ob.get("telemetry_verified_ramp_pct") or 0)
        if ("BREACH" in status or (ramp < 85 and "RECLAIM" in status)) and (
            ob_cust in c_low or c_low in ob_cust
        ):
            return ob
    return None


def compute_ui_score_and_companion(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Computes the 7-dimension 0-100 Allocation score, 5-Pillar Companion Check BOM, and DFE Scorecard.

    Explicitly scores:
    - Upfront Cash Prepayment (`upfront_prepay_pct`: 0%..100% -> 0..10 pts)
    - Contract Duration (`5-Yr = 10 pts`, `3-Yr = 7 pts`, `1-Yr = 4 pts`, `FlexStart/Short-Term = 1 pt`)
    - 5-Pillar Full-Stack Companion Capacity (GPU/TPU + Host CPU + Storage + Networking + Data Egress Gbps)
    - Hard Utilization Breach Guardrail (`-25 pts` and `BLOCKED` status if account has an unresolved 14-day breach)
    """
    customer_name = str(payload.get("customer_name") or "Custom Pursuit (Synthetic)")
    tcv = float(payload.get("deal_tcv_usd_m") or 40.0)
    contract_stage = str(payload.get("contract_stage") or "Early / Unverified")
    consumption_model = str(payload.get("consumption_model") or "3-Yr CUD")
    cm_upper = consumption_model.upper()
    raw_dur = payload.get("contract_duration_months")
    if "FlexStart" in cm_upper or "SPOT" in cm_upper or "ON-DEMAND" in cm_upper:
        contract_duration_months = int(raw_dur) if (raw_dur is not None and str(raw_dur).strip() != "" and int(raw_dur) <= 6) else 3
    elif raw_dur is not None and str(raw_dur).strip() != "":
        contract_duration_months = int(raw_dur)
    elif "5-YR" in cm_upper or "5YR" in cm_upper or "5-YEAR" in cm_upper:
        contract_duration_months = 60
    elif "1-YR" in cm_upper or "1YR" in cm_upper or "1-YEAR" in cm_upper:
        contract_duration_months = 12
    else:
        contract_duration_months = 36
    upfront_prepay_pct = float(payload.get("upfront_prepay_pct") or 0.0)
    flex_win = bool(payload.get("flexible_delivery_window", True))
    gen_shift = bool(payload.get("willing_to_shift_generation", True))
    alt_regs = payload.get("alternate_regions") or []
    cust_tier = str(payload.get("customer_tier") or "Early / Unverified Tier")
    tech_stage = str(
        payload.get("technical_validation_stage")
        or "Unverified / Discovery"
    )
    primary_reg = str(payload.get("primary_region") or "us-east5")
    requested_chips = max(1, int(payload.get("requested_chips") or 1024))
    storage_cores = int(payload.get("storage_cores") or 0)
    compute_cores = int(payload.get("compute_cores") or 0)
    networking_cores = int(payload.get("networking_cores") or 0)
    egress_gbps = float(
        payload.get("egress_gbps")
        if payload.get("egress_gbps") is not None
        else round(requested_chips * 0.08, 1)
    )

    # 1. Commercial Economics, TCV & Upfront Cash Prepayment (max 25: up to 15 from TCV + up to 10 from Upfront Prepay %)
    s_tcv_base = min(15, round(6 + (tcv / 120.0) * 9))
    prepay_clamped = max(0.0, min(100.0, upfront_prepay_pct))
    s_prepay_bonus = round((prepay_clamped / 100.0) * 10.0, 1)
    s_comm = min(25, round(s_tcv_base + s_prepay_bonus))

    # 2. Contractual Commitment & Duration Term Hierarchy: 5-Yr > 3-Yr > 1-Yr > Short-Term (max 20)
    if "FlexStart" in cm_upper or "SPOT" in cm_upper or "ON-DEMAND" in cm_upper or contract_duration_months < 12:
        s_term = 1
        term_label = "Short-Term / FlexStart / On-Demand"
    elif contract_duration_months >= 60 or "5-YR" in cm_upper or "5YR" in cm_upper or "5-YEAR" in cm_upper:
        s_term = 10
        term_label = "5-Year CUD (Max Term Priority)"
    elif contract_duration_months >= 36 or "3-YR" in cm_upper or "3YR" in cm_upper or "3-YEAR" in cm_upper or "1-3YR" in cm_upper:
        s_term = 7
        term_label = "3-Year CUD"
    else:
        s_term = 4
        term_label = "1-Year CUD"

    if "Signed" in contract_stage or "Contracted" in contract_stage:
        s_stage = 10
    elif "Committed" in contract_stage or "Redlines" in contract_stage or "Customer Firm" in contract_stage:
        s_stage = 8
    elif "Proposal" in contract_stage or "Likely" in contract_stage or "Scoped" in contract_stage:
        s_stage = 5
    else:
        s_stage = 2
    s_contract = min(20, s_term + s_stage)

    # 3. Flexibility & DFE (max 20)
    s_dfe = 8
    if "FlexStart" in consumption_model or "Spot" in consumption_model:
        s_dfe += 5
    elif "CUD" in consumption_model:
        s_dfe += 3
    if flex_win:
        s_dfe += 3
    if gen_shift:
        s_dfe += 3
    if len(alt_regs) >= 1 or primary_reg in ("us-central1", "us-south1", "us-east5"):
        s_dfe += 3
    s_dfe = min(20, s_dfe)

    # 4. Strategic Tier & Pull-Through Profile (max 15)
    if "Frontier" in cust_tier or "Strategic" in cust_tier:
        s_tier = 15
    elif "Digital Native" in cust_tier:
        s_tier = 12
    elif "Enterprise" in cust_tier:
        s_tier = 10
    else:
        s_tier = 4

    # 5. Technical Readiness (max 10)
    if "PoC Completed" in tech_stage or "Benchmark" in tech_stage:
        s_tech = 10
    elif "Approved" in tech_stage or "In Progress" in tech_stage:
        s_tech = 7
    else:
        s_tech = 3

    # 6. Lead Time Realism (max 5)
    s_lead = 5 if flex_win else 3

    # 5-Pillar Companion Check Companion BOM (Host CPU + Storage + Networking + Egress Gbps)
    total_companion = storage_cores + compute_cores + networking_cores
    regional_net_supply = 25000 if primary_reg in ("us-east4", "us-west1") else 32000
    companion_pct = round((total_companion / regional_net_supply) * 100.0, 1)
    requires_companion = companion_pct > 20.0 or egress_gbps >= 400.0

    # 7. Companion Companion Alignment (max 5)
    s_companion = 5 if not requires_companion else 4

    raw_score = min(
        100, s_comm + s_contract + s_dfe + s_tier + s_tech + s_lead + s_companion
    )

    # Check Hard Utilization Breach Guardrail
    breach_record = _has_unresolved_utilization_breach(
        customer_name,
        payload.get("has_active_utilization_breach"),
    )
    if breach_record and not payload.get("ignore_breach_guardrail"):
        breach_penalty = -25
        total_score = max(0, raw_score + breach_penalty)
        cutline_status = f"BLOCKED BY UTILIZATION BREACH ({breach_record['obligation_id']} at {breach_record['telemetry_verified_ramp_pct']}% Ramp)"
        rec = (
            f"Hard Guardrail Active: Customer has an unresolved 14-day utilization breach ({breach_record['telemetry_verified_ramp_pct']}% ramp on {breach_record['obligation_id']}). "
            "New chip allocation is blocked until idle capacity is reclaimed or swapped into an equal/higher-TCV CUD."
        )
    else:
        breach_penalty = 0
        total_score = raw_score
        if total_score >= 80:
            cutline_status = "Recommend: Approve — Human Council Decision (>= 80 pts)"
            rec = "Recommended for Tuesday Allocation Council approval (subject to human council sign-off)."
        elif total_score >= 65:
            cutline_status = "Band-2 Regional Trade-Off Queue (65–79 pts)"
            rec = "Strong candidate; add Cold Region fallback, 5-Yr term, or Upfront Prepay to reach 80+ cutline."
        else:
            cutline_status = "Below Cut-Line (< 65 pts) — Trigger 4-Step Playbook"
            rec = "Offer Post-Rejection Playbook: (1) Shift timeline to next supply wave, (2) Deploy 32–64 chip FlexStart seed pod in us-central1, or (3) Pivot to ASIC-v6e v6e / G4."

    coaching: List[str] = []
    if breach_record:
        coaching.append(
            f"RESOLVE BREACH FIRST: Reclaim idle chips on {breach_record['obligation_id']} ({breach_record['telemetry_verified_ramp_pct']}% ramp) or execute a CUD Value Swap to remove the -25 pt breach penalty."
        )
    if contract_duration_months < 60:
        coaching.append(
            f"Upgrading term from {term_label} ({contract_duration_months} mos) to a 5-Year CUD (60 mos) adds +{10 - s_term} pts."
        )
    if prepay_clamped < 30.0:
        coaching.append(
            f"Adding 30%–50% Upfront Cash Prepayment adds +3 to +5 pts (up to +10 pts at 100% prepay) to accelerate Hyperscale Cloud CapEx recovery."
        )
    if s_stage < 10:
        coaching.append(
            f"Advance contract stage from '{contract_stage}' to 'Contract Signed' for +{10 - s_stage} pts."
        )
    if not gen_shift:
        coaching.append(
            "Enable generation-shift flexibility (e.g., B200 ↔ ASIC-v7 v7 / H200 ↔ ASIC-v6e v6e) for +3 pts."
        )
    if primary_reg in ("us-east4", "us-west1"):
        coaching.append(
            f"Primary region {primary_reg} is constrained; adding us-central1 or us-south1 unlocks Cold-Region priority (+3 pts)."
        )

    score_breakdown = {
        "total_score": total_score,
        "raw_score_before_guardrails": raw_score,
        "utilization_breach_penalty": breach_penalty,
        "has_active_utilization_breach": bool(breach_record),
        "upfront_prepay_pct": prepay_clamped,
        "prepay_cashflow_pts": s_prepay_bonus,
        "contract_duration_months": contract_duration_months,
        "term_hierarchy_pts": s_term,
        "max_score": 100,
        "cutline_status": cutline_status,
        "recommendation": rec,
        "dimensions": {
            "commercial_economics_tcv": {
                "score": s_comm,
                "max": 25,
                "rationale": f"${tcv}M TCV base ({s_tcv_base}/15 pts) + {prepay_clamped:.0f}% Upfront Cash Prepayment bonus (+{s_prepay_bonus}/10 pts).",
            },
            "contractual_commitment": {
                "score": s_contract,
                "max": 20,
                "rationale": f"Term: {term_label} ({s_term}/10 pts; 5-Yr > 3-Yr > 1-Yr) + Stage: {contract_stage} ({s_stage}/10 pts).",
            },
            "flexibility_dfe": {
                "score": s_dfe,
                "max": 20,
                "rationale": f"Alt regions: {', '.join(alt_regs) or 'None'} | Gen shift: {'Yes' if gen_shift else 'No'}.",
            },
            "customer_strategic_tier": {
                "score": s_tier,
                "max": 15,
                "rationale": f"Tier: {cust_tier} (Prioritizes sticky production inference & core Cloud pull-through; AI-heavy customers show 1.5x–5.9x YoY Infra+Platform growth).",
            },
            "technical_readiness": {
                "score": s_tech,
                "max": 10,
                "rationale": f"Validation: {tech_stage}.",
            },
            "lead_time_realism": {
                "score": s_lead,
                "max": 5,
                "rationale": "Meets >= 45-day Registry CDR lead-time threshold.",
            },
            "companion_companion_alignment": {
                "score": s_companion,
                "max": 5,
                "rationale": f"5-Pillar Full-Stack Footprint (GPU/TPU + {total_companion:,} Host/Storage/Net vCPUs + {egress_gbps} Gbps Egress = {companion_pct}% of {primary_reg} net supply).",
            },
        },
        "coaching_tips": coaching,
    }

    companion_check = {
        "storage_dependency": str(
            payload.get("storage_dependency") or "Yes - ParallelFS / HighIOPSDisk"
        ),
        "storage_cores": storage_cores,
        "compute_dependency": str(
            payload.get("compute_dependency") or "Yes - C4/N4 Host Coordinator Nodes"
        ),
        "compute_cores": compute_cores,
        "networking_dependency": str(
            payload.get("networking_dependency") or "Yes - Cross-Region RoCE"
        ),
        "networking_cores": networking_cores,
        "egress_gbps": egress_gbps,
        "total_companion_cores": total_companion,
        "regional_net_supply_cores": regional_net_supply,
        "companion_pct_of_regional_supply": companion_pct,
        "requires_companion_escalation": requires_companion,
        "escalation_reason": (
            f"JOINT 5-PILLAR COMPANION 2.0 REVIEW REQUIRED: Coupled Classic Infra ({total_companion:,} vCPUs / {egress_gbps} Gbps egress) is {companion_pct}% of {primary_reg} net supply (>20% threshold)."
            if requires_companion
            else f"5-Pillar Capacity Cleared: Companion CPU, Storage, Networking ({total_companion:,} vCPUs) & Egress ({egress_gbps} Gbps) fit within {primary_reg} headroom ({companion_pct}% <= 20% threshold)."
        ),
    }

    dfe_scorecard = {
        "dfe_tier": "DFE Gold (High Fungibility)" if s_dfe >= 16 else "DFE Silver",
        "dfe_score": s_dfe * 5,
        "max_score": 100,
        "summary": f"{consumption_model} ({contract_duration_months} mos, {prepay_clamped:.0f}% prepay) across {primary_reg} + {', '.join(alt_regs) or 'primary'}.",
        "recommendations": coaching,
    }

    return {
        "score_breakdown": score_breakdown,
        "companion_check": companion_check,
        "dfe_scorecard": dfe_scorecard,
    }


def _init_ui_store() -> Dict[str, Any]:
    """Initializes 100% synthetic, anonymized demo records for Apex Capacity Navigator."""
    raw_allocation = [
        {
            "request_id": "TET-2026-0412",
            "created_at": "2026-10-20T14:30:00Z",
            "updated_at": "2026-10-30T18:10:00Z",
            "customer_name": "Northstar Frontier AI (Synthetic)",
            "vector_opportunity_id": "VEC-SYNTH-2012",
            "registry_cdr_id": "CDR-SYNTH-4115",
            "telemetry_plan_id": "GIB-SYNTH-8821",
            "sub_region": "NORTHAM-West-Strategic",
            "account_executive_ldap": "account-fsr@demo.example.com",
            "ce_lead_ldap": "field-specialist-ce@demo.example.com",
            "specialist_ldap": "gtm-specialist@demo.example.com",
            "rvp_approver_ldap": "ce-vp-approver@demo.example.com",
            "chip_name": "AI-ASIC v6e",
            "requested_chips": 8192,
            "primary_region": "us-east5",
            "alternate_regions": ["us-central1", "us-south1"],
            "target_delivery_date": "2026-12-01",
            "flexible_delivery_window": True,
            "consumption_model": "5-Yr CUD",
            "deal_tcv_usd_m": 310.0,
            "contract_stage": "Contract Signed",
            "contract_duration_months": 60,
            "upfront_prepay_pct": 30.0,
            "egress_gbps": 640.0,
            "customer_tier": "Strategic AI / Frontier Lab",
            "technical_validation_stage": "PoC Completed / Benchmark Verified",
            "workload_type": "Frontier Pre-Training & Production Inference",
            "workload_description": "Synthetic 8,192-chip AI-ASIC v6e pod (5-Yr CUD with 30% upfront cash prepay) and coupled C4 coordinator nodes + ParallelFS.",
            "willing_to_shift_generation": True,
            "storage_dependency": "Yes - ParallelFS / Lustre",
            "storage_cores": 2800,
            "compute_dependency": "Yes - C4 Host Coordinator Nodes",
            "compute_cores": 5400,
            "networking_dependency": "Yes - Cross-Region RoCE",
            "networking_cores": 1200,
            "stage": "Step 4: Allocated & Approved",
            "stage_step": 4,
            "council_decision": "Recommend: Approve (Human Council Decision)",
            "allocated_chips": 8192,
            "allocated_region": "us-east5",
            "allocated_date": "2026-12-01",
            "linked_companion_card_id": "RUB-2026-0101",
            "assigned_to_demo_rep": True,
        },
        {
            "request_id": "TET-2026-0413",
            "created_at": "2026-10-22T09:15:00Z",
            "updated_at": "2026-10-30T19:00:00Z",
            "customer_name": "Stratos Autonomous Robotics (Synthetic)",
            "vector_opportunity_id": "VEC-SYNTH-2013",
            "registry_cdr_id": "CDR-SYNTH-3810",
            "telemetry_plan_id": "GIB-SYNTH-8840",
            "sub_region": "NORTHAM-West-Robotics",
            "account_executive_ldap": "account-fsr@demo.example.com",
            "ce_lead_ldap": "field-specialist-ce@demo.example.com",
            "specialist_ldap": "gtm-specialist@demo.example.com",
            "rvp_approver_ldap": "ce-vp-approver@demo.example.com",
            "chip_name": "AI-ASIC v6e",
            "requested_chips": 4096,
            "primary_region": "us-central1",
            "alternate_regions": ["us-east5"],
            "target_delivery_date": "2026-11-20",
            "flexible_delivery_window": True,
            "consumption_model": "3-Yr CUD",
            "deal_tcv_usd_m": 128.0,
            "contract_stage": "Contract Signed",
            "contract_duration_months": 36,
            "upfront_prepay_pct": 15.0,
            "egress_gbps": 320.0,
            "customer_tier": "Strategic AI / Frontier Lab",
            "technical_validation_stage": "PoC Completed / Benchmark Verified",
            "workload_type": "Multimodal World Model & Robotics Simulation",
            "workload_description": "Synthetic 4,096-chip ASIC-v6e TPU v6e expansion ask; currently BLOCKED by 14-day utilization breach on SLA-2026-903 (14% verified ramp).",
            "willing_to_shift_generation": True,
            "storage_dependency": "Yes - HighIOPSDisk ML",
            "storage_cores": 1200,
            "compute_dependency": "Yes - N4 Data Loaders",
            "compute_cores": 2200,
            "networking_dependency": "No",
            "networking_cores": 400,
            "stage": "Step 3: Blocked by 14-Day Utilization Breach",
            "stage_step": 3,
            "council_decision": "BLOCKED — 14-Day Utilization Breach (SLA-2026-903 at 14% Ramp)",
            "allocated_chips": 0,
            "allocated_region": "Blocked (Resolve SLA-2026-903 14% Ramp First)",
            "allocated_date": "Blocked",
            "linked_companion_card_id": None,
            "assigned_to_demo_rep": True,
        },
        {
            "request_id": "TET-2026-0414",
            "created_at": "2026-10-25T11:00:00Z",
            "updated_at": "2026-10-31T06:00:00Z",
            "customer_name": "Nimbus Open-Model Cloud (Synthetic)",
            "vector_opportunity_id": "VEC-SYNTH-2014",
            "registry_cdr_id": "CDR-SYNTH-2900",
            "telemetry_plan_id": "GIB-SYNTH-8902",
            "sub_region": "NORTHAM-Central-ISV",
            "account_executive_ldap": "other-team-fsr@demo.example.com",
            "ce_lead_ldap": "other-team-ce@demo.example.com",
            "specialist_ldap": "gtm-specialist@demo.example.com",
            "rvp_approver_ldap": "ce-vp-approver@demo.example.com",
            "chip_name": "NVIDIA B200",
            "requested_chips": 2048,
            "primary_region": "us-central1",
            "alternate_regions": ["us-south1"],
            "target_delivery_date": "2026-12-15",
            "flexible_delivery_window": True,
            "consumption_model": "3-Yr CUD",
            "deal_tcv_usd_m": 94.5,
            "contract_stage": "Committed Deal / Redlines",
            "contract_duration_months": 36,
            "upfront_prepay_pct": 25.0,
            "egress_gbps": 240.0,
            "customer_tier": "Digital Native",
            "technical_validation_stage": "PoC Completed / Benchmark Verified",
            "workload_type": "Scaled Inference & Lakehouse Serving",
            "workload_description": "Synthetic 2,048x NVIDIA B200 GPUs with coupled N4D lakehouse cluster and ModelHub/DataWarehouse pull-through.",
            "willing_to_shift_generation": True,
            "storage_dependency": "Yes - GCS + HighIOPSDisk Balanced",
            "storage_cores": 2600,
            "compute_dependency": "Yes - N4D Lakehouse Nodes",
            "compute_cores": 5800,
            "networking_dependency": "Yes - Private Service Connect",
            "networking_cores": 900,
            "stage": "Step 3: Allocation Forum Prioritization",
            "stage_step": 3,
            "council_decision": "In Forum Queue (Score 82/100 — Recommend: Approve)",
            "allocated_chips": 0,
            "allocated_region": "Pending",
            "allocated_date": "TBD",
            "linked_companion_card_id": "RUB-2026-0102",
            "assigned_to_demo_rep": False,
        },
        {
            "request_id": "TET-2026-0415",
            "created_at": "2026-10-26T16:20:00Z",
            "updated_at": "2026-10-31T07:30:00Z",
            "customer_name": "Helios Quantitative Trading (Synthetic)",
            "vector_opportunity_id": "VEC-SYNTH-2015",
            "registry_cdr_id": "CDR-SYNTH-1105",
            "telemetry_plan_id": "GIB-SYNTH-8955",
            "sub_region": "NORTHAM-East-FSI",
            "account_executive_ldap": "account-fsr@demo.example.com",
            "ce_lead_ldap": "field-specialist-ce@demo.example.com",
            "specialist_ldap": "gtm-specialist@demo.example.com",
            "rvp_approver_ldap": "ce-vp-approver@demo.example.com",
            "chip_name": "NVIDIA GB200 NVL72",
            "requested_chips": 1536,
            "primary_region": "us-east4",
            "alternate_regions": [],
            "target_delivery_date": "2026-11-15",
            "flexible_delivery_window": False,
            "consumption_model": "1-Yr CUD",
            "deal_tcv_usd_m": 85.0,
            "contract_stage": "Proposal Submitted",
            "contract_duration_months": 12,
            "upfront_prepay_pct": 0.0,
            "egress_gbps": 180.0,
            "customer_tier": "Enterprise Focus",
            "technical_validation_stage": "Architecture Approved by CE Specialist",
            "workload_type": "Low-Latency Alpha Signal Training",
            "workload_description": "Synthetic 1,536x GB200 NVL72 locked to constrained us-east4 with zero region flexibility and 1-Yr term.",
            "willing_to_shift_generation": False,
            "storage_dependency": "Yes - ParallelFS",
            "storage_cores": 2100,
            "compute_dependency": "Yes - C4 High-Freq Compute",
            "compute_cores": 4200,
            "networking_dependency": "Yes - Ultra-Low-Latency Interconnect",
            "networking_cores": 800,
            "stage": "Step 5: Post-Rejection Playbook & RVP Exception",
            "stage_step": 5,
            "council_decision": "Rejected - Capacity Constrained (us-east4 • Score 56/100)",
            "allocated_chips": 0,
            "allocated_region": "Rejected (Offer Mar 2027 / Cold Region)",
            "allocated_date": "TBD",
            "linked_companion_card_id": "RUB-2026-0103",
            "assigned_to_demo_rep": True,
        },
        {
            "request_id": "TET-2026-0416",
            "created_at": "2026-10-28T10:00:00Z",
            "updated_at": "2026-10-31T08:00:00Z",
            "customer_name": "Kinetix Video Foundation (Synthetic)",
            "vector_opportunity_id": "VEC-SYNTH-2016",
            "registry_cdr_id": "CDR-SYNTH-5220",
            "telemetry_plan_id": "GIB-SYNTH-9012",
            "sub_region": "NORTHAM-East-GenAI",
            "account_executive_ldap": "other-team-fsr@demo.example.com",
            "ce_lead_ldap": "other-team-ce@demo.example.com",
            "specialist_ldap": "gtm-specialist@demo.example.com",
            "rvp_approver_ldap": "ce-vp-approver@demo.example.com",
            "chip_name": "NVIDIA H200",
            "requested_chips": 1024,
            "primary_region": "us-east4",
            "alternate_regions": ["us-central1"],
            "target_delivery_date": "2026-11-30",
            "flexible_delivery_window": False,
            "consumption_model": "On-Demand Static",
            "deal_tcv_usd_m": 28.0,
            "contract_stage": "Proposal Submitted",
            "contract_duration_months": 12,
            "upfront_prepay_pct": 0.0,
            "egress_gbps": 95.0,
            "customer_tier": "Digital Native",
            "technical_validation_stage": "PoC Completed / Benchmark Verified",
            "workload_type": "Video Diffusion Training & Serving",
            "workload_description": "Synthetic 1,024x H200 GPUs in constrained us-east4; prime candidate for AI-ASIC v6e DFE shift.",
            "willing_to_shift_generation": True,
            "storage_dependency": "Yes - HighIOPSDisk Throughput",
            "storage_cores": 900,
            "compute_dependency": "Yes - N4 Video Pre-Processing",
            "compute_cores": 1900,
            "networking_dependency": "No",
            "networking_cores": 300,
            "stage": "Step 2: Regional Supply Gate",
            "stage_step": 2,
            "council_decision": "Pending Regional Gate",
            "allocated_chips": 0,
            "allocated_region": "Pending",
            "allocated_date": "TBD",
            "linked_companion_card_id": None,
            "assigned_to_demo_rep": False,
        },
    ]

    sla_obligations = [
        {
            "obligation_id": "SLA-2026-901",
            "forum_type": "ALLOCATION",
            "source_record_id": "TET-2026-0412",
            "customer_name": "Northstar Frontier AI (Synthetic)",
            "registry_cdr_id": "CDR-SYNTH-4115",
            "telemetry_plan_id": "GIB-SYNTH-8821",
            "resource_summary": "8,192x AI-ASIC v6e",
            "region": "us-east5",
            "owner_ae_ldap": "account-fsr@demo.example.com",
            "owner_ce_ldap": "field-specialist-ce@demo.example.com",
            "pace_guardian_ldap": "ops-capacity-lead@demo.example.com",
            "approval_timestamp": "2026-10-28T16:00:00Z",
            "sla_rule_name": "Allocation [Monday W+1] Customer Confirmation Gate",
            "deadline_timestamp": "2026-11-03T17:00:00Z",
            "hours_remaining": 18,
            "telemetry_verified_ramp_pct": 82,
            "customer_confirmed": False,
            "sla_status": "AT RISK (<24h to [Monday W+1] Customer Confirmation)",
            "recommended_action": "Urgent: Record written customer confirmation before Monday W+1 deadline or reserved capacity returns to the saleable Cloud pool.",
            "assigned_to_demo_rep": True,
        },
        {
            "obligation_id": "SLA-2026-902",
            "forum_type": "COMPANION",
            "source_record_id": "RUB-2026-0101",
            "customer_name": "Northstar Frontier AI (Synthetic)",
            "registry_cdr_id": "CDR-SYNTH-4115",
            "telemetry_plan_id": "GIB-SYNTH-8821",
            "resource_summary": "9,400 Net vCPUs (C4-Standard-192 + ParallelFS)",
            "region": "us-east5",
            "owner_ae_ldap": "account-fsr@demo.example.com",
            "owner_ce_ldap": "field-specialist-ce@demo.example.com",
            "pace_guardian_ldap": "ops-capacity-lead@demo.example.com",
            "approval_timestamp": "2026-10-20T12:00:00Z",
            "sla_rule_name": "Companion 14-Day Post-Delivery Hardware Utilization Ramp",
            "deadline_timestamp": "2026-11-03T12:00:00Z",
            "hours_remaining": 12,
            "telemetry_verified_ramp_pct": 88,
            "customer_confirmed": True,
            "sla_status": "COMPLIANT (88% Utilization Verified via Billing Telemetry)",
            "recommended_action": "Healthy: Post-allocation utilization and billing telemetry confirms 88% hardware ramp within 14 days of delivery.",
            "assigned_to_demo_rep": True,
        },
        {
            "obligation_id": "SLA-2026-903",
            "forum_type": "ALLOCATION",
            "source_record_id": "TET-2026-0413",
            "customer_name": "Stratos Autonomous Robotics (Synthetic)",
            "registry_cdr_id": "CDR-SYNTH-3810",
            "telemetry_plan_id": "GIB-SYNTH-8840",
            "resource_summary": "4,096x AI-ASIC v6e",
            "region": "us-central1",
            "owner_ae_ldap": "account-fsr@demo.example.com",
            "owner_ce_ldap": "field-specialist-ce@demo.example.com",
            "pace_guardian_ldap": "ops-capacity-lead@demo.example.com",
            "approval_timestamp": "2026-10-15T16:00:00Z",
            "sla_rule_name": "14-Day Post-Delivery Utilization Check & Contract Swap Eligibility",
            "deadline_timestamp": "2026-10-30T17:00:00Z",
            "hours_remaining": 0,
            "telemetry_verified_ramp_pct": 14,
            "customer_confirmed": True,
            "sla_status": "BREACH — RECLAMATION CANDIDATE",
            "recommended_action": "Utilization telemetry shows only 14% usage past Day 14 (vs. 85% target). Blocks new allocations for this account (-25 pt penalty). Reclaim 3,500 idle chips or execute an equal/higher-TCV CUD Value Swap.",
            "assigned_to_demo_rep": True,
        },
        {
            "obligation_id": "SLA-2026-904",
            "forum_type": "QUOTA_LEAK_GUARD",
            "source_record_id": "TET-2026-0415",
            "customer_name": "Helios Quantitative Trading (Synthetic)",
            "registry_cdr_id": "CDR-SYNTH-5190",
            "telemetry_plan_id": "GIB-SYNTH-9102",
            "resource_summary": "256x AI-ASIC v6e Queued-Resource (qr-helios-v6e-east5)",
            "region": "us-east5-b",
            "owner_ae_ldap": "account-fsr@demo.example.com",
            "owner_ce_ldap": "field-specialist-ce@demo.example.com",
            "pace_guardian_ldap": "ops-capacity-lead@demo.example.com",
            "approval_timestamp": "2026-10-26T10:00:00Z",
            "sla_rule_name": "Invisible Quota Leak (FAILED/SUSPENDED TPU Queued-Resource)",
            "deadline_timestamp": "2026-10-31T18:00:00Z",
            "hours_remaining": 2,
            "telemetry_verified_ramp_pct": 0,
            "customer_confirmed": True,
            "sla_status": "AT RISK — INVISIBLE QUOTA LEAK (SUSPENDED QR)",
            "recommended_action": "Cloud TPU queued-resource in SUSPENDED/FAILED state locks 256 FlexStart TPU quota chips. Run atomic cleanup: kubectl delete queuedresource qr-helios-v6e-east5 --zone=us-east5-b --force",
            "assigned_to_demo_rep": True,
        },
    ]

    companion_cards = [
        {
            "card_id": "RUB-2026-0101",
            "created_at": "2026-10-21T10:00:00Z",
            "updated_at": "2026-10-30T18:15:00Z",
            "customer_name": "Northstar Frontier AI (Synthetic)",
            "registry_cdr_id": "CDR-SYNTH-4115",
            "vector_opportunity_id": "VEC-SYNTH-2012",
            "linked_allocation_request_id": "TET-2026-0412",
            "stage": "Stage 4: Approved by Companion Forum (14-Day Ramp Active)",
            "stage_step": 4,
            "assigned_to_demo_rep": True,
            "tab1_account_commercial": {
                "customer_tier": "Strategic AI / Frontier Lab",
                "sub_region": "NORTHAM-West-Strategic",
                "account_executive_ldap": "account-fsr@demo.example.com",
                "ce_lead_ldap": "field-specialist-ce@demo.example.com",
                "ced_approver_ldap": "ce-director@demo.example.com",
                "ce_vp_nominator_ldap": "ce-vp-approver@demo.example.com",
                "commercial_stage": "Contract Signed",
                "current_annual_run_rate_usd_m": 420.0,
                "incremental_arr_usd_m": 103.0,
                "total_deal_tcv_usd_m": 310.0,
            },
            "tab2_cdr_line_items": {
                "cdr_status": "Submitted - Under Review",
                "region": "us-east5",
                "zone": "us-east5-a / us-east5-b",
                "machine_family": "C4-Standard-192 + ParallelFS",
                "pd_ssd_tb": 2400,
                "gross_requested_cores": 11800,
                "current_consumed_cores": 2400,
                "net_incremental_cores": 9400,
                "regional_available_supply_cores": 32000,
                "pct_of_regional_supply": 29.4,
                "exceeds_20pct_threshold": True,
                "target_delivery_date": "2026-12-01",
            },
            "tab3_workload_dfe": {
                "workload_category": "Coupled AI Pre-Training Host Coordinator & Storage Nodes",
                "latency_sensitivity": "High (<2ms to TPU Pod)",
                "multi_zone_tolerant": True,
                "alternate_region_candidates": ["us-central1", "us-south1"],
                "alternate_machine_families": ["C4-Standard", "C3-Standard", "N4-Standard"],
                "phased_ramp_feasible": True,
                "spot_or_flex_start_eligible_pct": 25,
                "dfe_classification": "DFE Gold — Multi-Family Host Fungibility",
            },
            "tab4_strategic_responses": {
                "q1_business_justification": "Anchors $310M 5-Yr CUD (30% upfront prepay) and supports 8,192x AI-ASIC v6e chips.",
                "q2_impact_if_delayed_or_denied": "Without the 9,400 net C4 & ParallelFS cores in us-east5, the 8,192x AI-ASIC v6e pod cannot ingest training checkpoints.",
                "q3_why_specific_region_and_sku": "Must co-locate in us-east5 alongside approved Allocation allocation TET-2026-0412.",
                "q4_customer_ramp_and_45day_plan": "CDR filed >=45 days prior; customer commits to 85% utilization within 14 days of provisioning.",
                "q5_dfe_alternatives_exhausted": "Evaluated C3 and N4 fallback families; customer approved C4/C3 mixed node pools.",
                "q6_associated_with_allocation_approval": "YES — Directly coupled with Allocation Approval TET-2026-0412 (8,192x ASIC-v6e TPU v6e in us-east5).",
            },
            "approvals": {
                "ce_submitted_by": "field-specialist-ce@demo.example.com",
                "ced_endorsed_by": "ce-director@demo.example.com",
                "ced_endorsed_at": "2026-10-25T15:00:00Z",
                "ce_vp_nominated_by": "ce-vp-approver@demo.example.com",
                "ce_vp_nominated_at": "2026-10-27T17:30:00Z",
                "companion_forum_status": "Approved",
            },
        },
        {
            "card_id": "RUB-2026-0102",
            "created_at": "2026-10-26T12:00:00Z",
            "updated_at": "2026-10-31T06:30:00Z",
            "customer_name": "Nimbus Open-Model Cloud (Synthetic)",
            "registry_cdr_id": "CDR-SYNTH-2900",
            "vector_opportunity_id": "VEC-SYNTH-2014",
            "linked_allocation_request_id": "TET-2026-0414",
            "stage": "Stage 2: Pending CED Endorsement",
            "stage_step": 2,
            "assigned_to_demo_rep": False,
            "tab1_account_commercial": {
                "customer_tier": "Digital Native",
                "sub_region": "NORTHAM-Central-ISV",
                "account_executive_ldap": "other-team-fsr@demo.example.com",
                "ce_lead_ldap": "other-team-ce@demo.example.com",
                "ced_approver_ldap": "ce-director@demo.example.com",
                "ce_vp_nominator_ldap": "ce-vp-approver@demo.example.com",
                "commercial_stage": "Committed Deal / Redlines",
                "current_annual_run_rate_usd_m": 185.0,
                "incremental_arr_usd_m": 31.5,
                "total_deal_tcv_usd_m": 94.5,
            },
            "tab2_cdr_line_items": {
                "cdr_status": "Submitted - Under Review",
                "region": "us-central1",
                "zone": "us-central1-a / us-central1-c",
                "machine_family": "N4D-Standard-128 + HighIOPSDisk Balanced",
                "pd_ssd_tb": 1800,
                "gross_requested_cores": 12500,
                "current_consumed_cores": 3200,
                "net_incremental_cores": 9300,
                "regional_available_supply_cores": 32000,
                "pct_of_regional_supply": 29.1,
                "exceeds_20pct_threshold": True,
                "target_delivery_date": "2026-12-15",
            },
            "tab3_workload_dfe": {
                "workload_category": "Spark/Photon Lakehouse + Open-Model Feature Store",
                "latency_sensitivity": "Medium (<10ms)",
                "multi_zone_tolerant": True,
                "alternate_region_candidates": ["us-south1", "us-east5"],
                "alternate_machine_families": ["N4D-Standard", "N4-Standard", "C4D-Standard"],
                "phased_ramp_feasible": True,
                "spot_or_flex_start_eligible_pct": 40,
                "dfe_classification": "DFE Gold — N4D > N4 > C4D Spillover Enabled",
            },
            "tab4_strategic_responses": {
                "q1_business_justification": "Supports $94.5M Open-Model & Lakehouse expansion on CLOUD.",
                "q2_impact_if_delayed_or_denied": "Blocks customer feature-store ingestion for 2,048x B200 GPUs.",
                "q3_why_specific_region_and_sku": "Co-located with primary DataWarehouse & GCS lakehouse in us-central1.",
                "q4_customer_ramp_and_45day_plan": "2-phase ramp over 14 days post reservation delivery.",
                "q5_dfe_alternatives_exhausted": "Configured Kubernetes Custom ComputeClass with N4D > N4 > C4D spillover.",
                "q6_associated_with_allocation_approval": "YES — Coupled with Allocation Request TET-2026-0414 (2,048x NVIDIA B200).",
            },
            "approvals": {
                "ce_submitted_by": "other-team-ce@demo.example.com",
                "ced_endorsed_by": None,
                "ced_endorsed_at": None,
                "ce_vp_nominated_by": None,
                "ce_vp_nominated_at": None,
                "companion_forum_status": "Pending CED Endorsement",
            },
        },
        {
            "card_id": "RUB-2026-0103",
            "created_at": "2026-10-27T08:00:00Z",
            "updated_at": "2026-10-31T07:45:00Z",
            "customer_name": "Helios Quantitative Trading (Synthetic)",
            "registry_cdr_id": "CDR-SYNTH-1105",
            "vector_opportunity_id": "VEC-SYNTH-2015",
            "linked_allocation_request_id": "TET-2026-0415",
            "stage": "Stage 3: CED Endorsed — Pending CE VP Nomination",
            "stage_step": 3,
            "assigned_to_demo_rep": True,
            "tab1_account_commercial": {
                "customer_tier": "Enterprise Focus",
                "sub_region": "NORTHAM-East-FSI",
                "account_executive_ldap": "account-fsr@demo.example.com",
                "ce_lead_ldap": "field-specialist-ce@demo.example.com",
                "ced_approver_ldap": "ce-director@demo.example.com",
                "ce_vp_nominator_ldap": "ce-vp-approver@demo.example.com",
                "commercial_stage": "Proposal Submitted",
                "current_annual_run_rate_usd_m": 62.0,
                "incremental_arr_usd_m": 42.5,
                "total_deal_tcv_usd_m": 85.0,
            },
            "tab2_cdr_line_items": {
                "cdr_status": "Submitted - Under Review",
                "region": "us-east4",
                "zone": "us-east4-a",
                "machine_family": "C4-Highcpu-192 + ParallelFS",
                "pd_ssd_tb": 1200,
                "gross_requested_cores": 8900,
                "current_consumed_cores": 1800,
                "net_incremental_cores": 7100,
                "regional_available_supply_cores": 25000,
                "pct_of_regional_supply": 28.4,
                "exceeds_20pct_threshold": True,
                "target_delivery_date": "2026-11-15",
            },
            "tab3_workload_dfe": {
                "workload_category": "Quantitative Backtesting & Tick Data Ingestion",
                "latency_sensitivity": "Ultra-High (<1ms)",
                "multi_zone_tolerant": False,
                "alternate_region_candidates": ["us-east5"],
                "alternate_machine_families": ["C4-Highcpu", "C3-Highcpu"],
                "phased_ramp_feasible": True,
                "spot_or_flex_start_eligible_pct": 15,
                "dfe_classification": "DFE Silver — Hot Region Constrained",
            },
            "tab4_strategic_responses": {
                "q1_business_justification": "$85M TCV quantitative research expansion.",
                "q2_impact_if_delayed_or_denied": "Delays quantitative simulation pipeline migration.",
                "q3_why_specific_region_and_sku": "Proximity to financial exchange feeds in us-east4.",
                "q4_customer_ramp_and_45day_plan": "Phased ramp starting with 30% seed capacity.",
                "q5_dfe_alternatives_exhausted": "Pitching us-east5 Cold Region migration for bulk batch backtesting.",
                "q6_associated_with_allocation_approval": "Coupled with TET-2026-0415 (currently in Post-Rejection Playbook).",
            },
            "approvals": {
                "ce_submitted_by": "field-specialist-ce@demo.example.com",
                "ced_endorsed_by": "ce-director@demo.example.com",
                "ced_endorsed_at": "2026-10-29T14:20:00Z",
                "ce_vp_nominated_by": None,
                "ce_vp_nominated_at": None,
                "companion_forum_status": "Pending CE VP Nomination",
            },
        },
    ]

    store = {
        "allocation_requests": [],
        "companion_cards": companion_cards,
        "sla_obligations": sla_obligations,
    }
    globals()["UI_STORE"] = store

    allocation_requests = []
    for r in raw_allocation:
        # For TET-2026-0413 (already approved, currently under ramp review), compute baseline score and attach breach flag
        calc = compute_ui_score_and_companion(r)
        allocation_requests.append(
            {
                **r,
                "score_breakdown": calc["score_breakdown"],
                "companion_check": calc["companion_check"],
                "dfe_scorecard": calc["dfe_scorecard"],
                "priority_score": calc["score_breakdown"]["total_score"],
            }
        )
    store["allocation_requests"] = allocation_requests
    return store


UI_STORE = _init_ui_store()


@router.get("/api/v1/overview")
def get_ui_overview(request: Request):
    role_view = get_role_view(request)
    t_reqs = UI_STORE["allocation_requests"]
    r_cards = UI_STORE["companion_cards"]
    slas = UI_STORE["sla_obligations"]

    if role_view == "FIELD_REP":
        t_reqs = [r for r in t_reqs if is_assigned_to_field_rep(r.get("customer_name", ""), r.get("request_id", ""), r.get("account_executive_ldap", ""))]
        r_cards = [c for c in r_cards if is_assigned_to_field_rep(c.get("customer_name", ""), c.get("linked_allocation_request_id", ""))]
        slas = [s for s in slas if is_assigned_to_field_rep(s.get("customer_name", ""), s.get("source_record_id", ""), s.get("owner_ae_ldap", ""))]

    tot_req_chips = sum(r["requested_chips"] for r in t_reqs)
    tot_alloc_chips = sum(r["allocated_chips"] for r in t_reqs)
    tot_tcv = round(sum(r["deal_tcv_usd_m"] for r in t_reqs), 1)
    coupled = sum(1 for r in t_reqs if r.get("linked_companion_card_id"))
    at_risk = sum(
        1
        for s in slas
        if "RISK" in s["sla_status"] or "BREACH" in s["sla_status"]
    )
    decisions_count = 12
    try:
        from backend.crm_pursuit_hub import V3_STORE
        decs = V3_STORE.get("historic_decisions", [])
        if role_view == "FIELD_REP":
            decs = [d for d in decs if is_assigned_to_field_rep(d.get("customer_name", ""), d.get("related_deal_id", ""))]
        decisions_count = len(decs)
    except Exception:
        pass

    return {
        "role_view": role_view,
        "rbac_enforced": True,
        "kpis": {
            "total_allocation_requests": len(t_reqs),
            "total_requested_chips": tot_req_chips,
            "total_allocated_chips": tot_alloc_chips,
            "total_pipeline_tcv_usd_m": tot_tcv,
            "active_companion_cards": len(r_cards),
            "coupled_allocation_companion_deals": coupled,
            "sla_at_risk_or_breached": at_risk,
            "warehouse_chip_skus_count": len(RAW_CHIP_SPECS),
            "warehouse_regional_slices_count": 0 if role_view == "FIELD_REP" else len(RAW_REGIONAL_AVAIL),
            "historic_decisions_count": decisions_count,
        },
    }


@router.get("/api/v1/allocation/requests")
def list_ui_allocation_requests(request: Request):
    role_view = get_role_view(request)
    try:
        from backend.supply_planning_v4 import ensure_v4_store_initialized
        ensure_v4_store_initialized()
    except Exception:
        pass
    reqs = UI_STORE["allocation_requests"]
    buckets = UI_STORE.get("demand_buckets", [])
    if role_view == "FIELD_REP":
        reqs = [
            r
            for r in reqs
            if is_assigned_to_field_rep(
                r.get("customer_name", ""),
                r.get("request_id", ""),
                r.get("account_executive_ldap", ""),
            )
        ]
        # Field reps never see global demand buckets or other reps' accounts
        buckets = []
    return {
        "role_view": role_view,
        "rbac_enforced": True,
        "requests": reqs,
        "demand_buckets": buckets,
    }


@router.post("/api/v1/allocation/score-preview")
def preview_ui_allocation_score(payload: Dict[str, Any]):
    return compute_ui_score_and_companion(payload)


@router.post("/api/v1/allocation/requests")
def create_ui_allocation_request(payload: Dict[str, Any], request: Request):
    actor = resolve_actor_identity(request, payload.get("account_executive_ldap", "field-specialist-ce@demo.example.com"))
    calc = compute_ui_score_and_companion(payload)
    new_id = f"TET-2026-04{17 + len(UI_STORE['allocation_requests'])}"
    now_iso = datetime.now(timezone.utc).isoformat()
    ideal_dt = str(payload.get("ideal_start_date") or payload.get("target_delivery_date") or "2026-12-01")
    must_dt = str(payload.get("must_have_by_date") or "2027-01-31")
    hz_id = str(payload.get("registry_cca_id") or payload.get("registry_cdr_id") or "CDR-SYNTH-7110")

    linked_companion_id = None
    if calc["companion_check"]["requires_companion_escalation"] and payload.get(
        "auto_create_companion_if_needed", True
    ):
        linked_companion_id = f"RUB-2026-010{1 + len(UI_STORE['companion_cards'])}"
        gross_cores = calc["companion_check"]["total_companion_cores"]
        reg = str(payload.get("primary_region") or "us-east5")
        reg_supply = calc["companion_check"]["regional_net_supply_cores"]
        pct = calc["companion_check"]["companion_pct_of_regional_supply"]

        new_companion = {
            "card_id": linked_companion_id,
            "created_at": now_iso,
            "updated_at": now_iso,
            "customer_name": payload.get("customer_name", "New Synthetic AI Account"),
            "registry_cdr_id": hz_id,
            "vector_opportunity_id": payload.get(
                "vector_opportunity_id", "VEC-SYNTH-2099"
            ),
            "linked_allocation_request_id": new_id,
            "ideal_start_date": ideal_dt,
            "must_have_by_date": must_dt,
            "stage": "Stage 2: Pending CED Endorsement",
            "stage_step": 2,
            "assigned_to_demo_rep": True,
            "tab1_account_commercial": {
                "customer_tier": payload.get(
                    "customer_tier", "Strategic AI / Frontier Lab"
                ),
                "sub_region": payload.get("sub_region", "NORTHAM-GenAI"),
                "account_executive_ldap": actor,
                "ce_lead_ldap": "field-specialist-ce@demo.example.com",
                "ced_approver_ldap": "ce-director@demo.example.com",
                "ce_vp_nominator_ldap": "ce-vp-approver@demo.example.com",
                "commercial_stage": payload.get("contract_stage", "Contract Signed"),
                "current_annual_run_rate_usd_m": 45.0,
                "incremental_arr_usd_m": round(
                    float(payload.get("deal_tcv_usd_m") or 60.0) / 3.0, 1
                ),
                "total_deal_tcv_usd_m": float(payload.get("deal_tcv_usd_m") or 60.0),
            },
            "tab2_cdr_line_items": {
                "cdr_status": "Submitted - Under Review",
                "region": reg,
                "zone": f"{reg}-a / {reg}-b",
                "machine_family": "C4-Standard-192 + ParallelFS",
                "pd_ssd_tb": 1200,
                "gross_requested_cores": gross_cores,
                "current_consumed_cores": 0,
                "net_incremental_cores": gross_cores,
                "regional_available_supply_cores": reg_supply,
                "pct_of_regional_supply": pct,
                "exceeds_20pct_threshold": True,
                "target_delivery_date": ideal_dt,
            },
            "tab3_workload_dfe": {
                "workload_category": payload.get(
                    "workload_type", "Pre-Training & RL"
                ),
                "latency_sensitivity": "High (<2ms)",
                "multi_zone_tolerant": True,
                "alternate_region_candidates": payload.get(
                    "alternate_regions", ["us-central1"]
                ),
                "alternate_machine_families": ["C4-Standard", "N4-Standard"],
                "phased_ramp_feasible": True,
                "spot_or_flex_start_eligible_pct": 25,
                "dfe_classification": calc["dfe_scorecard"]["dfe_tier"],
            },
            "tab4_strategic_responses": {
                "q1_business_justification": f"Coupled companion host/storage BOM for ${payload.get('deal_tcv_usd_m', 60)}M TCV accelerator deal.",
                "q2_impact_if_delayed_or_denied": f"Strands {payload.get('requested_chips', 2048)}x {payload.get('chip_name', 'TPU/GPU')} deployment.",
                "q3_why_specific_region_and_sku": f"Co-located in {reg} with coupled Allocation request {new_id}.",
                "q4_customer_ramp_and_45day_plan": "Immediate 14-day ramp upon reservation delivery.",
                "q5_dfe_alternatives_exhausted": "Configured multi-family C4/N4 spillover.",
                "q6_associated_with_allocation_approval": f"YES — Auto-spawned by Coupled Companion Check for Allocation request {new_id}.",
            },
            "approvals": {
                "ce_submitted_by": actor,
                "ced_endorsed_by": None,
                "ced_endorsed_at": None,
                "ce_vp_nominated_by": None,
                "ce_vp_nominated_at": None,
                "companion_forum_status": "Pending CED Endorsement",
            },
        }
        UI_STORE["companion_cards"].insert(0, new_companion)

    new_req = {
        "request_id": new_id,
        "created_at": now_iso,
        "updated_at": now_iso,
        "customer_name": payload.get("customer_name", "New Synthetic AI Account"),
        "vector_opportunity_id": payload.get(
            "vector_opportunity_id", "VEC-SYNTH-2099"
        ),
        "registry_cdr_id": hz_id,
        "registry_cca_id": hz_id,
        "telemetry_plan_id": payload.get("telemetry_plan_id", "GIB-SYNTH-9981"),
        "sub_region": payload.get("sub_region", "NORTHAM-GenAI"),
        "account_executive_ldap": actor,
        "ce_lead_ldap": "field-specialist-ce@demo.example.com",
        "specialist_ldap": "gtm-specialist@demo.example.com",
        "rvp_approver_ldap": "ce-vp-approver@demo.example.com",
        "chip_name": payload.get("chip_name", "NextGen-ASIC v7"),
        "requested_chips": int(payload.get("requested_chips") or 2048),
        "primary_region": payload.get("primary_region", "us-east5"),
        "alternate_regions": payload.get("alternate_regions", ["us-central1"]),
        "target_delivery_date": ideal_dt,
        "ideal_start_date": ideal_dt,
        "must_have_by_date": must_dt,
        "flexible_delivery_window": bool(
            payload.get("flexible_delivery_window", True)
        ),
        "consumption_model": payload.get("consumption_model", "3-Yr CUD"),
        "deal_tcv_usd_m": float(payload.get("deal_tcv_usd_m") or 64.0),
        "contract_stage": payload.get("contract_stage", "Contract Signed"),
        "contract_duration_months": int(
            payload.get("contract_duration_months") or 36
        ),
        "upfront_prepay_pct": float(payload.get("upfront_prepay_pct") or 0.0),
        "egress_gbps": float(payload.get("egress_gbps") or 160.0),
        "customer_tier": payload.get(
            "customer_tier", "Strategic AI / Frontier Lab"
        ),
        "technical_validation_stage": payload.get(
            "technical_validation_stage", "PoC Completed / Benchmark Verified"
        ),
        "workload_type": payload.get("workload_type", "Pre-Training"),
        "workload_description": payload.get("workload_description", ""),
        "willing_to_shift_generation": bool(
            payload.get("willing_to_shift_generation", True)
        ),
        "storage_dependency": payload.get(
            "storage_dependency", "Yes - ParallelFS"
        ),
        "storage_cores": int(payload.get("storage_cores") or 0),
        "compute_dependency": payload.get("compute_dependency", "Yes - C4 Nodes"),
        "compute_cores": int(payload.get("compute_cores") or 0),
        "networking_dependency": payload.get(
            "networking_dependency", "Yes - RoCE"
        ),
        "networking_cores": int(payload.get("networking_cores") or 0),
        "stage": "Step 3: Allocation Forum Prioritization",
        "stage_step": 3,
        "council_decision": f"In Forum Queue (Score {calc['score_breakdown']['total_score']}/100)",
        "allocated_chips": 0,
        "allocated_region": "Pending",
        "allocated_date": "TBD",
        "linked_companion_card_id": linked_companion_id,
        "score_breakdown": calc["score_breakdown"],
        "companion_check": calc["companion_check"],
        "dfe_scorecard": calc["dfe_scorecard"],
        "priority_score": calc["score_breakdown"]["total_score"],
        "assigned_to_demo_rep": True,
    }
    FIELD_REP_ASSIGNED_REQUEST_IDS.add(new_id)
    try:
        from backend.supply_planning_v4 import enrich_request_v4
        enrich_request_v4(new_req, len(UI_STORE["allocation_requests"]))
    except Exception:
        pass
    UI_STORE["allocation_requests"].insert(0, new_req)

    try:
        from backend.crm_pursuit_hub import record_historic_decision_entry
        record_historic_decision_entry(
            {
                "decision_forum": "Allocation Council (Tue)",
                "decision_outcome": "QUEUED_FOR_COUNCIL",
                "customer_name": new_req["customer_name"],
                "customer_segment": new_req["customer_tier"],
                "vector_opportunity_id": new_req["vector_opportunity_id"],
                "related_deal_id": new_id,
                "requested_sku": new_req["chip_name"],
                "requested_chips": new_req["requested_chips"],
                "requested_region": new_req["primary_region"],
                "approved_sku": new_req["chip_name"],
                "approved_chips": 0,
                "approved_region": "Pending Council",
                "consumption_mechanism": f"{new_req['consumption_model']} ({new_req['upfront_prepay_pct']:.0f}% Upfront Prepay)",
                "allocation_score_before": new_req["priority_score"],
                "allocation_score_after": new_req["priority_score"],
                "tcv_usd_m": new_req["deal_tcv_usd_m"],
                "commercial_incentive_applied": f"{new_req['consumption_model']} + Coupled Companion {linked_companion_id or 'None'}",
                "firm_readiness_status": "Firm (Customer RED + Internal BLACK Verified)",
                "vector_pbo_tagged": f"Infra AI / Infrastructure AI / {new_req['contract_stage']}",
                "dfe_benchmark_cited": calc["dfe_scorecard"]["dfe_tier"],
                "decision_maker_ldap": actor,
                "co_approver_ldap": "ce-director@demo.example.com",
                "decision_rationale": f"Intake submitted ({new_req['requested_chips']}x {new_req['chip_name']} in {new_req['primary_region']}, Ideal: {ideal_dt}, Must-Have: {must_dt}, Prepay: {new_req['upfront_prepay_pct']:.0f}%) with Pre-Allocation Score {new_req['priority_score']}/100 ({calc['score_breakdown']['cutline_status']}). Coupled Companion Card: {linked_companion_id or 'None'}.",
                "precedent_tags": [new_req["chip_name"], new_req["primary_region"], "Intake-Submitted"],
            }
        )
    except Exception:
        pass

    return {"request": new_req, "linked_companion_card_id": linked_companion_id}


@router.post("/api/v1/allocation/requests/{request_id}/transition")
def transition_ui_allocation_request(request_id: str, payload: Dict[str, Any], request: Request):
    role_view = get_role_view(request)
    if role_view == "FIELD_REP":
        raise HTTPException(
            status_code=403,
            detail="RBAC Policy: Council allocation transitions require Central Capacity & Operations View.",
        )
    found = next(
        (r for r in UI_STORE["allocation_requests"] if r["request_id"] == request_id),
        None,
    )
    if not found:
        raise HTTPException(status_code=404, detail="Allocation request not found")

    actor = resolve_actor_identity(request, payload.get("approver_ldap", "capacity-council@demo.example.com"))
    prev_decision = found.get("council_decision", "")
    found["stage"] = payload.get("new_stage", found["stage"])
    found["stage_step"] = int(payload.get("new_stage_step", found["stage_step"]))
    found["council_decision"] = payload.get(
        "council_decision", found["council_decision"]
    )
    found["allocated_chips"] = int(
        payload.get("allocated_chips", found["allocated_chips"])
    )
    found["allocated_region"] = payload.get(
        "allocated_region", found["allocated_region"]
    )
    found["allocated_date"] = payload.get("allocated_date", found["allocated_date"])
    found["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        from backend.crm_pursuit_hub import record_historic_decision_entry
        record_historic_decision_entry(
            {
                "decision_forum": "Allocation Council (Tue)",
                "decision_outcome": found["council_decision"].upper().replace(" ", "_"),
                "customer_name": found["customer_name"],
                "customer_segment": found.get("customer_tier", "Strategic AI"),
                "vector_opportunity_id": found.get("vector_opportunity_id", ""),
                "related_deal_id": found["request_id"],
                "requested_sku": found["chip_name"],
                "requested_chips": found["requested_chips"],
                "requested_region": found["primary_region"],
                "approved_sku": found["chip_name"],
                "approved_chips": found["allocated_chips"],
                "approved_region": found["allocated_region"],
                "consumption_mechanism": found.get("consumption_model", "3-Year CUD"),
                "allocation_score_before": found.get("priority_score", 80),
                "allocation_score_after": found.get("priority_score", 80),
                "tcv_usd_m": found["deal_tcv_usd_m"],
                "commercial_incentive_applied": found.get("consumption_model", "3Yr CUD"),
                "firm_readiness_status": "Firm (Customer RED + Internal BLACK Verified)",
                "vector_pbo_tagged": f"Infra AI / Infrastructure AI / {found.get('contract_stage', 'Contract Signed')}",
                "dfe_benchmark_cited": found.get("dfe_scorecard", {}).get("dfe_tier", "DFE Gold"),
                "decision_maker_ldap": actor,
                "co_approver_ldap": "ce-director@demo.example.com",
                "decision_rationale": f"Transitioned {found['request_id']} from '{prev_decision}' to '{found['council_decision']}' ({found['allocated_chips']}x {found['chip_name']} in {found['allocated_region']}).",
                "precedent_tags": [found["chip_name"], found["allocated_region"], found["council_decision"]],
            }
        )
    except Exception:
        pass

    return {"request": found}


@router.get("/api/v1/companion/cards")
def list_ui_companion_cards(request: Request):
    role_view = get_role_view(request)
    cards = UI_STORE["companion_cards"]
    if role_view == "FIELD_REP":
        cards = [
            c
            for c in cards
            if is_assigned_to_field_rep(
                c.get("customer_name", ""),
                c.get("linked_allocation_request_id", ""),
            )
        ]
    return {"role_view": role_view, "rbac_enforced": True, "cards": cards}


@router.get("/api/v1/companion/cdr-lookup")
def lookup_ui_cdrs(request: Request, q: str = Query("")):
    role_view = get_role_view(request)
    query = q.strip().lower()
    catalog = [
        {
            "registry_cdr_id": "CDR-SYNTH-4115",
            "customer_name": "Northstar Frontier AI (Synthetic)",
            "region": "us-east5",
            "zone": "us-east5-a",
            "machine_family": "C4-Standard-192 + ParallelFS",
            "gross_requested_cores": 11800,
            "current_consumed_cores": 2400,
            "cdr_status": "Submitted - Under Review",
            "eligible_for_companion_intake": True,
            "status_reason": "ELIGIBLE: Netted demand is 9,400 cores (29.4% of us-east5 supply > 20% Companion gate).",
            "assigned_to_demo_rep": True,
        },
        {
            "registry_cdr_id": "CDR-SYNTH-2900",
            "customer_name": "Nimbus Open-Model Cloud (Synthetic)",
            "region": "us-central1",
            "zone": "us-central1-a",
            "machine_family": "N4D-Standard-128",
            "gross_requested_cores": 12500,
            "current_consumed_cores": 3200,
            "cdr_status": "Submitted - Under Review",
            "eligible_for_companion_intake": True,
            "status_reason": "ELIGIBLE: Netted demand is 9,300 cores (29.1% of us-central1 supply > 20% Companion gate).",
            "assigned_to_demo_rep": False,
        },
        {
            "registry_cdr_id": "CDR-SYNTH-5992",
            "customer_name": "Legacy Retail Archive Corp (Synthetic)",
            "region": "us-central1",
            "zone": "us-central1-b",
            "machine_family": "N2-Standard-64",
            "gross_requested_cores": 6400,
            "current_consumed_cores": 1200,
            "cdr_status": "Approved",
            "eligible_for_companion_intake": False,
            "status_reason": "BLOCKED BY COMPANION 2.0 POLICY: CDR is already 'Approved' in Registry. Do not file duplicate Companion card.",
            "assigned_to_demo_rep": True,
        },
        {
            "registry_cdr_id": "CDR-SYNTH-6441",
            "customer_name": "Superseded Media Migration (Synthetic)",
            "region": "us-east4",
            "zone": "us-east4-c",
            "machine_family": "C3-Standard-88",
            "gross_requested_cores": 9200,
            "current_consumed_cores": 0,
            "cdr_status": "Obsolete",
            "eligible_for_companion_intake": False,
            "status_reason": "BLOCKED BY COMPANION 2.0 POLICY: CDR status is 'Obsolete'. Please submit an active Registry CDR (>=45d lead time).",
            "assigned_to_demo_rep": True,
        },
    ]
    if role_view == "FIELD_REP":
        catalog = [c for c in catalog if c.get("assigned_to_demo_rep")]
    if not query:
        return {"results": catalog}
    matched = [
        c
        for c in catalog
        if query in c["registry_cdr_id"].lower()
        or query in c["customer_name"].lower()
        or query in c["region"].lower()
    ]
    return {"results": matched or catalog}


@router.post("/api/v1/companion/cards/{card_id}/approve")
def approve_ui_companion_card(card_id: str, payload: Dict[str, Any], request: Request):
    card = next(
        (c for c in UI_STORE["companion_cards"] if c["card_id"] == card_id), None
    )
    if not card:
        raise HTTPException(status_code=404, detail="Companion card not found")

    action = payload.get("action")
    approver = resolve_actor_identity(request, payload.get("approver_ldap", "ce-director@demo.example.com"))
    now_iso = datetime.now(timezone.utc).isoformat()

    if action == "ced_endorse":
        card["approvals"]["ced_endorsed_by"] = approver
        card["approvals"]["ced_endorsed_at"] = now_iso
        card["approvals"]["companion_forum_status"] = "CED Endorsed — Ready for CE VP"
        card["stage"] = "Stage 3: CED Endorsed — Pending CE VP Nomination"
        card["stage_step"] = 3
    elif action == "ce_vp_nominate":
        if not card["approvals"]["ced_endorsed_by"]:
            card["approvals"]["ced_endorsed_by"] = "ce-director@demo.example.com"
            card["approvals"]["ced_endorsed_at"] = now_iso
        card["approvals"]["ce_vp_nominated_by"] = approver
        card["approvals"]["ce_vp_nominated_at"] = now_iso
        card["approvals"]["companion_forum_status"] = "Nominated for Tue/Thu Companion Forum"
        card["stage"] = "Stage 3.5: CE VP Nominated — Queued for Companion Forum"
        card["stage_step"] = 3
    elif action == "forum_approve":
        card["approvals"]["companion_forum_status"] = "Approved by Companion Forum"
        card["stage"] = "Stage 4: Approved by Companion Forum (14-Day Ramp Active)"
        card["stage_step"] = 4

    card["updated_at"] = now_iso

    try:
        from backend.crm_pursuit_hub import record_historic_decision_entry
        t2 = card["tab2_cdr_line_items"]
        t1 = card["tab1_account_commercial"]
        record_historic_decision_entry(
            {
                "decision_forum": "Companion 2.0 Forum (Tue/Thu)",
                "decision_outcome": "APPROVED_COUPLED_COMPANION" if action == "forum_approve" else str(action).upper(),
                "customer_name": card["customer_name"],
                "customer_segment": t1.get("customer_tier", "Strategic AI"),
                "vector_opportunity_id": card.get("vector_opportunity_id", ""),
                "related_deal_id": f"{card['card_id']} + {card.get('linked_allocation_request_id', '')}",
                "requested_sku": t2["machine_family"],
                "requested_chips": t2["gross_requested_cores"],
                "requested_region": t2["region"],
                "approved_sku": t2["machine_family"],
                "approved_chips": t2["net_incremental_cores"],
                "approved_region": t2["region"],
                "consumption_mechanism": "3-Year CUD + Coupled Companion Companion Approval",
                "allocation_score_before": 86,
                "allocation_score_after": 92,
                "tcv_usd_m": t1["total_deal_tcv_usd_m"],
                "commercial_incentive_applied": "3Yr CUD + Coupled Companion Companion Approval",
                "firm_readiness_status": "Firm (Customer RED + Internal BLACK Verified)",
                "vector_pbo_tagged": f"Infra AI / Infrastructure AI / {t1.get('commercial_stage', 'Contract Signed')}",
                "dfe_benchmark_cited": f"Netted Demand Formula ({t2['gross_requested_cores']} - {t2['current_consumed_cores']} = {t2['net_incremental_cores']} net cores, {t2['pct_of_regional_supply']}% of {t2['region']})",
                "decision_maker_ldap": approver,
                "co_approver_ldap": "ce-vp-approver@demo.example.com",
                "decision_rationale": f"Companion 2.0 action '{action}' by {approver} on {card['card_id']} ({card['customer_name']}). Status: {card['approvals']['companion_forum_status']}.",
                "precedent_tags": ["Companion-2.0", t2["machine_family"], t2["region"], str(action)],
            }
        )
    except Exception:
        pass

    return {"card": card}


@router.get("/api/v1/sla/obligations")
def list_ui_sla_obligations(request: Request):
    role_view = get_role_view(request)
    obs = UI_STORE["sla_obligations"]
    if role_view == "FIELD_REP":
        obs = [
            o
            for o in obs
            if is_assigned_to_field_rep(
                o.get("customer_name", ""),
                o.get("source_record_id", ""),
                o.get("owner_ae_ldap", ""),
            )
        ]
    return {"role_view": role_view, "rbac_enforced": True, "obligations": obs}


@router.post("/api/v1/sla/obligations/{obligation_id}/action")
def action_ui_sla_obligation(obligation_id: str, payload: Dict[str, Any], request: Request):
    role_view = get_role_view(request)
    act = payload.get("action")
    if act == "reclaim_capacity" and role_view == "FIELD_REP":
        raise HTTPException(
            status_code=403,
            detail="RBAC Policy: Pool reclamation requires Central Capacity & Operations View.",
        )

    ob = next(
        (
            o
            for o in UI_STORE["sla_obligations"]
            if o["obligation_id"] == obligation_id
        ),
        None,
    )
    if not ob:
        raise HTTPException(status_code=404, detail="SLA obligation not found")

    actor = resolve_actor_identity(request, "ops-capacity-lead@demo.example.com")
    if act == "confirm_customer":
        ob["customer_confirmed"] = True
        ob["sla_status"] = "CONFIRMED ([Monday W+1] Met)"
        ob["recommended_action"] = (
            "Customer confirmation recorded before Monday W+1 deadline. Monitoring 14-day utilization ramp."
        )
    elif act == "verify_telemetry_ramp":
        ob["telemetry_verified_ramp_pct"] = int(
            payload.get("telemetry_verified_ramp_pct") or 85
        )
        ob["sla_status"] = (
            f"COMPLIANT ({ob['telemetry_verified_ramp_pct']}% Utilization Ramp Verified)"
        )
        ob["recommended_action"] = (
            "Healthy: Customer ramp verified above Use-It-or-Lose-It 14-day threshold."
        )
    elif act == "reclaim_capacity":
        ob["sla_status"] = "RECLAIMED TO SALEABLE CLOUD POOL"
        ob["hours_remaining"] = 0
        ob["recommended_action"] = (
            "Capacity reclaimed under 14-Day Use-It-or-Lose-It policy and returned to the saleable CLOUD pool for the next highest-scoring deal."
        )

    try:
        from backend.crm_pursuit_hub import record_historic_decision_entry
        record_historic_decision_entry(
            {
                "decision_forum": "SLA Utilization & Reclamation",
                "decision_outcome": "RECLAIMED_IDLE_SLA" if act == "reclaim_capacity" else str(act).upper(),
                "customer_name": ob["customer_name"],
                "customer_segment": "SLA Watchlist / Utilization Telemetry",
                "vector_opportunity_id": ob["source_record_id"],
                "related_deal_id": f"{ob['obligation_id']} / {ob['source_record_id']}",
                "requested_sku": ob["resource_summary"],
                "requested_chips": 1,
                "requested_region": ob["region"],
                "approved_sku": ob["resource_summary"],
                "approved_chips": 0 if act == "reclaim_capacity" else 1,
                "approved_region": ob["region"],
                "consumption_mechanism": "Use-It-or-Lose-It SLA Governance",
                "allocation_score_before": ob.get("telemetry_verified_ramp_pct", 0),
                "allocation_score_after": ob.get("telemetry_verified_ramp_pct", 0),
                "tcv_usd_m": 0.0,
                "commercial_incentive_applied": "Saleable CLOUD Reclaimed Capacity Pool",
                "firm_readiness_status": "Post-Approval SLA Audit",
                "vector_pbo_tagged": f"Infra AI / {ob['registry_cdr_id']} / {ob['telemetry_plan_id']}",
                "dfe_benchmark_cited": f"Use-It-or-Lose-It ({ob['sla_rule_name']})",
                "decision_maker_ldap": actor,
                "co_approver_ldap": "ce-director@demo.example.com",
                "decision_rationale": f"Executed SLA action '{act}' on {ob['obligation_id']} ({ob['customer_name']} — {ob['resource_summary']} in {ob['region']}). Result: {ob['sla_status']}. {ob['recommended_action']}",
                "precedent_tags": ["SLA-Enforcement", ob["region"], str(act)],
            }
        )
    except Exception:
        pass

    return {"obligation": ob}


@router.get("/api/v1/capacity/sales-view")
def get_ui_sales_view(request: Request):
    role_view = get_role_view(request)
    specs = []
    for s in RAW_CHIP_SPECS:
        hbm_gb = float(s.get("hbm_capacity_gb") or s.get("hbm_gb") or 80.0)
        bw_gbps = float(s.get("hbm_bandwidth_gbps") or 3350.0)
        bw_tbps = round(bw_gbps / 1000.0, 2)
        fp8_val = float(s.get("fp8_tflops") or s.get("bf16_tflops") or 1979.0)
        bf16_val = float(s.get("bf16_tflops") or 989.0)
        max_pods = int(s.get("max_pod_scale_chips") or s.get("max_pod_size") or 256)
        specs.append(
            {
                "chip_name": s.get("short_name") or s.get("name") or s.get("chip_id") or "Unknown",
                "hardware_type": s.get("category") or "GPU",
                "release_stage": s.get("release_stage") or "GA",
                "workload_focus": s.get("workload_focus") or "Training & Inference",
                "fp8_tflops": fp8_val,
                "fp16_bf16_tflops": bf16_val,
                "memory_size_gb": hbm_gb,
                "memory_bandwidth_tbps": bw_tbps,
                "interconnect_technology": s.get("cloud_machine_series") or "NVLink / ICI",
                "interconnect_bandwidth_gbps": bw_gbps,
                "max_scale_chips": max_pods,
                "typical_use_cases": f"Machine series: {s.get('cloud_machine_series', 'Standard')} • {hbm_gb:.0f} GB HBM ({bw_tbps} TB/s) • Max scale: {max_pods:,} chips",
            }
        )

    avail = []
    for r in RAW_REGIONAL_AVAIL:
        status_raw = str(r.get("on_demand_status") or "CONSTRAINED")
        reg_name = r.get("region") or "us-central1"
        is_cold = status_raw == "HIGH_OD_CAPACITY" or reg_name in (
            "us-central1",
            "us-south1",
            "us-east5",
        )
        modes = []
        if r.get("mode_flex_start_flex_offered"):
            modes.append("Flex-Start")
        if r.get("mode_flex_start_calendar_offered"):
            modes.append("FlexStart Calendar")
        if r.get("mode_spot_offered"):
            modes.append("Spot")
        modes.append("1-5Yr CUD")

        if is_cold and status_raw == "HIGH_OD_CAPACITY":
            obfuscated_bucket = "512 – 1,024 Chips (Power-of-2 Bucket)"
            zonal_rank = "Rank 1 (Highest Immediate Fulfillment)"
        elif is_cold:
            obfuscated_bucket = "256 – 512 Chips (Power-of-2 Bucket)"
            zonal_rank = "Rank 2 (High Flex-Start / Cold-Region Headroom)"
        else:
            obfuscated_bucket = "64 – 128 Chips (Power-of-2 Bucket)"
            zonal_rank = "Rank 4 (Constrained — Reservation / Allocation Required)"

        avail.append(
            {
                "chip_name": r.get("chip_name") or r.get("chip_id") or "Unknown",
                "hardware_type": r.get("category") or "GPU",
                "region": reg_name,
                "geography": "NORTHAM"
                if str(reg_name).startswith("us-")
                else "GLOBAL",
                "zone_count": int(r.get("zone_count") or 2),
                "zones": str(r.get("zones") or "a, b"),
                "availability_status": "Available" if is_cold else "Constrained (Council Queue)",
                "consumption_modes": ", ".join(modes),
                "stockout_risk_tier": (
                    "Cold Region — High Headroom (DFE Fast-Track)"
                    if is_cold
                    else (
                        "Constrained Region (Use Counter-Option Playbook)"
                        if role_view == "FIELD_REP"
                        else f"Hot Region ({status_raw})"
                    )
                ),
                "dfe_cold_region_recommended": is_cold,
                "obfuscated_bucket_chips": (
                    "Customer-Safe Tier Only (Exact Supply Redacted for Field View)"
                    if role_view == "FIELD_REP"
                    else obfuscated_bucket
                ),
                "zonal_rank": zonal_rank,
            }
        )

    return {"role_view": role_view, "chip_specs": specs, "regional_availability": avail}


def _get_model_hub_client():
    try:
        genai = None
        return genai.Client(
            model_hubai=True,
            project=os.environ.get("CLOUD_PROJECT_ID", "apex-ai-capacity-demo"),
            location=os.environ.get("CLOUD_REGION", "us-central1"),
        )
    except Exception:
        return None


def _call_foundation_llm_text(prompt: str) -> tuple[Optional[str], str]:
    """Calls ModelHub AI Fast-Router LLM with automatic fallback to Pro-Reasoner LLM."""
    client = _get_model_hub_client()
    if not client:
        return None, "deterministic-policy-engine"
    for model_id in (FOUNDATION_LLM_MODEL_PRIMARY, FOUNDATION_LLM_MODEL_FALLBACK):
        try:
            resp = client.models.generate_content(
                model=model_id,
                contents=prompt,
            )
            if resp and resp.text:
                return resp.text.strip(), f"model-hub/{model_id}"
        except Exception as e:
            print(f"WARN: FoundationLLM call failed on {model_id}: {e}")
            continue
    return None, "deterministic-policy-engine"


@router.post("/api/v1/ai/parse-intake")
def parse_ui_intake(payload: Dict[str, Any]):
    raw_text = str(payload.get("raw_text") or payload.get("prompt") or payload.get("text") or "").strip()
    parsed_fields: List[str] = []
    missing_fields: List[str] = []

    known_cust = None
    for c_candidate in (
        "Stratos Autonomous Robotics (Synthetic)",
        "Northstar Frontier AI (Synthetic)",
        "Helios Quantitative Trading (Synthetic)",
        "Nimbus Open-Model Cloud (Synthetic)",
        "Kinetix Video Foundation (Synthetic)",
    ):
        short_c = c_candidate.split("(")[0].strip()
        if short_c.lower() in raw_text.lower():
            known_cust = c_candidate
            break

    m_cust = re.search(r"Customer:\s*([^\.\n,]+)", raw_text, re.I)
    if m_cust:
        customer_name = m_cust.group(1).strip()
        parsed_fields.append("customer_name")
        if not known_cust:
            for c_candidate in (
                "Stratos Autonomous Robotics (Synthetic)",
                "Northstar Frontier AI (Synthetic)",
                "Helios Quantitative Trading (Synthetic)",
                "Nimbus Open-Model Cloud (Synthetic)",
                "Kinetix Video Foundation (Synthetic)",
            ):
                if c_candidate.split("(")[0].strip().lower() in customer_name.lower():
                    known_cust = c_candidate
                    break
    elif known_cust:
        customer_name = known_cust
        parsed_fields.append("customer_name")
    else:
        m_alt = re.search(r"(?:customer\s+)?([A-Z][A-Za-z0-9\s\-()]{2,40}?)\s+(?:is\s+)?(?:requesting|wants|needs|asking\s+for)\b", raw_text)
        if m_alt:
            customer_name = m_alt.group(1).strip()
            parsed_fields.append("customer_name")
        else:
            customer_name = "Custom Pursuit (Synthetic)"
            missing_fields.append("customer_name (assumed Custom Pursuit)")

    m_chips = re.search(
        r"(\d[\d,]*)\s*(?:x\s*)?(?:NVIDIA\s+|Cloud\s+|Cloud\s+|HGX\s+|Grace\s+Blackwell\s+)*(ASIC-v6e|TPU\s*v6e|TPU\s*v5p|TPU\s*v5e|ASIC-v7|TPU\s*v7x?|GB200|B200|H200|H100|G4|RTX\s*PRO\s*6000)",
        raw_text,
        re.I,
    )
    if m_chips:
        requested_chips = int(m_chips.group(1).replace(",", ""))
        raw_chip = m_chips.group(2).strip().upper()
        parsed_fields.extend(["requested_chips", "chip_name"])
    else:
        m_num = re.search(r"(\d[\d,]*)\s*(?:x\s*)?(?:chips?|GPUs?|TPUs?|accelerators?)", raw_text, re.I)
        if not m_num:
            m_num = re.search(r"\b(\d[\d,]*)\s*x\b", raw_text, re.I)
        requested_chips = int(m_num.group(1).replace(",", "")) if m_num else 1024
        if m_num:
            parsed_fields.append("requested_chips")
        else:
            missing_fields.append("requested_chips (assumed 1,024)")
        m_chip_only = re.search(
            r"\b(ASIC-v6e|TPU\s*v6e|TPU\s*v5p|TPU\s*v5e|ASIC-v7|TPU\s*v7x?|GB200|B200|H200|H100|G4|RTX\s*PRO\s*6000)\b",
            raw_text,
            re.I,
        )
        raw_chip = m_chip_only.group(1).strip().upper() if m_chip_only else "TPU V6E"
        if m_chip_only:
            parsed_fields.append("chip_name")
        else:
            missing_fields.append("chip_name (assumed ASIC-v6e TPU v6e)")

    if "V7" in raw_chip or "ASIC_V7" in raw_chip:
        chip_name = "NextGen-ASIC v7"
    elif "V6" in raw_chip or "ASIC_V6E" in raw_chip:
        chip_name = "AI-ASIC v6e"
    elif "V5" in raw_chip:
        chip_name = "TPU v5p"
    elif "GB200" in raw_chip:
        chip_name = "NVIDIA GB200 NVL72"
    elif "B200" in raw_chip:
        chip_name = "NVIDIA B200"
    elif "H200" in raw_chip:
        chip_name = "NVIDIA H200"
    elif "H100" in raw_chip:
        chip_name = "NVIDIA H100"
    elif "G4" in raw_chip or "RTX" in raw_chip:
        chip_name = "NVIDIA G4 (RTX PRO 6000)"
    else:
        chip_name = "AI-ASIC v6e"

    m_reg = re.search(
        r"\b(us-central1|us-east4|us-east5|us-west1|us-west4|us-south1|europe-west4|asia-northeast1)\b",
        raw_text,
        re.I,
    )
    if m_reg:
        primary_region = m_reg.group(1).lower()
        parsed_fields.append("primary_region")
    else:
        primary_region = "us-central1"
        missing_fields.append("primary_region (assumed us-central1)")

    m_tcv = re.search(r"\$(\d+(?:\.\d+)?)\s*M", raw_text, re.I)
    if m_tcv:
        deal_tcv_usd_m = float(m_tcv.group(1))
        parsed_fields.append("deal_tcv_usd_m")
    else:
        deal_tcv_usd_m = round(requested_chips * 0.035, 1)
        missing_fields.append("deal_tcv_usd_m (estimated from chip count)")

    m_prepay = re.search(r"(\d{1,3})\s*%\s*(?:upfront|prepay|pre-pay)", raw_text, re.I)
    if m_prepay:
        upfront_prepay_pct = float(min(100, int(m_prepay.group(1))))
        parsed_fields.append("upfront_prepay_pct")
    elif re.search(r"\bno\s+prepay|\b0\s*%\s*prepay|\bzero\s+prepay", raw_text, re.I):
        upfront_prepay_pct = 0.0
        parsed_fields.append("upfront_prepay_pct")
    else:
        upfront_prepay_pct = 0.0
        missing_fields.append("upfront_prepay_pct (assumed 0%)")

    if re.search(r"\bflex_start\b|\bflex\b|\bspot\b|\bon-demand\b", raw_text, re.I):
        contract_duration_months = 3
        consumption_model = "Flex-Start / Calendar"
        parsed_fields.append("contract_duration_months")
    elif re.search(r"\b5[\s-]*yr|\b5[\s-]*year|60[\s-]*month", raw_text, re.I):
        contract_duration_months = 60
        consumption_model = "5-Yr CUD"
        parsed_fields.append("contract_duration_months")
    elif re.search(r"\b3[\s-]*yr|\b3[\s-]*year|36[\s-]*month", raw_text, re.I):
        contract_duration_months = 36
        consumption_model = "3-Yr CUD"
        parsed_fields.append("contract_duration_months")
    elif re.search(r"\b1[\s-]*yr|\b1[\s-]*year|12[\s-]*month", raw_text, re.I):
        contract_duration_months = 12
        consumption_model = "1-Yr CUD"
        parsed_fields.append("contract_duration_months")
    else:
        contract_duration_months = 12
        consumption_model = "1-Yr CUD"
        missing_fields.append("contract_duration_months (assumed 12m)")

    # Conservative stage, tier, and technical validation parsing
    known_req = next(
        (r for r in UI_STORE.get("allocation_requests", []) if known_cust and r.get("customer_name") == known_cust),
        None,
    )
    if re.search(r"\bearly\b|\bdiscovery\b|\binitial\b|\bunverified\b", raw_text, re.I):
        contract_stage = "Early / Unverified"
        parsed_fields.append("contract_stage")
    elif re.search(r"\bproposal\b|\blikely\b|\bscoped\b", raw_text, re.I):
        contract_stage = "Proposal Submitted"
        parsed_fields.append("contract_stage")
    elif re.search(r"\bcommitted\b|\bredlines\b|\bcustomer\s+firm\b|\bterm\s+sheet\b", raw_text, re.I):
        contract_stage = "Committed Deal / Redlines"
        parsed_fields.append("contract_stage")
    elif re.search(r"\bcontract\s+signed\b|\bsigned\s+cud\b|\bexecuted\b", raw_text, re.I):
        contract_stage = "Contract Signed"
        parsed_fields.append("contract_stage")
    elif known_req:
        contract_stage = known_req.get("contract_stage", "Contract Signed")
    else:
        contract_stage = "Early / Unverified"
        missing_fields.append("contract_stage (assumed Early / Unverified)")

    if re.search(r"\bfrontier\b|\bstrategic\s+ai\b|\bstrategic_pod\b|\bp0\b", raw_text, re.I):
        customer_tier = "Strategic AI / Frontier Lab"
        parsed_fields.append("customer_tier")
    elif re.search(r"\bdigital\s+native\b|\bscaleup\b", raw_text, re.I):
        customer_tier = "Digital Native"
        parsed_fields.append("customer_tier")
    elif re.search(r"\benterprise\b|\bquant\b|\bfinancial\b|\bhealthcare\b", raw_text, re.I):
        customer_tier = "Enterprise Focus"
        parsed_fields.append("customer_tier")
    elif known_req:
        customer_tier = known_req.get("customer_tier", "Strategic AI / Frontier Lab")
    else:
        customer_tier = "Early / Unverified Tier"
        missing_fields.append("customer_tier (assumed Early / Unverified Tier)")

    if re.search(r"\bpoc\s+completed\b|\bbenchmark\s+verified\b|\bmfu\b", raw_text, re.I):
        tech_validation = "PoC Completed / Benchmark Verified"
        parsed_fields.append("technical_validation_stage")
    elif re.search(r"\bapproved\s+by\s+ce\b|\bpoc\s+in\s+progress\b", raw_text, re.I):
        tech_validation = "Architecture Approved by CE Specialist"
        parsed_fields.append("technical_validation_stage")
    elif known_req and not re.search(r"\bearly\b|\bdiscovery\b|\bunverified\b", raw_text, re.I):
        tech_validation = known_req.get("technical_validation_stage", "PoC Completed / Benchmark Verified")
    else:
        tech_validation = "Unverified / Discovery"
        missing_fields.append("technical_validation_stage (assumed Unverified / Discovery)")

    m_comp = re.search(r"(\d[\d,]*)\s*(?:C4|C3|N4|host)\s*(?:host\s*)?(?:vCPUs?|cores?)", raw_text, re.I)
    compute_cores = int(m_comp.group(1).replace(",", "")) if m_comp else max(256, int(requested_chips * 2.0))
    if not m_comp:
        missing_fields.append("compute_cores (estimated from chip count)")

    m_stor = re.search(r"(\d[\d,]*)\s*(?:ParallelFS|Lustre|HighIOPSDisk|storage)\s*(?:storage\s*)?(?:vCPUs?|cores?)", raw_text, re.I)
    storage_cores = int(m_stor.group(1).replace(",", "")) if m_stor else max(128, int(requested_chips * 0.8))

    m_net = re.search(r"(\d[\d,]*)\s*(?:RoCE|network|interconnect)\s*(?:vCPUs?|cores?)", raw_text, re.I)
    networking_cores = int(m_net.group(1).replace(",", "")) if m_net else max(64, int(requested_chips * 0.4))

    m_egress = re.search(r"(\d+(?:\.\d+)?)\s*Gbps", raw_text, re.I)
    egress_gbps = float(m_egress.group(1)) if m_egress else round(requested_chips * 0.08, 1)

    alt_regions = (
        []
        if re.search(r"locked to|strict|no alternate|zero region flexibility", raw_text, re.I)
        else [r for r in ["us-central1", "us-south1"] if r != primary_region]
    )

    extracted = {
        "customer_name": customer_name,
        "chip_name": chip_name,
        "requested_chips": requested_chips,
        "primary_region": primary_region,
        "alternate_regions": alt_regions,
        "target_delivery_date": "2026-12-15",
        "flexible_delivery_window": not bool(re.search(r"strict|locked|inflexible", raw_text, re.I)),
        "consumption_model": consumption_model,
        "deal_tcv_usd_m": deal_tcv_usd_m,
        "contract_stage": contract_stage,
        "contract_duration_months": contract_duration_months,
        "upfront_prepay_pct": upfront_prepay_pct,
        "egress_gbps": egress_gbps,
        "customer_tier": customer_tier,
        "technical_validation_stage": tech_validation,
        "workload_type": "Pre-Training & Production Inference",
        "workload_description": raw_text[:280],
        "willing_to_shift_generation": not bool(re.search(r"locked|no shift", raw_text, re.I)),
        "storage_dependency": "Yes - ParallelFS / Lustre",
        "storage_cores": storage_cores,
        "compute_dependency": "Yes - C4/C3 Host Coordinator Nodes",
        "compute_cores": compute_cores,
        "networking_dependency": "Yes - Cross-Region RoCE / Cloud Interconnect",
        "networking_cores": networking_cores,
        "parsed_fields": parsed_fields,
        "fields_not_provided": missing_fields,
        "unspecified_fields": missing_fields,
        "missing_fields": missing_fields,
        "ai_extraction_summary": (
            f"Extracted ({', '.join(parsed_fields) or 'defaults'}); "
            + (f"assumed conservative defaults for unprovided fields ({', '.join(missing_fields)})" if missing_fields else "all core fields provided in text.")
        ),
    }

    summary_txt, model_used = _call_foundation_llm_text(
        "Summarize in 1 concise sentence the key commercial (TCV, term, upfront prepay %) and 5-pillar technical parameters of this synthetic CLOUD AI capacity deal note:\n"
        + raw_text
    )
    if summary_txt:
        extracted["ai_extraction_summary"] = f"[{model_used}] {summary_txt}"

    return {"model": model_used, "parsed_payload": extracted}


@router.post("/api/v1/agent/evaluate-deal")
@router.post("/api/v1/ai/evaluate-deal")
def evaluate_deal_agentic_workflow(payload: Dict[str, Any], request: Request):
    """Multi-Step Tool-Calling Agentic Deal Evaluator (Deterministic 4-Step Pipeline + ModelHub AI Fast-Router LLM Summary).

    Runs 4 steps in sequence and returns a transparent `tool_trace` array so users can inspect
    every step, input, output, and guardrail check before Human-in-the-Loop approval.
    """
    t0 = time.time()
    explicit_text = str(payload.get("raw_text") or payload.get("prompt") or payload.get("text") or "").strip()
    has_explicit_raw_text = bool(explicit_text)
    req_id = payload.get("request_id")
    matched_req = None
    if req_id:
        matched_req = next(
            (r for r in UI_STORE.get("allocation_requests", []) if r.get("request_id") == req_id),
            None,
        )
    elif not has_explicit_raw_text and payload.get("customer_name"):
        matched_req = next(
            (r for r in UI_STORE.get("allocation_requests", []) if r.get("customer_name") == payload.get("customer_name")),
            None,
        )
        if matched_req:
            req_id = matched_req.get("request_id")

    raw_text = (
        explicit_text
        or (
            f"Customer: {matched_req['customer_name']}. Requesting {matched_req['requested_chips']}x {matched_req['chip_name']} in {matched_req['primary_region']} for ${matched_req['deal_tcv_usd_m']}M TCV on a {matched_req.get('contract_duration_months', 36)}-month ({matched_req.get('consumption_model', '3-Yr CUD')}) {matched_req.get('contract_stage', 'Contract Signed')} with {matched_req.get('upfront_prepay_pct', 30)}% upfront prepay."
            if matched_req
            else "Customer: Northstar Frontier AI (Synthetic). Requesting 8,192x AI-ASIC v6e chips in us-east5 (flexible to us-central1, us-south1) for $310.0M TCV on a 5-year (60m) CUD Contract Signed with 30% upfront cash prepay. Strategic AI / Frontier Lab tier, PoC Completed / Benchmark Verified. Companion footprint: 5,400 C4 host vCPUs, 2,800 ParallelFS storage vCPUs, 1,200 RoCE network vCPUs, and 640 Gbps data egress."
        )
    ).strip()

    # Step 1: Extract Deal Parameters (ModelHub AI Fast-Router LLM + structured regex parser)
    t1_start = time.time()
    parsed_res = parse_ui_intake({"raw_text": raw_text})
    parsed = parsed_res["parsed_payload"]
    all_override_keys = (
        "customer_name",
        "chip_name",
        "requested_chips",
        "primary_region",
        "alternate_regions",
        "flexible_delivery_window",
        "willing_to_shift_generation",
        "contract_duration_months",
        "upfront_prepay_pct",
        "deal_tcv_usd_m",
        "storage_cores",
        "compute_cores",
        "networking_cores",
        "egress_gbps",
        "has_active_utilization_breach",
        "contract_stage",
        "customer_tier",
        "technical_validation_stage",
        "consumption_model",
    )
    if matched_req and not has_explicit_raw_text:
        for k in all_override_keys:
            if k in matched_req and matched_req[k] is not None:
                parsed[k] = matched_req[k]
        parsed["fields_not_provided"] = []
        parsed["unspecified_fields"] = []
        parsed["missing_fields"] = []
    if not has_explicit_raw_text:
        for k in all_override_keys:
            if k in payload and payload[k] is not None:
                parsed[k] = payload[k]
        if "cud_term_months" in payload and payload["cud_term_months"] is not None:
            parsed["contract_duration_months"] = payload["cud_term_months"]
        if not matched_req:
            provided_keys = {k for k in all_override_keys if k in payload and payload[k] is not None}
            filtered_missing = [
                m for m in (parsed.get("fields_not_provided") or [])
                if not any(m.startswith(pk) for pk in provided_keys)
            ]
            parsed["fields_not_provided"] = filtered_missing
            parsed["unspecified_fields"] = filtered_missing
            parsed["missing_fields"] = filtered_missing
    if "upfront_cash_prepay_pct" in payload and payload["upfront_cash_prepay_pct"] is not None:
        parsed["upfront_prepay_pct"] = payload["upfront_cash_prepay_pct"]
    if "commitment_term_months" in payload and payload["commitment_term_months"] is not None:
        parsed["contract_duration_months"] = payload["commitment_term_months"]

    cm_existing = str(parsed.get("consumption_model") or "").upper()
    if "ON-DEMAND" in cm_existing:
        parsed["consumption_model"] = "On-Demand Static"
    elif "FlexStart" in cm_existing or "FLEX" in cm_existing or "SPOT" in cm_existing:
        parsed["consumption_model"] = "Flex-Start / Calendar"
    elif int(parsed.get("contract_duration_months") or 36) >= 60:
        parsed["consumption_model"] = "5-Yr CUD"
    elif int(parsed.get("contract_duration_months") or 36) <= 12:
        parsed["consumption_model"] = "1-Yr CUD"
    else:
        parsed["consumption_model"] = "3-Yr CUD"
    t1_ms = round((time.time() - t1_start) * 1000, 1)

    # Step 2: Check 5-Pillar Regional Supply & Companion 2.0 >20% Threshold
    t2_start = time.time()
    calc = compute_ui_score_and_companion(parsed)
    companion = calc["companion_check"]
    reg = parsed["primary_region"]
    is_expansion_region = reg in ("us-central1", "us-east5", "us-south1", "europe-west4")
    t2_ms = round((time.time() - t2_start) * 1000, 1)

    # Step 3: Check Utilization Breach Guardrail & Capital Solvency Cap (<=80% of verified funding/revenue)
    t3_start = time.time()
    breach_ob = _has_unresolved_utilization_breach(
        parsed["customer_name"],
        payload.get("has_active_utilization_breach"),
    )
    verified_funding_m = float(payload.get("verified_funding_or_revenue_usd_m") or 400.0)
    max_creditworthy_tcv_m = round(verified_funding_m * 0.80, 1)
    exceeds_capital_cap = float(parsed["deal_tcv_usd_m"]) > max_creditworthy_tcv_m
    t3_ms = round((time.time() - t3_start) * 1000, 1)

    # Step 4: Synthesize Score & Counter-Options for Human Approval
    t4_start = time.time()
    sb = calc["score_breakdown"]
    chips = int(parsed["requested_chips"])
    seed_chips = max(32, min(64, chips // 16))
    if breach_ob:
        counter_options = [
            {
                "option_id": "OPT-HOLD",
                "title": "Action Required: Hold Expansion & Resolve 14-Day Utilization Breach First",
                "summary": (
                    f"HOLD / DO NOT DEPLOY NEW CAPACITY: Account has an unresolved 14-day utilization breach on {breach_ob['obligation_id']} "
                    f"({breach_ob['telemetry_verified_ramp_pct']}% verified ramp vs. 85% target). Require customer to ramp existing 4,096x TPU v6e allocation above 85%, "
                    "execute a value-neutral CUD swap, or reclaim 3,500 idle chips before unlocking new capacity."
                ),
            },
            {
                "option_id": "OPT-SWAP",
                "title": "Pathway B: Value-Neutral CUD Swap (>=100% Remaining TCV)",
                "summary": "If the customer's model architecture shifted, convert the under-utilized commitment into an available SKU family at >=100% remaining contract value before reviewing expansion.",
            },
            {
                "option_id": "OPT-RECLAIM",
                "title": "Pathway C: Partial Quota Reclamation to Flex-Start Pool",
                "summary": "Reclaim the unburned 3,500 chips back into the saleable regional pool to clear the SLA breach flag.",
            },
        ]
    else:
        counter_options = [
            {
                "option_id": "OPT-A",
                "title": "Option A: Immediate Dev/Test Seed Pod + Next Supply Wave Lock",
                "summary": f"Deploy {seed_chips}x {parsed['chip_name']} starter cluster in us-central1 via Flex-Start + Kubernetes Custom ComputeClass while locking the full {chips:,}-chip production tranche for the next regional delivery wave.",
            },
            {
                "option_id": "OPT-B",
                "title": "Option B: Expansion-Region / Multi-Arch TPU Fast-Track",
                "summary": "Fulfill immediately in expansion-headroom regions (us-central1 / us-east5 / us-south1) or pivot eligible inference/training tranches to AI-ASIC v6e / G4 RTX PRO 6000.",
            },
            {
                "option_id": "OPT-C",
                "title": "Option C: Commercial & Prepay Optimization (+Score Boost)",
                "summary": "Locking a 5-Year CUD (10/10 term pts) with >=30% Upfront Cash Prepayment (+3 to +10 cashflow pts) maximizes Tuesday Council stack-rank priority.",
            },
        ]
    t4_ms = round((time.time() - t4_start) * 1000, 1)

    not_prov = parsed.get("fields_not_provided") or []
    s1_out = (
        f"Customer: {parsed['customer_name']} | Ask: {chips:,}x {parsed['chip_name']} in {reg} | "
        f"TCV: ${parsed['deal_tcv_usd_m']}M | Term: {parsed['contract_duration_months']} mos ({parsed['consumption_model']}) | "
        f"Upfront Prepay: {parsed['upfront_prepay_pct']:.0f}% | Stage: {parsed['contract_stage']} | Tier: {parsed['customer_tier']}"
        + (f" | Assumed defaults for unprovided fields: {', '.join(not_prov)}" if not_prov else "")
    )
    s2_out = (
        f"Region Posture: {'Expansion / Balanced Headroom' if is_expansion_region else 'Constrained Hot Region'} | "
        f"Companion vCPUs: {companion['total_companion_cores']:,} ({companion['companion_pct_of_regional_supply']}% of {reg} net supply) | "
        f"Data Egress: {companion['egress_gbps']} Gbps | Coupled Companion >20% Gate: {'YES (Auto-Draft Companion Card)' if companion['requires_companion_escalation'] else 'NO'}"
    )
    s3_out = (
        (
            f"HARD BLOCK: Active 14-day utilization breach on {breach_ob['obligation_id']} ({breach_ob['telemetry_verified_ramp_pct']}% ramp vs. 85% target; -25 pt penalty). "
            if breach_ob
            else "14-Day Utilization Check: PASS (No active ramp breaches vs. 85% target). "
        )
        + (
            f"CAPITAL CAP WARNING: Ask (${parsed['deal_tcv_usd_m']}M) exceeds 80% of verified funding/revenue (${max_creditworthy_tcv_m}M cap)."
            if exceeds_capital_cap
            else f"Capital Sanity Cap: PASS (${parsed['deal_tcv_usd_m']}M <= ${max_creditworthy_tcv_m}M 80% cap)."
        )
    )
    s4_out = f"Final Score: {sb['total_score']}/100 ({sb['cutline_status']}) -> Synthesized recommendation for Human Council Review."

    tool_trace = [
        {
            "step": 1,
            "name": "extract_deal_parameters",
            "tool_name": "extract_deal_parameters",
            "engine": parsed_res["model"],
            "latency_ms": t1_ms,
            "status": "PASS",
            "input_summary": f"Raw deal text ({len(raw_text)} chars)",
            "output_summary": s1_out,
            "summary": s1_out,
        },
        {
            "step": 2,
            "name": "check_5_pillar_regional_capacity",
            "tool_name": "check_5_pillar_regional_capacity",
            "engine": "deterministic-5-pillar-bom-engine",
            "latency_ms": t2_ms,
            "status": "COMPANION_ESCALATION_REQUIRED" if companion["requires_companion_escalation"] else "CLEARED",
            "input_summary": f"Region: {reg} | Chips: {chips:,} | Companion CPU/Storage/Net + Egress",
            "output_summary": s2_out,
            "summary": s2_out,
        },
        {
            "step": 3,
            "name": "verify_utilization_and_capital_guardrails",
            "tool_name": "verify_utilization_and_capital_guardrails",
            "engine": "sla-and-credit-sanity-guard",
            "latency_ms": t3_ms,
            "status": "BLOCKED" if (breach_ob or exceeds_capital_cap) else "VERIFIED",
            "input_summary": f"Account: {parsed['customer_name']} | Funding/Rev: ${verified_funding_m}M | Ask TCV: ${parsed['deal_tcv_usd_m']}M",
            "output_summary": s3_out,
            "summary": s3_out,
        },
        {
            "step": 4,
            "name": "score_and_synthesize_counter_options",
            "tool_name": "score_and_synthesize_counter_options",
            "engine": "allocation-rubric-v5+human-in-the-loop",
            "latency_ms": t4_ms,
            "status": "HOLD_FOR_BREACH_RESOLUTION" if breach_ob else "READY_FOR_HUMAN_APPROVAL",
            "input_summary": f"Prepay: {parsed['upfront_prepay_pct']:.0f}% (+{sb['prepay_cashflow_pts']} pts) | Term: {parsed['contract_duration_months']}m ({sb['term_hierarchy_pts']}/10 pts)",
            "output_summary": s4_out,
            "summary": s4_out,
        },
    ]

    rec_status = (
        "HOLD / DO NOT DEPLOY NEW CAPACITY — BLOCKED BY 14-DAY UTILIZATION BREACH"
        if breach_ob
        else "RECOMMEND_APPROVE_HUMAN_DECISION"
        if sb["total_score"] >= 80
        else "COUNCIL_REVIEW_WITH_COUNTER_OPTIONS"
    )
    rec_label = (
        "HOLD / DO NOT DEPLOY NEW CAPACITY — Blocked by 14-Day Utilization Breach (Reclaim or Swap Existing Quota First)"
        if breach_ob
        else "Recommend: Approve (Human Council Decision Required)"
        if sb["total_score"] >= 80
        else "Recommend: Route to Council with Counter-Options (Human Decision)"
    )
    assumed_line = f"Assumed Defaults (fields not stated in input): {', '.join(not_prov)}\n" if not_prov else ""
    draft_memo = (
        f"ALLOCATION DECISION MEMO ({req_id or 'INTAKE-PREVIEW'})\n"
        f"Account: {parsed['customer_name']} | Ask: {chips:,}x {parsed['chip_name']} in {reg}\n"
        f"Commercials: ${parsed['deal_tcv_usd_m']}M TCV | {parsed['contract_duration_months']}m ({parsed['consumption_model']}) | {parsed['upfront_prepay_pct']:.0f}% Upfront Prepay | Stage: {parsed['contract_stage']} | Tier: {parsed['customer_tier']}\n"
        + assumed_line
        + f"5-Pillar Check: {companion['total_companion_cores']:,} companion vCPUs ({companion['companion_pct_of_regional_supply']}% of {reg}) + {companion['egress_gbps']} Gbps egress\n"
        f"14-Day Utilization Gate: {'BLOCKED (-25 pts — Active Breach on ' + breach_ob['obligation_id'] + ' at 14% Ramp vs. 85% Target)' if breach_ob else 'VERIFIED PASS'}\n"
        f"Allocation Priority Score: {sb['total_score']}/100 ({rec_label})\n"
        f"Recommended Action: {counter_options[0]['summary']}"
    )

    return {
        "workflow_id": f"AGENT-{int(time.time())}",
        "recommendation_status": rec_status,
        "recommendation_label": rec_label,
        "draft_allocation_memo": draft_memo,
        "model": parsed_res["model"],
        "ai_model": parsed_res["model"],
        "fields_not_provided": not_prov,
        "unspecified_fields": not_prov,
        "missing_fields": not_prov,
        "extracted_params": {
            "customer_name": parsed.get("customer_name"),
            "accelerator": "TPU v6e" if "v6e" in str(parsed.get("chip_name", "")).lower() or "asic_v6e" in str(parsed.get("chip_name", "")).lower() else parsed.get("chip_name"),
            "chip_name": parsed.get("chip_name"),
            "region": parsed.get("primary_region"),
            "chips": parsed.get("requested_chips"),
            "tcv_usd_m": parsed.get("deal_tcv_usd_m"),
            "duration_months": parsed.get("contract_duration_months"),
            "consumption_model": parsed.get("consumption_model"),
            "upfront_prepay_pct": parsed.get("upfront_prepay_pct"),
            "contract_stage": parsed.get("contract_stage"),
            "customer_tier": parsed.get("customer_tier"),
            "technical_validation_stage": parsed.get("technical_validation_stage"),
        },
        "pipeline_architecture": f"deterministic-4-step-pipeline + {parsed_res['model']}",
        "total_latency_ms": round((time.time() - t0) * 1000, 1),
        "human_in_the_loop_required": True,
        "parsed_deal": parsed,
        "parsed_intake": parsed,
        "score_breakdown": sb,
        "companion_check": companion,
        "dfe_scorecard": calc["dfe_scorecard"],
        "capital_sanity_check": {
            "verified_funding_or_revenue_usd_m": verified_funding_m,
            "max_creditworthy_commit_usd_m": max_creditworthy_tcv_m,
            "exceeds_80pct_cap": exceeds_capital_cap,
        },
        "counter_options": counter_options,
        "tool_trace": tool_trace,
    }


@router.post("/api/v1/ai/post-rejection-playbook")
def generate_ui_post_rejection_playbook(payload: Dict[str, Any]):
    req_id = payload.get("request_id", "TET-2026-0415")
    found = next(
        (r for r in UI_STORE["allocation_requests"] if r["request_id"] == req_id),
        UI_STORE["allocation_requests"][0],
    )

    cust = found["customer_name"]
    chip = found["chip_name"]
    qty = found["requested_chips"]
    reg = found["primary_region"]
    tcv = found["deal_tcv_usd_m"]
    cdr = found["registry_cdr_id"]
    vec = found["vector_opportunity_id"]
    is_tpu = "TPU" in chip or "ASIC-v7" in chip or "ASIC-v6e" in chip
    shift_window = "January 2027 (Q1 '27 TPU Wave)" if is_tpu else "March 2027 (Q1 '27 GPU Wave)"
    seed_qty = max(32, min(128, qty // 16))
    machine_family = "ct6e-standard-4t" if is_tpu else "a3-megagpu-8g"
    fallback_family = "ct5lp-hightpu-4t" if is_tpu else "a3-highgpu-8g"
    slug = cust.lower().replace(" ", "-").replace(".", "").replace("(", "").replace(")", "")[:20]

    gke_compute_class_yaml = f"""apiVersion: cloud.cloud.com/v1
kind: ComputeClass
metadata:
  name: dfe-{slug}-cascade
spec:
  priorities:
  # Priority 1: Primary Dedicated Reservation (1-5Yr CUD in {reg})
  - machineFamily: {machine_family}
    reservation:
      name: {slug}-primary-res-{reg}
      affinity: Specific
  # Priority 2: Flex-Start-Start (Queue up to 1800s for {seed_qty}-chip validation / burst)
  - machineFamily: {machine_family}
    provisioningModel: FlexStart
    flexStart:
      enabled: true
      capacityCheckWaitTimeSeconds: 1800
  # Priority 3: Cross-Generation / Preemptible Spot Fallback (Zero-Idle Continuation)
  - machineFamily: {fallback_family}
    spot: true
  activeMigration:
    optimizeRulePriority: true  # Automatically migrates pods back to Priority 1 when {reg} reservation lands
  nodePoolAutoCreation:
    enabled: true"""

    queued_resource_cleanup_cli = (
        f"# Pre-Flight Quota Leak Check: FAILED or SUSPENDED TPU queued-resources silently consume FlexStart quota\n"
        f"cloud-cli alpha compute tpus queued-resources list --zone={reg}-a --filter=\"state=(FAILED,SUSPENDED)\"\n"
        f"kubectl delete queuedresource qr-{slug}-{reg} --zone={reg}-a --force"
    )

    rvp_to = "regional-vp-approver@demo.example.com"
    rvp_cc = "ce-director@demo.example.com, gtm-specialist@demo.example.com, capacity-council@demo.example.com"
    rvp_subject = f"[RVP APPROVAL REQUEST] AI Infra Allocation Exception — {cust} ({qty:,}x {chip} | ${tcv}M TCV | {cdr})"
    rvp_body = f"""Hi Regional VP Approver,

Per the Hyperscale AI Infrastructure Allocation Policy (go/capacity-poster & go/ai-infra-allocation), we are requesting formal RVP sign-off to submit an exception appeal to the AI Infra Capacity Council following Allocation review ({found['request_id']}).

1. SYNTHETIC DEAL & CUSTOMER SUMMARY
   • Customer Name: {cust} ({found['customer_tier']})
   • Vector Opportunity ID: {vec} | Registry CDR: {cdr} | Plan ID: {found['telemetry_plan_id']}
   • Committed Deal TCV: ${tcv}M USD ({found['contract_stage']} — {found['consumption_model']})
   • Requested Footprint: {qty:,}x {chip} in {reg} (Target Date: {found['target_delivery_date']})
   • Pre-Allocation Score: {found['priority_score']}/100 ({found['score_breakdown']['cutline_status']})
   • 5-Pillar Coupled Companion Check BOM: {found['companion_check']['total_companion_cores']:,} companion Classic Infra vCPUs ({found['companion_check']['companion_pct_of_regional_supply']}% of {reg} net supply)

2. POST-REJECTION MITIGATION OPTIONS EXHAUSTED WITH CUSTOMER
   • Option A (Timeline Shift): Proposed shifting full {qty:,}-chip production ramp to {shift_window}.
   • Option B (Immediate Dev/Test Seed Pod + Kubernetes ComputeClass): Proposed immediate {seed_qty}x {chip} seed cluster via Flex-Start / Kubernetes Custom ComputeClass (activeMigration: optimizeRulePriority: true) in Cold Region (us-central1 / us-south1) this week.
   • Option C (DFE Generation/Hardware Shift): Evaluated AI-ASIC v6e / NextGen-ASIC v7 / G4 RTX PRO 6000 equivalence.

3. BUSINESS JUSTIFICATION FOR RVP EXCEPTION
   • Customer has contractually committed to the Use-It-or-Lose-It [Monday W+1] confirmation and 14-day utilization ramp SLA.

Please reply "APPROVED" to authorize forwarding this escalation package to the Capacity Council.

Best regards,
Account Team ({found['account_executive_ldap']} & {found['ce_lead_ldap']})"""

    return {
        "request_id": found["request_id"],
        "step1_shift_timeline": (
            f"Align primary {qty:,}x {chip} production tranche with the {shift_window} supply delivery wave in {reg}, locking CUD economics today."
        ),
        "step2_small_dev_test_capacity": (
            f"Immediately provision a {seed_qty}x {chip} Dev/Test Seed Pod in a Cold Region (us-central1 or us-south1) via Flex-Start + Kubernetes Custom ComputeClass (activeMigration: optimizeRulePriority: true) so {cust}'s engineering team can validate checkpoints this week."
        ),
        "step3_customer_communication_script": (
            f"\"We can deploy your {seed_qty}-chip validation cluster this week in us-central1 using Kubernetes Custom ComputeClass auto-migration while reserving your full {qty:,}-chip {chip} production tranche for the {shift_window} datacenter delivery wave—or accelerate full delivery by shifting to our Cold-Region pool.\""
        ),
        "gke_compute_class_yaml": gke_compute_class_yaml,
        "queued_resource_cleanup_cli": queued_resource_cleanup_cli,
        "rvp_email_to": rvp_to,
        "rvp_email_cc": rvp_cc,
        "rvp_email_subject": rvp_subject,
        "rvp_email_body": rvp_body,
    }


@router.post("/api/v1/ai/chat")
@router.post("/api/v1/ai/ask")
def ui_ai_chat(payload: Dict[str, Any], request: Request):
    msgs = payload.get("messages")
    last_msg = ""
    if isinstance(msgs, list) and msgs:
        last_item = msgs[-1]
        if isinstance(last_item, dict):
            last_msg = str(last_item.get("content") or last_item.get("text") or "").strip()
    question = str(
        payload.get("question")
        or payload.get("prompt")
        or payload.get("query")
        or payload.get("text")
        or last_msg
        or ""
    ).strip()
    role_view = get_role_view(request)
    t_reqs = UI_STORE["allocation_requests"]
    r_cards = UI_STORE["companion_cards"]
    slas = UI_STORE["sla_obligations"]

    if role_view == "FIELD_REP":
        t_reqs = [r for r in t_reqs if is_assigned_to_field_rep(r.get("customer_name", ""), r.get("request_id", ""))]
        r_cards = [c for c in r_cards if is_assigned_to_field_rep(c.get("customer_name", ""), c.get("linked_allocation_request_id", ""))]
        slas = [s for s in slas if is_assigned_to_field_rep(s.get("customer_name", ""), s.get("source_record_id", ""))]

    breached_customers = [
        f"{s['customer_name']} ({s['obligation_id']} at {s['telemetry_verified_ramp_pct']}% ramp vs. 85% target — {s['sla_status']})"
        for s in UI_STORE["sla_obligations"]
        if "BREACH" in s["sla_status"]
    ]

    context_summary = (
        f"Role View: {role_view}. "
        f"HARD GOVERNANCE RULES: "
        f"(1) Any account with an active 14-day utilization breach (<85% target ramp: {'; '.join(breached_customers)}) is STRICTLY DISQUALIFIED from receiving new chip allocations until its idle capacity is ramped >=85%, reclaimed, or swapped into an equal/higher-TCV CUD. "
        f"(2) Term hierarchy (out of 10 max term pts): On-Demand/FlexStart = 1/10 pts, 1-Year CUD = 4/10 pts, 3-Year CUD = 7/10 pts (+3 pt delta over 1-Yr CUD / +6 pt delta over On-Demand), 5-Year CUD = 10/10 pts (+6 pt delta over 1-Yr CUD / +9 pt delta over On-Demand), plus Upfront Cash Prepayment (+0 to +10 pts). "
        f"(3) Enforce 5-Pillar Full-Stack Companion Checks (GPU/TPU + Host CPU + Storage + Networking + Egress Gbps > 20% regional net supply triggers Companion 2.0). "
        f"(4) Recommendation labels must say 'Recommend: Approve (Human Council Decision Required)' — never auto-approve without human sign-off. "
        f"Active Allocation Deals ({len(t_reqs)}): "
        + "; ".join(
            f"{r['request_id']} {r['customer_name']} ({r['requested_chips']}x {r['chip_name']} in {r['primary_region']}, ${r['deal_tcv_usd_m']}M TCV, Term: {r.get('contract_duration_months', 36)}m, Prepay: {r.get('upfront_prepay_pct', 0)}%, Score {r['priority_score']}/100 [{r['score_breakdown']['cutline_status']}], Decision: {r['council_decision']})"
            for r in t_reqs
        )
        + f". Active Companion 2.0 Cards ({len(r_cards)}): "
        + "; ".join(
            f"{c['card_id']} {c['customer_name']} ({c['tab2_cdr_line_items']['net_incremental_cores']} net cores, {c['tab2_cdr_line_items']['pct_of_regional_supply']}% of {c['tab2_cdr_line_items']['region']}, Stage: {c['stage']})"
            for c in r_cards
        )
        + f". SLA Watchlist ({len(slas)}): "
        + "; ".join(
            f"{s['obligation_id']} {s['customer_name']} ({s['sla_rule_name']}, Ramp: {s['telemetry_verified_ramp_pct']}%, Status: {s['sla_status']})"
            for s in slas
        )
    )

    if question:
        ans, model_used = _call_foundation_llm_text(
            "You are the Apex Capacity AI Copilot (Synthetic Prototype Environment). "
            "Directly answer the user's specific question in 3-5 concise bullet points citing exact synthetic IDs, chip counts, regions, and scores from the state below. "
            "CRITICAL POLICY: Never recommend allocating new chips to an account in utilization breach (such as Stratos Autonomous Robotics on SLA-2026-903 at 14% ramp vs. 85% target); explicitly state that they are blocked until existing idle capacity is ramped above 85%, reclaimed, or CUD-swapped.\n\n"
            f"State:\n{context_summary}\n\nUser Question: {question}"
        )
        if ans:
            return {"answer": ans, "reply": ans, "model": model_used, "role_view": role_view, "question": question}

    by_id = {r["request_id"]: r for r in UI_STORE["allocation_requests"]}
    r_northstar = by_id["TET-2026-0412"]
    r_stratos = by_id["TET-2026-0413"]
    r_nimbus = by_id["TET-2026-0414"]
    r_helios = by_id["TET-2026-0415"]

    q_low = question.lower()
    if any(k in q_low for k in ("stratos", "breach", "reclaim", "lose-it", "14-day", "14%", "sla")):
        fallback_ans = (
            f"**14-Day Utilization SLA & Breach Analysis (`{role_view}` View • Question: \"{question}\")**:\n\n"
            f"• **Active Breach (Blocked from Expansion)**: `SLA-2026-903` — **{r_stratos['customer_name']}** is at **14% verified utilization ramp** past Day 14 (vs. 85% target) on its `4,096x AI-ASIC v6e` allocation in `us-central1` (~`3,522` chips idle).\n"
            f"• **Queue Impact (`TET-2026-0413`)**: Stratos receives a mandatory **-25 pt utilization breach penalty** (Score: **{r_stratos['priority_score']}/100**) and is **BLOCKED from new capacity approval**. Recommended action: require Stratos to ramp existing capacity ≥85%, execute a TCV-preserving CUD Value Swap, or reclaim idle chips into the Flex-Start Pool.\n"
            f"• **At-Risk Monday W+1 Confirmation**: `SLA-2026-901` — **{r_northstar['customer_name']}** (`8,192x AI-ASIC v6e` in `us-east5`) has 18h remaining to confirm its Monday W+1 delivery lock."
        )
    elif any(k in q_low for k in ("reject", "counter", "helios", "mar 2027", "jan 2027", "rvp", "exception", "east4")):
        fallback_ans = (
            f"**Constrained Region & Counter-Offer Playbook (`{role_view}` View • Question: \"{question}\")**:\n\n"
            f"• **Primary Counter-Offer Candidate (`TET-2026-0415`)**: **{r_helios['customer_name']}** requested `{r_helios['requested_chips']:,}x {r_helios['chip_name']}` in allocation-constrained `{r_helios['primary_region']}` on a {r_helios['consumption_model']} (${r_helios['deal_tcv_usd_m']}M TCV, 0% prepay, Score **{r_helios['priority_score']}/100**).\n"
            f"• **3 Ranked Counter-Options**: (1) Shift full deployment to high-headroom `us-central1` or `us-south1` (+3 pt region boost); (2) Deploy an immediate `64x–128x` Flex-Start-Start seed cluster in `us-central1` while holding `us-east4` for the March 2027 expansion wave; (3) Upgrade from 1-Yr to 3-Yr CUD with 20% upfront prepayment."
        )
    elif any(k in q_low for k in ("cold", "dfe", "alternative", "b200", "asic_v7", "v7", "v6e", "asic_v6e", "region")):
        fallback_ans = (
            f"**Cold-Region & DFE Architecture Recommendations (`{role_view}` View • Question: \"{question}\")**:\n\n"
            f"• **High-Headroom Target Regions**: `us-central1` and `us-south1` have immediate Balanced / Expansion Headroom, whereas `us-east4` is constrained (<15% headroom).\n"
            f"• **DFE Hardware Pivots**: For constrained `H100/H200/GB200` asks in `us-east4`, pivot training/inference workloads to **ASIC-v6e (`TPU v6e`)** in `us-east5` or `us-central1` ($1.22/hr 3-Yr published CUD reference vs $2.70/hr list), or offload ≤64-chip inference to **NVIDIA G4 (RTX PRO 6000 Blackwell)** in `us-central1`."
        )
    else:
        fallback_ans = (
            f"**Allocation Queue Cutline Summary (`{role_view}` View • Question: \"{question or 'Overview'}\")**:\n\n"
            f"• **Recommend: Approve (Human Council Decision ≥80 pts)**: `TET-2026-0412` **{r_northstar['customer_name']}** (`{r_northstar['requested_chips']:,}x {r_northstar['chip_name']}` in `{r_northstar['primary_region']}`, ${r_northstar['deal_tcv_usd_m']}M TCV, 5-Yr CUD, 30% prepay, Score **{r_northstar['priority_score']}/100**) and `TET-2026-0414` **{r_nimbus['customer_name']}** (`{r_nimbus['requested_chips']:,}x {r_nimbus['chip_name']}` in `{r_nimbus['primary_region']}`, ${r_nimbus['deal_tcv_usd_m']}M TCV, Score **{r_nimbus['priority_score']}/100**).\n"
            f"• **Blocked by 14-Day Utilization Breach**: `TET-2026-0413` **{r_stratos['customer_name']}** (`{r_stratos['requested_chips']:,}x {r_stratos['chip_name']}` in `{r_stratos['primary_region']}`, Score **{r_stratos['priority_score']}/100** after -25 pt breach penalty on `SLA-2026-903` at 14% ramp vs. 85% target) — held until existing idle capacity is remediated.\n"
            f"• **Routed to Counter-Offer Playbook (<65 pts)**: `TET-2026-0415` **{r_helios['customer_name']}** (`{r_helios['requested_chips']:,}x {r_helios['chip_name']}` in `{r_helios['primary_region']}`, Score **{r_helios['priority_score']}/100**)."
        )

    return {
        "answer": fallback_ans,
        "reply": fallback_ans,
        "model": "deterministic-question-router (offline fallback)",
        "role_view": role_view,
        "question": question,
    }


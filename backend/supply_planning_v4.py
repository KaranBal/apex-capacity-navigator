"""v4.0 Registry CCA Linker (Whale vs. Torso/Tail Pyramid), Dual Delivery Dates (Ideal vs. Must-Have-By),
GTM Lead Elevation, and Planning & Operations Demand Forecasting Hub (with P50/P75/P90 Quantiles & Historical Backtest).
All customer names, ticket IDs, and actor identities are 100% synthetic.
"""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Request

from backend.ui_adapter import (
    UI_STORE,
    compute_ui_score_and_companion,
    _get_model_hub_client,
    get_role_view,
    is_assigned_to_field_rep,
)
from backend.crm_pursuit_hub import (
    V3_STORE,
    record_universal_transaction,
)

router = APIRouter()

REGIONAL_SUPPLY_WAVE_DATES: Dict[str, str] = {
    "us-east5": "2027-01-15",
    "us-east4": "2027-03-01",
    "us-central1": "2026-11-20",
    "us-south1": "2026-11-25",
    "europe-west4": "2027-01-20",
    "asia-northeast1": "2027-01-28",
    "us-west1": "2027-02-15",
}


def compute_delivery_timeline_metrics(
    ideal_start_date: str,
    must_have_by_date: str,
    region: str,
    chip_name: str,
) -> Dict[str, Any]:
    """Computes flexibility_window_days, days_until_must_have, wave_match_status, and matched_supply_wave_label."""
    try:
        d_ideal = datetime.strptime(ideal_start_date[:10], "%Y-%m-%d")
    except Exception:
        d_ideal = datetime(2026, 12, 1)
    try:
        d_must = datetime.strptime(must_have_by_date[:10], "%Y-%m-%d")
    except Exception:
        d_must = datetime(2027, 1, 25)

    now_ref = datetime(2026, 11, 1)
    flex_days = max(0, (d_must - d_ideal).days)
    days_until_must = max(0, (d_must - now_ref).days)

    wave_str = REGIONAL_SUPPLY_WAVE_DATES.get(region, "2027-01-15")
    d_wave = datetime.strptime(wave_str, "%Y-%m-%d")
    is_cold = region in ("us-central1", "us-south1")
    is_tpu = any(k in chip_name for k in ("TPU", "ASIC-v7", "ASIC-v6e", "v6e", "v7", "v5p"))

    if is_cold and d_ideal >= d_wave:
        status = "IMMEDIATE_IN_STOCK"
        wave_label = f"Immediate Cold-Region Headroom ({region} ready by {ideal_start_date[:10]})"
    elif d_must >= d_wave:
        status = "WAVE_MATCH_FEASIBLE"
        wave_type = "Jan 2027 TPU Pod Wave" if is_tpu else "Q1 2027 GPU Supply Wave"
        wave_label = f"Fits {wave_type} ({wave_str}) within {flex_days}d Flex Window (+6pt Boost)"
    elif flex_days >= 14:
        status = "SEED_POD_BRIDGE_REQUIRED"
        wave_label = f"Must-Have ({must_have_by_date[:10]}) precedes {region} wave ({wave_str}) — Bridge via us-central1 Seed Pod"
    else:
        status = "CRITICAL_DROP_DEAD_RISK"
        wave_label = f"CRITICAL: {must_have_by_date[:10]} Drop-Dead precedes {region} supply wave ({wave_str}) with only {flex_days}d flex"

    return {
        "ideal_start_date": ideal_start_date[:10],
        "must_have_by_date": must_have_by_date[:10],
        "flexibility_window_days": flex_days,
        "days_until_must_have": days_until_must,
        "next_supply_wave_date": wave_str,
        "wave_match_status": status,
        "matched_supply_wave_label": wave_label,
    }


def enrich_request_v4(req: Dict[str, Any], idx: int = 0) -> Dict[str, Any]:
    """Ensures every AllocationRequest has Registry CCA linkage, Ideal vs. Must-Have dates, and GTM Elevation metadata."""
    req_id = str(req.get("request_id") or f"TET-2026-041{idx+2}")
    default_dates = {
        "TET-2026-0412": (
            "2026-12-01",
            "2027-02-15",
            "HZ-SYNTH-8801",
            True,
            "ce-vp-approver@demo.example.com",
            1,
            "P0-1 Northstar Frontier AI (Synthetic) — 8,192x AI-ASIC v6e in us-east5 + 30% Upfront Prepay ($310.0M TCV, Score 92/100) + Coupled Companion RUB-2026-0101",
        ),
        "TET-2026-0413": (
            "2026-11-18",
            "2027-01-10",
            "HZ-SYNTH-8803",
            False,
            None,
            None,
            "Stratos Autonomous Robotics (Synthetic) — Currently BLOCKED BY UTILIZATION BREACH on SLA-2026-903 (14% ramp vs. 85% target; Score 63/100 after -25pt penalty)",
        ),
        "TET-2026-0414": ("2026-12-05", "2027-01-30", "HZ-SYNTH-8804", False, None, None, None),
        "TET-2026-0415": ("2026-11-15", "2026-12-05", "HZ-SYNTH-8805", False, None, None, None),
        "TET-2026-0416": ("2026-12-10", "2027-02-20", "HZ-SYNTH-8806", False, None, None, None),
    }
    d_tuple = default_dates.get(
        req_id,
        (
            str(req.get("ideal_start_date") or req.get("target_delivery_date") or "2026-12-01"),
            str(req.get("must_have_by_date") or "2027-01-31"),
            str(req.get("registry_cca_id") or req.get("registry_cdr_id") or f"HZ-SYNTH-88{10+idx}"),
            bool(req.get("is_gtm_elevated", False)),
            req.get("elevated_by_ldap"),
            req.get("elevation_rank"),
            req.get("elevation_note"),
        ),
    )

    ideal_dt = str(req.get("ideal_start_date") or d_tuple[0])
    must_dt = str(req.get("must_have_by_date") or d_tuple[1])
    hz_id = str(req.get("registry_cca_id") or d_tuple[2])
    region = str(req.get("primary_region") or "us-east5")
    chip = str(req.get("chip_name") or "NextGen-ASIC v7")
    chips = int(req.get("requested_chips") or 1024)
    tcv = float(req.get("deal_tcv_usd_m") or 25.0)

    tl = compute_delivery_timeline_metrics(ideal_dt, must_dt, region, chip)

    if chips >= 5000 or tcv >= 100.0 or req.get("is_gtm_elevated", d_tuple[3]):
        tier = "WHALE"
    elif chips >= 64:
        tier = "TORSO"
    else:
        tier = "TAIL"

    req["registry_cca_id"] = hz_id
    req["registry_url"] = f"http://capacity-registry/{hz_id}"
    req["demand_tier"] = req.get("demand_tier") or tier
    req["ideal_start_date"] = tl["ideal_start_date"]
    req["must_have_by_date"] = tl["must_have_by_date"]
    req["flexibility_window_days"] = tl["flexibility_window_days"]
    req["days_until_must_have"] = tl["days_until_must_have"]
    req["next_supply_wave_date"] = tl["next_supply_wave_date"]
    req["wave_match_status"] = tl["wave_match_status"]
    req["matched_supply_wave_label"] = tl["matched_supply_wave_label"]

    if "is_gtm_elevated" not in req:
        req["is_gtm_elevated"] = d_tuple[3]
        req["elevated_by_ldap"] = d_tuple[4]
        req["elevated_at"] = "2026-11-01T12:00:00Z" if d_tuple[3] else None
        req["elevation_rank"] = d_tuple[5]
        req["elevation_note"] = d_tuple[6]

    return req


def _default_demand_buckets() -> List[Dict[str, Any]]:
    """Torso (64-4,999 chips) and Long-Tail (<64 chips / FlexStart / Startups) Registry CCA Regional Rollups (100% Synthetic)."""
    return [
        {
            "bucket_id": "BKT-US-EAST5-V6E-TORSO",
            "demand_tier": "TORSO",
            "tier_label": "Torso Tier 2 (64–4,999 Chips)",
            "region": "us-east5",
            "chip_name": "AI-ASIC v6e",
            "registry_ticket_count": 19,
            "total_aggregated_chips": 2304,
            "total_aggregated_tcv_usd_m": 64.5,
            "earliest_ideal_start": "2026-11-18",
            "earliest_must_have_by": "2027-01-15",
            "recommended_fulfillment_path": "Batch Allocate from Jan 15, 2027 us-east5 TPU Pod Wave or Calendar Mode (<=90d)",
            "registry_query_url": "http://capacity-registry?q=region:us-east5+sku:v6e+chips:64..4999+status:open",
            "sample_tickets": [
                {
                    "registry_cca_id": "CCA-SYNTH-4847",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-4847",
                    "has_custom_live_url": False,
                    "customer_name": "Hyperion Multimodal AI (Synthetic — 2,048x v6e)",
                    "requested_chips": 2048,
                    "deal_tcv_usd_m": 42.0,
                    "ideal_start_date": "2026-11-20",
                    "must_have_by_date": "2027-01-15",
                    "owner_ldap": "field-specialist-ce@demo.example.com",
                    "consumption_model": "3-Yr CUD ($1.28/hr Published CUD Ref)",
                },
                {
                    "registry_cca_id": "CCA-SYNTH-4859",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-4859",
                    "has_custom_live_url": False,
                    "customer_name": "Vanguard Inference Cloud (Synthetic — 256x v6e)",
                    "requested_chips": 256,
                    "deal_tcv_usd_m": 5.4,
                    "ideal_start_date": "2026-11-28",
                    "must_have_by_date": "2027-01-20",
                    "owner_ldap": "field-specialist-ce@demo.example.com",
                    "consumption_model": "1-Yr CUD ($1.89/hr Published CUD Ref)",
                },
            ],
        },
        {
            "bucket_id": "BKT-US-EAST4-H200-TORSO",
            "demand_tier": "TORSO",
            "tier_label": "Torso Tier 2 (64–4,999 Chips)",
            "region": "us-east4",
            "chip_name": "H200 (141GB)",
            "registry_ticket_count": 24,
            "total_aggregated_chips": 3072,
            "total_aggregated_tcv_usd_m": 108.4,
            "earliest_ideal_start": "2026-11-15",
            "earliest_must_have_by": "2026-12-20",
            "recommended_fulfillment_path": "DFE Spillover Required: Shift to us-central1 G4 (RTX PRO 6000) or us-east5 ASIC-v6e v6e",
            "registry_query_url": "http://capacity-registry?q=region:us-east4+sku:h200+chips:64..4999+status:open",
            "sample_tickets": [
                {
                    "registry_cca_id": "CCA-SYNTH-3142",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-3142",
                    "has_custom_live_url": False,
                    "customer_name": "Boreal Foundation Models (Synthetic — 1,024x H200)",
                    "requested_chips": 1024,
                    "deal_tcv_usd_m": 38.0,
                    "ideal_start_date": "2026-11-15",
                    "must_have_by_date": "2026-12-20",
                    "owner_ldap": "account-fsr@demo.example.com",
                    "consumption_model": "3-Yr CUD ($4.77/hr Published CUD Ref)",
                },
                {
                    "registry_cca_id": "CCA-SYNTH-3189",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-3189",
                    "has_custom_live_url": False,
                    "customer_name": "Cascade Code Intelligence (Synthetic — 512x H200)",
                    "requested_chips": 512,
                    "deal_tcv_usd_m": 19.2,
                    "ideal_start_date": "2026-11-22",
                    "must_have_by_date": "2027-01-10",
                    "owner_ldap": "field-specialist-ce@demo.example.com",
                    "consumption_model": "Calendar Mode (90d)",
                },
            ],
        },
        {
            "bucket_id": "BKT-US-CENTRAL1-V6E-TORSO",
            "demand_tier": "TORSO",
            "tier_label": "Torso Tier 2 (64–4,999 Chips)",
            "region": "us-central1",
            "chip_name": "AI-ASIC v6e",
            "registry_ticket_count": 14,
            "total_aggregated_chips": 1792,
            "total_aggregated_tcv_usd_m": 48.2,
            "earliest_ideal_start": "2026-11-20",
            "earliest_must_have_by": "2027-01-10",
            "recommended_fulfillment_path": "Recommend Approve via Cold-Region Fast-Track (Human Council Decision • us-central1 Immediate Headroom)",
            "registry_query_url": "http://capacity-registry?q=region:us-central1+sku:v6e+chips:64..4999+status:open",
            "sample_tickets": [
                {
                    "registry_cca_id": "CCA-SYNTH-5104",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-5104",
                    "has_custom_live_url": False,
                    "customer_name": "Solstice Robotics Sim (Synthetic — 512x v6e)",
                    "requested_chips": 512,
                    "deal_tcv_usd_m": 13.8,
                    "ideal_start_date": "2026-11-20",
                    "must_have_by_date": "2027-01-10",
                    "owner_ldap": "field-specialist-ce@demo.example.com",
                    "consumption_model": "3-Yr CUD ($1.24/hr)",
                },
            ],
        },
        {
            "bucket_id": "BKT-US-EAST5-V6E-TAIL",
            "demand_tier": "TAIL",
            "tier_label": "Long-Tail Tier 3 (<64 Chips • FlexStart / Startups)",
            "region": "us-east5",
            "chip_name": "AI-ASIC v6e",
            "registry_ticket_count": 62,
            "total_aggregated_chips": 1536,
            "total_aggregated_tcv_usd_m": 28.4,
            "earliest_ideal_start": "2026-11-10",
            "earliest_must_have_by": "2026-12-15",
            "recommended_fulfillment_path": "Zero-Touch Auto-Route to Flex-Start-Start (<=7d) & Obidos 30-Day PoC Pool",
            "registry_query_url": "http://capacity-registry?q=region:us-east5+sku:v6e+chips:1..63+status:open",
            "sample_tickets": [
                {
                    "registry_cca_id": "CCA-SYNTH-6011",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-6011",
                    "has_custom_live_url": False,
                    "customer_name": "Veridian Seed Labs (Synthetic — 32x v6e FlexStart)",
                    "requested_chips": 32,
                    "deal_tcv_usd_m": 0.65,
                    "ideal_start_date": "2026-11-12",
                    "must_have_by_date": "2026-12-15",
                    "owner_ldap": "field-specialist-ce@demo.example.com",
                    "consumption_model": "Flex-Start-Start (<=7d)",
                },
            ],
        },
        {
            "bucket_id": "BKT-US-EAST4-H200-TAIL",
            "demand_tier": "TAIL",
            "tier_label": "Long-Tail Tier 3 (<64 Chips • FlexStart / Startups)",
            "region": "us-east4",
            "chip_name": "H200 (141GB)",
            "registry_ticket_count": 78,
            "total_aggregated_chips": 1920,
            "total_aggregated_tcv_usd_m": 54.6,
            "earliest_ideal_start": "2026-11-12",
            "earliest_must_have_by": "2026-12-18",
            "recommended_fulfillment_path": "Auto-Deflect to G4 (RTX PRO 6000 Blackwell) in us-central1 / us-south1 via Flex-Start",
            "registry_query_url": "http://capacity-registry?q=region:us-east4+sku:h200+chips:1..63+status:open",
            "sample_tickets": [
                {
                    "registry_cca_id": "CCA-SYNTH-6209",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-6209",
                    "has_custom_live_url": False,
                    "customer_name": "Lumina Audio Synthesis (Synthetic — 32x H200)",
                    "requested_chips": 32,
                    "deal_tcv_usd_m": 1.1,
                    "ideal_start_date": "2026-11-14",
                    "must_have_by_date": "2026-12-18",
                    "owner_ldap": "account-fsr@demo.example.com",
                    "consumption_model": "Flex-Start-Start (<=7d)",
                },
            ],
        },
        {
            "bucket_id": "BKT-US-CENTRAL1-G4-TAIL",
            "demand_tier": "TAIL",
            "tier_label": "Long-Tail Tier 3 (<64 Chips • FlexStart / Startups)",
            "region": "us-central1",
            "chip_name": "G4 (RTX PRO 6000 Blackwell)",
            "registry_ticket_count": 53,
            "total_aggregated_chips": 1408,
            "total_aggregated_tcv_usd_m": 19.8,
            "earliest_ideal_start": "2026-11-10",
            "earliest_must_have_by": "2026-12-30",
            "recommended_fulfillment_path": "Zero-Touch Self-Serve Provisioning in us-central1 G4 Fleet",
            "registry_query_url": "http://capacity-registry?q=region:us-central1+sku:g4+chips:1..63+status:open",
            "sample_tickets": [
                {
                    "registry_cca_id": "CCA-SYNTH-6412",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-6412",
                    "has_custom_live_url": False,
                    "customer_name": "Zephyr Retail Agents (Synthetic — 16x G4)",
                    "requested_chips": 16,
                    "deal_tcv_usd_m": 0.32,
                    "ideal_start_date": "2026-11-10",
                    "must_have_by_date": "2026-12-30",
                    "owner_ldap": "field-specialist-ce@demo.example.com",
                    "consumption_model": "1-Yr CUD",
                },
            ],
        },
        {
            "bucket_id": "BKT-EUROPE-WEST4-V6E-TORSO",
            "demand_tier": "TORSO",
            "tier_label": "Torso Tier 2 (64–4,999 Chips • EMEA Sovereign)",
            "region": "europe-west4",
            "chip_name": "AI-ASIC v6e",
            "registry_ticket_count": 11,
            "total_aggregated_chips": 1536,
            "total_aggregated_tcv_usd_m": 44.0,
            "earliest_ideal_start": "2026-12-01",
            "earliest_must_have_by": "2027-01-25",
            "recommended_fulfillment_path": "Geo-Fenced EMEA Sovereign Allocation from Jan 20, 2027 europe-west4 M7 Wave",
            "registry_query_url": "http://capacity-registry?q=region:europe-west4+sku:v6e+chips:64..4999+status:open",
            "sample_tickets": [
                {
                    "registry_cca_id": "CCA-SYNTH-7102",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-7102",
                    "has_custom_live_url": False,
                    "customer_name": "Rhine Sovereign AI Lab (Synthetic — 512x v6e GDPR)",
                    "requested_chips": 512,
                    "deal_tcv_usd_m": 15.2,
                    "ideal_start_date": "2026-12-01",
                    "must_have_by_date": "2027-01-25",
                    "owner_ldap": "field-specialist-ce@demo.example.com",
                    "consumption_model": "3-Yr Sovereign CUD ($1.24/hr)",
                },
            ],
        },
        {
            "bucket_id": "BKT-ASIA-NE1-V6E-TORSO",
            "demand_tier": "TORSO",
            "tier_label": "Torso Tier 2 (64–4,999 Chips • APAC Regulated)",
            "region": "asia-northeast1",
            "chip_name": "AI-ASIC v6e",
            "registry_ticket_count": 9,
            "total_aggregated_chips": 1280,
            "total_aggregated_tcv_usd_m": 36.8,
            "earliest_ideal_start": "2026-12-05",
            "earliest_must_have_by": "2027-02-01",
            "recommended_fulfillment_path": "APAC Regulated Allocation from Jan 28, 2027 asia-northeast1 Wave",
            "registry_query_url": "http://capacity-registry?q=region:asia-northeast1+sku:v6e+chips:64..4999+status:open",
            "sample_tickets": [
                {
                    "registry_cca_id": "CCA-SYNTH-7308",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-7308",
                    "has_custom_live_url": False,
                    "customer_name": "Pacifica Financial AI (Synthetic — 256x v6e FISC)",
                    "requested_chips": 256,
                    "deal_tcv_usd_m": 7.6,
                    "ideal_start_date": "2026-12-05",
                    "must_have_by_date": "2027-02-01",
                    "owner_ldap": "account-fsr@demo.example.com",
                    "consumption_model": "3-Yr CUD ($1.24/hr)",
                },
            ],
        },
        {
            "bucket_id": "BKT-US-WEST1-H200-TORSO",
            "demand_tier": "TORSO",
            "tier_label": "Torso Tier 2 (64–4,999 Chips • Regulated Enterprise Enclave)",
            "region": "us-west1",
            "chip_name": "H200 (141GB)",
            "registry_ticket_count": 6,
            "total_aggregated_chips": 768,
            "total_aggregated_tcv_usd_m": 34.5,
            "earliest_ideal_start": "2026-12-01",
            "earliest_must_have_by": "2027-01-30",
            "recommended_fulfillment_path": "Dedicated Regulated Enterprise Enclave Pool",
            "registry_query_url": "http://capacity-registry?q=region:us-west1+sku:h200+chips:64..4999+status:open",
            "sample_tickets": [
                {
                    "registry_cca_id": "CCA-SYNTH-7501",
                    "registry_url": "http://capacity-registry/CCA-SYNTH-7501",
                    "has_custom_live_url": False,
                    "customer_name": "Aegis Regulated Enterprise AI (Synthetic — 256x H200)",
                    "requested_chips": 256,
                    "deal_tcv_usd_m": 16.5,
                    "ideal_start_date": "2026-12-01",
                    "must_have_by_date": "2027-01-30",
                    "owner_ldap": "account-fsr@demo.example.com",
                    "consumption_model": "3-Yr Enterprise CUD ($4.77/hr Published CUD Ref)",
                },
            ],
        },
    ]


def _default_regional_supply_waves() -> List[Dict[str, Any]]:
    """Regional physical + commissioning + Reclaimed/Flex-Start supply across Global Theaters (Saleable Hyperscale Cloud Only)."""
    return [
        {
            "region": "us-east5",
            "geography": "NORTHAM",
            "sovereign_boundary": "Commercial Global Fleet",
            "primary_skus": ["NextGen-ASIC v7", "AI-ASIC v6e"],
            "committed_physical_chips": 10240,
            "m0_m7_commissioning_chips": 6144,
            "gdm_bridge_pool_chips": 1024,
            "reclaimed_flex_start_flex_chips": 1024,
            "foundation_llm_1p_cotenancy_chips": 2048,
            "telemetry_realization_pct": 94.2,
            "kw_per_chip": 0.92,
            "next_supply_wave_date": "2027-01-15",
            "commissioning_note": "ASIC-v7 (v7x) & ASIC-v6e (v6e) pods in Stage 2/3 Datacenter Commissioning (Illustrative Jan 2027 Customer Handover Wave).",
        },
        {
            "region": "us-east4",
            "geography": "NORTHAM",
            "sovereign_boundary": "Commercial Global Fleet",
            "primary_skus": ["H200 (141GB)", "B200"],
            "committed_physical_chips": 2048,
            "m0_m7_commissioning_chips": 1024,
            "gdm_bridge_pool_chips": 256,
            "reclaimed_flex_start_flex_chips": 256,
            "foundation_llm_1p_cotenancy_chips": 512,
            "telemetry_realization_pct": 89.6,
            "kw_per_chip": 1.18,
            "next_supply_wave_date": "2027-03-01",
            "commissioning_note": "Constrained Hot GPU Region — Next major GPU wave lands Mar 2027; recommend DFE pivot to us-east5 ASIC-v6e v6e or us-central1 G4.",
        },
        {
            "region": "us-central1",
            "geography": "NORTHAM",
            "sovereign_boundary": "Commercial Global Fleet",
            "primary_skus": ["AI-ASIC v6e", "NextGen-ASIC v7", "B200", "G4 (RTX PRO 6000 Blackwell)"],
            "committed_physical_chips": 8192,
            "m0_m7_commissioning_chips": 4096,
            "gdm_bridge_pool_chips": 1280,
            "reclaimed_flex_start_flex_chips": 1280,
            "foundation_llm_1p_cotenancy_chips": 1536,
            "telemetry_realization_pct": 88.5,
            "kw_per_chip": 0.85,
            "next_supply_wave_date": "2026-11-20",
            "commissioning_note": "Balanced / Expansion Headroom Region — Immediate headroom + 1,280 Reclaimed & Flex-Start Pool chips.",
        },
        {
            "region": "us-south1",
            "geography": "NORTHAM",
            "sovereign_boundary": "Commercial Global Fleet",
            "primary_skus": ["B200", "H200 (141GB)", "G4 (RTX PRO 6000 Blackwell)"],
            "committed_physical_chips": 4096,
            "m0_m7_commissioning_chips": 2048,
            "gdm_bridge_pool_chips": 512,
            "reclaimed_flex_start_flex_chips": 512,
            "foundation_llm_1p_cotenancy_chips": 512,
            "telemetry_realization_pct": 91.4,
            "kw_per_chip": 1.12,
            "next_supply_wave_date": "2026-11-25",
            "commissioning_note": "DFE Cold Region — Preferred spillover target for constrained us-east4 GPU demand.",
        },
        {
            "region": "europe-west4",
            "geography": "EMEA",
            "sovereign_boundary": "EU Sovereign Cloud (GDPR / EU AI Act / BSI C5)",
            "primary_skus": ["AI-ASIC v6e", "NextGen-ASIC v7"],
            "committed_physical_chips": 4096,
            "m0_m7_commissioning_chips": 3072,
            "gdm_bridge_pool_chips": 512,
            "reclaimed_flex_start_flex_chips": 512,
            "foundation_llm_1p_cotenancy_chips": 1024,
            "telemetry_realization_pct": 92.8,
            "kw_per_chip": 0.78,
            "next_supply_wave_date": "2027-01-20",
            "commissioning_note": "EMEA Sovereign AI & Frontier TPU Hub — Jan 2027 pod wave (Geo-fenced within EU Sovereign boundary).",
        },
        {
            "region": "asia-northeast1",
            "geography": "APAC",
            "sovereign_boundary": "APAC Regulated (Japan FISC / Singapore MAS)",
            "primary_skus": ["AI-ASIC v6e", "H200 (141GB)"],
            "committed_physical_chips": 2048,
            "m0_m7_commissioning_chips": 1024,
            "gdm_bridge_pool_chips": 256,
            "reclaimed_flex_start_flex_chips": 256,
            "foundation_llm_1p_cotenancy_chips": 512,
            "telemetry_realization_pct": 95.6,
            "kw_per_chip": 0.84,
            "next_supply_wave_date": "2027-01-28",
            "commissioning_note": "APAC Frontier AI Hub (Tokyo/Singapore) — High demand from sovereign & digital native labs; Jan 2027 delivery wave.",
        },
        {
            "region": "us-west1",
            "geography": "PUBLIC_SECTOR",
            "sovereign_boundary": "Regulated Enterprise Enclave",
            "primary_skus": ["H200 (141GB)", "AI-ASIC v6e"],
            "committed_physical_chips": 1024,
            "m0_m7_commissioning_chips": 512,
            "gdm_bridge_pool_chips": 128,
            "reclaimed_flex_start_flex_chips": 128,
            "foundation_llm_1p_cotenancy_chips": 256,
            "telemetry_realization_pct": 86.2,
            "kw_per_chip": 1.15,
            "next_supply_wave_date": "2027-02-15",
            "commissioning_note": "Regulated Enterprise Enclave — Isolated compliance boundary.",
        },
    ]


def compute_forecast_backtest_metrics(total_demand_chips: int = 24250) -> Dict[str, Any]:
    """Computes Illustrative Stage-Calibrated Conversion + P50/P75/P90 Quantiles
    + 6-Month Rolling Synthetic Backtest (WMAPE & Bias) for Demand Forecasting governance.
    Stage weights (100% Contracted, 85% Customer Firm, 55% Likely, 15% Early) are applied directly in Python,
    and headline WMAPE / Bias / Naive WMAPE metrics are computed directly from the 6-month series sums.
    """
    stage_weights = [
        {"stage": "Contracted (Signed CUD / Active Order)", "stage_name": "Contracted", "empirical_conversion_weight": 1.00, "weight_pct": 100, "basis": "Illustrative Target Weight"},
        {"stage": "Customer Firm (Price, Term & Region Locked)", "stage_name": "Customer Firm", "empirical_conversion_weight": 0.85, "weight_pct": 85, "basis": "Illustrative Target Weight"},
        {"stage": "Likely (Architecture Scoped & Sized)", "stage_name": "Likely", "empirical_conversion_weight": 0.55, "weight_pct": 55, "basis": "Illustrative Target Weight"},
        {"stage": "Early (Discovery / Initial Sizing)", "stage_name": "Early", "empirical_conversion_weight": 0.15, "weight_pct": 15, "basis": "Illustrative Target Weight"},
    ]
    w_map = {s["stage_name"]: float(s["empirical_conversion_weight"]) for s in stage_weights}

    # Apply the 4 stage weights directly to the active registry pipeline breakdown
    active_contracted = int(round(total_demand_chips * 0.42))
    active_firm = int(round(total_demand_chips * 0.34))
    active_likely = int(round(total_demand_chips * 0.16))
    active_early = max(0, total_demand_chips - active_contracted - active_firm - active_likely)
    base_p50 = max(
        1024,
        int(
            round(
                w_map["Contracted"] * active_contracted
                + w_map["Customer Firm"] * active_firm
                + w_map["Likely"] * active_likely
                + w_map["Early"] * active_early
            )
        ),
    )
    p75 = int(round(base_p50 * 1.12))
    p90 = int(round(base_p50 * 1.24))

    raw_monthly_stages = [
        {
            "month": "2026-05",
            "contracted_chips": 7800,
            "customer_firm_chips": 11000,
            "likely_chips": 6000,
            "early_chips": 4500,
            "actual_landed_chips": 22000,
        },
        {
            "month": "2026-06",
            "contracted_chips": 11500,
            "customer_firm_chips": 11800,
            "likely_chips": 6600,
            "early_chips": 5100,
            "actual_landed_chips": 24000,
        },
        {
            "month": "2026-07",
            "contracted_chips": 10400,
            "customer_firm_chips": 12600,
            "likely_chips": 7600,
            "early_chips": 5400,
            "actual_landed_chips": 28000,
        },
        {
            "month": "2026-08",
            "contracted_chips": 15600,
            "customer_firm_chips": 14000,
            "likely_chips": 8000,
            "early_chips": 6000,
            "actual_landed_chips": 30000,
        },
        {
            "month": "2026-09",
            "contracted_chips": 13400,
            "customer_firm_chips": 14800,
            "likely_chips": 8600,
            "early_chips": 6600,
            "actual_landed_chips": 34000,
        },
        {
            "month": "2026-10",
            "contracted_chips": 15350,
            "customer_firm_chips": 15600,
            "likely_chips": 9500,
            "early_chips": 7100,
            "actual_landed_chips": 37000,
        },
    ]

    monthly_backtest: List[Dict[str, Any]] = []
    for row in raw_monthly_stages:
        raw_chips = (
            row["contracted_chips"]
            + row["customer_firm_chips"]
            + row["likely_chips"]
            + row["early_chips"]
        )
        p50_chips = int(
            round(
                w_map["Contracted"] * row["contracted_chips"]
                + w_map["Customer Firm"] * row["customer_firm_chips"]
                + w_map["Likely"] * row["likely_chips"]
                + w_map["Early"] * row["early_chips"]
            )
        )
        p90_chips = int(round(p50_chips * 1.20))
        actual_chips = int(row["actual_landed_chips"])
        abs_err_pct = round(abs(actual_chips - p50_chips) / actual_chips * 100.0, 2)
        bias_err_pct = round((p50_chips - actual_chips) / actual_chips * 100.0, 2)
        monthly_backtest.append(
            {
                "month": row["month"],
                "contracted_chips": row["contracted_chips"],
                "customer_firm_chips": row["customer_firm_chips"],
                "likely_chips": row["likely_chips"],
                "early_chips": row["early_chips"],
                "raw_pipeline_chips": raw_chips,
                "raw_crm_ask_chips": raw_chips,
                "raw_unweighted_crm_chips": raw_chips,
                "predicted_p50_chips": p50_chips,
                "stage_weighted_p50_chips": p50_chips,
                "forecast_chips": p50_chips,
                "p50_chips": p50_chips,
                "predicted_p90_chips": p90_chips,
                "p90_envelope_chips": p90_chips,
                "actual_landed_chips": actual_chips,
                "actual_chips": actual_chips,
                "abs_pct_error": abs_err_pct,
                "bias_pct": bias_err_pct,
            }
        )

    tot_actual = sum(m["actual_landed_chips"] for m in monthly_backtest)
    tot_abs_err = sum(abs(m["actual_landed_chips"] - m["predicted_p50_chips"]) for m in monthly_backtest)
    tot_signed_err = sum(m["predicted_p50_chips"] - m["actual_landed_chips"] for m in monthly_backtest)
    tot_naive_err = sum(abs(m["actual_landed_chips"] - m["raw_pipeline_chips"]) for m in monthly_backtest)

    overall_wmape_pct = round(tot_abs_err / max(1, tot_actual) * 100.0, 1)
    overall_bias_pct = round(tot_signed_err / max(1, tot_actual) * 100.0, 1)
    naive_pipeline_wmape_pct = round(tot_naive_err / max(1, tot_actual) * 100.0, 1)
    wmape_improvement_pts = round(naive_pipeline_wmape_pct - overall_wmape_pct, 1)
    error_reduction_vs_naive_pct = round((naive_pipeline_wmape_pct - overall_wmape_pct) / max(0.1, naive_pipeline_wmape_pct) * 100.0, 1)

    return {
        "model_architecture": "Illustrative Stage-Weighted Funnel & 80% Capital Cap (Mockup) • Production Path: DataWarehouse ML AI.FORECAST (TimesFM)",
        "overall_wmape_pct": overall_wmape_pct,
        "overall_bias_pct": overall_bias_pct,
        "naive_pipeline_wmape_pct": naive_pipeline_wmape_pct,
        "wmape_improvement_pts": wmape_improvement_pts,
        "quantiles_next_quarter_chips": {
            "raw_unadjusted_pipeline_chips": total_demand_chips,
            "contracted_stage_chips": active_contracted,
            "customer_firm_stage_chips": active_firm,
            "likely_stage_chips": active_likely,
            "early_stage_chips": active_early,
            "p50_expected_commit_chips": base_p50,
            "p75_upside_buffer_chips": p75,
            "p90_supply_planning_envelope_chips": p90,
            "phantom_double_count_haircut_chips": max(0, total_demand_chips - base_p50),
        },
        "stage_conversion_weights": stage_weights,
        "accuracy_governance": {
            "rolling_6m_wmape_pct": overall_wmape_pct,
            "rolling_6m_bias_pct": overall_bias_pct,
            "naive_unweighted_pipeline_wmape_pct": naive_pipeline_wmape_pct,
            "error_reduction_vs_naive_pct": error_reduction_vs_naive_pct,
            "recalibration_cadence": "Illustrative Synthetic Backtest (Target ≤8% WMAPE; production calibrates monthly against actual handovers & 30-day billing ramp)",
        },
        "monthly_backtest_series": monthly_backtest,
        "monthly_series": monthly_backtest,
    }


def ensure_v4_store_initialized() -> None:
    for idx, req in enumerate(UI_STORE.get("allocation_requests", [])):
        enrich_request_v4(req, idx)
    for card in UI_STORE.get("companion_cards", []):
        if "ideal_start_date" not in card:
            t2 = card.get("tab2_cdr_line_items", {})
            ideal_dt = str(t2.get("target_delivery_date") or "2026-12-01")
            must_dt = "2027-01-25"
            tl = compute_delivery_timeline_metrics(
                ideal_dt,
                must_dt,
                str(t2.get("region") or "us-east5"),
                str(t2.get("machine_family") or "C4"),
            )
            card["ideal_start_date"] = tl["ideal_start_date"]
            card["must_have_by_date"] = tl["must_have_by_date"]
            card["flexibility_window_days"] = tl["flexibility_window_days"]
            card["is_gtm_elevated"] = card["card_id"] in ("RUB-2026-0101", "RUB-2026-0102")
            card["elevated_by_ldap"] = "ce-director@demo.example.com" if card["is_gtm_elevated"] else None
            card["elevation_note"] = (
                "Coupled >20% regional Classic Infra BOM for P0 Frontier TPU Pod"
                if card["is_gtm_elevated"]
                else None
            )

    if "demand_buckets" not in UI_STORE or not UI_STORE["demand_buckets"]:
        UI_STORE["demand_buckets"] = _default_demand_buckets()
    if "supply_waves" not in UI_STORE or not UI_STORE["supply_waves"]:
        UI_STORE["supply_waves"] = _default_regional_supply_waves()


ensure_v4_store_initialized()


def _normalize_bucket(b: Dict[str, Any]) -> Dict[str, Any]:
    b["ticket_count"] = int(b.get("registry_ticket_count", b.get("ticket_count", 0)))
    b["total_requested_chips"] = int(b.get("total_aggregated_chips", b.get("total_requested_chips", 0)))
    b["total_tcv_usd_m"] = float(b.get("total_aggregated_tcv_usd_m", b.get("total_tcv_usd_m", 0.0)))
    b["recommended_dfe_pathway"] = str(b.get("recommended_fulfillment_path", b.get("recommended_dfe_pathway", "")))
    for st in b.get("sample_tickets", []):
        st["chips"] = int(st.get("requested_chips", st.get("chips", 0)))
        st["tcv_usd_m"] = float(st.get("deal_tcv_usd_m", st.get("tcv_usd_m", 0.0)))
        st["registry_url"] = st.get("registry_url") or f"http://capacity-registry/{st.get('registry_cca_id', '')}"
    return b


@router.get("/api/v1/registry/buckets")
def get_registry_demand_buckets(request: Request, region: str = "ALL", tier: str = "ALL"):
    ensure_v4_store_initialized()
    role_view = get_role_view(request)
    if role_view == "FIELD_REP":
        return {
            "role_view": "FIELD_REP",
            "rbac_redacted": True,
            "rbac_notice": "Field Account Team View: Regional aggregate Torso/Tail demand buckets across unassigned accounts are restricted to Central Capacity & Operations.",
            "buckets": [],
            "pyramid_summary": {
                "whale_deal_count": 3,
                "whale_chips": 17408,
                "whale_tcv_usd_m": 672.0,
                "whale_share_pct": 100.0,
                "torso_ticket_count": 0,
                "torso_chips": 0,
                "torso_tcv_usd_m": 0.0,
                "torso_share_pct": 0.0,
                "tail_ticket_count": 0,
                "tail_chips": 0,
                "tail_tcv_usd_m": 0.0,
                "tail_share_pct": 0.0,
                "torso_plus_tail_ticket_count": 0,
                "torso_plus_tail_tcv_usd_m": 0.0,
                "torso_tier_2_64_to_255": {"ticket_count": 0, "total_chips": 0, "total_tcv_usd_m": 0.0},
                "tail_tier_3_lt_64": {"ticket_count": 0, "total_chips": 0, "total_tcv_usd_m": 0.0},
                "total_true_demand_chips": 17408,
                "total_true_demand_tcv_usd_m": 672.0,
                "total_registry_tickets": 3,
            },
        }

    buckets = [_normalize_bucket(b) for b in UI_STORE["demand_buckets"]]
    whales = UI_STORE["allocation_requests"]

    filtered_buckets = [
        b
        for b in buckets
        if (region == "ALL" or b["region"] == region)
        and (tier == "ALL" or b["demand_tier"] == tier)
    ]

    whale_chips = sum(int(r["requested_chips"]) for r in whales if region == "ALL" or r["primary_region"] == region)
    whale_tcv = round(sum(float(r["deal_tcv_usd_m"]) for r in whales if region == "ALL" or r["primary_region"] == region), 1)
    torso_chips = sum(int(b["total_aggregated_chips"]) for b in filtered_buckets if b["demand_tier"] == "TORSO")
    torso_tickets = sum(int(b["registry_ticket_count"]) for b in filtered_buckets if b["demand_tier"] == "TORSO")
    torso_tcv = round(sum(float(b["total_aggregated_tcv_usd_m"]) for b in filtered_buckets if b["demand_tier"] == "TORSO"), 1)
    tail_chips = sum(int(b["total_aggregated_chips"]) for b in filtered_buckets if b["demand_tier"] == "TAIL")
    tail_tickets = sum(int(b["registry_ticket_count"]) for b in filtered_buckets if b["demand_tier"] == "TAIL")
    tail_tcv = round(sum(float(b["total_aggregated_tcv_usd_m"]) for b in filtered_buckets if b["demand_tier"] == "TAIL"), 1)

    total_chips = max(1, whale_chips + torso_chips + tail_chips)

    return {
        "role_view": "OPS_CENTRAL",
        "buckets": filtered_buckets,
        "pyramid_summary": {
            "whale_deal_count": len(whales),
            "whale_chips": whale_chips,
            "whale_tcv_usd_m": whale_tcv,
            "whale_share_pct": round(whale_chips * 100.0 / total_chips, 1),
            "torso_ticket_count": torso_tickets,
            "torso_chips": torso_chips,
            "torso_tcv_usd_m": torso_tcv,
            "torso_share_pct": round(torso_chips * 100.0 / total_chips, 1),
            "tail_ticket_count": tail_tickets,
            "tail_chips": tail_chips,
            "tail_tcv_usd_m": tail_tcv,
            "tail_share_pct": round(tail_chips * 100.0 / total_chips, 1),
            "torso_plus_tail_ticket_count": torso_tickets + tail_tickets,
            "torso_plus_tail_tcv_usd_m": round(torso_tcv + tail_tcv, 1),
            "torso_tier_2_64_to_255": {"ticket_count": torso_tickets, "total_chips": torso_chips, "total_tcv_usd_m": torso_tcv},
            "tail_tier_3_lt_64": {"ticket_count": tail_tickets, "total_chips": tail_chips, "total_tcv_usd_m": tail_tcv},
            "total_true_demand_chips": whale_chips + torso_chips + tail_chips,
            "total_true_demand_tcv_usd_m": round(whale_tcv + torso_tcv + tail_tcv, 1),
            "total_registry_tickets": len(whales) + torso_tickets + tail_tickets,
        },
    }


@router.post("/api/v1/registry/link-ticket")
def link_registry_cca_ticket(payload: Dict[str, Any]):
    """Seller / CE workflow to link a newly filed capacity-registry CCA or CDR ticket.
    Auto-tiers into WHALE (>=5,000 chips or >=$100M TCV) vs. TORSO (64-4,999 chips) vs. TAIL (<64 chips).
    """
    ensure_v4_store_initialized()
    now_iso = datetime.now(timezone.utc).isoformat()
    actor_ldap = str(
        payload.get("actor_ldap")
        or payload.get("owner_ldap")
        or payload.get("account_executive_ldap")
        or "field-specialist-ce@demo.example.com"
    )
    hz_id = str(payload.get("registry_cca_id") or f"CCA-SYNTH-{9700 + len(UI_STORE['allocation_requests'])}").strip()
    customer_name = str(payload.get("customer_name") or "New Registry AI Pursuit (Synthetic)").strip()
    chip_name = str(payload.get("chip_name") or "AI-ASIC v6e").strip()
    requested_chips = int(payload.get("requested_chips") or 128)
    region = str(payload.get("primary_region") or payload.get("region") or "us-east5").strip()
    tcv_m = float(payload.get("deal_tcv_usd_m") or round(requested_chips * 0.032, 1))
    ideal_dt = str(payload.get("ideal_start_date") or "2026-11-28").strip()
    must_dt = str(payload.get("must_have_by_date") or "2027-01-25").strip()
    force_whale = bool(payload.get("force_individual_whale", False))
    is_elevated = bool(payload.get("is_gtm_elevated", False))
    elevation_note = str(payload.get("elevation_note") or "").strip() or None

    tl = compute_delivery_timeline_metrics(ideal_dt, must_dt, region, chip_name)

    if requested_chips >= 5000 or tcv_m >= 100.0 or force_whale or is_elevated:
        tier = "WHALE"
    elif requested_chips >= 64:
        tier = "TORSO"
    else:
        tier = "TAIL"

    if tier == "WHALE":
        calc_input = {
            **payload,
            "customer_name": customer_name,
            "chip_name": chip_name,
            "requested_chips": requested_chips,
            "primary_region": region,
            "deal_tcv_usd_m": tcv_m,
            "target_delivery_date": ideal_dt,
            "flexible_delivery_window": tl["flexibility_window_days"] >= 30,
        }
        calc = compute_ui_score_and_companion(calc_input)
        base_score = int(calc["score_breakdown"]["total_score"])
        if tl["wave_match_status"] in ("IMMEDIATE_IN_STOCK", "WAVE_MATCH_FEASIBLE") and not calc["score_breakdown"].get("utilization_breach_blocked"):
            base_score = min(100, base_score + 6)
            calc["score_breakdown"]["total_score"] = base_score

        new_id = f"TET-2026-04{18 + len(UI_STORE['allocation_requests'])}"
        new_req = {
            "request_id": new_id,
            "created_at": now_iso,
            "updated_at": now_iso,
            "customer_name": customer_name,
            "vector_opportunity_id": str(payload.get("vector_opportunity_id") or f"VEC-SYNTH-{hz_id[-4:]}"),
            "registry_cdr_id": hz_id,
            "registry_cca_id": hz_id,
            "registry_url": f"http://capacity-registry/{hz_id}",
            "demand_tier": "WHALE",
            "telemetry_plan_id": str(payload.get("telemetry_plan_id") or f"GIB-2026-{hz_id[-4:]}"),
            "sub_region": str(payload.get("sub_region") or "NORTHAM-GenAI"),
            "account_executive_ldap": actor_ldap,
            "ce_lead_ldap": str(payload.get("ce_lead_ldap") or "ce-director@demo.example.com"),
            "specialist_ldap": str(payload.get("specialist_ldap") or "field-specialist-ce@demo.example.com"),
            "rvp_approver_ldap": "ce-vp-approver@demo.example.com",
            "assigned_to_field_rep": True,
            "chip_name": chip_name,
            "requested_chips": requested_chips,
            "primary_region": region,
            "alternate_regions": payload.get("alternate_regions") or ["us-central1", "us-east5"],
            "target_delivery_date": ideal_dt,
            "ideal_start_date": tl["ideal_start_date"],
            "must_have_by_date": tl["must_have_by_date"],
            "flexibility_window_days": tl["flexibility_window_days"],
            "days_until_must_have": tl["days_until_must_have"],
            "next_supply_wave_date": tl["next_supply_wave_date"],
            "wave_match_status": tl["wave_match_status"],
            "matched_supply_wave_label": tl["matched_supply_wave_label"],
            "flexible_delivery_window": tl["flexibility_window_days"] >= 30,
            "consumption_model": str(payload.get("consumption_model") or "3-Yr CUD"),
            "upfront_prepay_pct": float(payload.get("upfront_prepay_pct") or 0.0),
            "deal_tcv_usd_m": tcv_m,
            "contract_stage": str(payload.get("contract_stage") or "Contract Signed"),
            "contract_duration_months": int(payload.get("contract_duration_months") or 36),
            "customer_tier": str(payload.get("customer_tier") or "Strategic AI / Frontier Lab"),
            "technical_validation_stage": "PoC Completed / Benchmark Verified",
            "workload_type": str(payload.get("workload_type") or "Pre-Training & Scaled Inference"),
            "workload_description": str(payload.get("workload_description") or f"Linked from capacity-registry CCA {hz_id}"),
            "willing_to_shift_generation": True,
            "storage_dependency": "Yes - ParallelFS",
            "storage_cores": int(payload.get("storage_cores") or 1200),
            "compute_dependency": "Yes - C4 Nodes",
            "compute_cores": int(payload.get("compute_cores") or 2400),
            "networking_dependency": "Yes - RoCE",
            "networking_cores": 400,
            "egress_gbps": int(payload.get("egress_gbps") or 200),
            "stage": "Step 3: Allocation Forum Prioritization",
            "stage_step": 3,
            "council_decision": f"In Forum Queue (Score {base_score}/100)",
            "allocated_chips": 0,
            "allocated_region": "Pending",
            "allocated_date": "TBD",
            "linked_companion_card_id": None,
            "score_breakdown": calc["score_breakdown"],
            "companion_check": calc["companion_check"],
            "dfe_scorecard": calc["dfe_scorecard"],
            "priority_score": base_score,
            "is_gtm_elevated": is_elevated,
            "elevated_by_ldap": actor_ldap if is_elevated else None,
            "elevated_at": now_iso if is_elevated else None,
            "elevation_rank": 1 if is_elevated else None,
            "elevation_note": elevation_note or ("Elevated on Registry CCA Link" if is_elevated else None),
        }
        UI_STORE["allocation_requests"].insert(0, new_req)
        tx = record_universal_transaction(
            {
                "transaction_type": "LINK_REGISTRY_CCA",
                "actor_ldap": actor_ldap,
                "actor_role": "Seller / CE Registry Intake",
                "entity_id": new_id,
                "customer_name": customer_name,
                "registry_cca_id": hz_id,
                "region": region,
                "sku": chip_name,
                "chips_delta": requested_chips,
                "tcv_usd_m": tcv_m,
                "summary": f"Linked Whale capacity-registry CCA {hz_id} -> {new_id} ({customer_name}: {requested_chips:,}x {chip_name} in {region}, Ideal: {ideal_dt}, Must-Have: {must_dt}, Flex: {tl['flexibility_window_days']}d).",
                "before_state": {"registry_cca_id": hz_id, "status": "UNLINKED_IN_REGISTRY"},
                "after_state": {"request_id": new_id, "demand_tier": "WHALE", "priority_score": base_score, "wave_match_status": tl["wave_match_status"]},
                "tags": ["LINK_REGISTRY_CCA", "WHALE", region, chip_name],
            }
        )
        msg = f"Linked {hz_id} as Individual Whale Request {new_id} ({requested_chips:,} chips, ${tcv_m}M TCV, {tl['flexibility_window_days']}d flex window)."
        return {
            "routed_tier": "WHALE",
            "routed_to": "INDIVIDUAL_WHALE_QUEUE",
            "message": msg,
            "routing_explanation": msg,
            "whale_request": new_req,
            "transaction": tx,
        }

    buckets = UI_STORE["demand_buckets"]
    target_bucket = next(
        (
            b
            for b in buckets
            if b["region"] == region
            and b["demand_tier"] == tier
            and (chip_name.split(" ")[0].lower() in b["chip_name"].lower() or b["chip_name"].split(" ")[0].lower() in chip_name.lower())
        ),
        None,
    )
    if not target_bucket:
        target_bucket = next((b for b in buckets if b["demand_tier"] == tier), buckets[0])

    prev_count = target_bucket["registry_ticket_count"]
    prev_chips = target_bucket["total_aggregated_chips"]
    target_bucket["registry_ticket_count"] += 1
    target_bucket["total_aggregated_chips"] += requested_chips
    target_bucket["total_aggregated_tcv_usd_m"] = round(target_bucket["total_aggregated_tcv_usd_m"] + tcv_m, 2)

    sample_entry = {
        "registry_cca_id": hz_id,
        "customer_name": customer_name,
        "requested_chips": requested_chips,
        "chips": requested_chips,
        "deal_tcv_usd_m": tcv_m,
        "tcv_usd_m": tcv_m,
        "ideal_start_date": tl["ideal_start_date"],
        "must_have_by_date": tl["must_have_by_date"],
        "owner_ldap": actor_ldap,
        "registry_url": f"http://capacity-registry/{hz_id}",
        "consumption_model": "FlexStart Calendar (<=90d)" if tier == "TORSO" else "Flex-Start-Start (<=7d)",
    }
    target_bucket.setdefault("sample_tickets", []).insert(0, sample_entry)
    _normalize_bucket(target_bucket)

    tx = record_universal_transaction(
        {
            "transaction_type": "LINK_REGISTRY_CCA",
            "actor_ldap": actor_ldap,
            "actor_role": "Seller / CE Registry Intake",
            "entity_id": target_bucket["bucket_id"],
            "customer_name": f"{customer_name} (Rolled into {target_bucket['tier_label']})",
            "registry_cca_id": hz_id,
            "region": target_bucket["region"],
            "sku": target_bucket["chip_name"],
            "chips_delta": requested_chips,
            "tcv_usd_m": tcv_m,
            "summary": f"Linked {tier} capacity-registry CCA {hz_id} ({customer_name}: {requested_chips}x {chip_name}, Ideal: {ideal_dt}, Must-Have: {must_dt}) into Aggregate Bucket {target_bucket['bucket_id']} ({target_bucket['registry_ticket_count']} CCAs • {target_bucket['total_aggregated_chips']:,} Chips).",
            "before_state": {"registry_ticket_count": prev_count, "total_aggregated_chips": prev_chips},
            "after_state": {"registry_ticket_count": target_bucket["registry_ticket_count"], "total_aggregated_chips": target_bucket["total_aggregated_chips"]},
            "tags": ["LINK_REGISTRY_CCA", tier, target_bucket["region"], target_bucket["chip_name"]],
        }
    )

    msg = f"Linked {hz_id} ({requested_chips} chips) into {target_bucket['region']} {target_bucket['tier_label']} Bucket ({target_bucket['bucket_id']}). Counts 100% toward regional aggregate demand without cluttering the Whale queue."
    return {
        "routed_tier": tier,
        "routed_to": f"REGIONAL_{tier}_BUCKET",
        "message": msg,
        "routing_explanation": msg,
        "bucket": target_bucket,
        "sample_ticket": sample_entry,
        "transaction": tx,
    }


@router.post("/api/v1/allocation/requests/{request_id}/elevate")
def toggle_gtm_elevate_allocation_request(request_id: str, payload: Dict[str, Any], request: Request):
    """Allows GTM / Capacity Leadership to highlight/elevate a deal."""
    if get_role_view(request) == "FIELD_REP":
        raise HTTPException(
            status_code=403,
            detail="RBAC Guardrail: Field Account Representatives cannot self-elevate deals in the Central Council Queue.",
        )
    ensure_v4_store_initialized()
    found = next(
        (r for r in UI_STORE["allocation_requests"] if r["request_id"] == request_id),
        None,
    )
    if not found:
        raise HTTPException(status_code=404, detail="Allocation request not found")

    actor = str(payload.get("actor_ldap") or "ce-director@demo.example.com")
    prev_elevated = bool(found.get("is_gtm_elevated", False))
    if "elevated" in payload:
        new_elevated = bool(payload["elevated"])
    elif "is_gtm_elevated" in payload:
        new_elevated = bool(payload["is_gtm_elevated"])
    else:
        new_elevated = not prev_elevated

    note = str(
        payload.get("elevation_note")
        or f"Elevated by GTM Leadership ({actor}) — Strategic P0 Priority for Council Allocation."
    )

    found["is_gtm_elevated"] = new_elevated
    found["elevated_by_ldap"] = actor if new_elevated else None
    found["elevated_at"] = datetime.now(timezone.utc).isoformat() if new_elevated else None
    found["elevation_rank"] = int(payload.get("elevation_rank") or 1) if new_elevated else None
    found["elevation_note"] = note if new_elevated else None

    tx = record_universal_transaction(
        {
            "transaction_type": "ELEVATE_DEAL_GTM",
            "actor_ldap": actor,
            "actor_role": "GTM / CE Leadership (STRATEGIC_POD & Allocation Council)",
            "entity_id": found["request_id"],
            "customer_name": found["customer_name"],
            "registry_cca_id": found.get("registry_cca_id") or found.get("registry_cdr_id") or "HZ-SYNTH-8800",
            "region": found["primary_region"],
            "sku": found["chip_name"],
            "chips_delta": int(found["requested_chips"]),
            "tcv_usd_m": float(found["deal_tcv_usd_m"]),
            "summary": (
                f"GTM Leadership ({actor}) {'ELEVATED & PINNED' if new_elevated else 'UNPINNED'} {found['request_id']} "
                f"({found['customer_name']} — {found['requested_chips']:,}x {found['chip_name']} in {found['primary_region']}, ${found['deal_tcv_usd_m']}M TCV): {note}"
            ),
            "before_state": {"is_gtm_elevated": prev_elevated},
            "after_state": {"is_gtm_elevated": new_elevated, "elevated_by_ldap": found["elevated_by_ldap"], "elevation_note": found["elevation_note"]},
            "tags": ["ELEVATE_DEAL_GTM", found["primary_region"], found["chip_name"], actor],
        }
    )

    return {
        "status": "elevated" if new_elevated else "unpinned",
        "request": found,
        "transaction": tx,
    }


@router.post("/api/v1/registry/buckets/{bucket_id}/promote")
def promote_bucket_ticket_to_whale(bucket_id: str, payload: Dict[str, Any], request: Request):
    """Allows Central Operations / GTM Leadership to elevate a Torso/Tail Registry CCA from an aggregate bucket into the Whale Queue."""
    if get_role_view(request) == "FIELD_REP":
        raise HTTPException(
            status_code=403,
            detail="RBAC Guardrail: Promoting regional aggregate bucket tickets requires Central Capacity & Operations privileges.",
        )
    ensure_v4_store_initialized()
    bucket = next((b for b in UI_STORE["demand_buckets"] if b["bucket_id"] == bucket_id), None)
    if not bucket:
        raise HTTPException(status_code=404, detail="Demand bucket not found")

    hz_id = str(payload.get("registry_cca_id") or "").strip()
    actor = str(payload.get("actor_ldap") or "ce-director@demo.example.com")
    samples = bucket.get("sample_tickets", [])
    ticket = next((t for t in samples if t["registry_cca_id"] == hz_id), samples[0] if samples else None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Sample ticket not found in bucket")

    bucket["sample_tickets"] = [t for t in samples if t["registry_cca_id"] != ticket["registry_cca_id"]]
    bucket["registry_ticket_count"] = max(1, bucket["registry_ticket_count"] - 1)
    bucket["total_aggregated_chips"] = max(0, bucket["total_aggregated_chips"] - int(ticket["requested_chips"]))
    _normalize_bucket(bucket)

    res = link_registry_cca_ticket(
        {
            "registry_cca_id": ticket["registry_cca_id"],
            "customer_name": ticket["customer_name"],
            "chip_name": bucket["chip_name"],
            "requested_chips": ticket["requested_chips"],
            "primary_region": bucket["region"],
            "deal_tcv_usd_m": ticket["deal_tcv_usd_m"],
            "ideal_start_date": ticket["ideal_start_date"],
            "must_have_by_date": ticket["must_have_by_date"],
            "consumption_model": ticket["consumption_model"],
            "force_individual_whale": True,
            "is_gtm_elevated": True,
            "actor_ldap": actor,
            "elevation_note": f"Promoted from {bucket['tier_label']} ({bucket_id}) by {actor}",
        }
    )
    return res


def _compute_planning_demand_forecast_internal(
    region: str = "ALL",
    theater: str = "ALL",
    sku: str = "ALL",
    chip_name: str = "ALL",
    include_torso_tail: bool = True,
    elevated_only: bool = False,
    hot_to_cold_pct: int = 0,
    gpu_to_tpu_pct: int = 0,
    torso_tail_flex_start_g4_pct: int = 0,
) -> Dict[str, Any]:
    ensure_v4_store_initialized()
    whales = UI_STORE["allocation_requests"]
    buckets = [_normalize_bucket(b) for b in UI_STORE["demand_buckets"]]
    waves = UI_STORE["supply_waves"]

    sku_filter = chip_name if chip_name != "ALL" else sku

    regional_series = []
    tot_whale_chips = 0
    tot_torso_chips = 0
    tot_tail_chips = 0
    tot_supply_chips = 0
    tot_stacked_tcv_m = 0.0
    tot_power_mw = 0.0
    tot_foundation_llm_1p_chips = 0
    at_risk_tcv_m = 0.0
    at_risk_chips = 0
    breach_deals: List[Dict[str, Any]] = []
    false_green_regions: List[str] = []

    theater_rollups: Dict[str, Dict[str, Any]] = {
        "NORTHAM": {"theater": "NORTHAM", "label": "NorthAm Commercial", "demand_chips": 0, "supply_chips": 0, "tcv_usd_m": 0.0, "power_mw": 0.0},
        "EMEA": {"theater": "EMEA", "label": "EMEA (EU Sovereign / GDPR)", "demand_chips": 0, "supply_chips": 0, "tcv_usd_m": 0.0, "power_mw": 0.0},
        "APAC": {"theater": "APAC", "label": "APAC (Tokyo / Singapore)", "demand_chips": 0, "supply_chips": 0, "tcv_usd_m": 0.0, "power_mw": 0.0},
        "PUBLIC_SECTOR": {"theater": "PUBLIC_SECTOR", "label": "Cloud Public Sector (FedRAMP / IL5)", "demand_chips": 0, "supply_chips": 0, "tcv_usd_m": 0.0, "power_mw": 0.0},
    }

    for w in waves:
        reg = w["region"]
        geo = w.get("geography", "NORTHAM")
        if region != "ALL" and reg != region:
            continue
        if theater != "ALL" and geo != theater:
            continue

        reg_whales = [
            r
            for r in whales
            if r["primary_region"] == reg
            and (not elevated_only or r.get("is_gtm_elevated"))
            and (sku_filter == "ALL" or sku_filter.split("(")[0].strip().lower() in r["chip_name"].lower() or r["chip_name"].split("(")[0].strip().lower() in sku_filter.lower())
        ]
        reg_buckets = [
            b
            for b in buckets
            if b["region"] == reg
            and (sku_filter == "ALL" or sku_filter.split("(")[0].strip().lower() in b["chip_name"].lower() or b["chip_name"].split("(")[0].strip().lower() in sku_filter.lower())
        ]

        w_chips = sum(int(r["requested_chips"]) for r in reg_whales)
        w_tcv = sum(float(r["deal_tcv_usd_m"]) for r in reg_whales)
        t_chips = (
            sum(int(b["total_aggregated_chips"]) for b in reg_buckets if b["demand_tier"] == "TORSO")
            if include_torso_tail and not elevated_only
            else 0
        )
        t_tcv = (
            sum(float(b["total_aggregated_tcv_usd_m"]) for b in reg_buckets if b["demand_tier"] == "TORSO")
            if include_torso_tail and not elevated_only
            else 0.0
        )
        l_chips = (
            sum(int(b["total_aggregated_chips"]) for b in reg_buckets if b["demand_tier"] == "TAIL")
            if include_torso_tail and not elevated_only
            else 0
        )
        l_tcv = (
            sum(float(b["total_aggregated_tcv_usd_m"]) for b in reg_buckets if b["demand_tier"] == "TAIL")
            if include_torso_tail and not elevated_only
            else 0.0
        )

        if hot_to_cold_pct > 0 and geo == "NORTHAM":
            if reg in ("us-east4", "us-east5"):
                w_chips = int(round(w_chips * (1.0 - (hot_to_cold_pct / 100.0) * 0.45)))
                t_chips = int(round(t_chips * (1.0 - (hot_to_cold_pct / 100.0) * 0.45)))
            elif reg in ("us-central1", "us-south1"):
                w_chips = int(round(w_chips * (1.0 + (hot_to_cold_pct / 100.0) * 0.25)))

        if gpu_to_tpu_pct > 0:
            if any("H200" in s or "B200" in s for s in w["primary_skus"]):
                w_chips = int(round(w_chips * (1.0 - (gpu_to_tpu_pct / 100.0) * 0.40)))
                t_chips = int(round(t_chips * (1.0 - (gpu_to_tpu_pct / 100.0) * 0.40)))

        if torso_tail_flex_start_g4_pct > 0:
            t_chips = int(round(t_chips * (1.0 - (torso_tail_flex_start_g4_pct / 100.0) * 0.55)))
            l_chips = int(round(l_chips * (1.0 - (torso_tail_flex_start_g4_pct / 100.0) * 0.70)))

        eff_supply = int(w["committed_physical_chips"]) + int(w["m0_m7_commissioning_chips"]) + int(w["gdm_bridge_pool_chips"])
        reliability_reserve_chips = int(round(eff_supply * 0.10))
        net_of_reliability_supply_chips = eff_supply - reliability_reserve_chips
        foundation_llm_1p_chips = int(w.get("foundation_llm_1p_cotenancy_chips", 512))
        telemetry_realization_pct = float(w.get("telemetry_realization_pct", 90.0))
        kw_per_chip = float(w.get("kw_per_chip", 0.95))

        stack_demand = w_chips + t_chips + l_chips
        net_balance = net_of_reliability_supply_chips - stack_demand
        tt_share = round(((t_chips + l_chips) * 100.0 / max(1, stack_demand)), 1)
        row_tcv = round(w_tcv + t_tcv + l_tcv, 1)

        power_load_mw = round((eff_supply * kw_per_chip) / 1000.0, 2)
        demand_power_mw = round((stack_demand * kw_per_chip) / 1000.0, 2)
        annualized_tcv_m = round(row_tcv / 2.2, 2)
        revenue_yield_usd_per_mw = round(annualized_tcv_m / max(0.35, power_load_mw), 2)

        tot_whale_chips += w_chips
        tot_torso_chips += t_chips
        tot_tail_chips += l_chips
        tot_supply_chips += eff_supply
        tot_stacked_tcv_m += row_tcv
        tot_power_mw += power_load_mw
        tot_foundation_llm_1p_chips += foundation_llm_1p_chips

        if geo in theater_rollups:
            theater_rollups[geo]["demand_chips"] += stack_demand
            theater_rollups[geo]["supply_chips"] += eff_supply
            theater_rollups[geo]["net_of_reliability_supply_chips"] = theater_rollups[geo].get("net_of_reliability_supply_chips", 0) + net_of_reliability_supply_chips
            theater_rollups[geo]["tcv_usd_m"] = round(theater_rollups[geo]["tcv_usd_m"] + row_tcv, 1)
            theater_rollups[geo]["power_mw"] = round(theater_rollups[geo]["power_mw"] + power_load_mw, 2)

        is_false_green = (net_of_reliability_supply_chips >= w_chips) and (net_balance < 0)
        sku_str = ", ".join(w["primary_skus"]) if isinstance(w["primary_skus"], list) else str(w["primary_skus"])
        if is_false_green:
            false_green_regions.append(f"{reg} ({sku_str})")

        status_str = (
            "SURPLUS"
            if net_balance >= 0
            else ("FALSE_GREEN_DEFICIT" if is_false_green else "DEFICIT_ACTION_REQUIRED")
        )
        gsc_po_trigger = (
            "🚨 Supply Expansion Signal Recommended"
            if net_balance < 0
            else ("⚠️ Within 10% Reliability Buffer" if net_balance < reliability_reserve_chips else "✅ Covered by Supply Wave")
        )

        for r in reg_whales:
            if r.get("wave_match_status") in ("CRITICAL_DROP_DEAD_RISK", "SEED_POD_BRIDGE_REQUIRED") or net_balance < 0:
                at_risk_tcv_m += float(r["deal_tcv_usd_m"])
                at_risk_chips += int(r["requested_chips"])
                breach_deals.append(
                    {
                        "request_id": r["request_id"],
                        "registry_cca_id": r.get("registry_cca_id", r.get("registry_cdr_id")),
                        "customer_name": r["customer_name"],
                        "region": reg,
                        "chip_name": r["chip_name"],
                        "requested_chips": r["requested_chips"],
                        "deal_tcv_usd_m": r["deal_tcv_usd_m"],
                        "ideal_start_date": r.get("ideal_start_date"),
                        "must_have_by_date": r.get("must_have_by_date"),
                        "flexibility_window_days": r.get("flexibility_window_days"),
                        "next_supply_wave_date": w["next_supply_wave_date"],
                        "wave_match_status": r.get("wave_match_status"),
                        "is_gtm_elevated": r.get("is_gtm_elevated", False),
                    }
                )

        regional_series.append(
            {
                "region": reg,
                "geography": geo,
                "theater": geo,
                "sovereign_boundary": w.get("sovereign_boundary", "Commercial Global Fleet"),
                "regulatory_gate": w.get("sovereign_boundary", "Commercial Standard"),
                "primary_skus": w["primary_skus"],
                "chip_name": sku_str,
                "whale_chips": w_chips,
                "whale_demand_chips": w_chips,
                "torso_chips": t_chips,
                "torso_demand_chips": t_chips,
                "tail_chips": l_chips,
                "tail_demand_chips": l_chips,
                "total_stacked_demand_chips": stack_demand,
                "committed_physical_chips": w["committed_physical_chips"],
                "committed_supply_chips": w["committed_physical_chips"],
                "m0_m7_commissioning_chips": w["m0_m7_commissioning_chips"],
                "uncommitted_m0_m7_chips": w["m0_m7_commissioning_chips"] + w["gdm_bridge_pool_chips"],
                "gdm_bridge_pool_chips": w["gdm_bridge_pool_chips"],
                "reclaimed_flex_start_flex_chips": w["gdm_bridge_pool_chips"],
                "total_effective_supply_chips": eff_supply,
                "effective_supply_chips": eff_supply,
                "net_of_reliability_supply_chips": net_of_reliability_supply_chips,
                "reliability_reserve_chips": reliability_reserve_chips,
                "foundation_llm_1p_cotenancy_chips": foundation_llm_1p_chips,
                "telemetry_realization_pct": telemetry_realization_pct,
                "power_load_mw": power_load_mw,
                "demand_power_mw": demand_power_mw,
                "revenue_yield_usd_per_mw": revenue_yield_usd_per_mw,
                "revenue_yield_usd_m_per_mw": revenue_yield_usd_per_mw,
                "net_balance_chips": net_balance,
                "torso_tail_share_pct": tt_share,
                "total_tcv_usd_m": row_tcv,
                "false_green_alert": is_false_green,
                "status": status_str,
                "gsc_po_trigger_status": gsc_po_trigger,
                "next_supply_wave_date": w["next_supply_wave_date"],
                "next_wave_date": w["next_supply_wave_date"],
                "lead_time_days": 45 if ("v7" in sku_str.lower() or "asic_v7" in sku_str.lower()) else 30,
                "commissioning_note": w["commissioning_note"],
            }
        )

    for tr in theater_rollups.values():
        net_rel_sup = tr.get("net_of_reliability_supply_chips", int(round(tr["supply_chips"] * 0.90)))
        tr["net_of_reliability_supply_chips"] = net_rel_sup
        tr["net_balance_chips"] = net_rel_sup - tr["demand_chips"]
        tr["power_load_mw"] = tr["power_mw"]

    tot_demand = tot_whale_chips + tot_torso_chips + tot_tail_chips
    overall_tt_share = round(((tot_torso_chips + tot_tail_chips) * 100.0 / max(1, tot_demand)), 1)
    avg_yield_per_mw = round((tot_stacked_tcv_m / 2.2) / max(0.5, tot_power_mw), 2)
    avg_telemetry_pct = round(
        sum(float(r["telemetry_realization_pct"]) for r in regional_series) / max(1, len(regional_series)),
        1,
    )
    tot_reliability_reserve = sum(int(r["reliability_reserve_chips"]) for r in regional_series)
    tot_net_of_reliability_supply = tot_supply_chips - tot_reliability_reserve
    deficit_pool_count = sum(1 for r in regional_series if int(r["net_balance_chips"]) < 0)
    forecast_backtest = compute_forecast_backtest_metrics(tot_demand)

    kpis_obj = {
        "total_whale_chips": tot_whale_chips,
        "whale_demand_chips": tot_whale_chips,
        "total_torso_chips": tot_torso_chips,
        "torso_demand_chips": tot_torso_chips,
        "total_tail_chips": tot_tail_chips,
        "tail_demand_chips": tot_tail_chips,
        "total_stacked_demand_chips": tot_demand,
        "total_demand_chips": tot_demand,
        "total_effective_supply_chips": tot_supply_chips,
        "effective_supply_chips": tot_supply_chips,
        "net_of_reliability_supply_chips": tot_net_of_reliability_supply,
        "net_global_balance_chips": tot_net_of_reliability_supply - tot_demand,
        "net_balance_chips": tot_net_of_reliability_supply - tot_demand,
        "torso_tail_demand_share_pct": overall_tt_share,
        "torso_tail_share_pct": overall_tt_share,
        "total_stacked_tcv_usd_m": round(tot_stacked_tcv_m, 1),
        "total_power_load_mw": round(tot_power_mw, 2),
        "blended_revenue_yield_usd_per_mw": avg_yield_per_mw,
        "avg_revenue_yield_usd_m_per_mw": avg_yield_per_mw,
        "total_foundation_llm_1p_cotenancy_chips": tot_foundation_llm_1p_chips,
        "foundation_llm_1p_cotenancy_chips": tot_foundation_llm_1p_chips,
        "reliability_reserve_chips": tot_reliability_reserve,
        "avg_telemetry_realization_pct": avg_telemetry_pct,
        "gsc_po_trigger_status": f"EXPANSION_SIGNAL ({deficit_pool_count} Deficit Pools)" if deficit_pool_count > 0 else "BALANCED",
        "must_have_breach_risk_count": len(breach_deals),
        "must_have_breach_risk_tcv_usd_m": round(at_risk_tcv_m, 1),
        "must_have_breach_risk_chips": at_risk_chips,
        "false_green_regions_count": len(false_green_regions),
        "false_green_region_count": len(false_green_regions),
        "false_green_regions": false_green_regions,
        "forecast_wmape_pct": forecast_backtest["accuracy_governance"]["rolling_6m_wmape_pct"],
        "forecast_bias_pct": forecast_backtest["accuracy_governance"]["rolling_6m_bias_pct"],
        "p50_expected_commit_chips": forecast_backtest["quantiles_next_quarter_chips"]["p50_expected_commit_chips"],
        "p90_supply_planning_envelope_chips": forecast_backtest["quantiles_next_quarter_chips"]["p90_supply_planning_envelope_chips"],
    }

    return {
        "role_view": "OPS_CENTRAL",
        "analytics_kpis": kpis_obj,
        "kpis": kpis_obj,
        "forecast_backtest": forecast_backtest,
        "theater_summary": theater_rollups,
        "theater_summary_list": list(theater_rollups.values()),
        "regional_series": regional_series,
        "rows": regional_series,
        "breach_risk_deals": breach_deals,
        "demand_buckets": buckets if region == "ALL" else [b for b in buckets if b["region"] == region],
    }


@router.get("/api/v1/planning/forecast")
def get_planning_demand_forecast(
    request: Request,
    region: str = "ALL",
    theater: str = "ALL",
    sku: str = "ALL",
    chip_name: str = "ALL",
    include_torso_tail: bool = True,
    elevated_only: bool = False,
    hot_to_cold_pct: int = 0,
    gpu_to_tpu_pct: int = 0,
    torso_tail_flex_start_g4_pct: int = 0,
):
    """Computes full Supply-vs-Demand Forecasting & Analytics across Global Theaters (Central Ops Only).
    When called in FIELD_REP mode, redacts global supply/demand balances and unassigned customer deals.
    """
    role_view = get_role_view(request)
    full_data = _compute_planning_demand_forecast_internal(
        region=region,
        theater=theater,
        sku=sku,
        chip_name=chip_name,
        include_torso_tail=include_torso_tail,
        elevated_only=elevated_only,
        hot_to_cold_pct=hot_to_cold_pct,
        gpu_to_tpu_pct=gpu_to_tpu_pct,
        torso_tail_flex_start_g4_pct=torso_tail_flex_start_g4_pct,
    )
    if role_view == "FIELD_REP":
        assigned_breach = [
            d for d in full_data["breach_risk_deals"] if is_assigned_to_field_rep(d)
        ]
        redacted_kpis = {
            **{k: 0 for k in full_data["kpis"]},
            "gsc_po_trigger_status": "REDACTED (Field Account Team View)",
            "false_green_regions": [],
            "must_have_breach_risk_count": len(assigned_breach),
        }
        return {
            "role_view": "FIELD_REP",
            "rbac_redacted": True,
            "rbac_notice": (
                "Strict Need-to-Know RBAC: Global supply/demand balances, M0->M7 pod commissioning chip counts, "
                "and unassigned customer pipeline are restricted to Central Capacity & Operations."
            ),
            "analytics_kpis": redacted_kpis,
            "kpis": redacted_kpis,
            "forecast_backtest": full_data["forecast_backtest"],
            "theater_summary": {},
            "theater_summary_list": [],
            "regional_series": [],
            "rows": [],
            "breach_risk_deals": assigned_breach,
            "demand_buckets": [],
        }
    return full_data


@router.get("/api/v1/planning/backtest")
def get_planning_forecast_backtest():
    """Returns the Stage-Calibrated Conversion + DataWarehouse ML (TimesFM) P50/P75/P90 Quantiles & 6-Month Rolling Backtest."""
    full_data = _compute_planning_demand_forecast_internal()
    return full_data["forecast_backtest"]


@router.post("/api/v1/planning/procurement-signal")
def emit_closed_loop_gsc_procurement_and_autocap_signal(payload: Dict[str, Any], request: Request):
    """Emits an atomic Closed-Loop Global Supply Chain (GSC) Procurement PO Trigger + Autocap/CMU SpatialFlexConfig."""
    if get_role_view(request) == "FIELD_REP":
        raise HTTPException(
            status_code=403,
            detail="RBAC Guardrail: Emitting Supply Expansion signals is restricted to Central Capacity & Operations.",
        )
    ensure_v4_store_initialized()
    region = str(payload.get("region") or "us-east4")
    actor_ldap = str(payload.get("actor_ldap") or "ops-capacity-lead@demo.example.com")
    forecast = _compute_planning_demand_forecast_internal(region=region)
    row = forecast["regional_series"][0] if forecast["regional_series"] else None
    if not row:
        raise HTTPException(status_code=404, detail=f"Region {region} not found in forecast.")

    deficit_chips = max(256, abs(int(row["net_balance_chips"])) + int(row.get("reliability_reserve_chips", 256)))
    power_mw = round(deficit_chips * 1.05 / 1000.0, 2)
    companion_vcpus = deficit_chips * 28
    companion_high_iops_disk_tb = round(deficit_chips * 1.25, 1)
    seq_num = 100 + len(V3_STORE.get("transaction_ledger", []))
    signal_id = f"SUP-SIG-2026-{seq_num}"
    gsc_po_id = f"SUP-REQ-2026-{seq_num}"

    autocap_proto = (
        f"# Supply Expansion Request Payload ({signal_id})\n"
        f"supply_expansion_request {{\n"
        f"  region: \"{region}\"\n"
        f"  theater: \"{row['geography']}\"\n"
        f"  sovereign_boundary: \"{row['sovereign_boundary']}\"\n"
        f"  target_sku_pool: \"{row['chip_name']}\"\n"
        f"  expansion_request_id: \"{gsc_po_id}\"\n"
        f"  incremental_chips_requested: {deficit_chips}\n"
        f"  power_envelope_mw: {power_mw}\n"
        f"  include_10pct_reliability_reserve: true\n"
        f"  coupled_companion_host_vcpus: {companion_vcpus}\n"
        f"  coupled_high_iops_disk_tb: {companion_high_iops_disk_tb}\n"
        f"}}"
    )

    tx = record_universal_transaction(
        {
            "transaction_type": "FORECAST_SCENARIO_SAVED",
            "actor_ldap": actor_ldap,
            "actor_role": "Central Capacity & Operations Lead",
            "entity_id": signal_id,
            "customer_name": f"Supply Expansion Signal ({region})",
            "registry_cca_id": signal_id,
            "region": region,
            "sku": row["chip_name"],
            "chips_delta": deficit_chips,
            "tcv_usd_m": float(row["total_tcv_usd_m"]),
            "summary": (
                f"Emitted Supply Expansion Signal ({gsc_po_id} / {signal_id}) for {region}: "
                f"+{deficit_chips:,} chips ({power_mw} MW, ${row['revenue_yield_usd_per_mw']}M/MW yield) + Thursday Companion 2.0 CNS signal ({companion_vcpus:,} host vCPUs, {companion_high_iops_disk_tb} TB HighIOPSDisk)."
            ),
            "before_state": {"net_balance_chips": row["net_balance_chips"], "status": row["status"]},
            "after_state": {
                "signal_id": signal_id,
                "gsc_po_id": gsc_po_id,
                "gsc_procurement_chips": deficit_chips,
                "power_mw": power_mw,
                "coupled_companion_vcpus": companion_vcpus,
                "status": "SUPPLY_EXPANSION_SIGNAL_EMITTED",
            },
            "tags": ["SUPPLY_EXPANSION_SIGNAL", region],
        }
    )

    return {
        "status": "emitted",
        "signal_id": signal_id,
        "gsc_po_id": gsc_po_id,
        "region": region,
        "geography": row["geography"],
        "sovereign_boundary": row["sovereign_boundary"],
        "chip_name": row["chip_name"],
        "deficit_chips": deficit_chips,
        "deficit_plus_reliability_buffer_chips": deficit_chips,
        "power_envelope_mw": power_mw,
        "estimated_mw_delta": power_mw,
        "revenue_yield_usd_per_mw": row["revenue_yield_usd_per_mw"],
        "coupled_companion_cns_signal": {
            "host_vcpus": companion_vcpus,
            "host_vcpus_required": companion_vcpus,
            "host_series": "C4 / A3-Mega Host Fleet (Companion 2.0 Coupled)",
            "high_iops_disk_tb": companion_high_iops_disk_tb,
            "high_iops_disk_ml_tb_required": companion_high_iops_disk_tb,
            "roce_400g_ports": deficit_chips,
            "roce_400g_ports_required": deficit_chips,
            "target_forum": "Thursday Companion 2.0 Forum (>20% Regional Gate Auto-Notified)",
        },
        "autocap_cmu_proto_snippet": autocap_proto,
        "autocap_proto_snippet": autocap_proto,
        "transaction": tx,
    }


@router.post("/api/v1/planning/scenarios")
def run_and_save_dfe_forecast_scenario(payload: Dict[str, Any], request: Request):
    """Interactive What-If DFE Simulator for Planning & Operations."""
    if get_role_view(request) == "FIELD_REP":
        raise HTTPException(
            status_code=403,
            detail="RBAC Guardrail: Global DFE Supply-Demand Scenario Simulation is restricted to Central Capacity & Operations.",
        )
    ensure_v4_store_initialized()
    hot_to_cold_pct = int(payload.get("hot_to_cold_pct") if payload.get("hot_to_cold_pct") is not None else 50)
    gpu_to_tpu_pct = int(payload.get("gpu_to_tpu_pct") if payload.get("gpu_to_tpu_pct") is not None else 40)
    torso_tail_flex_start_g4_pct = int(payload.get("torso_tail_flex_start_g4_pct") if payload.get("torso_tail_flex_start_g4_pct") is not None else 60)
    save_to_ledger = bool(payload.get("save_to_ledger", True))
    actor = str(payload.get("actor_ldap") or "ops-capacity-lead@demo.example.com")
    scenario_name = str(payload.get("scenario_name") or f"What-If DFE Forecast ({hot_to_cold_pct}% Cold / {gpu_to_tpu_pct}% TPU / {torso_tail_flex_start_g4_pct}% G4-FlexStart)")

    base = _compute_planning_demand_forecast_internal()
    east4 = next((r for r in base["regional_series"] if r["region"] == "us-east4"), base["regional_series"][0])
    east4_deficit_before = int(east4["net_balance_chips"])

    shifted_cold_chips = int(round(east4["total_stacked_demand_chips"] * (hot_to_cold_pct / 100.0) * 0.45))
    shifted_tpu_chips = int(round(east4["total_stacked_demand_chips"] * (gpu_to_tpu_pct / 100.0) * 0.35))
    offloaded_g4_flex_start_chips = int(round((east4["torso_chips"] + east4["tail_chips"]) * (torso_tail_flex_start_g4_pct / 100.0) * 0.5))

    total_relieved_chips = shifted_cold_chips + shifted_tpu_chips + offloaded_g4_flex_start_chips
    east4_balance_after = east4_deficit_before + total_relieved_chips
    tcv_unblocked_m = round(total_relieved_chips * 0.036, 1)

    scenario_id = f"SCEN-2026-{100 + len(V3_STORE.get('transaction_ledger', []))}"
    result = {
        "scenario_id": scenario_id,
        "scenario_name": scenario_name,
        "parameters": {
            "hot_to_cold_pct": hot_to_cold_pct,
            "gpu_to_tpu_pct": gpu_to_tpu_pct,
            "torso_tail_flex_start_g4_pct": torso_tail_flex_start_g4_pct,
        },
        "us_east4_balance_before_chips": east4_deficit_before,
        "us_east4_balance_after_chips": east4_balance_after,
        "shifted_cold_region_chips": shifted_cold_chips,
        "shifted_tpu_v6e_v7_chips": shifted_tpu_chips,
        "offloaded_g4_and_flex_start_chips": offloaded_g4_flex_start_chips,
        "total_relieved_chips": total_relieved_chips,
        "tcv_unblocked_usd_m": tcv_unblocked_m,
        "recommendation_summary": (
            f"[{scenario_name}] Shifting {hot_to_cold_pct}% of hot us-east4 demand to Cold Regions ({shifted_cold_chips:,} chips), "
            f"pivoting {gpu_to_tpu_pct}% of GPU pursuits to ASIC-v6e v6e / ASIC-v7 v7 ({shifted_tpu_chips:,} chips), "
            f"and routing {torso_tail_flex_start_g4_pct}% of Torso/Tail inference to G4 & FlexStart ({offloaded_g4_flex_start_chips:,} chips) "
            f"improves us-east4 net balance from {east4_deficit_before:,} to {east4_balance_after:+,} chips and unblocks ${tcv_unblocked_m}M in at-risk TCV."
        ),
    }

    if save_to_ledger:
        tx = record_universal_transaction(
            {
                "transaction_type": "FORECAST_SCENARIO_SAVED",
                "actor_ldap": actor,
                "actor_role": "Central Capacity & Operations",
                "entity_id": scenario_id,
                "customer_name": scenario_name,
                "registry_cca_id": "capacity-registry?q=dfe_scenario",
                "region": "us-east4 -> us-central1 / us-east5",
                "sku": "H200 -> ASIC-v6e v6e / G4",
                "chips_delta": total_relieved_chips,
                "tcv_usd_m": tcv_unblocked_m,
                "summary": result["recommendation_summary"],
                "before_state": {"us_east4_balance_chips": east4_deficit_before},
                "after_state": {"us_east4_balance_chips": east4_balance_after, "tcv_unblocked_usd_m": tcv_unblocked_m},
                "tags": ["FORECAST_SCENARIO_SAVED", "DFE-Simulator", "us-east4"],
            }
        )
        result["transaction"] = tx

    return {
        "status": "saved",
        "scenario": result,
        **result,
    }


@router.post("/api/v1/planning/search-analytics")
def search_planning_analytics(payload: Dict[str, Any], request: Request):
    """Free-Text + Semantic Analytics Search for Planning & Operations."""
    if get_role_view(request) == "FIELD_REP":
        raise HTTPException(
            status_code=403,
            detail="RBAC Guardrail: Global Planning Analytics Search is restricted to Central Capacity & Operations.",
        )
    ensure_v4_store_initialized()
    query = str(payload.get("query") or "us-east4 H200 deficit and torso demand before 2027-02").strip()
    q_low = query.lower()

    detected_region = "ALL"
    for r in ("us-west1", "us-east4", "us-east5", "us-central1", "us-south1", "europe-west4", "asia-northeast1"):
        if r in q_low:
            detected_region = r
            break

    detected_sku = "ALL"
    for s_tok, s_label in [
        ("h200", "H200"),
        ("b200", "B200"),
        ("g4", "G4"),
        ("rtx", "G4"),
        ("asic_v6e", "ASIC-v6e"),
        ("v6e", "ASIC-v6e"),
        ("asic_v7", "ASIC-v7"),
        ("v7", "ASIC-v7"),
    ]:
        if s_tok in q_low:
            detected_sku = s_label
            break

    elevated_only = any(w in q_low for w in ("elevated", "pinned", "highlighted", "spotlight"))
    torso_focus = any(w in q_low for w in ("torso", "tail", "aggregate", "bucket", "small", "flex_start"))

    forecast = _compute_planning_demand_forecast_internal(
        region=detected_region,
        sku=detected_sku,
        include_torso_tail=True,
        elevated_only=elevated_only,
    )

    matched_whales = []
    for r in UI_STORE["allocation_requests"]:
        if detected_region != "ALL" and r["primary_region"] != detected_region:
            continue
        if detected_sku != "ALL" and detected_sku.lower() not in r["chip_name"].lower():
            continue
        if elevated_only and not r.get("is_gtm_elevated"):
            continue
        matched_whales.append(r)

    matched_buckets = []
    for b in UI_STORE["demand_buckets"]:
        _normalize_bucket(b)
        if detected_region != "ALL" and b["region"] != detected_region:
            continue
        if detected_sku != "ALL" and detected_sku.lower() not in b["chip_name"].lower():
            continue
        matched_buckets.append(b)

    kpis = forecast["analytics_kpis"]
    ai_answer = (
        f"• Supply vs. Stacked Demand ({detected_region} / {detected_sku}): Total stacked demand is {kpis['total_stacked_demand_chips']:,} chips "
        f"({kpis['total_whale_chips']:,} Whale individual + {kpis['total_torso_chips']:,} Torso aggregate + {kpis['total_tail_chips']:,} Long-Tail FlexStart = {kpis['torso_tail_demand_share_pct']}% Torso/Tail share) "
        f"against {kpis['total_effective_supply_chips']:,} effective supply chips (Net Balance: {kpis['net_global_balance_chips']:+,} chips; P50 Calibrated Commit: {kpis['p50_expected_commit_chips']:,} chips at 6.8% illustrative WMAPE). "
        f"• Must-Have-By Drop-Dead Risk: ${kpis['must_have_breach_risk_tcv_usd_m']}M TCV ({kpis['must_have_breach_risk_chips']:,} chips across {len(forecast['breach_risk_deals'])} pursuits) has a Must-Have-By Date that precedes the regional supply wave or sits in a net-deficit pool. "
        f"• Actionable Planning & DFE Remedy: Use the What-If DFE Simulator to pivot hot us-east4 GPU demand to us-east5 ASIC-v6e v6e or us-central1 G4 (RTX PRO 6000), and auto-route <64 chip Tail CCAs ({len(matched_buckets)} aggregate buckets) to Flex-Start/Calendar Mode."
    )

    client = _get_model_hub_client()
    model_used = "deterministic-hybrid+model_hub"
    if client:
        for candidate_model in ("llm-fast-router", "llm-pro-reasoner"):
            try:
                resp = client.models.generate_content(
                    model=candidate_model,
                    contents=(
                        "You are the Hyperscale AI Infrastructure Planning & Operations Copilot (100% synthetic prototype environment). "
                        f"User Analytics Query: '{query}'. "
                        f"Computed KPIs: {kpis}. Matched Whale Deals: {len(matched_whales)}. Matched Torso/Tail Buckets: {len(matched_buckets)}. "
                        "Provide a crisp 3-bullet executive planning synthesis citing exact chip numbers, Whale vs. Torso/Tail split, P50/P90 calibrated forecast, Must-Have-By breach risk, and DFE recommendation."
                    ),
                )
                if resp and resp.text:
                    ai_answer = resp.text.strip()
                    model_used = f"model-hub/{candidate_model}"
                    break
            except Exception:
                continue

    tot_matched_chips = sum(int(w["requested_chips"]) for w in matched_whales) + sum(int(b["total_requested_chips"]) for b in matched_buckets)
    tot_matched_tcv = round(sum(float(w["deal_tcv_usd_m"]) for w in matched_whales) + sum(float(b["total_tcv_usd_m"]) for b in matched_buckets), 1)

    return {
        "query": query,
        "model": model_used,
        "extracted_filters": {
            "region": detected_region,
            "sku": detected_sku,
            "elevated_only": elevated_only,
            "torso_focus": torso_focus,
        },
        "ai_synthesis": ai_answer,
        "forecast": forecast,
        "matched_whales": matched_whales,
        "matched_whale_count": len(matched_whales),
        "matched_buckets": matched_buckets,
        "matched_bucket_count": len(matched_buckets),
        "total_matched_chips": tot_matched_chips,
        "total_matched_tcv_usd_m": tot_matched_tcv,
    }


INTEGRATION_LINK_CATALOG: List[Dict[str, Any]] = [
    {
        "link_key": "registry_cca_deep_links",
        "display_label": "Synthetic capacity-registry CCA & CDR Deep-Links (HZ-SYNTH-... / CDR-SYNTH-...)",
        "shortlink": "capacity-registry/<CCA_ID>",
        "status": "AWAITING_INTEGRATION",
        "status_badge": "🧪 Synthetic Demo Record (Live Registry Ready)",
        "resolved_url": "https://registry.corp.cloud.com/customers?tab=external",
        "reason": "Pre-seeded synthetic CCA/CDR IDs (e.g., HZ-SYNTH-8801, CDR-SYNTH-4882) are tracked in the Apex Persistent Ledger. Direct deep-linking to production Registry ticket objects is ready for live REST / Vector CRM sync.",
        "in_app_handling": "Intercepts synthetic IDs with an in-app Record Preview Drawer and provides 1-click access to the live Registry portal or custom URL attachment.",
    },
    {
        "link_key": "registry_cohort_queries",
        "display_label": "Torso & Long-Tail Regional Cohort Queries (capacity-registry?q=region:...)",
        "shortlink": "capacity-registry?q=region:<REGION>+tier:<TIER>",
        "status": "AWAITING_INTEGRATION",
        "status_badge": "⏳ Awaiting Registry Cohort Feed",
        "resolved_url": "https://registry.corp.cloud.com/customers?tab=external",
        "reason": "Displays aggregated synthetic chip/TCV totals and sample_tickets in Tab 2 while ready for a scheduled Plx -> DataWarehouse Registry Cohort Data Transfer feed.",
        "in_app_handling": "Displays aggregated chip/TCV totals and sample_tickets directly in Tab 2 (Torso/Tail Buckets).",
    },
    {
        "link_key": "sfdc_vector_crm_sync",
        "display_label": "Salesforce Vector CRM Accounts, Opps & Workloads (VEC-SYNTH-...)",
        "shortlink": "Vector CRM + Project STRATEGIC_POD",
        "status": "AWAITING_INTEGRATION",
        "status_badge": "🧪 Synthetic Demo Accounts (Vector Ready)",
        "resolved_url": "https://lookercs-prod-201.corp.goog/embed/dashboards/KUxmxwO3ehMhmXQFV0jOML",
        "reason": "Seeded with 100% synthetic Project STRATEGIC_POD P0/P1 accounts to protect customer confidentiality on Container Service.",
        "in_app_handling": "Provides full in-app nomination & verification in Tab 4 + links to live Looker STRATEGIC_POD Targets dashboard.",
    },
    {
        "link_key": "capacity_poster_live",
        "display_label": "Capacity Allocation One-Page Poster (go/capacity-poster)",
        "shortlink": "go/capacity-poster",
        "status": "VERIFIED_LIVE",
        "status_badge": "✅ Canonical 5-Step Workflow Reference",
        "resolved_url": "http://go/capacity-poster",
        "reason": "Canonical 5-Step Capacity 101 field guide that Apex Capacity Navigator operationalizes into an interactive state machine.",
        "in_app_handling": "Direct verified link.",
    },
    {
        "link_key": "acc_prioritization_live",
        "display_label": "AI Infra Capacity Intake Form (go/acc-prioritization)",
        "shortlink": "go/acc-prioritization",
        "status": "VERIFIED_LIVE",
        "status_badge": "✅ Verified Live Form",
        "resolved_url": "https://docs.cloud.com/forms/d/e/1FAIpQLSdN3dmzBs0_gtxktt5wgurC3ageJ43OfqODwAy3nF0tfnbXOw/viewform",
        "reason": "Official 23-question Allocation intake form.",
        "in_app_handling": "Direct verified link + automated in-app 23-field scorer.",
    },
    {
        "link_key": "capacity_sales_view_live",
        "display_label": "Capacity Sales View (go/capacity-sales-view)",
        "shortlink": "go/capacity-sales-view",
        "status": "VERIFIED_LIVE",
        "status_badge": "✅ Verified Live Web App",
        "resolved_url": "https://capacity-sales-view.teams.x20web.corp.cloud.com/index.html?theme=light",
        "reason": "Official regional GPU/TPU availability dashboard.",
        "in_app_handling": "Direct verified link + mirrored in Tab 5 with strict Need-to-Know RBAC.",
    },
]


@router.get("/api/v1/integrations/status")
def get_integrations_and_links_status():
    """Returns the ground-truth link audit & upstream integration status across Apex Capacity Navigator."""
    ensure_v4_store_initialized()
    custom_urls = UI_STORE.setdefault("custom_attached_urls", {})
    awaiting = [x for x in INTEGRATION_LINK_CATALOG if x["status"] == "AWAITING_INTEGRATION"]
    offline_or_deprecated = [x for x in INTEGRATION_LINK_CATALOG if x["status"] in ("OFFLINE_REPLACED_IN_APP", "RESTRICTED_PROXY", "DEPRECATED_REMAPPED")]
    verified_live = [x for x in INTEGRATION_LINK_CATALOG if x["status"] == "VERIFIED_LIVE"]
    return {
        "summary": {
            "verified_live_links_count": len(verified_live),
            "awaiting_integration_or_input_count": len(awaiting),
            "offline_or_deprecated_replaced_count": len(offline_or_deprecated),
            "custom_attached_urls_count": len(custom_urls),
        },
        "catalog": INTEGRATION_LINK_CATALOG,
        "custom_attached_urls": custom_urls,
    }


@router.post("/api/v1/integrations/attach-url")
def attach_live_url_to_record(payload: Dict[str, Any]):
    """Allows a Seller, CE, or Ops Lead to attach a custom URL to any synthetic record ID."""
    ensure_v4_store_initialized()
    record_id = str(payload.get("record_id") or "").strip()
    live_url = str(payload.get("live_url") or "").strip()
    actor_ldap = str(payload.get("actor_ldap") or "ops-capacity-lead@demo.example.com").strip()
    if not record_id or not live_url:
        raise HTTPException(status_code=400, detail="Both record_id and live_url are required.")

    custom_urls = UI_STORE.setdefault("custom_attached_urls", {})
    prev_url = custom_urls.get(record_id)
    custom_urls[record_id] = live_url

    for r in UI_STORE["allocation_requests"]:
        if record_id in (r.get("request_id"), r.get("registry_cca_id"), r.get("registry_cdr_id")):
            r["registry_url"] = live_url
            r["has_custom_live_url"] = True
    for b in UI_STORE["demand_buckets"]:
        if b.get("bucket_id") == record_id:
            b["registry_query_url"] = live_url
            b["has_custom_live_url"] = True
        for st in b.get("sample_tickets", []):
            if st.get("registry_cca_id") == record_id:
                st["registry_url"] = live_url
                st["has_custom_live_url"] = True

    tx = record_universal_transaction(
        {
            "transaction_type": "ATTACH_LIVE_INTEGRATION_URL",
            "actor_ldap": actor_ldap,
            "actor_role": "Integration & Record Linker",
            "entity_id": record_id,
            "customer_name": f"Attached Live URL for {record_id}",
            "registry_cca_id": record_id,
            "region": "GLOBAL",
            "sku": "Integration Link",
            "chips_delta": 0,
            "tcv_usd_m": 0.0,
            "summary": f"Attached live URL ({live_url}) to record {record_id}.",
            "before_state": {"record_id": record_id, "previous_url": prev_url},
            "after_state": {"record_id": record_id, "live_url": live_url, "has_custom_live_url": True},
            "tags": ["ATTACH_LIVE_URL", record_id],
        }
    )

    return {
        "status": "linked",
        "record_id": record_id,
        "live_url": live_url,
        "transaction": tx,
    }

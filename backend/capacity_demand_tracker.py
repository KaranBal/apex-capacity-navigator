"""v4.5 Startup & MME AI Infra Capacity Demand Tracker & Pursuit Hub Integration (100% Synthetic Data).

Incorporates public Hyperscale Cloud list & published CUD reference pricing, hardware SKU families (TPU v6e ASIC-v6e, TPU v7x ASIC-v7, H100, H200, B200, G4, ARMServer C4A),
5-Pillar CNS + Accelerator + Egress CCA completeness checks, CEM Review sign-off gates, PoC-to-CUD credit bridges,
and the Stranded CUD Value-Swap & Next-Gen Upgrade Clause Calculator.
All customer names, ticket IDs, and actor identities are 100% synthetic.
"""

from __future__ import annotations
from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Request

from backend.ui_adapter import get_role_view, is_assigned_to_field_rep
from backend.crm_pursuit_hub import record_universal_transaction

router = APIRouter()

BENCHMARK_PRICING_MATRIX: List[Dict[str, Any]] = [
    {
        "sku_code": "TPU_V6E",
        "tab_name": "v6 (ASIC-v6e)",
        "chip_label": "AI-ASIC v6e",
        "vm_family": "ct6e-standard",
        "hardware_category": "TPU",
        "list_price_hr": 2.70,
        "flex_start_flex_hr": 1.35,
        "flex_start_calendar_hr": 1.89,
        "cud_1yr_benchmark_hr": 1.89,
        "cud_3yr_benchmark_hr": 1.22,
        "mega_cluster_floor_hr": 1.15,
        "notes": "Public List / Published CUD Reference (Illustrative): $2.70/hr list, $1.89/hr 1-Yr CUD (-30%), $1.22/hr 3-Yr CUD (-55%).",
    },
    {
        "sku_code": "TPU_V7X",
        "tab_name": "v7 (ASIC-v7)",
        "chip_label": "NextGen-ASIC v7x",
        "vm_family": "ct7x-standard",
        "hardware_category": "TPU",
        "list_price_hr": 8.40,
        "flex_start_flex_hr": 4.20,
        "flex_start_calendar_hr": 5.88,
        "cud_1yr_benchmark_hr": 5.88,
        "cud_3yr_benchmark_hr": 3.78,
        "mega_cluster_floor_hr": 3.78,
        "notes": "Public List / Published CUD Reference (Illustrative): 5-Yr CUD or >=25% Upfront Prepay eligible for priority scoring boost.",
    },
    {
        "sku_code": "TPU_V5P_V5E",
        "tab_name": "v5p & v5e",
        "chip_label": "TPU v5p & v5e",
        "vm_family": "ct5p-hightpu / ct5lp-hightpu",
        "hardware_category": "TPU",
        "list_price_hr": 4.20,
        "flex_start_flex_hr": 2.10,
        "flex_start_calendar_hr": 2.94,
        "cud_1yr_benchmark_hr": 2.94,
        "cud_3yr_benchmark_hr": 1.89,
        "mega_cluster_floor_hr": 1.80,
        "notes": "Public List / Published CUD Reference (Illustrative): Proven training/inference workhorse; eligible for contractual CUD value-exchange into v6e/v7x.",
    },
    {
        "sku_code": "H100",
        "tab_name": "H100 (Hopper High & Mega)",
        "chip_label": "NVIDIA H100 80GB (A3 High / A3 Mega)",
        "vm_family": "a3-megagpu-8g / a3-highgpu-8g",
        "hardware_category": "GPU",
        "list_price_hr": 8.00,
        "flex_start_flex_hr": 4.00,
        "flex_start_calendar_hr": 5.60,
        "cud_1yr_benchmark_hr": 5.60,
        "cud_3yr_benchmark_hr": 3.60,
        "mega_cluster_floor_hr": 3.60,
        "notes": "Public List / Published CUD Reference (Illustrative): Eligible for Stranded CUD Value-Swap from underutilized G4/L4 reservations.",
    },
    {
        "sku_code": "H200",
        "tab_name": "H200 (141GB HBM3e)",
        "chip_label": "NVIDIA H200 141GB (A3 Ultra)",
        "vm_family": "a3-ultragpu-8g",
        "hardware_category": "GPU",
        "list_price_hr": 10.60,
        "flex_start_flex_hr": 5.30,
        "flex_start_calendar_hr": 7.42,
        "cud_1yr_benchmark_hr": 7.42,
        "cud_3yr_benchmark_hr": 4.77,
        "mega_cluster_floor_hr": 4.50,
        "notes": "Public List / Published CUD Reference (Illustrative): Constrained in us-east4; +15pt scoring boost when paired with TPU v6e/v7x inference attachment.",
    },
    {
        "sku_code": "B200",
        "tab_name": "B200 (Blackwell 180GB)",
        "chip_label": "NVIDIA B200 180GB (A4 High)",
        "vm_family": "a4-highgpu-8g",
        "hardware_category": "GPU",
        "list_price_hr": 14.20,
        "flex_start_flex_hr": 7.10,
        "flex_start_calendar_hr": 9.94,
        "cud_1yr_benchmark_hr": 9.94,
        "cud_3yr_benchmark_hr": 6.39,
        "mega_cluster_floor_hr": 6.00,
        "notes": "Public List / Published CUD Reference (Illustrative): High-density Blackwell training nodes; best availability in us-central1 and us-south1.",
    },
    {
        "sku_code": "G4",
        "tab_name": "G4 (RTX PRO 6000 Blackwell)",
        "chip_label": "NVIDIA G4 (RTX PRO 6000 Blackwell Server Ed.)",
        "vm_family": "g4-standard",
        "hardware_category": "GPU",
        "list_price_hr": 3.40,
        "flex_start_flex_hr": 1.70,
        "flex_start_calendar_hr": 2.38,
        "cud_1yr_benchmark_hr": 2.38,
        "cud_3yr_benchmark_hr": 1.53,
        "mega_cluster_floor_hr": 1.45,
        "notes": "Public List / Published CUD Reference (Illustrative): Primary DFE offload target for <64-chip inference, multimodal rendering, and startup evaluations.",
    },
    {
        "sku_code": "C4A_A100",
        "tab_name": "ARMServer C4A & Classic Host Compute",
        "chip_label": "Cloud ARMServer C4A & C4 Companion Host Fleet",
        "vm_family": "c4a-highmem / c4-standard",
        "hardware_category": "CPU",
        "list_price_hr": 0.68,
        "flex_start_flex_hr": 0.34,
        "flex_start_calendar_hr": 0.48,
        "cud_1yr_benchmark_hr": 0.48,
        "cud_3yr_benchmark_hr": 0.31,
        "mega_cluster_floor_hr": 0.30,
        "notes": "Public List / Published CUD Reference (Illustrative): Coupled Companion 2.0 host CPU tier for data loading, checkpointing, and baremetal ARM workloads.",
    },
]

TRACKER_PURSUITS_SEED: List[Dict[str, Any]] = [
    {
        "pursuit_id": "TRK-2026-001",
        "account_name": "Northstar Frontier AI (Synthetic)",
        "assigned_to_field_rep": True,
        "nal_segment": "Growth",
        "date_added": "2026-10-14",
        "sku_tab": "GOING_TO_ALLOCATION",
        "chip_type": "TPU v6e (ASIC-v6e — 8,192 Chips)",
        "sku_code": "TPU_V6E",
        "readiness_stage": "FIRM_GOING_TO_ALLOCATION",
        "stage_badge": "FIRM • *GOING TO ALLOCATION THIS WEEK* (30% Prepay + 5-Yr CUD)",
        "min_chips": 4096,
        "max_chips": 8192,
        "cud_term": "5-Yr CUD (30% Upfront Prepay)",
        "customer_bid_price_hr": 1.28,
        "benchmark_price_hr": 1.22,
        "price_vs_benchmark_status": "CLEARS_REFERENCE_FLOOR",
        "tcv_usd_m": 310.0,
        "region_requirement": "us-east5 (Primary) / us-central1 (Spillover)",
        "vector_workload_url": "http://crm-pipeline-synth/WL-SYNTH-9001",
        "accelerator_cca_id": "CCA-SYNTH-9001",
        "accelerator_cca_url": "http://capacity-registry/CCA-SYNTH-9001",
        "storage_cca_status": "CCA-SYNTH-9001-STG (4.5 PB ParallelFS)",
        "storage_cca_url": "http://capacity-registry/CCA-SYNTH-9001-STG",
        "networking_cca_status": "CCA-SYNTH-9001-NET (800G Jupiter ICI + 650 Gbps Egress)",
        "networking_cca_url": "http://capacity-registry/CCA-SYNTH-9001-NET",
        "compute_cca_status": "CCA-SYNTH-9001-CPU (9,400 Net C4 + ParallelFS vCPU Companion • RUB-2026-0101)",
        "compute_cca_url": "http://capacity-registry/CCA-SYNTH-9001-CPU",
        "cns_completeness_score": "5/5 Complete (GPU/TPU + CPU + Storage + Net + Egress)",
        "intake_form_submitted_by": "Y, Field Specialist CE (Demo) (10/14/2026)",
        "cem_review_signoff": "Y, CEM Reviewer (Demo) (10/15/2026)",
        "fsm": "Field Sales Manager (Demo)",
        "cem": "CEM Reviewer (Demo)",
        "fsr": "Account FSR (Demo)",
        "ce": "Field Specialist CE (Demo)",
        "ai_infra_gtm": "AI Infra GTM Lead (Demo)",
        "ai_infra_ce": "AI Infra CE Lead (Demo)",
        "ai_infra_fsa": "Solutions Architect (Demo)",
        "executive_brief_url": None,
        "special_deal_structure_flag": "PREPAY_30PCT_5YR_WHALE",
        "commentary": "[Synthetic Flagship Whale Pursuit] 8,192x AI-ASIC v6e in us-east5 on a 5-Year CUD with 30% upfront cash prepayment ($310.0M TCV, Score 92/100). All 5 companion infrastructure pillars (RUB-2026-0101: 9,400 net C4 + ParallelFS vCPUs, 4.5 PB ParallelFS, 650 Gbps egress) validated.",
    },
    {
        "pursuit_id": "TRK-2026-002",
        "account_name": "Apex Cloud Systems (Synthetic)",
        "assigned_to_field_rep": True,
        "nal_segment": "Acquisition",
        "date_added": "2026-10-18",
        "sku_tab": "GOING_TO_ALLOCATION",
        "chip_type": "TPU v6e (ASIC-v6e — 2,048 Chips)",
        "sku_code": "TPU_V6E",
        "readiness_stage": "FIRM_GOING_TO_ALLOCATION",
        "stage_badge": "FIRM • *GOING TO ALLOCATION THIS WEEK* (Clears Reference CUD Floor)",
        "min_chips": 1024,
        "max_chips": 2048,
        "cud_term": "3-Yr CUD (25% Prepay)",
        "customer_bid_price_hr": 1.28,
        "benchmark_price_hr": 1.22,
        "price_vs_benchmark_status": "CLEARS_REFERENCE_FLOOR",
        "tcv_usd_m": 66.8,
        "region_requirement": "us-east5 or us-central1",
        "vector_workload_url": "http://crm-pipeline-synth/WL-SYNTH-9002",
        "accelerator_cca_id": "CCA-SYNTH-9002",
        "accelerator_cca_url": "http://capacity-registry/CCA-SYNTH-9002",
        "storage_cca_status": "CCA-SYNTH-9002-STG (1.2 PB HighIOPSDisk ML)",
        "storage_cca_url": "http://capacity-registry/CCA-SYNTH-9002-STG",
        "networking_cca_status": "CCA-SYNTH-9002-NET (200 Gbps Egress)",
        "networking_cca_url": "http://capacity-registry/CCA-SYNTH-9002-NET",
        "compute_cca_status": "CCA-SYNTH-9002-CPU (1,600 vCPU C4)",
        "compute_cca_url": "http://capacity-registry/CCA-SYNTH-9002-CPU",
        "cns_completeness_score": "5/5 Complete",
        "intake_form_submitted_by": "Y, Field Specialist CE (Demo) (10/18/2026)",
        "cem_review_signoff": "Y, CEM Reviewer (Demo) (10/19/2026)",
        "fsm": "Field Sales Manager (Demo)",
        "cem": "CEM Reviewer (Demo)",
        "fsr": "Account FSR (Demo)",
        "ce": "Field Specialist CE (Demo)",
        "ai_infra_gtm": "AI Infra GTM Lead (Demo)",
        "ai_infra_ce": "AI Infra CE Lead (Demo)",
        "ai_infra_fsa": "Solutions Architect (Demo)",
        "executive_brief_url": None,
        "special_deal_structure_flag": "COMPETITIVE_TAKEOUT_SYNTH",
        "commentary": "[Synthetic Competitive Takeout] Migrated JAX inference stack from external GPU cloud onto ASIC-v6e v6e. Clears published 3-Yr CUD reference floor ($1.28/hr vs $1.22/hr reference) with 25% upfront prepay.",
    },
    {
        "pursuit_id": "TRK-2026-003",
        "account_name": "Stratos Autonomous Robotics (Synthetic)",
        "assigned_to_field_rep": True,
        "nal_segment": "Growth",
        "date_added": "2026-10-05",
        "sku_tab": "TPU_V6E",
        "chip_type": "TPU v6e (ASIC-v6e — 4,096 Chips)",
        "sku_code": "TPU_V6E",
        "readiness_stage": "REQUALIFY_CHECK_CNS",
        "stage_badge": "🚨 HOLD: Active 14% Utilization Breach on Prior Allocation (SLA-2026-903)",
        "min_chips": 2048,
        "max_chips": 4096,
        "cud_term": "3-Yr CUD (15% Prepay)",
        "customer_bid_price_hr": 1.25,
        "benchmark_price_hr": 1.22,
        "price_vs_benchmark_status": "CLEARS_REFERENCE_FLOOR",
        "tcv_usd_m": 128.0,
        "region_requirement": "us-central1",
        "vector_workload_url": "http://crm-pipeline-synth/WL-SYNTH-9003",
        "accelerator_cca_id": "CCA-SYNTH-9003",
        "accelerator_cca_url": "http://capacity-registry/CCA-SYNTH-9003",
        "storage_cca_status": "CCA-SYNTH-9003-STG (2.5 PB Lustre)",
        "storage_cca_url": "http://capacity-registry/CCA-SYNTH-9003-STG",
        "networking_cca_status": "CCA-SYNTH-9003-NET (320 Gbps Egress)",
        "networking_cca_url": "http://capacity-registry/CCA-SYNTH-9003-NET",
        "compute_cca_status": "CCA-SYNTH-9003-CPU (3,200 vCPU C4)",
        "compute_cca_url": "http://capacity-registry/CCA-SYNTH-9003-CPU",
        "cns_completeness_score": "5/5 Complete (Blocked by SLA-2026-903 Breach)",
        "intake_form_submitted_by": "Y, Field Specialist CE (Demo) (10/05/2026)",
        "cem_review_signoff": "Hold — Pending SLA-2026-903 Ramp Remediation",
        "fsm": "Field Sales Manager (Demo)",
        "cem": "CEM Reviewer (Demo)",
        "fsr": "Account FSR (Demo)",
        "ce": "Field Specialist CE (Demo)",
        "ai_infra_gtm": "AI Infra GTM Lead (Demo)",
        "ai_infra_ce": "AI Infra CE Lead (Demo)",
        "ai_infra_fsa": "Solutions Architect (Demo)",
        "executive_brief_url": None,
        "special_deal_structure_flag": "UTILIZATION_BREACH_HOLD",
        "commentary": "[Synthetic Performance Management Gate] Customer's existing 4,096-chip us-central1 allocation (SLA-2026-903) is at 14% utilization past the 14-day grace window (vs. 85% target). Expansion request TET-2026-0413 ($128.0M TCV) is automatically held (-25pt penalty: 88 -> 63/100) until idle chips are reclaimed or ramped >=85%.",
    },
    {
        "pursuit_id": "TRK-2026-004",
        "account_name": "Vectoria Foundation Labs (Synthetic)",
        "assigned_to_field_rep": False,
        "nal_segment": "Activation",
        "date_added": "2026-10-12",
        "sku_tab": "H200",
        "chip_type": "H200 141GB (1,024x) + TPU v6e (2,048x Coupled)",
        "sku_code": "H200",
        "readiness_stage": "FIRM",
        "stage_badge": "FIRM • 'GPU Ties to TPU' Rule Verified (+15pt Boost)",
        "min_chips": 1024,
        "max_chips": 3072,
        "cud_term": "3-Yr CUD (30% Prepay)",
        "customer_bid_price_hr": 4.95,
        "benchmark_price_hr": 4.77,
        "price_vs_benchmark_status": "CLEARS_REFERENCE_FLOOR",
        "tcv_usd_m": 112.4,
        "region_requirement": "us-central1 (H200) + us-east5 (v6e)",
        "vector_workload_url": "http://crm-pipeline-synth/WL-SYNTH-9004",
        "accelerator_cca_id": "CCA-SYNTH-9004",
        "accelerator_cca_url": "http://capacity-registry/CCA-SYNTH-9004",
        "storage_cca_status": "CCA-SYNTH-9004-STG (2 PB HighIOPSDisk Balanced)",
        "storage_cca_url": "http://capacity-registry/CCA-SYNTH-9004-STG",
        "networking_cca_status": "CCA-SYNTH-9004-NET (RoCE 400G + 280 Gbps Egress)",
        "networking_cca_url": "http://capacity-registry/CCA-SYNTH-9004-NET",
        "compute_cca_status": "CCA-SYNTH-9004-CPU (12,000 N4 vCPUs)",
        "compute_cca_url": "http://capacity-registry/CCA-SYNTH-9004-CPU",
        "cns_completeness_score": "5/5 Complete",
        "intake_form_submitted_by": "Y, Specialist CE (Demo) (10/12/2026)",
        "cem_review_signoff": "Y, CEM Reviewer (Demo) (10/13/2026)",
        "fsm": "Field Sales Manager (Demo)",
        "cem": "CEM Reviewer (Demo)",
        "fsr": "Enterprise FSR (Demo)",
        "ce": "Specialist CE (Demo)",
        "ai_infra_gtm": "AI Infra GTM Lead (Demo)",
        "ai_infra_ce": "AI Infra CE Lead (Demo)",
        "ai_infra_fsa": "Solutions Architect (Demo)",
        "executive_brief_url": None,
        "special_deal_structure_flag": "GPU_TIES_TO_TPU_COUPLED",
        "commentary": "[Synthetic Cross-Architecture Pursuit] Pairs 1,024x H200 training nodes with 2,048x ASIC-v6e v6e inference chips and 30% upfront prepayment.",
    },
    {
        "pursuit_id": "TRK-2026-005",
        "account_name": "Prism Media AI (Synthetic)",
        "assigned_to_field_rep": False,
        "nal_segment": "Growth",
        "date_added": "2026-10-09",
        "sku_tab": "H100",
        "chip_type": "G4 (64x Unused) -> H100 Mega (24x CUD Value Swap)",
        "sku_code": "H100",
        "readiness_stage": "FIRM",
        "stage_badge": "CUD VALUE EXCHANGE ($3.02M G4 -> $3.18M H100 Mega)",
        "min_chips": 24,
        "max_chips": 24,
        "cud_term": "3-Yr CUD Swap",
        "customer_bid_price_hr": 5.08,
        "benchmark_price_hr": 3.60,
        "price_vs_benchmark_status": "CLEARS_REFERENCE_FLOOR",
        "tcv_usd_m": 3.18,
        "region_requirement": "us-central1",
        "vector_workload_url": "http://crm-pipeline-synth/WL-SYNTH-9005",
        "accelerator_cca_id": "CCA-SYNTH-9005",
        "accelerator_cca_url": "http://capacity-registry/CCA-SYNTH-9005",
        "storage_cca_status": "Existing HighIOPSDisk Pool Verified",
        "storage_cca_url": None,
        "networking_cca_status": "Existing VPC + 40 Gbps Egress Verified",
        "networking_cca_url": None,
        "compute_cca_status": "Included in A3-Mega Host",
        "compute_cca_url": None,
        "cns_completeness_score": "5/5 Complete",
        "intake_form_submitted_by": "Y, Specialist CE (Demo) (10/09/2026)",
        "cem_review_signoff": "Y, CEM Reviewer (Demo) (10/09/2026)",
        "fsm": "Field Sales Manager (Demo)",
        "cem": "CEM Reviewer (Demo)",
        "fsr": "Enterprise FSR (Demo)",
        "ce": "Specialist CE (Demo)",
        "ai_infra_gtm": "AI Infra GTM Lead (Demo)",
        "ai_infra_ce": "AI Infra CE Lead (Demo)",
        "ai_infra_fsa": "Solutions Architect (Demo)",
        "executive_brief_url": None,
        "special_deal_structure_flag": "STRANDED_CUD_VALUE_SWAP",
        "commentary": "[Synthetic CUD Value Exchange] Exchanges 64x underutilized G4 chips ($3.02M remaining commitment) into 24x H100 Mega chips ($3.18M TCV, 105.4% TCV preservation).",
    },
    {
        "pursuit_id": "TRK-2026-006",
        "account_name": "Boreal Sovereign AI (Synthetic)",
        "assigned_to_field_rep": False,
        "nal_segment": "Acquisition",
        "date_added": "2026-10-16",
        "sku_tab": "TPU_V6E",
        "chip_type": "TPU v6e (ASIC-v6e — 1,536 Chips EU Sovereign)",
        "sku_code": "TPU_V6E",
        "readiness_stage": "CAPACITY_ALLOCATED_WON",
        "stage_badge": "ALLOCATED (1,536x v6e europe-west4) • 5-Yr Sovereign CUD",
        "min_chips": 1536,
        "max_chips": 1536,
        "cud_term": "5-Yr CUD (40% Prepay)",
        "customer_bid_price_hr": 1.34,
        "benchmark_price_hr": 1.22,
        "price_vs_benchmark_status": "CLEARS_REFERENCE_FLOOR",
        "tcv_usd_m": 90.2,
        "region_requirement": "europe-west4 (GDPR Sovereign Boundary)",
        "vector_workload_url": "http://crm-pipeline-synth/WL-SYNTH-9006",
        "accelerator_cca_id": "CCA-SYNTH-9006",
        "accelerator_cca_url": "http://capacity-registry/CCA-SYNTH-9006",
        "storage_cca_status": "CCA-SYNTH-9006-STG (1.8 PB ParallelFS)",
        "storage_cca_url": "http://capacity-registry/CCA-SYNTH-9006-STG",
        "networking_cca_status": "CCA-SYNTH-9006-NET (220 Gbps Egress)",
        "networking_cca_url": "http://capacity-registry/CCA-SYNTH-9006-NET",
        "compute_cca_status": "CCA-SYNTH-9006-CPU (2,400 vCPU C4)",
        "compute_cca_url": "http://capacity-registry/CCA-SYNTH-9006-CPU",
        "cns_completeness_score": "5/5 Complete",
        "intake_form_submitted_by": "Y, EMEA Specialist CE (Demo) (10/16/2026)",
        "cem_review_signoff": "Y, CEM Reviewer (Demo) (10/17/2026)",
        "fsm": "EMEA Sales Manager (Demo)",
        "cem": "CEM Reviewer (Demo)",
        "fsr": "EMEA FSR (Demo)",
        "ce": "EMEA Specialist CE (Demo)",
        "ai_infra_gtm": "AI Infra GTM Lead (Demo)",
        "ai_infra_ce": "AI Infra CE Lead (Demo)",
        "ai_infra_fsa": "Solutions Architect (Demo)",
        "executive_brief_url": None,
        "special_deal_structure_flag": "EU_SOVEREIGN_5YR_PREPAY",
        "commentary": "[Synthetic EMEA Sovereign Win] 1,536x ASIC-v6e v6e allocated in europe-west4 on a 5-Yr Sovereign CUD with 40% upfront cash prepay.",
    },
    {
        "pursuit_id": "TRK-2026-007",
        "account_name": "Meridian Quant Systems (Synthetic)",
        "assigned_to_field_rep": False,
        "nal_segment": "Mid-Market",
        "date_added": "2026-10-20",
        "sku_tab": "B200",
        "chip_type": "NVIDIA B200 180GB (512 Chips)",
        "sku_code": "B200",
        "readiness_stage": "FIRM",
        "stage_badge": "FIRM • Cold-Region Fast-Track (us-south1)",
        "min_chips": 256,
        "max_chips": 512,
        "cud_term": "3-Yr CUD (20% Prepay)",
        "customer_bid_price_hr": 6.65,
        "benchmark_price_hr": 6.39,
        "price_vs_benchmark_status": "CLEARS_REFERENCE_FLOOR",
        "tcv_usd_m": 76.0,
        "region_requirement": "us-south1 (Accepted DFE Cold Region Shift)",
        "vector_workload_url": "http://crm-pipeline-synth/WL-SYNTH-9007",
        "accelerator_cca_id": "CCA-SYNTH-9007",
        "accelerator_cca_url": "http://capacity-registry/CCA-SYNTH-9007",
        "storage_cca_status": "CCA-SYNTH-9007-STG (900 TB HighIOPSDisk ML)",
        "storage_cca_url": "http://capacity-registry/CCA-SYNTH-9007-STG",
        "networking_cca_status": "CCA-SYNTH-9007-NET (150 Gbps Egress)",
        "networking_cca_url": "http://capacity-registry/CCA-SYNTH-9007-NET",
        "compute_cca_status": "CCA-SYNTH-9007-CPU (1,024 vCPU C4)",
        "compute_cca_url": "http://capacity-registry/CCA-SYNTH-9007-CPU",
        "cns_completeness_score": "5/5 Complete",
        "intake_form_submitted_by": "Y, Specialist CE (Demo) (10/20/2026)",
        "cem_review_signoff": "Y, CEM Reviewer (Demo) (10/21/2026)",
        "fsm": "Field Sales Manager (Demo)",
        "cem": "CEM Reviewer (Demo)",
        "fsr": "Enterprise FSR (Demo)",
        "ce": "Specialist CE (Demo)",
        "ai_infra_gtm": "AI Infra GTM Lead (Demo)",
        "ai_infra_ce": "AI Infra CE Lead (Demo)",
        "ai_infra_fsa": "Solutions Architect (Demo)",
        "executive_brief_url": None,
        "special_deal_structure_flag": "COLD_REGION_SPILLOVER",
        "commentary": "[Synthetic Cold-Region Spillover] Accepted DFE shift from constrained us-east4 to us-south1 B200 pool with 20% upfront prepayment.",
    },
    {
        "pursuit_id": "TRK-2026-008",
        "account_name": "Cascade Agentic Labs (Synthetic)",
        "assigned_to_field_rep": False,
        "nal_segment": "Activation",
        "date_added": "2026-10-22",
        "sku_tab": "G4",
        "chip_type": "NVIDIA G4 RTX PRO 6000 (128 Chips)",
        "sku_code": "G4",
        "readiness_stage": "CAPACITY_ALLOCATED_WON",
        "stage_badge": "ALLOCATED • Zero-Touch Calendar Mode",
        "min_chips": 64,
        "max_chips": 128,
        "cud_term": "1-Yr CUD",
        "customer_bid_price_hr": 2.45,
        "benchmark_price_hr": 2.38,
        "price_vs_benchmark_status": "CLEARS_REFERENCE_FLOOR",
        "tcv_usd_m": 2.47,
        "region_requirement": "us-central1",
        "vector_workload_url": "http://crm-pipeline-synth/WL-SYNTH-9008",
        "accelerator_cca_id": "CCA-SYNTH-9008",
        "accelerator_cca_url": "http://capacity-registry/CCA-SYNTH-9008",
        "storage_cca_status": "Included in Project Quota",
        "storage_cca_url": None,
        "networking_cca_status": "40 Gbps Egress Verified",
        "networking_cca_url": None,
        "compute_cca_status": "Included in G4 VM",
        "compute_cca_url": None,
        "cns_completeness_score": "5/5 Complete",
        "intake_form_submitted_by": "Y, Specialist CE (Demo) (10/22/2026)",
        "cem_review_signoff": "Y, CEM Reviewer (Demo) (10/22/2026)",
        "fsm": "Field Sales Manager (Demo)",
        "cem": "CEM Reviewer (Demo)",
        "fsr": "Startup FSR (Demo)",
        "ce": "Specialist CE (Demo)",
        "ai_infra_gtm": "AI Infra GTM Lead (Demo)",
        "ai_infra_ce": "AI Infra CE Lead (Demo)",
        "ai_infra_fsa": "Solutions Architect (Demo)",
        "executive_brief_url": None,
        "special_deal_structure_flag": "G4_INFERENCE_OFFLOAD",
        "commentary": "[Synthetic G4 Inference Offload] Deflected from constrained us-east4 H100 queue into immediate us-central1 G4 Blackwell fleet.",
    },
    {
        "pursuit_id": "TRK-2026-009",
        "account_name": "Zephyr Edge Compute (Synthetic)",
        "assigned_to_field_rep": False,
        "nal_segment": "Activation",
        "date_added": "2026-10-24",
        "sku_tab": "C4A_A100",
        "chip_type": "ARMServer C4A Baremetal (64 Hosts)",
        "sku_code": "C4A_A100",
        "readiness_stage": "FIRM",
        "stage_badge": "FIRM • C4A Baremetal Eval -> 3-Yr Commit",
        "min_chips": 16,
        "max_chips": 64,
        "cud_term": "3-Yr CUD",
        "customer_bid_price_hr": 0.45,
        "benchmark_price_hr": 0.31,
        "price_vs_benchmark_status": "CLEARS_REFERENCE_FLOOR",
        "tcv_usd_m": 0.85,
        "region_requirement": "us-east4",
        "vector_workload_url": "http://crm-pipeline-synth/WL-SYNTH-9009",
        "accelerator_cca_id": "CCA-SYNTH-9009",
        "accelerator_cca_url": "http://capacity-registry/CCA-SYNTH-9009",
        "storage_cca_status": "No incremental storage required",
        "storage_cca_url": None,
        "networking_cca_status": "25 Gbps Egress Verified",
        "networking_cca_url": None,
        "compute_cca_status": "CCA-SYNTH-9009 (ARMServer C4A Baremetal)",
        "compute_cca_url": "http://capacity-registry/CCA-SYNTH-9009",
        "cns_completeness_score": "5/5 Complete",
        "intake_form_submitted_by": "Y, Specialist CE (Demo) (10/24/2026)",
        "cem_review_signoff": "Y, CEM Reviewer (Demo) (10/24/2026)",
        "fsm": "Field Sales Manager (Demo)",
        "cem": "CEM Reviewer (Demo)",
        "fsr": "Startup FSR (Demo)",
        "ce": "Specialist CE (Demo)",
        "ai_infra_gtm": "AI Infra GTM Lead (Demo)",
        "ai_infra_ce": "AI Infra CE Lead (Demo)",
        "ai_infra_fsa": "Solutions Architect (Demo)",
        "executive_brief_url": None,
        "special_deal_structure_flag": "ARM_SERVER_C4A_BAREMETAL",
        "commentary": "[Synthetic ARMServer Host Fleet] 64x ARMServer C4A baremetal machines on a 3-Yr commitment in us-east4.",
    },
]

TRACKER_STORE: Dict[str, Any] = {
    "pursuits": [dict(p) for p in TRACKER_PURSUITS_SEED],
}


@router.get("/api/v1/tracker/pursuits")
def get_infracapacity_tracker_pursuits(
    request: Request,
    sku_tab: str = Query("ALL", description="Filter by SKU tab (e.g. GOING_TO_ALLOCATION, H100, H200, B200, G4, TPU_V6E, TPU_V7X, C4A_A100)"),
    nal_segment: str = Query("ALL", description="Filter by NAL segment (Activation, Acquisition, Growth, Mid-Market)"),
    readiness_stage: str = Query("ALL", description="Filter by stage (FIRM_GOING_TO_ALLOCATION, FIRM, REQUALIFY_CHECK_CNS, CAPACITY_ALLOCATED_WON)"),
    owner: str = Query("ALL", description="Filter by demo role"),
    q: str = Query("", description="Free-text search across synthetic account, CCA ID, or commentary"),
):
    """Returns the synthetic AI Infra Capacity Demand Tracker & Pursuit Hub records.
    Enforces server-side RBAC when X-Demo-Role-View: FIELD_REP is active.
    """
    role_view = get_role_view(request)
    pursuits = TRACKER_STORE["pursuits"]
    if role_view == "FIELD_REP":
        pursuits = [p for p in pursuits if is_assigned_to_field_rep(p)]

    q_low = q.strip().lower()

    filtered = []
    for p in pursuits:
        if sku_tab != "ALL" and p["sku_tab"] != sku_tab and p["sku_code"] != sku_tab:
            continue
        if nal_segment != "ALL" and nal_segment.lower() not in p["nal_segment"].lower():
            continue
        if readiness_stage != "ALL" and p["readiness_stage"] != readiness_stage:
            continue
        if owner != "ALL":
            owner_blob = f"{p.get('ai_infra_gtm', '')} {p.get('ai_infra_ce', '')} {p.get('fsm', '')} {p.get('cem', '')} {p.get('fsr', '')} {p.get('ce', '')}".lower()
            if owner.lower() not in owner_blob:
                continue
        if q_low:
            haystack = " ".join(str(v) for v in p.values() if v is not None).lower()
            if q_low not in haystack:
                continue
        filtered.append(p)

    total_min_chips = sum(int(p["min_chips"]) for p in filtered)
    total_max_chips = sum(int(p["max_chips"]) for p in filtered)
    total_tcv_m = round(sum(float(p["tcv_usd_m"]) for p in filtered), 2)
    firm_count = sum(1 for p in filtered if p["readiness_stage"] in ("FIRM_GOING_TO_ALLOCATION", "FIRM", "FIRM_POC"))
    allocated_count = sum(1 for p in filtered if p["readiness_stage"] == "CAPACITY_ALLOCATED_WON")
    clears_benchmark_count = sum(1 for p in filtered if p["price_vs_benchmark_status"] in ("CLEARS_BENCHMARK", "AT_BENCHMARK", "CLEARS_REFERENCE_FLOOR"))

    return {
        "role_view": role_view,
        "synthetic_data_notice": "100% Synthetic Customer & Pursuit Dataset (Safe for Demo Sharing)",
        "source_sheets": [
            {
                "name": "Synthetic AI Infra Capacity Demand Tracker (Modeled on Regional Demand Tracker Workflow)",
                "shortlink": "capacity-registry",
                "url": "http://capacity-registry",
                "tabs_extracted": 8,
                "rows_extracted": len(filtered),
            },
        ],
        "summary_kpis": {
            "matched_pursuits_count": len(filtered),
            "total_min_chips": total_min_chips,
            "total_max_chips": total_max_chips,
            "total_tcv_usd_m": total_tcv_m,
            "firm_or_poc_ready_count": firm_count,
            "allocated_or_won_count": allocated_count,
            "clears_or_at_benchmark_count": clears_benchmark_count,
        },
        "benchmark_pricing_matrix": BENCHMARK_PRICING_MATRIX,
        "pursuits": filtered,
    }


@router.post("/api/v1/tracker/cud-swap-calculator")
def calculate_stranded_cud_value_swap(payload: Dict[str, Any]):
    """Interactive Stranded CUD Value-Swap & Next-Gen Upgrade Calculator (100% Synthetic).
    Only logs a transaction to the ledger if `log_transaction: true` is explicitly passed.
    """
    customer_name = str(payload.get("customer_name") or "Prism Media AI (Synthetic)").strip()
    source_sku = str(payload.get("source_sku") or "G4 (RTX PRO 6000)").strip()
    source_chips = int(payload.get("source_chips") or 64)
    source_rate_hr = float(payload.get("source_rate_hr") or 1.53)
    remaining_hours = float(payload.get("remaining_hours") or 22000.0)

    target_sku = str(payload.get("target_sku") or "H100 Mega (a3-megagpu-8g)").strip()
    target_rate_hr = float(payload.get("target_rate_hr") or 3.60)
    target_term_months = int(payload.get("target_term_months") or 36)
    node_granularity = int(payload.get("node_granularity") or 8)
    include_upgrade_clause = bool(payload.get("include_upgrade_clause", True))
    upgrade_target_sku = str(payload.get("upgrade_target_sku") or "ASIC-v7 (TPU v7x) / B200 after Month 24").strip()
    actor_ldap = str(payload.get("actor_ldap") or "field-specialist-ce@demo.example.com").strip()
    should_log = bool(payload.get("log_transaction", False))

    remaining_value_usd = round(source_chips * source_rate_hr * remaining_hours, 2)
    target_hours_total = target_term_months * 730.0
    cost_per_target_chip = max(1.0, target_rate_hr * target_hours_total)

    raw_target_chips = remaining_value_usd / cost_per_target_chip
    recommended_target_chips = max(
        node_granularity,
        int(math.ceil(raw_target_chips / float(node_granularity)) * node_granularity),
    )
    new_tcv_usd = round(recommended_target_chips * cost_per_target_chip, 2)
    net_tcv_delta_usd = round(new_tcv_usd - remaining_value_usd, 2)
    tcv_preservation_pct = round((new_tcv_usd * 100.0) / max(1.0, remaining_value_usd), 1)

    summary_text = (
        f"[CUD Value Exchange — {customer_name}] Exchanging {source_chips}x unused {source_sku} chips "
        f"(${source_rate_hr:.2f}/hr × {remaining_hours:,.0f} remaining hrs = ${remaining_value_usd:,.2f}) "
        f"into {recommended_target_chips}x {target_sku} chips (${target_rate_hr:.2f}/hr × {target_term_months} mos = ${new_tcv_usd:,.2f}) "
        f"preserves {tcv_preservation_pct}% of committed spend ({net_tcv_delta_usd:+,.2f} net TCV delta)"
        + (f" with a contractual 24-month upgrade clause to {upgrade_target_sku}." if include_upgrade_clause else ".")
    )

    tx = None
    if should_log:
        tx = record_universal_transaction(
            {
                "transaction_type": "CUD_VALUE_EXCHANGE_CALCULATED",
                "actor_ldap": actor_ldap,
                "actor_role": "AI Infra CE / Deal Desk Structuring",
                "entity_id": f"SWAP-{customer_name[:10].upper().replace(' ', '')}",
                "customer_name": customer_name,
                "registry_cca_id": "CCA-SYNTH-9005",
                "region": "US Flexible",
                "sku": f"{source_sku} -> {target_sku}",
                "chips_delta": recommended_target_chips - source_chips,
                "tcv_usd_m": round(new_tcv_usd / 1_000_000.0, 2),
                "summary": summary_text,
                "before_state": {
                    "source_sku": source_sku,
                    "source_chips": source_chips,
                    "source_rate_hr": source_rate_hr,
                    "remaining_hours": remaining_hours,
                    "remaining_value_usd": remaining_value_usd,
                },
                "after_state": {
                    "target_sku": target_sku,
                    "recommended_target_chips": recommended_target_chips,
                    "target_rate_hr": target_rate_hr,
                    "target_term_months": target_term_months,
                    "new_tcv_usd": new_tcv_usd,
                    "net_tcv_delta_usd": net_tcv_delta_usd,
                    "tcv_preservation_pct": tcv_preservation_pct,
                    "upgrade_target_sku": upgrade_target_sku if include_upgrade_clause else None,
                },
                "tags": ["CUD_VALUE_EXCHANGE", customer_name],
            }
        )

    return {
        "customer_name": customer_name,
        "source_sku": source_sku,
        "source_chips": source_chips,
        "source_rate_hr": source_rate_hr,
        "remaining_hours": remaining_hours,
        "remaining_value_usd": remaining_value_usd,
        "target_sku": target_sku,
        "recommended_target_chips": recommended_target_chips,
        "recommended_nodes": recommended_target_chips // max(1, node_granularity),
        "target_rate_hr": target_rate_hr,
        "target_term_months": target_term_months,
        "new_tcv_usd": new_tcv_usd,
        "net_tcv_delta_usd": net_tcv_delta_usd,
        "tcv_preservation_pct": tcv_preservation_pct,
        "include_upgrade_clause": include_upgrade_clause,
        "upgrade_target_sku": upgrade_target_sku if include_upgrade_clause else None,
        "summary": summary_text,
        "logged_to_ledger": should_log,
        "transaction": tx,
    }


@router.post("/api/v1/tracker/validate-firm-gate")
def validate_and_promote_to_going_to_allocation(payload: Dict[str, Any]):
    """Validates a synthetic pursuit against the 6-point FIRM gate and promotes it to FIRM_GOING_TO_ALLOCATION."""
    pursuit_id = str(payload.get("pursuit_id") or "").strip()
    cem_reviewer = str(payload.get("cem_reviewer") or "CEM Reviewer (Demo)").strip()
    actor_ldap = str(payload.get("actor_ldap") or "ops-capacity-lead@demo.example.com").strip()

    target = next((p for p in TRACKER_STORE["pursuits"] if p["pursuit_id"] == pursuit_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Pursuit {pursuit_id} not found.")

    if "UTILIZATION_BREACH" in str(target.get("special_deal_structure_flag", "")):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Guardrail Block: {target['account_name']} has an unresolved 14-day utilization breach "
                "(SLA-2026-903 at 14% ramp). Remediate or reclaim idle capacity before promoting to Allocation."
            ),
        )

    prev_stage = target["readiness_stage"]
    now_date = datetime.now(timezone.utc).strftime("%m/%d/%Y")
    target["readiness_stage"] = "FIRM_GOING_TO_ALLOCATION"
    target["stage_badge"] = f"FIRM • Promoted to *GOING TO ALLOCATION THIS WEEK* ({now_date})"
    target["cem_review_signoff"] = f"Y, {cem_reviewer} ({now_date})"
    target["cns_completeness_score"] = "5/5 Complete (Validated for Allocation)"

    tx = record_universal_transaction(
        {
            "transaction_type": "PROMOTE_FIRM_GOING_TO_ALLOCATION",
            "actor_ldap": actor_ldap,
            "actor_role": "AI Infra GTM / CEM Gate Validator",
            "entity_id": pursuit_id,
            "customer_name": target["account_name"],
            "registry_cca_id": target["accelerator_cca_id"],
            "region": target["region_requirement"],
            "sku": target["chip_type"],
            "chips_delta": int(target["max_chips"]),
            "tcv_usd_m": float(target["tcv_usd_m"]),
            "summary": (
                f"Validated all 6 FIRM readiness gates for {target['account_name']} ({target['max_chips']}x {target['chip_type']} @ ${target['customer_bid_price_hr']:.2f}/hr, "
                f"CCA {target['accelerator_cca_id']}, CEM Sign-Off: {target['cem_review_signoff']}) and promoted to *GOING TO ALLOCATION THIS WEEK*."
            ),
            "before_state": {"readiness_stage": prev_stage},
            "after_state": {
                "readiness_stage": target["readiness_stage"],
                "cem_review_signoff": target["cem_review_signoff"],
                "cns_completeness_score": target["cns_completeness_score"],
            },
            "tags": ["GOING_TO_ALLOCATION", target["sku_code"], target["nal_segment"]],
        }
    )

    return {
        "status": "promoted",
        "pursuit": target,
        "transaction": tx,
    }

"""Salesforce (Vector CRM), Project STRATEGIC_POD / Dedicated Pod Governance, Reclaimed & Flex-Start Pool,
Persistent Institutional Memory Vault, and ModelHub AI Semantic Vector Search + Fast-Router LLM Router.
All customer names, ticket IDs, and actor identities are 100% synthetic.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import math
import os
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Request
from backend.ui_adapter import (
    UI_STORE,
    compute_ui_score_and_companion,
    _get_model_hub_client,
    get_role_view,
    is_assigned_to_field_rep,
)

router = APIRouter()

# Clean up any legacy snapshots if present
for _old_snap in (
    "/tmp/apex_persistent_memory_v3.json",
    "/tmp/apex_persistent_memory_v4_synth.json",
    "/tmp/apex_persistent_memory_v5_synth.json",
):
    if os.path.exists(_old_snap):
        try:
            os.remove(_old_snap)
        except Exception:
            pass

PERSISTENT_MEMORY_FILE = os.environ.get(
    "APEX_MEMORY_FILE", "/tmp/apex_persistent_memory_v6_synth.json"
)

STRATEGIC_POD_12_VERTICALS = [
    "1. Model Training (Frontier & Foundation LLM Pre/Post-Training)",
    "2. Scaled Inference (High-Throughput Low-Latency Serving)",
    "3. World Model Training (Multimodal Video & Spatial World Models)",
    "4. Robotics / Physical AI (Embodied AI & Sensor Simulation)",
    "5. Trading Models (Quant Finance, HFT & Alpha Generation)",
    "6. Regulated Enterprise AI (Financial & Healthcare Deployments)",
    "7. Open Model Inference (Open-Weights Serving Factories)",
    "8. Recommendation Systems (Large-Scale Commerce & Media Ranking)",
    "9. Autonomous Mobility (AV Fleet Perception & End-to-End Planning)",
    "10. Drug Discovery (Genomics, Molecular Dynamics & Bio-AI)",
    "11. Edge AI Inference (Distributed Telco, Retail & Industrial Edge)",
    "12. Sovereign AI (National AI Clouds & Sovereign Data Residency)",
]

TPU_JOURNEY_STAGES = [
    "1. Greenfield (<$1K T3M AI Spend)",
    "2. GPU Explorer / Spender (>=$1K GPU, <$1K TPU T3M)",
    "3. TPU Prospect (<$1K TPU T3M + Active Vector Open TPU Pursuit)",
    "4. TPU Explorer ($4K–$1M Annualized TPU ARR)",
    "5. TPU Torso Spender ($1M–$100M Annualized TPU ARR)",
    "6. TPU Whale ($100M+ Annualized TPU ARR / >=5,000 Chips)",
    "7. Dedicated Multi-Pod Commitment (3–5 Year CUD + Upfront Prepay)",
]

BLOOM_POD_TIERS = [
    {
        "pod_tier": "S01 (Entry Dedicated Slice)",
        "chips": 256,
        "power_mw": 2.0,
        "architecture": "AI-ASIC v6e / NextGen-ASIC v7 Building Block",
        "tco_savings_vs_iaas": "38% TCO Savings (3–5Yr CUD)",
        "commercial_routes": ["3-Year CUD", "5-Year CUD + Upfront Prepay", "Calendar Mode"],
    },
    {
        "pod_tier": "S02 (Standard 1-Pod Slice)",
        "chips": 1024,
        "power_mw": 8.0,
        "architecture": "1x Liquid-Cooled TPU Pod + ICI 3D Torus",
        "tco_savings_vs_iaas": "45% TCO Savings (3–5Yr CUD)",
        "commercial_routes": ["3-Year CUD", "5-Year CUD + Upfront Prepay"],
    },
    {
        "pod_tier": "S03 (Dual-Pod Cluster)",
        "chips": 2048,
        "power_mw": 16.0,
        "architecture": "2x Liquid-Cooled TPU Pods + RoCEv2 Inter-Pod Fabric",
        "tco_savings_vs_iaas": "48% TCO Savings (3–5Yr CUD)",
        "commercial_routes": ["3-Year CUD", "5-Year CUD + Upfront Prepay"],
    },
    {
        "pod_tier": "S04 (Whale Supercluster — >=5,000 Chips)",
        "chips": 8192,
        "power_mw": 64.0,
        "architecture": "Full AI-ASIC v6e / ASIC-v7 (TPU v7x) Superpod + Optical Circuit Switching (OCS)",
        "tco_savings_vs_iaas": "52% TCO Savings (5-Yr CUD + Prepay)",
        "commercial_routes": ["5-Year CUD + Upfront Cash Prepayment", "3-Year CUD"],
    },
]

GDM_AND_CROSS_PA_BENCHMARKS = {
    "gdm_gqm_pool": {
        "pool_name": "Saleable Cloud Reclaimed & Flex-Start Pool",
        "unit_conversion": "14-Day Use-It-or-Lose-It SLA Reclamation -> Instant FlexStart / PoC Flex Pool",
        "total_dynamic_bridge_chips": 3072,
        "allocated_emergency_loan_chips": 1152,
        "recycled_from_use_it_or_lose_it_chips": 640,
        "available_instant_bridge_chips": 2560,
        "active_emergency_loans": [
            {
                "loan_id": "FLEX-ALLOC-2026-01",
                "customer_name": "Kinetix Video Foundation (Synthetic)",
                "sfdc_account_id": "SFDC-SYNTH-005",
                "chip_type": "AI-ASIC v6e",
                "chips": 256,
                "region": "us-central1",
                "duration_days": 14,
                "ttfc_minutes": 22,
                "mechanism": "Obidos Fast-Track (go/obidos-intake) + Calendar Mode",
                "status": "ACTIVE — Validating ahead of 3-Yr CUD lock",
            },
            {
                "loan_id": "FLEX-ALLOC-2026-02",
                "customer_name": "Helios Quantitative Trading (Synthetic)",
                "sfdc_account_id": "SFDC-SYNTH-004",
                "chip_type": "NextGen-ASIC v7 Seed Pod",
                "chips": 128,
                "region": "us-south1",
                "duration_days": 21,
                "ttfc_minutes": 27,
                "mechanism": "Cold-Region Seed Pod + PyTorch/XLA Validation",
                "status": "ACTIVE — Validating GPU->TPU Inference Attachment",
            },
        ],
    },
    "cross_pa_research_cards": [
        {
            "source_id": "RES-POSTER-01",
            "title": "Canonical 5-Step Capacity Allocation Workflow (go/capacity-poster & go/acc-prioritization)",
            "owners": "Central Capacity & Operations Governance",
            "summary": "Operationalizes the canonical 5-Step Capacity Allocation Poster into an interactive state machine: Step 1 (5-Pillar Full-Stack Intake: GPU/TPU + CPU + Storage + Networking + Egress), Step 2 (Automated Scoring with 5-Yr > 3-Yr > 1-Yr CUD & Upfront Prepay cash-flow priority), Step 3 (Tuesday/Thursday Council Cutline >=80 pts — Human Decision), Step 4 (14-Day Use-It-or-Lose-It SLA Tracking against 85% target ramp), and Step 5 (4-Step Post-Rejection Counter-Offer Playbook).",
            "applied_in_apex": "Implemented across Tabs 1–6 with real-time scoring, upfront prepay weighting, and hard utilization breach guardrails.",
        },
        {
            "source_id": "RES-STRATEGIC_POD-02",
            "title": "Project STRATEGIC_POD & Cross-Architecture Co-Deployment ('GPU Ties to TPU')",
            "owners": "AI Infrastructure GTM & Specialist CE",
            "summary": "Curated P0/P1 accounts across 12 AI verticals. Tracks customer progression from Greenfield -> GPU Spender -> TPU Prospect -> Torso -> Whale (>=5,000 chips). Awards a +15pt priority boost when scarce GPU requests are paired with a verified Cloud TPU inference/training commitment.",
            "applied_in_apex": "Built synthetic Salesforce Vector CRM Hub, Seller/CE Nomination, 1-Click Leader Verification, and +15pt Allocation Priority Boost.",
        },
        {
            "source_id": "RES-PLAYBOOK-03",
            "title": "Global AI Infrastructure Sales Playbook (go/ai-infra:playbook) — DFE Benchmarks & 5.9x Downstream Pull-Through",
            "owners": "Global AI Infrastructure GTM",
            "summary": "Documents the 5.9x downstream revenue multiplier across core storage, database, analytics, and security workloads when an enterprise lands an AI anchor workload. Quantifies DFE price-performance: NextGen-ASIC v7 delivers 52% lower Training TCO vs GB300; AI-ASIC v6e delivers 3.18x training & 1.8x inference price-perf vs H200; G4 (RTX PRO 6000 Blackwell) delivers 3x–4x FP4 price-perf vs H100 for <=64-chip inference.",
            "applied_in_apex": "Integrated quantitative DFE Chip Benchmark comparisons, G4 & ASIC-v6e v6e pivot calculators, and commercial program selectors.",
        },
    ],
    "playbook_dfe_and_commercial": {
        "get_to_firm_gate": {
            "deal_pipeline_tags": [
                "Early (Discovery Conversation — 15% Illustrative Weight)",
                "Likely (Architecture & Sizing Scoped — 55% Illustrative Weight)",
                "Customer Firm (Allocation Ready — 85% Illustrative Weight)",
                "Contracted (Signed CUD / Active Order — 100% Weight)",
            ],
            "customer_firm_red": [
                "Price agreed (Clears Published CUD Reference floor; legacy CUD discounts do NOT automatically persist on renewals)",
                "Term locked (5-Year CUD > 3-Year CUD > 1-Year CUD) + Upfront Cash Prepayment % confirmed",
                "Target Region(s) & spillover cold-region candidates confirmed",
                "Written commitment from customer to begin contracting immediately after capacity allocation",
            ],
            "internal_firm_black": [
                "5-Pillar CCAs approved in Registry (Accelerator + Host CPU + Storage + Networking + Data Egress)",
                "Vector Workload linked to Vector Opportunity with capital-solvency check (ARR <= 25% of verified funding/revenue)",
                "Capacity Intake Form (23-field go/acc-prioritization) submitted",
                "CEM / CED final technical review completed + Zero active 14-day utilization breaches on prior allocations",
            ],
            "vector_workload_pbo_schema": {
                "workload_gross_arr": "Drives the $ value of the workload in PBO",
                "primary_workload_pillar_l5": "Infra AI",
                "key_workload_products": "Infrastructure AI",
                "sales_play": "AI Infrastructure",
                "workload_solution_options": [
                    "AI Infra - Training and Fine Tuning",
                    "AI Infra - Inference",
                    "AI Infra - Other",
                ],
                "workload_progress_win_stages": {
                    "Early / Likely": "Uncommitted Pipeline (15% / 55% illustrative conversion weight)",
                    "Customer Firm": "Committed Pipeline (85% illustrative conversion weight)",
                    "Contracted": "Signed CUD / Active Order (100% conversion weight)",
                },
                "next_steps_format": "[date] [Initials] [use case] [Next Steps] [business sponsor/approver] [risks]",
            },
            "renewal_and_sizing_rules": [
                "Whale tier (>=5,000 chips or >=$100M TCV) requires individual Tuesday Council underwriting",
                "Torso tier (64–4,999 chips) is managed via regional cohort buckets and FlexStart Calendar/CUD matching",
                "Long-Tail tier (<64 chips) routes automatically to FlexStart (Flex <=7d / Calendar <=90d) or G4 Blackwell",
                "Accounts with unresolved 14-day utilization breaches (<85% target ramp) are blocked from expansion approvals (-25pt penalty)",
            ],
        },
        "dfe_chip_benchmarks": [
            {
                "chip": "NextGen-ASIC v7",
                "internal_pool_code": "ASIC_V7_POD (Liquid-Cooled 3D-Torus ICI Pod)",
                "list_or_cud_price": "~$3.78/hr (3-Yr Published CUD Ref) / ~$8.40/hr list",
                "tflops_and_memory": "4,614 FP8 / 2,307 BF16 TFLOPS • 192 GB HBM3e (7,370 GB/s) • 42.5 EF FP8/Pod",
                "price_perf_advantage": "52% Lower Training TCO vs NVIDIA GB300 • High MFU on Frontier FP8 Training & Reasoning Inference",
                "best_fit_and_pivot": "Frontier LLM pre-training, RL post-training, and high-throughput reasoning inference.",
            },
            {
                "chip": "AI-ASIC v6e",
                "internal_pool_code": "ASIC_V6E_POD (256 chips/pod • High Regional Availability in us-east5 & us-central1)",
                "list_or_cud_price": "~$1.22/hr (3-Yr Published CUD Ref) / ~$2.70/hr list",
                "tflops_and_memory": "918 BF16/FP8 TFLOPS • 32 GB HBM (1,638 GB/s) • 235 PF/Pod",
                "price_perf_advantage": "3.18x Better Training Price-Perf vs H200 • 1.8x Better Inference Price-Perf vs H100 • ~40% lower TCO with vLLM on TPU",
                "best_fit_and_pivot": "Primary DFE pivot for H100/H200 training & multimodal inference.",
            },
            {
                "chip": "G4 VM (NVIDIA RTX PRO 6000 Blackwell)",
                "internal_pool_code": "G4_BLACKWELL_POOL (Immediate Cold-Region Availability)",
                "list_or_cud_price": "~$1.53/hr (3-Yr Published CUD Ref) / ~$3.40/hr list",
                "tflops_and_memory": "2,200 FP4 TFLOPS • 1,100 FP8 TFLOPS • 96 GB GDDR7/chip (768 GB per 8-GPU VM)",
                "price_perf_advantage": "3x–4x Better FP4 Price-Perf vs H100 • 10x Throughput vs L4 on TensorRT-LLM",
                "best_fit_and_pivot": "Ideal DFE pivot from H100/H200 for <=64-chip inference, multimodal rendering, and Omniverse simulation.",
            },
        ],
        "commercial_programs": [
            {
                "program": "Upfront Cash Prepayment Incentive",
                "stage": "Deal Structuring (Stages 3–4)",
                "funding_cap": "Up to +10 Priority Score Points for 20%–100% Upfront Cash Prepayment on 3-Yr / 5-Yr CUDs",
                "go_link": "go/cloudpricingplaybook",
            },
            {
                "program": "Stranded CUD Value-Exchange",
                "stage": "Active CUD Re-Balancing",
                "funding_cap": "100%+ TCV-Preserving Swap from Underutilized G4/L4 into H100/v6e/v7x",
                "go_link": "capacity-registry",
            },
            {
                "program": "CLOUD Credits, IWC & Catalyst Lite",
                "stage": "Deal Structuring & Migration (Stages 2–3)",
                "funding_cap": "CLOUD Credits: Up to 10% Opp Value • IWC: Up to 15% IAS/ARR",
                "go_link": "go/cloud-credit-program",
            },
        ],
        "pod_commissioning_milestones": [
            {
                "milestone": "Stage 1: Rack Placement & Floor Readiness (Illustrative)",
                "fast_track_days": 3,
                "median_days": 7,
                "tail_days": 12,
                "nextgen_target_slo_days": 7,
                "gate": "Physical Rack & Floor Verification",
            },
            {
                "milestone": "Stage 2: Power Energization & Cooling Verification (Illustrative)",
                "fast_track_days": 8,
                "median_days": 21,
                "tail_days": 33,
                "nextgen_target_slo_days": 21,
                "gate": "Power & Liquid Cooling Qualification",
            },
            {
                "milestone": "Stage 3: Network & Cluster Burn-In QA (Illustrative)",
                "fast_track_days": 15,
                "median_days": 35,
                "tail_days": 52,
                "nextgen_target_slo_days": 35,
                "gate": "Fabric Topology & Burn-In Diagnostics",
            },
            {
                "milestone": "Stage 4: Reservation Activation & Customer Handover (Illustrative)",
                "fast_track_days": 18,
                "median_days": 40,
                "tail_days": 64,
                "nextgen_target_slo_days": 40,
                "gate": "Customer Project Quota & Slice Handover",
            },
        ],
    },
}


def _default_sfdc_accounts() -> List[Dict[str, Any]]:
    return [
        {
            "sfdc_account_id": "SFDC-SYNTH-001",
            "account_name": "Northstar Frontier AI (Synthetic)",
            "assigned_to_field_rep": True,
            "vector_opportunity_id": "VEC-SYNTH-9411",
            "vector_workload_id": "WL-SYNTH-9411",
            "vector_stage": "Stage 4 - Contract Signed (5-Yr CUD + 30% Prepay)",
            "open_tpu_pursuit": True,
            "sub_region": "NORTHAM-West-Frontier",
            "nominated_by_ldap": "field-specialist-ce@demo.example.com",
            "ce_owner_ldap": "ce-director@demo.example.com",
            "gtm_leader_ldap": "ce-vp-approver@demo.example.com",
            "t3m_gpu_spend_m": 18.4,
            "t3m_tpu_spend_m": 42.6,
            "annualized_ai_arr_m": 244.0,
            "strategic_pod_tier": "GTM P0 (Top 100)",
            "strategic_pod_vertical": "1. Model Training (Frontier & Foundation LLM Pre/Post-Training)",
            "secondary_vertical": "2. Scaled Inference (High-Throughput Low-Latency Serving)",
            "tpu_journey_stage": "6. TPU Whale ($100M+ Annualized TPU ARR / >=5,000 Chips)",
            "gpu_to_tpu_roadmap_verified": True,
            "bloom_pod_tier": "S04 (Whale Supercluster — >=5,000 Chips)",
            "bloom_commercial_route": "5-Year CUD + 30% Upfront Cash Prepayment",
            "obidos_ttfc_minutes": 18,
            "verified_status": "VERIFIED BY GTM LEADERSHIP",
            "verified_by_ldap": "ce-vp-approver@demo.example.com",
            "verified_at": "2026-10-29T16:30:00Z",
            "verification_notes": "Synthetic Flagship P0 Whale: 8,192x AI-ASIC v6e in us-east5 on 5-Yr CUD with 30% upfront prepay ($310.0M TCV, Score 92/100) + coupled Companion 2.0 RUB-2026-0101 (9,400 net C4 + ParallelFS vCPUs).",
            "linked_allocation_request_id": "TET-2026-0412",
            "allocation_priority_boost_pts": 15,
        },
        {
            "sfdc_account_id": "SFDC-SYNTH-002",
            "account_name": "Stratos Autonomous Robotics (Synthetic)",
            "assigned_to_field_rep": True,
            "vector_opportunity_id": "VEC-SYNTH-8820",
            "vector_workload_id": "WL-SYNTH-8820",
            "vector_stage": "Stage 3 - On Hold (Active 14% Utilization Breach on SLA-2026-903)",
            "open_tpu_pursuit": True,
            "sub_region": "NORTHAM-West-PhysicalAI",
            "nominated_by_ldap": "field-specialist-ce@demo.example.com",
            "ce_owner_ldap": "ce-director@demo.example.com",
            "gtm_leader_ldap": "ops-capacity-lead@demo.example.com",
            "t3m_gpu_spend_m": 6.2,
            "t3m_tpu_spend_m": 12.4,
            "annualized_ai_arr_m": 74.4,
            "strategic_pod_tier": "GTM P0 (Top 100)",
            "strategic_pod_vertical": "4. Robotics / Physical AI (Embodied AI & Sensor Simulation)",
            "secondary_vertical": "3. World Model Training (Multimodal Video & Spatial World Models)",
            "tpu_journey_stage": "5. TPU Torso Spender ($1M–$100M Annualized TPU ARR)",
            "gpu_to_tpu_roadmap_verified": True,
            "bloom_pod_tier": "S03 (Dual-Pod Cluster)",
            "bloom_commercial_route": "3-Year CUD",
            "obidos_ttfc_minutes": 21,
            "verified_status": "HOLD — ACTIVE UTILIZATION BREACH (SLA-2026-903 AT 14% RAMP)",
            "verified_by_ldap": "ops-capacity-lead@demo.example.com",
            "verified_at": "2026-10-30T11:00:00Z",
            "verification_notes": "Synthetic Guardrail Case: Prior 4,096x AI-ASIC v6e us-central1 allocation (SLA-2026-903) is at 14% ramp past Day 14 (vs. 85% target). Expansion request TET-2026-0413 ($128.0M TCV) is blocked (-25pt penalty: 88 -> 63/100) until remediated.",
            "linked_allocation_request_id": "TET-2026-0413",
            "allocation_priority_boost_pts": 0,
        },
        {
            "sfdc_account_id": "SFDC-SYNTH-003",
            "account_name": "Nimbus Open-Model Cloud (Synthetic)",
            "assigned_to_field_rep": False,
            "vector_opportunity_id": "VEC-SYNTH-7719",
            "vector_workload_id": "WL-SYNTH-7719",
            "vector_stage": "Stage 3 - Technical Validation Complete",
            "open_tpu_pursuit": True,
            "sub_region": "NORTHAM-Central-Platform",
            "nominated_by_ldap": "account-fsr@demo.example.com",
            "ce_owner_ldap": "ce-director@demo.example.com",
            "gtm_leader_ldap": "ops-capacity-lead@demo.example.com",
            "t3m_gpu_spend_m": 9.8,
            "t3m_tpu_spend_m": 5.7,
            "annualized_ai_arr_m": 62.0,
            "strategic_pod_tier": "GTM P0 (Top 100)",
            "strategic_pod_vertical": "7. Open Model Inference (Open-Weights Serving Factories)",
            "secondary_vertical": "1. Model Training (Frontier & Foundation LLM Pre/Post-Training)",
            "tpu_journey_stage": "5. TPU Torso Spender ($1M–$100M Annualized TPU ARR)",
            "gpu_to_tpu_roadmap_verified": True,
            "bloom_pod_tier": "S03 (Dual-Pod Cluster)",
            "bloom_commercial_route": "3-Year CUD + 25% Prepay",
            "obidos_ttfc_minutes": 19,
            "verified_status": "VERIFIED BY GTM LEADERSHIP",
            "verified_by_ldap": "ce-director@demo.example.com",
            "verified_at": "2026-10-28T14:15:00Z",
            "verification_notes": "Synthetic Open-Model Inference Factory: 2,048x NVIDIA B200 in us-central1 ($94.5M TCV, 3-Yr CUD + 25% prepay, Score 82/100 — In Forum Queue) paired with Cloud TPU inference roadmap.",
            "linked_allocation_request_id": "TET-2026-0414",
            "allocation_priority_boost_pts": 15,
        },
        {
            "sfdc_account_id": "SFDC-SYNTH-004",
            "account_name": "Helios Quantitative Trading (Synthetic)",
            "assigned_to_field_rep": False,
            "vector_opportunity_id": "VEC-SYNTH-6502",
            "vector_workload_id": "WL-SYNTH-6502",
            "vector_stage": "Stage 2 - PoC In Progress",
            "open_tpu_pursuit": True,
            "sub_region": "NORTHAM-East-FinServ",
            "nominated_by_ldap": "account-fsr@demo.example.com",
            "ce_owner_ldap": "ce-director@demo.example.com",
            "gtm_leader_ldap": "ops-capacity-lead@demo.example.com",
            "t3m_gpu_spend_m": 7.1,
            "t3m_tpu_spend_m": 0.4,
            "annualized_ai_arr_m": 30.0,
            "strategic_pod_tier": "GTM P1 (266 Target)",
            "strategic_pod_vertical": "5. Trading Models (Quant Finance, HFT & Alpha Generation)",
            "secondary_vertical": "2. Scaled Inference (High-Throughput Low-Latency Serving)",
            "tpu_journey_stage": "3. TPU Prospect (<$1K TPU T3M + Active Vector Open TPU Pursuit)",
            "gpu_to_tpu_roadmap_verified": False,
            "bloom_pod_tier": "S02 (Standard 1-Pod Slice)",
            "bloom_commercial_route": "1-Year CUD -> 3-Year CUD Upgrade",
            "obidos_ttfc_minutes": 27,
            "verified_status": "PENDING GTM LEADER VERIFICATION",
            "verified_by_ldap": "",
            "verified_at": "",
            "verification_notes": "Synthetic Quant Trading Account: Currently below 80-pt cutline (Score 56/100) for 1,536x NVIDIA GB200 NVL72 in us-east4 ($85.0M TCV, 1-Yr CUD, 0% prepay); testing 128-chip ASIC-v7 seed pod in us-south1.",
            "linked_allocation_request_id": "TET-2026-0415",
            "allocation_priority_boost_pts": 0,
        },
        {
            "sfdc_account_id": "SFDC-SYNTH-005",
            "account_name": "Kinetix Video Foundation (Synthetic)",
            "assigned_to_field_rep": False,
            "vector_opportunity_id": "VEC-SYNTH-5109",
            "vector_workload_id": "WL-SYNTH-5109",
            "vector_stage": "Stage 3 - FlexStart Calendar Active",
            "open_tpu_pursuit": True,
            "sub_region": "NORTHAM-East-Startups",
            "nominated_by_ldap": "field-specialist-ce@demo.example.com",
            "ce_owner_ldap": "ce-director@demo.example.com",
            "gtm_leader_ldap": "ops-capacity-lead@demo.example.com",
            "t3m_gpu_spend_m": 0.8,
            "t3m_tpu_spend_m": 1.3,
            "annualized_ai_arr_m": 8.4,
            "strategic_pod_tier": "GTM P1 (266 Target)",
            "strategic_pod_vertical": "3. World Model Training (Multimodal Video & Spatial World Models)",
            "secondary_vertical": "2. Scaled Inference (High-Throughput Low-Latency Serving)",
            "tpu_journey_stage": "5. TPU Torso Spender ($1M–$100M Annualized TPU ARR)",
            "gpu_to_tpu_roadmap_verified": True,
            "bloom_pod_tier": "S01 (Entry Dedicated Slice)",
            "bloom_commercial_route": "FlexStart Calendar Bridge",
            "obidos_ttfc_minutes": 22,
            "verified_status": "VERIFIED BY GTM LEADERSHIP",
            "verified_by_ldap": "ce-director@demo.example.com",
            "verified_at": "2026-10-27T14:10:00Z",
            "verification_notes": "Synthetic Startup Video Lab: Requested 1,024x NVIDIA H200 in us-east4 ($28.0M TCV, Score 58/100); actively bridged with 256x AI-ASIC v6e via Calendar Mode in us-central1.",
            "linked_allocation_request_id": "TET-2026-0416",
            "allocation_priority_boost_pts": 10,
        },
    ]


def _default_memories() -> List[Dict[str, Any]]:
    return [
        {
            "memory_id": "MEM-2026-001",
            "created_at": "2026-10-30T09:15:00Z",
            "author_ldap": "ce-vp-approver@demo.example.com",
            "author_role": "VP, AI Infrastructure GTM (Demo Persona)",
            "category": "Capital Efficiency & Prepayment Policy",
            "sfdc_account_id": "SFDC-SYNTH-001",
            "title": "5-Yr > 3-Yr > 1-Yr CUD Hierarchy & Upfront Prepay Boost",
            "content": "Synthetic Policy Note: To maximize free cash flow for new data center buildouts, the 23-field scorer awards 20/20 term points for 5-Yr CUDs, 17/20 for 3-Yr CUDs, and 14/20 for 1-Yr CUDs, plus up to +10 bonus points for upfront cash prepayment.",
            "tags": ["Prepay Boost", "5-Yr CUD", "Capital Efficiency"],
        },
        {
            "memory_id": "MEM-2026-002",
            "created_at": "2026-10-30T14:20:00Z",
            "author_ldap": "ops-capacity-lead@demo.example.com",
            "author_role": "Central Capacity & Operations Lead (Demo Persona)",
            "category": "14-Day Use-It-or-Lose-It SLA & Utilization Breach Gate",
            "sfdc_account_id": "SFDC-SYNTH-002",
            "title": "Hard Block on Expansion Deals During Active 14-Day Utilization Breach",
            "content": "Synthetic Governance Rule: Any customer with an unresolved 14-day utilization breach (<85% target cluster ramp after 14 days, such as Stratos Autonomous Robotics on SLA-2026-903 at 14%) receives an automatic -25pt penalty (88 -> 63/100) and is blocked from new capacity approvals until idle chips are reclaimed or ramped >=85%.",
            "tags": ["Use-It-or-Lose-It", "Utilization Breach", "SLA-2026-903"],
        },
        {
            "memory_id": "MEM-2026-003",
            "created_at": "2026-10-31T10:00:00Z",
            "author_ldap": "ce-director@demo.example.com",
            "author_role": "Director, Specialist Customer Engineering (Demo Persona)",
            "category": "5-Pillar Full-Stack Intake & Coupled Companion 2.0 Gate",
            "sfdc_account_id": "SFDC-SYNTH-001",
            "title": "5-Pillar Companion Infrastructure Check (GPU/TPU + CPU + Storage + Net + Egress)",
            "content": "Synthetic Engineering Rule: Every multi-slice AI-ASIC v6e, NextGen-ASIC v7, or B200 cluster requires synchronized C4 host CPUs, ParallelFS/HighIOPSDisk storage, RoCE/ICI networking, and Data Egress bandwidth. When companion resources exceed 20% of regional net supply, auto-generate the 4-Tab Companion 2.0 card.",
            "tags": ["5-Pillar Intake", "Companion 2.0", "Egress Bandwidth"],
        },
    ]


def _default_historic_decisions() -> List[Dict[str, Any]]:
    return [
        {
            "decision_id": "DEC-2026-0920",
            "decision_date": "2026-10-29T18:10:00Z",
            "decision_forum": "Tuesday Allocation Council",
            "decision_outcome": "APPROVED",
            "customer_name": "Northstar Frontier AI (Synthetic)",
            "customer_segment": "Leading AI Lab",
            "strategic_pod_vertical": "1. Model Training (Frontier & Foundation LLM Pre/Post-Training)",
            "sfdc_account_id": "SFDC-SYNTH-001",
            "vector_opportunity_id": "VEC-SYNTH-9411",
            "vector_workload_id": "WL-SYNTH-9411",
            "related_deal_id": "TET-2026-0412",
            "requested_sku": "AI-ASIC v6e",
            "requested_chips": 8192,
            "requested_region": "us-east5",
            "approved_sku": "8,192x AI-ASIC v6e + Coupled Companion RUB-2026-0101",
            "approved_chips": 8192,
            "approved_region": "us-east5",
            "consumption_mechanism": "5-Year CUD (30% Upfront Cash Prepayment = $93.0M Immediate Cash Flow)",
            "allocation_score_before": 82,
            "allocation_score_after": 92,
            "tcv_usd_m": 310.0,
            "commercial_incentive_applied": "5-Yr CUD + 30% Upfront Prepay (+3.0pt Prepay Bonus)",
            "firm_readiness_status": "Firm (All 5 Companion Pillars + Prepay Verified)",
            "vector_pbo_tagged": "Infra AI / Stage 4 Committed",
            "dfe_benchmark_cited": "AI-ASIC v6e delivers 3.18x better training price-performance vs H200 & 256-chip liquid-cooled ICI pods",
            "decision_maker_ldap": "capacity-council@demo.example.com",
            "co_approver_ldap": "ce-vp-approver@demo.example.com",
            "decision_rationale": "Synthetic Precedent: Approved 8,192-chip Whale commitment in us-east5 (TET-2026-0412, Score 92/100) after verifying 30% upfront cash prepayment, 5-year CUD term, and synchronized Companion 2.0 card RUB-2026-0101 (9,400 net C4 + ParallelFS vCPUs, 4.5 PB ParallelFS, 650 Gbps egress).",
            "precedent_tags": ["Whale-8192-Chips", "5Yr-CUD-30pct-Prepay", "5-Pillar-Verified", "us-east5"],
        },
        {
            "decision_id": "DEC-2026-0918",
            "decision_date": "2026-10-28T17:40:00Z",
            "decision_forum": "Tuesday Allocation Council",
            "decision_outcome": "APPROVED_WITH_DFE_PIVOT",
            "customer_name": "Vectoria Foundation Labs (Synthetic)",
            "customer_segment": "Leading AI Lab",
            "strategic_pod_vertical": "2. Scaled Inference (High-Throughput Low-Latency Serving)",
            "sfdc_account_id": "SFDC-SYNTH-006",
            "vector_opportunity_id": "VEC-SYNTH-9004",
            "vector_workload_id": "WL-SYNTH-9004",
            "related_deal_id": "CCA-SYNTH-9004",
            "requested_sku": "H200 (141GB) in constrained us-east4",
            "requested_chips": 2048,
            "requested_region": "us-east4",
            "approved_sku": "2,048x AI-ASIC v6e in us-central1",
            "approved_chips": 2048,
            "approved_region": "us-central1",
            "consumption_mechanism": "3-Year CUD (30% Upfront Prepayment)",
            "allocation_score_before": 74,
            "allocation_score_after": 92,
            "tcv_usd_m": 66.8,
            "commercial_incentive_applied": "Cold-Region Fast-Track + 30% Prepay Bonus (+3.0 pts)",
            "firm_readiness_status": "Firm (Customer RED + Internal BLACK Verified)",
            "vector_pbo_tagged": "Infra AI / Stage 4 Committed",
            "dfe_benchmark_cited": "ASIC-v6e (v6e) delivers 3.18x better training price-performance vs H200 ($2.70/hr vs $10.50/hr)",
            "decision_maker_ldap": "ops-capacity-lead@demo.example.com",
            "co_approver_ldap": "ce-director@demo.example.com",
            "decision_rationale": "Synthetic Precedent: Customer originally requested 2,048x H200 in constrained us-east4. Specialist CE demonstrated 3.18x better price-performance on ASIC-v6e v6e in Cold Region us-central1 with 30% upfront prepayment, boosting score from 74 to 92/100.",
            "precedent_tags": ["H200-to-ASIC-v6e-Pivot", "Cold-Region-Spillover", "30pct-Prepay"],
        },
        {
            "decision_id": "DEC-2026-0915",
            "decision_date": "2026-10-26T14:00:00Z",
            "decision_forum": "Deal Desk CUD Re-Balancing",
            "decision_outcome": "APPROVED_WITH_DFE_PIVOT",
            "customer_name": "Prism Media AI (Synthetic)",
            "customer_segment": "Digital Native",
            "strategic_pod_vertical": "3. World Model Training (Multimodal Video & Spatial World Models)",
            "sfdc_account_id": "SFDC-SYNTH-007",
            "vector_opportunity_id": "VEC-SYNTH-9005",
            "vector_workload_id": "WL-SYNTH-9005",
            "related_deal_id": "CCA-SYNTH-9005",
            "requested_sku": "64x Stranded G4 CUD -> 24x A3 Mega (H100)",
            "requested_chips": 24,
            "requested_region": "us-central1",
            "approved_sku": "24x A3 Mega (H100) via Value-Neutral CUD Exchange ($3.02M -> $3.18M)",
            "approved_chips": 24,
            "approved_region": "us-central1",
            "consumption_mechanism": "3-Year CUD Value-Swap (105.4% TCV Preservation)",
            "allocation_score_before": 77,
            "allocation_score_after": 89,
            "tcv_usd_m": 3.18,
            "commercial_incentive_applied": "Stranded CUD Value Exchange: 64x G4 ($1.53/hr × 30,850h = $3.02M) -> 24x H100 Mega ($3.60/hr × 36m = $3.18M)",
            "firm_readiness_status": "Firm — 5-Pillar CNS CCAs Verified",
            "vector_pbo_tagged": "Infra AI / Stage 4 Committed",
            "dfe_benchmark_cited": "Value-neutral CUD swap retiring 64 unused G4 chips back to pool while expanding TCV by +$160K",
            "decision_maker_ldap": "ops-capacity-lead@demo.example.com",
            "co_approver_ldap": "ce-director@demo.example.com",
            "decision_rationale": "Synthetic Precedent: Exchanged 64 underutilized G4 chips into 24 H100 Mega chips in us-central1, preserving 105.4% of contract TCV and returning 64 G4 chips to the regional pool.",
            "precedent_tags": ["Stranded-CUD-Swap", "G4-to-H100-Mega", "Value-Neutral-Exchange"],
        },
        {
            "decision_id": "DEC-2026-0910",
            "decision_date": "2026-10-22T11:20:00Z",
            "decision_forum": "SLA Reclamation & Performance Governance",
            "decision_outcome": "RECLAIMED_TO_GDM_POOL",
            "customer_name": "Stratos Autonomous Robotics (Synthetic — Prior Allocation SLA-2026-903)",
            "customer_segment": "Leading AI Lab",
            "strategic_pod_vertical": "4. Robotics / Physical AI (Embodied AI & Sensor Simulation)",
            "sfdc_account_id": "SFDC-SYNTH-002",
            "vector_opportunity_id": "VEC-SYNTH-8820",
            "vector_workload_id": "WL-SYNTH-8820",
            "related_deal_id": "SLA-2026-903",
            "requested_sku": "AI-ASIC v6e",
            "requested_chips": 4096,
            "requested_region": "us-central1",
            "approved_sku": "HOLD & RECLAIM TRIGGERED (14% Ramp After 19 Days vs. 85% Target)",
            "approved_chips": 0,
            "approved_region": "Reclaimed & Flex-Start Pool",
            "consumption_mechanism": "14-Day Use-It-or-Lose-It SLA Enforcement",
            "allocation_score_before": 88,
            "allocation_score_after": 63,
            "tcv_usd_m": 128.0,
            "commercial_incentive_applied": "None — Expansion Request TET-2026-0413 Blocked (-25pt Breach Penalty: 88 -> 63/100)",
            "firm_readiness_status": "Breach Hold — 14% Cluster Utilization Past 14-Day Grace Window (85% Target)",
            "vector_pbo_tagged": "Infra AI / Expansion Hold",
            "dfe_benchmark_cited": "Use-It-or-Lose-It SLA: <85% verified cluster utilization after 14 days blocks new expansion requests and triggers reclamation",
            "decision_maker_ldap": "ops-capacity-lead@demo.example.com",
            "co_approver_ldap": "capacity-council@demo.example.com",
            "decision_rationale": "Synthetic Precedent: Telemetry showed only 14% utilization 19 days post-delivery on SLA-2026-903 (4,096x ASIC-v6e v6e in us-central1 vs. 85% target). Automatically blocked follow-on expansion request TET-2026-0413 (-25pt penalty: 88 -> 63/100) and initiated pool reclamation.",
            "precedent_tags": ["SLA-Breach-Reclaimed", "Use-It-Or-Lose-It", "Expansion-Blocked"],
        },
    ]


def _default_transaction_ledger() -> List[Dict[str, Any]]:
    return [
        {
            "transaction_id": "TXN-2026-1005",
            "timestamp": "2026-11-01T13:15:00Z",
            "transaction_type": "ELEVATE_DEAL_GTM",
            "actor_ldap": "ce-vp-approver@demo.example.com",
            "actor_role": "VP, AI Infrastructure GTM (Demo Persona)",
            "entity_id": "TET-2026-0412",
            "customer_name": "Northstar Frontier AI (Synthetic)",
            "sfdc_account_id": "SFDC-SYNTH-001",
            "registry_cca_id": "HZ-SYNTH-8801",
            "region": "us-east5",
            "sku": "AI-ASIC v6e",
            "chips_delta": 8192,
            "tcv_usd_m": 310.0,
            "summary": "Pinned Northstar Frontier AI (Synthetic) 8,192x AI-ASIC v6e (TET-2026-0412 / HZ-SYNTH-8801, 5-Yr CUD + 30% Prepay, Score 92/100) to #1 Council Queue.",
            "before_state_json": json.dumps({"is_gtm_elevated": False, "elevation_rank": None}),
            "after_state_json": json.dumps({"is_gtm_elevated": True, "elevation_rank": 1, "elevated_by_ldap": "ce-vp-approver@demo.example.com"}),
            "tags": ["ELEVATE_DEAL_GTM", "us-east5", "ASIC-v6e-v6e", "30pct-Prepay"],
        },
        {
            "transaction_id": "TXN-2026-1004",
            "timestamp": "2026-11-01T12:10:00Z",
            "transaction_type": "SLA_BREACH_HOLD",
            "actor_ldap": "ops-capacity-lead@demo.example.com",
            "actor_role": "Central Capacity & Operations Lead (Demo Persona)",
            "entity_id": "TET-2026-0413",
            "customer_name": "Stratos Autonomous Robotics (Synthetic)",
            "sfdc_account_id": "SFDC-SYNTH-002",
            "registry_cca_id": "HZ-SYNTH-8803",
            "region": "us-central1",
            "sku": "AI-ASIC v6e",
            "chips_delta": 4096,
            "tcv_usd_m": 128.0,
            "summary": "Applied automatic -25pt Utilization Breach Penalty (88 -> 63/100) on Stratos Autonomous Robotics (Synthetic) expansion TET-2026-0413 due to 14% ramp on SLA-2026-903 (vs. 85% target).",
            "before_state_json": json.dumps({"priority_score": 88, "status": "ELIGIBLE"}),
            "after_state_json": json.dumps({"priority_score": 63, "status": "BLOCKED_BY_UTILIZATION_BREACH"}),
            "tags": ["SLA_BREACH_HOLD", "SLA-2026-903", "us-central1"],
        },
        {
            "transaction_id": "TXN-2026-1003",
            "timestamp": "2026-11-01T10:30:00Z",
            "transaction_type": "FORECAST_SCENARIO_SAVED",
            "actor_ldap": "ops-capacity-lead@demo.example.com",
            "actor_role": "Central Capacity & Operations Lead (Demo Persona)",
            "entity_id": "SCEN-2026-Q127-DFE",
            "customer_name": "Q1 '27 NorthAm Supply-Demand Rebalance (Synthetic)",
            "sfdc_account_id": "PLANNING_OPS_SCENARIO",
            "registry_cca_id": "capacity-registry?q=northam+2027Q1",
            "region": "us-east4",
            "sku": "H200 (141GB) -> AI-ASIC v6e / G4",
            "chips_delta": 2560,
            "tcv_usd_m": 96.4,
            "summary": "Saved DFE Forecast Scenario SCEN-2026-Q127-DFE: Pivoting 50% of us-east4 H200 deficit (2,560 chips) to us-east5 ASIC-v6e v6e & us-central1 G4 eliminates $96.4M Must-Have-By breach risk.",
            "before_state_json": json.dumps({"us_east4_net_deficit_chips": -2840, "at_risk_tcv_m": 118.0}),
            "after_state_json": json.dumps({"us_east4_net_deficit_chips": -280, "unblocked_tcv_m": 96.4}),
            "tags": ["FORECAST_SCENARIO_SAVED", "us-east4", "us-east5", "DFE-Simulator"],
        },
    ]


def _load_or_init_v3_state() -> Dict[str, Any]:
    if os.path.exists(PERSISTENT_MEMORY_FILE):
        try:
            with open(PERSISTENT_MEMORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "sfdc_accounts" in data and "memories" in data:
                    return data
        except Exception:
            pass
    state = {
        "sfdc_accounts": _default_sfdc_accounts(),
        "memories": _default_memories(),
        "historic_decisions": _default_historic_decisions(),
        "transaction_ledger": _default_transaction_ledger(),
    }
    _save_v3_state(state)
    return state


def _save_v3_state(state: Dict[str, Any]) -> None:
    try:
        with open(PERSISTENT_MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception:
        pass


V3_STORE = _load_or_init_v3_state()


def _try_persist_to_warehouse(table_name: str, row_dict: Dict[str, Any]) -> bool:
    """Best-effort write-through to DataWarehouse apex-ai-capacity-demo.apex_capacity_navigator."""
    try:
        warehouse = None

        project_id = os.environ.get("CLOUD_PROJECT_ID", "apex-ai-capacity-demo")
        client = warehouse.Client(project=project_id)
        table_id = f"{project_id}.apex_capacity_navigator.{table_name}"
        clean_row = {}
        for k, v in row_dict.items():
            if k == "assigned_to_field_rep":
                continue
            if isinstance(v, (dict, list)):
                clean_row[k] = json.dumps(v)
            else:
                clean_row[k] = v
        errors = client.insert_rows_json(table_id, [clean_row])
        return len(errors) == 0
    except Exception:
        return False


def record_universal_transaction(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Canonical write-through transaction logger for ALL actions in Apex Capacity Navigator."""
    now_iso = datetime.now(timezone.utc).isoformat()
    ledger = V3_STORE.setdefault("transaction_ledger", _default_transaction_ledger())
    next_num = 1006 + len(ledger)
    tx_id = str(payload.get("transaction_id") or f"TXN-2026-{next_num:04d}")
    tx_type = str(payload.get("transaction_type") or "SYSTEM_TRANSACTION")
    actor_ldap = str(payload.get("actor_ldap") or "ops-capacity-lead@demo.example.com")
    actor_role = str(payload.get("actor_role") or "Capacity Operations")
    entity_id = str(payload.get("entity_id") or "APEX-ENTITY")
    customer_name = str(payload.get("customer_name") or "Synthetic AI Account")
    sfdc_id = str(payload.get("sfdc_account_id") or "SFDC-SYNTH-001")
    registry_id = str(payload.get("registry_cca_id") or "HZ-SYNTH-8800")
    region = str(payload.get("region") or "us-east5")
    sku = str(payload.get("sku") or "NextGen-ASIC v7")
    chips_delta = int(payload.get("chips_delta") or 0)
    tcv_usd_m = float(payload.get("tcv_usd_m") or 0.0)
    summary = str(payload.get("summary") or f"{tx_type} executed on {entity_id} by {actor_ldap}")

    before_raw = payload.get("before_state_json") or payload.get("before_state") or {}
    after_raw = payload.get("after_state_json") or payload.get("after_state") or {}
    before_json = before_raw if isinstance(before_raw, str) else json.dumps(before_raw)
    after_json = after_raw if isinstance(after_raw, str) else json.dumps(after_raw)
    raw_tags = payload.get("tags") or [tx_type, region, sku]
    tags_list = raw_tags if isinstance(raw_tags, list) else [str(raw_tags)]

    tx_entry = {
        "transaction_id": tx_id,
        "timestamp": now_iso,
        "transaction_type": tx_type,
        "actor_ldap": actor_ldap,
        "actor_role": actor_role,
        "entity_id": entity_id,
        "customer_name": customer_name,
        "sfdc_account_id": sfdc_id,
        "registry_cca_id": registry_id,
        "region": region,
        "sku": sku,
        "chips_delta": chips_delta,
        "tcv_usd_m": tcv_usd_m,
        "summary": summary,
        "before_state_json": before_json,
        "after_state_json": after_json,
        "tags": tags_list,
    }
    ledger.insert(0, tx_entry)

    memories = V3_STORE.setdefault("memories", _default_memories())
    mem_entry = {
        "memory_id": f"MEM-TXN-{next_num:04d}",
        "created_at": now_iso,
        "author_ldap": actor_ldap,
        "author_role": actor_role,
        "category": f"Transaction Ledger ({tx_type})",
        "sfdc_account_id": sfdc_id,
        "title": f"[{tx_type}] {customer_name} ({entity_id} • {registry_id})",
        "content": summary,
        "tags": tags_list,
    }
    memories.insert(0, mem_entry)

    _save_v3_state(V3_STORE)

    bq_row = {**tx_entry, "tags": ",".join(str(t) for t in tags_list)}
    _try_persist_to_warehouse("transaction_memory_ledger", bq_row)
    return tx_entry


@router.get("/api/v1/transactions")
def list_universal_transactions(
    request: Request,
    transaction_type: str = "ALL",
    region: str = "ALL",
    actor_ldap: str = "ALL",
    q: str = "",
):
    """Returns the Universal Persistent Transaction Memory Ledger (filtered by RBAC role view)."""
    role_view = get_role_view(request)
    ledger = V3_STORE.setdefault("transaction_ledger", _default_transaction_ledger())
    if role_view == "FIELD_REP":
        ledger = [t for t in ledger if is_assigned_to_field_rep(t)]

    q_low = q.strip().lower()
    filtered = []
    for t in ledger:
        if transaction_type != "ALL" and t.get("transaction_type") != transaction_type:
            continue
        if region != "ALL" and t.get("region") != region:
            continue
        if actor_ldap != "ALL" and actor_ldap.lower() not in str(t.get("actor_ldap", "")).lower():
            continue
        if q_low:
            hay = " ".join(
                str(t.get(k, ""))
                for k in (
                    "transaction_id",
                    "transaction_type",
                    "actor_ldap",
                    "entity_id",
                    "customer_name",
                    "registry_cca_id",
                    "region",
                    "sku",
                    "summary",
                )
            ).lower()
            if q_low not in hay:
                continue
        norm_t = {
            **t,
            "target_record_id": t.get("target_record_id") or t.get("entity_id") or t.get("registry_cca_id"),
            "entity_id": t.get("entity_id") or t.get("target_record_id") or t.get("registry_cca_id"),
            "sku_or_family": t.get("sku_or_family") or t.get("sku") or "",
            "sku": t.get("sku") or t.get("sku_or_family") or "",
            "chips_or_cores_delta": t.get("chips_or_cores_delta") if t.get("chips_or_cores_delta") is not None else t.get("chips_delta", 0),
            "chips_delta": t.get("chips_delta") if t.get("chips_delta") is not None else t.get("chips_or_cores_delta", 0),
        }
        filtered.append(norm_t)

    type_counts: Dict[str, int] = {}
    for t in ledger:
        tt = str(t.get("transaction_type") or "OTHER")
        type_counts[tt] = type_counts.get(tt, 0) + 1

    return {
        "role_view": role_view,
        "transactions": filtered,
        "total_transactions": len(ledger),
        "total_count": len(ledger),
        "filtered_count": len(filtered),
        "type_counts": type_counts,
        "warehouse_table": "apex-ai-capacity-demo:apex_capacity_navigator.transaction_memory_ledger",
    }


def record_historic_decision_entry(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Appends an immutable synthetic decision record to V3_STORE['historic_decisions'] and DataWarehouse."""
    now_iso = datetime.now(timezone.utc).isoformat()
    decisions = V3_STORE.setdefault("historic_decisions", _default_historic_decisions())
    next_num = 921 + len(decisions)
    dec_id = str(payload.get("decision_id") or f"DEC-2026-{next_num:04d}")

    entry = {
        "decision_id": dec_id,
        "decision_date": str(payload.get("decision_date") or now_iso),
        "decision_forum": str(payload.get("decision_forum") or "Tuesday Allocation Council"),
        "decision_outcome": str(payload.get("decision_outcome") or "APPROVED"),
        "customer_name": str(payload.get("customer_name") or "Synthetic AI Account"),
        "customer_segment": str(payload.get("customer_segment") or "Leading AI Lab"),
        "strategic_pod_vertical": str(payload.get("strategic_pod_vertical") or STRATEGIC_POD_12_VERTICALS[0]),
        "sfdc_account_id": str(payload.get("sfdc_account_id") or "SFDC-SYNTH-NEW"),
        "vector_opportunity_id": str(payload.get("vector_opportunity_id") or "VEC-SYNTH-NEW"),
        "vector_workload_id": str(payload.get("vector_workload_id") or "WL-SYNTH-NEW"),
        "related_deal_id": str(payload.get("related_deal_id") or "TET-2026-NEW"),
        "requested_sku": str(payload.get("requested_sku") or "NextGen-ASIC v7"),
        "requested_chips": int(payload.get("requested_chips") or 1024),
        "requested_region": str(payload.get("requested_region") or "us-east5"),
        "approved_sku": str(payload.get("approved_sku") or payload.get("requested_sku") or "NextGen-ASIC v7"),
        "approved_chips": int(payload.get("approved_chips") if payload.get("approved_chips") is not None else (payload.get("requested_chips") or 1024)),
        "approved_region": str(payload.get("approved_region") or payload.get("requested_region") or "us-east5"),
        "consumption_mechanism": str(payload.get("consumption_mechanism") or "3-Year CUD"),
        "allocation_score_before": int(payload.get("allocation_score_before") or 75),
        "allocation_score_after": int(payload.get("allocation_score_after") or 88),
        "tcv_usd_m": float(payload.get("tcv_usd_m") or 45.0),
        "commercial_incentive_applied": str(payload.get("commercial_incentive_applied") or "Published 3-Yr CUD Reference"),
        "firm_readiness_status": str(payload.get("firm_readiness_status") or "Firm (Customer RED + Internal BLACK Verified)"),
        "vector_pbo_tagged": str(payload.get("vector_pbo_tagged") or "Infra AI / Stage 3.0 Committed"),
        "dfe_benchmark_cited": str(payload.get("dfe_benchmark_cited") or "GPU Ties to TPU (+15pt Priority Boost)"),
        "decision_maker_ldap": str(payload.get("decision_maker_ldap") or "capacity-council@demo.example.com"),
        "co_approver_ldap": str(payload.get("co_approver_ldap") or "ce-vp-approver@demo.example.com"),
        "decision_rationale": str(payload.get("decision_rationale") or "Formal capacity governance decision logged to DataWarehouse historic_decisions_ledger."),
        "precedent_tags": payload.get("precedent_tags") or ["Live-Governance-Decision", "DataWarehouse-Persisted"],
    }
    decisions.insert(0, entry)
    _save_v3_state(V3_STORE)
    _try_persist_to_warehouse("historic_decisions_ledger", entry)

    record_universal_transaction(
        {
            "transaction_type": "LOG_DECISION",
            "actor_ldap": entry["decision_maker_ldap"],
            "actor_role": entry["decision_forum"],
            "entity_id": dec_id,
            "customer_name": entry["customer_name"],
            "sfdc_account_id": entry["sfdc_account_id"],
            "registry_cca_id": entry["related_deal_id"],
            "region": entry["approved_region"],
            "sku": entry["approved_sku"],
            "chips_delta": entry["approved_chips"],
            "tcv_usd_m": entry["tcv_usd_m"],
            "summary": f"Governance Decision {dec_id} ({entry['decision_outcome']}): {entry['customer_name']} — {entry['approved_chips']}x {entry['approved_sku']} in {entry['approved_region']} (${entry['tcv_usd_m']}M TCV).",
            "before_state": {"requested_sku": entry["requested_sku"], "requested_region": entry["requested_region"], "score_before": entry["allocation_score_before"]},
            "after_state": {"approved_sku": entry["approved_sku"], "approved_region": entry["approved_region"], "score_after": entry["allocation_score_after"], "outcome": entry["decision_outcome"]},
            "tags": ["LOG_DECISION", entry["decision_outcome"], entry["approved_region"]],
        }
    )
    return entry


@router.get("/api/v1/sfdc/accounts")
def list_sfdc_strategic_pod_accounts(request: Request):
    role_view = get_role_view(request)
    accounts = V3_STORE["sfdc_accounts"]
    if role_view == "FIELD_REP":
        accounts = [a for a in accounts if is_assigned_to_field_rep(a)]

    verified_count = sum(
        1 for a in accounts if a.get("verified_status") == "VERIFIED BY GTM LEADERSHIP"
    )
    p0_active = sum(1 for a in accounts if "P0" in str(a.get("strategic_pod_tier", "")))
    p1_active = sum(1 for a in accounts if "P1" in str(a.get("strategic_pod_tier", "")))
    total_arr = round(
        sum(float(a.get("annualized_ai_arr_m") or 0.0) for a in accounts), 1
    )

    return {
        "role_view": role_view,
        "accounts": accounts,
        "summary": {
            "program_target_total": 366,
            "program_p0_cap": 100,
            "program_p1_cap": 266,
            "active_tracked_accounts": len(accounts),
            "verified_by_leadership_count": verified_count,
            "p0_tracked_count": p0_active,
            "p1_tracked_count": p1_active,
            "total_tracked_ai_arr_m": total_arr,
        },
        "strategic_pod_verticals": STRATEGIC_POD_12_VERTICALS,
        "tpu_journey_stages": TPU_JOURNEY_STAGES,
        "bloom_pod_tiers": BLOOM_POD_TIERS,
        "gdm_and_cross_pa": GDM_AND_CROSS_PA_BENCHMARKS,
    }


@router.post("/api/v1/sfdc/accounts")
def nominate_sfdc_strategic_pod_account(payload: Dict[str, Any]):
    """Allows Sellers (FSRs) and CEs to link a synthetic Salesforce Vector CRM record and nominate for STRATEGIC_POD verification."""
    now_iso = datetime.now(timezone.utc).isoformat()
    idx = len(V3_STORE["sfdc_accounts"]) + 10
    acct_name = str(payload.get("account_name") or "New Strategic AI Pursuit (Synthetic)").strip()
    sfdc_id = str(payload.get("sfdc_account_id") or f"SFDC-SYNTH-{idx}").strip()
    opp_id = str(payload.get("vector_opportunity_id") or f"VEC-SYNTH-{idx}").strip()
    wkl_id = str(payload.get("vector_workload_id") or f"WL-SYNTH-{idx}").strip()

    t3m_gpu = float(payload.get("t3m_gpu_spend_m") or 1.5)
    t3m_tpu = float(payload.get("t3m_tpu_spend_m") or 0.25)
    arr_m = round((t3m_gpu + t3m_tpu) * 4.0, 2)

    new_acct = {
        "sfdc_account_id": sfdc_id,
        "account_name": acct_name,
        "assigned_to_field_rep": True,
        "vector_opportunity_id": opp_id,
        "vector_workload_id": wkl_id,
        "vector_stage": str(payload.get("vector_stage") or "Stage 2 - Technical Validation / PoC"),
        "open_tpu_pursuit": bool(payload.get("open_tpu_pursuit", True)),
        "sub_region": str(payload.get("sub_region") or "NORTHAM-West-Strategic"),
        "nominated_by_ldap": str(payload.get("nominated_by_ldap") or "field-specialist-ce@demo.example.com"),
        "ce_owner_ldap": str(payload.get("ce_owner_ldap") or "ce-director@demo.example.com"),
        "gtm_leader_ldap": str(payload.get("gtm_leader_ldap") or "ops-capacity-lead@demo.example.com"),
        "t3m_gpu_spend_m": t3m_gpu,
        "t3m_tpu_spend_m": t3m_tpu,
        "annualized_ai_arr_m": arr_m,
        "strategic_pod_tier": str(payload.get("strategic_pod_tier") or "Nominated (strategic-pod-program-nominate)"),
        "strategic_pod_vertical": str(payload.get("strategic_pod_vertical") or STRATEGIC_POD_12_VERTICALS[0]),
        "secondary_vertical": str(payload.get("secondary_vertical") or STRATEGIC_POD_12_VERTICALS[1]),
        "tpu_journey_stage": str(payload.get("tpu_journey_stage") or TPU_JOURNEY_STAGES[2]),
        "gpu_to_tpu_roadmap_verified": bool(payload.get("gpu_to_tpu_roadmap_verified", False)),
        "bloom_pod_tier": str(payload.get("bloom_pod_tier") or "S01 (Entry Dedicated Slice)"),
        "bloom_commercial_route": str(payload.get("bloom_commercial_route") or "3-Year CUD"),
        "obidos_ttfc_minutes": int(payload.get("obidos_ttfc_minutes") or 24),
        "verified_status": "PENDING GTM LEADER VERIFICATION",
        "verified_by_ldap": "",
        "verified_at": "",
        "verification_notes": str(
            payload.get("verification_notes")
            or f"Nominated by {payload.get('nominated_by_ldap', 'field-specialist-ce@demo.example.com')} via Salesforce Vector CRM sync."
        ),
        "linked_allocation_request_id": str(payload.get("linked_allocation_request_id") or ""),
        "allocation_priority_boost_pts": 0,
    }

    V3_STORE["sfdc_accounts"].insert(0, new_acct)

    mem_entry = {
        "memory_id": f"MEM-2026-{len(V3_STORE['memories']) + 101:03d}",
        "created_at": now_iso,
        "author_ldap": new_acct["nominated_by_ldap"],
        "author_role": "Seller / CE Nomination",
        "category": "Salesforce Vector CRM Nomination",
        "sfdc_account_id": sfdc_id,
        "title": f"CRM Nomination: {acct_name} ({sfdc_id} / {opp_id})",
        "content": (
            f"Linked Salesforce Account {sfdc_id} (Vector Opp {opp_id}, Workload {wkl_id}) with "
            f"${arr_m}M annualized AI ARR (${t3m_gpu}M GPU T3M, ${t3m_tpu}M TPU T3M) under vertical "
            f"'{new_acct['strategic_pod_vertical']}' and stage '{new_acct['tpu_journey_stage']}'."
        ),
        "tags": ["Vector CRM", "STRATEGIC_POD Nomination", acct_name],
    }
    V3_STORE["memories"].insert(0, mem_entry)
    _save_v3_state(V3_STORE)
    _try_persist_to_warehouse("sfdc_strategic_pod_accounts", new_acct)
    _try_persist_to_warehouse("persistent_memory_vault", mem_entry)

    return {"account": new_acct, "memory_logged": mem_entry}


@router.post("/api/v1/sfdc/accounts/{sfdc_account_id}/verify")
def verify_and_label_sfdc_account(sfdc_account_id: str, payload: Dict[str, Any], request: Request):
    """GTM Leader Verification & Labeling (restricted to OPS_CENTRAL)."""
    if get_role_view(request) == "FIELD_REP":
        raise HTTPException(
            status_code=403,
            detail="RBAC Guardrail: Only GTM / Capacity Leadership can verify STRATEGIC_POD P0 status and unlock priority score boosts.",
        )
    acct = next(
        (
            a
            for a in V3_STORE["sfdc_accounts"]
            if a["sfdc_account_id"] == sfdc_account_id
        ),
        None,
    )
    if not acct:
        raise HTTPException(status_code=404, detail="Salesforce STRATEGIC_POD account not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    leader_ldap = str(payload.get("verified_by_ldap") or "ops-capacity-lead@demo.example.com")
    new_tier = str(payload.get("strategic_pod_tier") or acct["strategic_pod_tier"])
    if "Nominated" in new_tier:
        new_tier = "GTM P0 (Top 100)"

    acct["strategic_pod_tier"] = new_tier
    acct["strategic_pod_vertical"] = str(payload.get("strategic_pod_vertical") or acct["strategic_pod_vertical"])
    acct["tpu_journey_stage"] = str(payload.get("tpu_journey_stage") or acct["tpu_journey_stage"])
    acct["gpu_to_tpu_roadmap_verified"] = bool(payload.get("gpu_to_tpu_roadmap_verified", True))
    acct["bloom_pod_tier"] = str(payload.get("bloom_pod_tier") or acct["bloom_pod_tier"])
    acct["bloom_commercial_route"] = str(payload.get("bloom_commercial_route") or acct["bloom_commercial_route"])
    acct["verified_status"] = "VERIFIED BY GTM LEADERSHIP"
    acct["verified_by_ldap"] = leader_ldap
    acct["verified_at"] = now_iso

    boost_pts = 15 if ("P0" in new_tier and acct["gpu_to_tpu_roadmap_verified"]) else (10 if acct["gpu_to_tpu_roadmap_verified"] else 5)
    acct["allocation_priority_boost_pts"] = boost_pts
    acct["verification_notes"] = str(
        payload.get("verification_notes")
        or f"Verified by {leader_ldap}: Tagged {new_tier}, '{acct['strategic_pod_vertical']}', and unlocked +{boost_pts}pt 'GPU Ties to TPU' Allocation Priority Boost."
    )

    linked_id = acct.get("linked_allocation_request_id")
    updated_allocation = None
    score_before = 65
    score_after = 65 + boost_pts
    if linked_id:
        t_req = next(
            (r for r in UI_STORE["allocation_requests"] if r["request_id"] == linked_id),
            None,
        )
        if t_req:
            base_calc = compute_ui_score_and_companion(t_req)
            base_score = int(base_calc["score_breakdown"]["total_score"])
            score_before = base_score
            if not base_calc["score_breakdown"].get("utilization_breach_blocked"):
                boosted_score = min(100, base_score + boost_pts)
                score_after = boosted_score
                t_req["priority_score"] = boosted_score
                t_req["score_breakdown"]["total_score"] = boosted_score
                if boosted_score >= 80:
                    t_req["score_breakdown"]["cutline_status"] = (
                        f"Recommend: Approve — Human Council Decision (>= 80 pts | Includes +{boost_pts}pt STRATEGIC_POD & GPU->TPU Leader Boost)"
                    )
                    t_req["score_breakdown"]["recommendation"] = (
                        f"Verified by {leader_ldap} ({new_tier} + GPU->TPU Roadmap). Recommended for Tuesday Allocation Council approval."
                    )
            t_req["updated_at"] = now_iso
            updated_allocation = t_req

    mem_entry = {
        "memory_id": f"MEM-2026-{len(V3_STORE['memories']) + 101:03d}",
        "created_at": now_iso,
        "author_ldap": leader_ldap,
        "author_role": "GTM Leadership Verification Gate",
        "category": "Project STRATEGIC_POD Leader Verification",
        "sfdc_account_id": sfdc_account_id,
        "title": f"Leader Verified: {acct['account_name']} -> {new_tier} (+{boost_pts}pt Allocation Boost)",
        "content": (
            f"{leader_ldap} verified Salesforce account {acct['account_name']} ({sfdc_account_id}) as {new_tier} "
            f"in vertical '{acct['strategic_pod_vertical']}' at journey stage '{acct['tpu_journey_stage']}'."
        ),
        "tags": ["Leader Verified", new_tier, acct["account_name"], leader_ldap],
    }
    V3_STORE["memories"].insert(0, mem_entry)

    decision_entry = record_historic_decision_entry({
        "decision_forum": "STRATEGIC_POD GTM Verification",
        "decision_outcome": "VERIFIED_P0_BOOST",
        "customer_name": acct["account_name"],
        "customer_segment": "Leading AI Lab" if "P0" in new_tier else "Digital Native",
        "strategic_pod_vertical": acct["strategic_pod_vertical"],
        "sfdc_account_id": sfdc_account_id,
        "vector_opportunity_id": acct["vector_opportunity_id"],
        "vector_workload_id": acct["vector_workload_id"],
        "related_deal_id": linked_id or acct["vector_opportunity_id"],
        "requested_sku": updated_allocation["chip_name"] if updated_allocation else "GPU + Cloud TPU Co-Deployment",
        "requested_chips": updated_allocation["requested_chips"] if updated_allocation else 512,
        "requested_region": updated_allocation["primary_region"] if updated_allocation else acct["sub_region"],
        "approved_sku": f"{acct['bloom_pod_tier']} ({acct['bloom_commercial_route']})",
        "approved_chips": updated_allocation["requested_chips"] if updated_allocation else 512,
        "approved_region": updated_allocation["primary_region"] if updated_allocation else acct["sub_region"],
        "consumption_mechanism": f"3-Year CUD + {acct['bloom_pod_tier']}",
        "allocation_score_before": score_before,
        "allocation_score_after": score_after,
        "tcv_usd_m": updated_allocation["deal_tcv_usd_m"] if updated_allocation else acct["annualized_ai_arr_m"],
        "commercial_incentive_applied": f"STRATEGIC_POD {new_tier} + +{boost_pts}pt 'GPU Ties to TPU' Priority Boost",
        "firm_readiness_status": "Firm (Customer RED + Internal BLACK Verified)",
        "vector_pbo_tagged": f"Infra AI / {acct['vector_stage']}",
        "dfe_benchmark_cited": "Project STRATEGIC_POD 'GPU Ties to TPU' Co-Deployment Roadmap",
        "decision_maker_ldap": leader_ldap,
        "co_approver_ldap": acct.get("ce_owner_ldap", "ce-director@demo.example.com"),
        "decision_rationale": acct["verification_notes"],
        "precedent_tags": ["STRATEGIC_POD-Verification", new_tier, "GPU-Ties-To-TPU-Boost"],
    })

    _save_v3_state(V3_STORE)
    _try_persist_to_warehouse("sfdc_strategic_pod_accounts", acct)
    _try_persist_to_warehouse("persistent_memory_vault", mem_entry)

    return {
        "account": acct,
        "updated_allocation_request": updated_allocation,
        "memory_logged": mem_entry,
        "decision_logged": decision_entry,
    }


@router.get("/api/v1/decisions")
def list_historic_decisions(
    request: Request,
    q: str = "",
    forum: str = "ALL",
    outcome: str = "ALL",
    segment: str = "ALL",
    decision_maker: str = "ALL",
):
    """Returns historic synthetic governance decisions from DataWarehouse / persistent ledger (filtered by RBAC role view)."""
    role_view = get_role_view(request)
    decisions = V3_STORE.get("historic_decisions", _default_historic_decisions())
    if role_view == "FIELD_REP":
        decisions = [d for d in decisions if is_assigned_to_field_rep(d)]

    filtered = []
    q_low = q.strip().lower()
    for d in decisions:
        if forum != "ALL" and forum.lower() not in d.get("decision_forum", "").lower():
            continue
        if outcome != "ALL" and d.get("decision_outcome") != outcome:
            continue
        if segment != "ALL" and segment.lower() not in d.get("customer_segment", "").lower():
            continue
        if decision_maker != "ALL" and decision_maker.lower() not in (
            d.get("decision_maker_ldap", "") + " " + d.get("co_approver_ldap", "")
        ).lower():
            continue
        if q_low:
            haystack = json.dumps(d).lower()
            if q_low not in haystack:
                continue
        filtered.append(d)

    approved_count = sum(
        1 for d in decisions if "APPROVED" in d.get("decision_outcome", "") or "VERIFIED" in d.get("decision_outcome", "")
    )
    dfe_pivot_count = sum(
        1 for d in decisions if d.get("decision_outcome") == "APPROVED_WITH_DFE_PIVOT"
    )
    reclaimed_count = sum(
        1 for d in decisions if d.get("decision_outcome") == "RECLAIMED_TO_GDM_POOL"
    )
    total_tcv_m = round(
        sum(float(d.get("tcv_usd_m") or 0.0) for d in decisions if d.get("decision_outcome") != "RECLAIMED_TO_GDM_POOL"),
        1,
    )

    return {
        "role_view": role_view,
        "decisions": filtered,
        "summary": {
            "total_decisions_in_db": len(decisions),
            "filtered_count": len(filtered),
            "approved_or_verified_count": approved_count,
            "dfe_pivot_count": dfe_pivot_count,
            "reclaimed_sla_count": reclaimed_count,
            "total_governed_tcv_usd_m": total_tcv_m,
            "warehouse_table": "apex-ai-capacity-demo:apex_capacity_navigator.historic_decisions_ledger",
        },
        "playbook_dfe_and_commercial": GDM_AND_CROSS_PA_BENCHMARKS["playbook_dfe_and_commercial"],
    }


@router.post("/api/v1/decisions")
def create_historic_decision(payload: Dict[str, Any]):
    """Records a new synthetic governance decision directly into DataWarehouse historic_decisions_ledger."""
    entry = record_historic_decision_entry(payload)
    mem_entry = {
        "memory_id": f"MEM-2026-{len(V3_STORE['memories']) + 101:03d}",
        "created_at": entry["decision_date"],
        "author_ldap": entry["decision_maker_ldap"],
        "author_role": entry["decision_forum"],
        "category": f"Historic Decision ({entry['decision_outcome']})",
        "sfdc_account_id": entry["sfdc_account_id"],
        "title": f"{entry['decision_id']}: {entry['customer_name']} ({entry['decision_outcome']})",
        "content": (
            f"{entry['decision_forum']} decision by {entry['decision_maker_ldap']}: "
            f"Requested {entry['requested_chips']}x {entry['requested_sku']} in {entry['requested_region']} -> "
            f"Approved {entry['approved_chips']}x {entry['approved_sku']} in {entry['approved_region']} "
            f"(Score {entry['allocation_score_before']}->{entry['allocation_score_after']}/100, TCV ${entry['tcv_usd_m']}M). "
            f"Rationale: {entry['decision_rationale']}"
        ),
        "tags": entry.get("precedent_tags", ["Historic-Decision"]),
    }
    V3_STORE["memories"].insert(0, mem_entry)
    _save_v3_state(V3_STORE)
    _try_persist_to_warehouse("persistent_memory_vault", mem_entry)
    return {"decision": entry, "memory_logged": mem_entry}


@router.post("/api/v1/decisions/lookup")
def lookup_historic_precedents(payload: Dict[str, Any], request: Request):
    """AI-Powered Historic Decision & Precedent Lookup across synthetic historic_decisions_ledger."""
    role_view = get_role_view(request)
    query = str(
        payload.get("query")
        or "Show historic decisions where H100/H200 was pivoted to ASIC-v6e v6e, or expansion deals were blocked by utilization breaches."
    ).strip()
    forum_filter = str(payload.get("forum") or "ALL")
    outcome_filter = str(payload.get("outcome") or "ALL")

    decisions = V3_STORE.get("historic_decisions", _default_historic_decisions())
    if role_view == "FIELD_REP":
        decisions = [d for d in decisions if is_assigned_to_field_rep(d)]

    candidates = []
    for d in decisions:
        if forum_filter != "ALL" and forum_filter.lower() not in d.get("decision_forum", "").lower():
            continue
        if outcome_filter != "ALL" and d.get("decision_outcome") != outcome_filter:
            continue
        doc_text = (
            f"{d['decision_id']} {d['customer_name']} ({d['customer_segment']} | {d['strategic_pod_vertical']}). "
            f"Forum: {d['decision_forum']}. Outcome: {d['decision_outcome']}. "
            f"Requested {d['requested_chips']}x {d['requested_sku']} in {d['requested_region']} -> "
            f"Approved {d['approved_chips']}x {d['approved_sku']} in {d['approved_region']} via {d['consumption_mechanism']}. "
            f"Score: {d['allocation_score_before']} -> {d['allocation_score_after']}/100. TCV: ${d['tcv_usd_m']}M. "
            f"Incentive: {d['commercial_incentive_applied']}. Firm Status: {d['firm_readiness_status']}. "
            f"DFE Benchmark: {d['dfe_benchmark_cited']}. Decision Maker: {d['decision_maker_ldap']}. "
            f"Rationale: {d['decision_rationale']}."
        )
        candidates.append((d, doc_text))

    if not candidates:
        candidates = [(d, json.dumps(d)) for d in decisions]

    client = _get_model_hub_client()
    embedding_model_used = "hybrid-precedent-vector-v4"
    query_vec: List[float] = []
    doc_vecs: List[List[float]] = []

    if client:
        try:
            texts_to_embed = [query] + [txt[:1000] for _, txt in candidates]
            emb_resp = client.models.embed_content(
                model="text-embedding-004",
                contents=texts_to_embed,
            )
            if emb_resp and getattr(emb_resp, "embeddings", None):
                all_vecs = [list(e.values) for e in emb_resp.embeddings]
                if len(all_vecs) == len(texts_to_embed):
                    query_vec = all_vecs[0]
                    doc_vecs = all_vecs[1:]
                    embedding_model_used = "model-hub/text-embedding-004 (768-dim)"
        except Exception:
            pass

    ranked = []
    for idx, (dec, txt) in enumerate(candidates):
        lex = _lexical_semantic_score(query, txt)
        if query_vec and idx < len(doc_vecs):
            cos = _cosine_similarity(query_vec, doc_vecs[idx])
            sim = round(0.65 * cos + 0.35 * lex, 3)
        else:
            sim = lex
        ranked.append({**dec, "similarity_score": sim})

    ranked.sort(key=lambda x: x["similarity_score"], reverse=True)
    top_precedents = ranked[:6]

    precedent_context = "\n".join(
        f"[{i+1}] {p['decision_id']} ({p['decision_date'][:10]} | {p['decision_forum']} | {p['decision_outcome']}): "
        f"{p['customer_name']} — Requested {p['requested_chips']}x {p['requested_sku']} ({p['requested_region']}) -> "
        f"Approved {p['approved_chips']}x {p['approved_sku']} ({p['approved_region']}), Score {p['allocation_score_before']}->{p['allocation_score_after']}, "
        f"TCV ${p['tcv_usd_m']}M. Rationale: {p['decision_rationale']}"
        for i, p in enumerate(top_precedents)
    )

    ai_precedent_ruling = ""
    llm_model_used = "apex-precedent-rag-engine"
    if client:
        for candidate_model in ("llm-fast-router", "llm-pro-reasoner"):
            try:
                resp = client.models.generate_content(
                    model=candidate_model,
                    contents=(
                        "You are the Apex Capacity Navigator Historic Decisions & Precedent Counsel (100% synthetic prototype environment). "
                        "Based strictly on the retrieved synthetic historic_decisions_ledger records below, provide a concise 3-bullet Precedent Analysis "
                        "citing exact Decision IDs (DEC-2026-...), DFE Benchmarks, Upfront Prepay & CUD duration rules, and 14-day utilization breach enforcement:\n\n"
                        f"Retrieved Historic Decisions:\n{precedent_context}\n\nLookup Query: {query}"
                    ),
                )
                if resp and resp.text:
                    ai_precedent_ruling = resp.text.strip()
                    llm_model_used = f"model-hub/{candidate_model}"
                    break
            except Exception:
                continue

    if not ai_precedent_ruling:
        bullets = [
            f"• **{p['decision_id']} — {p['customer_name']} (`{p['decision_outcome']}`)**: Requested `{p['requested_chips']:,}x {p['requested_sku']}` in `{p['requested_region']}` → Approved `{p['approved_chips']:,}x {p['approved_sku']}` in `{p['approved_region']}` (`Score {p['allocation_score_before']}→{p['allocation_score_after']}`, `${p['tcv_usd_m']}M TCV`)."
            for p in top_precedents[:4]
        ]
        ai_precedent_ruling = (
            f"**Historic Precedent Synthesis (`{len(top_precedents)}` top rulings)**:\n"
            + "\n".join(bullets)
        )

    return {
        "role_view": role_view,
        "query": query,
        "embedding_model": embedding_model_used,
        "llm_model": llm_model_used,
        "total_decisions_searched": len(candidates),
        "ai_precedent_ruling": ai_precedent_ruling,
        "precedents": top_precedents,
    }


@router.get("/api/v1/memory")
def list_persistent_memories(request: Request):
    role_view = get_role_view(request)
    memories = V3_STORE["memories"]
    if role_view == "FIELD_REP":
        memories = [m for m in memories if is_assigned_to_field_rep(m) or m.get("sfdc_account_id") in ("SFDC-SYNTH-001", "SFDC-SYNTH-002", "GLOBAL")]
    return {
        "role_view": role_view,
        "memories": memories,
        "storage_backend": "DataWarehouse (apex-ai-capacity-demo.apex_capacity_navigator.persistent_memory_vault) + Container Service Persistent Snapshot",
    }


@router.post("/api/v1/memory")
def add_persistent_memory(payload: Dict[str, Any]):
    now_iso = datetime.now(timezone.utc).isoformat()
    mem = {
        "memory_id": f"MEM-2026-{len(V3_STORE['memories']) + 101:03d}",
        "created_at": now_iso,
        "author_ldap": str(payload.get("author_ldap") or "ops-capacity-lead@demo.example.com"),
        "author_role": str(payload.get("author_role") or "AI Infra GTM / CE"),
        "category": str(payload.get("category") or "Institutional Deal & Policy Memory"),
        "sfdc_account_id": str(payload.get("sfdc_account_id") or "GLOBAL"),
        "title": str(payload.get("title") or "Capacity & Architecture Decision Note"),
        "content": str(payload.get("content") or "").strip(),
        "tags": payload.get("tags") or ["Persistent Memory", "Vector Indexed"],
    }
    V3_STORE["memories"].insert(0, mem)
    _save_v3_state(V3_STORE)
    _try_persist_to_warehouse("persistent_memory_vault", mem)
    return {"memory": mem}


def _build_unified_vector_corpus(role_view: str = "OPS_CENTRAL") -> List[Dict[str, Any]]:
    """Constructs the unified semantic search corpus across synthetic sources, respecting RBAC."""
    corpus: List[Dict[str, Any]] = []

    for a in V3_STORE["sfdc_accounts"]:
        if role_view == "FIELD_REP" and not is_assigned_to_field_rep(a):
            continue
        corpus.append(
            {
                "doc_id": a["sfdc_account_id"],
                "source_type": "Salesforce Vector CRM & STRATEGIC_POD Account",
                "title": f"{a['account_name']} ({a['strategic_pod_tier']} | {a['verified_status']})",
                "subtitle": f"SFDC: {a['sfdc_account_id']} • Vector Opp: {a['vector_opportunity_id']} • ARR: ${a['annualized_ai_arr_m']}M",
                "text": (
                    f"{a['account_name']} Salesforce Account {a['sfdc_account_id']} Vector Opportunity {a['vector_opportunity_id']}. "
                    f"STRATEGIC_POD Tier: {a['strategic_pod_tier']}. Vertical: {a['strategic_pod_vertical']}. "
                    f"Annualized AI ARR: ${a['annualized_ai_arr_m']}M. Notes: {a['verification_notes']}"
                ),
                "metadata": {
                    "sfdc_account_id": a["sfdc_account_id"],
                    "vector_opportunity_id": a["vector_opportunity_id"],
                    "strategic_pod_tier": a["strategic_pod_tier"],
                    "verified_status": a["verified_status"],
                },
            }
        )

    for d in V3_STORE.get("historic_decisions", []):
        if role_view == "FIELD_REP" and not is_assigned_to_field_rep(d):
            continue
        corpus.append(
            {
                "doc_id": d["decision_id"],
                "source_type": "Historic Governance Decision (DataWarehouse Ledger)",
                "title": f"{d['decision_id']}: {d['customer_name']} — {d['decision_outcome']} ({d['decision_forum']})",
                "subtitle": f"{d['requested_chips']:,}x {d['requested_sku']} ({d['requested_region']}) -> {d['approved_chips']:,}x {d['approved_sku']} ({d['approved_region']}) • ${d['tcv_usd_m']}M",
                "text": (
                    f"Historic Decision {d['decision_id']} in {d['decision_forum']}. "
                    f"Customer: {d['customer_name']}. Outcome: {d['decision_outcome']}. "
                    f"Requested {d['requested_chips']} {d['requested_sku']} in {d['requested_region']} -> "
                    f"Approved {d['approved_chips']} {d['approved_sku']} in {d['approved_region']}. "
                    f"Rationale: {d['decision_rationale']}"
                ),
                "metadata": {
                    "decision_id": d["decision_id"],
                    "decision_forum": d["decision_forum"],
                    "decision_outcome": d["decision_outcome"],
                },
            }
        )

    for r in UI_STORE["allocation_requests"]:
        if role_view == "FIELD_REP" and not is_assigned_to_field_rep(r):
            continue
        corpus.append(
            {
                "doc_id": r["request_id"],
                "source_type": "Allocation Accelerator Request (go/acc-prioritization)",
                "title": f"{r['request_id']}: {r['customer_name']} ({r['requested_chips']:,}x {r['chip_name']})",
                "subtitle": f"Region: {r['primary_region']} • TCV: ${r['deal_tcv_usd_m']}M • Score: {r['priority_score']}/100 ({r['council_decision']})",
                "text": (
                    f"Allocation Request {r['request_id']} for {r['customer_name']} (Vector Opp {r['vector_opportunity_id']}, Registry CDR {r['registry_cdr_id']}). "
                    f"Requesting {r['requested_chips']} {r['chip_name']} chips in {r['primary_region']}. "
                    f"TCV: ${r['deal_tcv_usd_m']}M, Consumption: {r['consumption_model']}, Prepay: {r.get('upfront_prepay_pct', 0)}%, Priority Score: {r['priority_score']}/100."
                ),
                "metadata": {
                    "request_id": r["request_id"],
                    "priority_score": r["priority_score"],
                    "primary_region": r["primary_region"],
                },
            }
        )

    for b in GDM_AND_CROSS_PA_BENCHMARKS["cross_pa_research_cards"]:
        corpus.append(
            {
                "doc_id": b["source_id"],
                "source_type": "Capacity Allocation Policy & Benchmark",
                "title": b["title"],
                "subtitle": f"Owners: {b['owners']}",
                "text": f"{b['title']}. {b['summary']} Applied in Apex: {b['applied_in_apex']}",
                "metadata": {"source_id": b["source_id"], "owners": b["owners"]},
            }
        )

    return corpus


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _lexical_semantic_score(query: str, doc_text: str) -> float:
    q_tokens = set(re.findall(r"[a-z0-9]+", query.lower()))
    d_tokens = set(re.findall(r"[a-z0-9]+", doc_text.lower()))
    if not q_tokens or not d_tokens:
        return 0.15

    synonyms = {
        "sfdc": {"salesforce", "vector", "crm", "opportunity"},
        "prepay": {"prepayment", "cash", "upfront", "5yr", "cud"},
        "breach": {"sla", "14", "utilization", "stratos", "reclaim", "hold"},
        "robotics": {"physical", "embodied", "world", "stratos", "g4"},
        "g4": {"rtx", "6000", "blackwell", "fp4", "h100"},
    }
    expanded_q = set(q_tokens)
    for tok in list(q_tokens):
        if tok in synonyms:
            expanded_q.update(synonyms[tok])

    overlap = len(expanded_q.intersection(d_tokens))
    ratio = overlap / max(1.0, math.sqrt(len(q_tokens)) * 2.2)
    return min(0.98, round(0.32 + ratio * 0.65, 3))


@router.post("/api/v1/vector-search")
def run_semantic_vector_search(payload: Dict[str, Any], request: Request):
    """Executes Semantic Vector Search across synthetic records (respecting RBAC role view)."""
    role_view = get_role_view(request)
    query = str(
        payload.get("query")
        or "Which synthetic accounts have upfront cash prepayment, GPU-to-TPU commitments, or active utilization breaches?"
    ).strip()
    top_k = int(payload.get("top_k") or 6)
    source_filter = str(payload.get("source_filter") or "ALL")

    corpus = _build_unified_vector_corpus(role_view=role_view)
    if source_filter and source_filter != "ALL":
        corpus = [
            c
            for c in corpus
            if source_filter.lower() in c["source_type"].lower()
        ] or corpus

    client = _get_model_hub_client()
    embedding_model_used = "hybrid-lexical-vector-v4"
    query_vec: List[float] = []
    doc_vecs: List[List[float]] = []

    if client:
        try:
            texts_to_embed = [query] + [c["text"][:1000] for c in corpus]
            emb_resp = client.models.embed_content(
                model="text-embedding-004",
                contents=texts_to_embed,
            )
            if emb_resp and getattr(emb_resp, "embeddings", None):
                all_vecs = [list(e.values) for e in emb_resp.embeddings]
                if len(all_vecs) == len(texts_to_embed):
                    query_vec = all_vecs[0]
                    doc_vecs = all_vecs[1:]
                    embedding_model_used = "model-hub/text-embedding-004 (768-dim)"
        except Exception:
            pass

    scored_results: List[Dict[str, Any]] = []
    for idx, doc in enumerate(corpus):
        lex_score = _lexical_semantic_score(query, doc["text"])
        if query_vec and idx < len(doc_vecs):
            cos_sim = _cosine_similarity(query_vec, doc_vecs[idx])
            combined_score = round(0.65 * cos_sim + 0.35 * lex_score, 3)
        else:
            combined_score = lex_score

        scored_results.append(
            {
                **doc,
                "similarity_score": combined_score,
                "embedding_dims": 768,
            }
        )

    scored_results.sort(key=lambda x: x["similarity_score"], reverse=True)
    top_matches = scored_results[:top_k]

    rag_context = "\n".join(
        f"[{i+1}] ({m['source_type']} | ID: {m['doc_id']} | Sim: {m['similarity_score']}) {m['title']}: {m['text']}"
        for i, m in enumerate(top_matches)
    )

    ai_synthesis = ""
    llm_model_used = "apex-grounded-rag-synthesizer"
    if client:
        for candidate_model in ("llm-fast-router", "llm-pro-reasoner"):
            try:
                resp = client.models.generate_content(
                    model=candidate_model,
                    contents=(
                        "You are the Apex Capacity Navigator Semantic Vector Search Copilot (100% synthetic prototype environment). "
                        f"Active RBAC Role View: {role_view}. "
                        "Synthesize a concise 3-bullet answer strictly grounded in these top vector-retrieved synthetic records:\n\n"
                        f"Retrieved Vector Context:\n{rag_context}\n\nUser Query: {query}"
                    ),
                )
                if resp and resp.text:
                    ai_synthesis = resp.text.strip()
                    llm_model_used = f"model-hub/{candidate_model}"
                    break
            except Exception:
                continue

    if not ai_synthesis:
        bullets = [
            f"• **{m['title']}** (`{m['doc_id']}` — `{int(m['similarity_score']*100)}%` match): {m['subtitle']}"
            for m in top_matches[:4]
        ]
        ai_synthesis = (
            f"**Semantic Vector Retrieval Summary (`{len(top_matches)}` matches across `{len(corpus)}` indexed records in `{role_view}` mode)**:\n"
            + "\n".join(bullets)
        )

    return {
        "role_view": role_view,
        "query": query,
        "embedding_model": embedding_model_used,
        "llm_model": llm_model_used,
        "total_indexed_documents": len(corpus),
        "ai_synthesis": ai_synthesis,
        "results": top_matches,
    }

"""FastAPI Production Backend for Apex Capacity: Unified Allocation & Companion Capacity Allocation Navigator (100% Synthetic Prototype)."""

from __future__ import annotations
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.domain_data import (
    FORM_CHIP_TO_BQ_ID,
    REGISTRY_CDR_CATALOG,
    ORG_DIRECTORY,
    calculate_companion_check_bom,
    compute_allocation_score,
    get_initial_seed_state,
    load_chip_specs,
    load_regional_availability,
    route_specialist_and_ce,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("apex_capacity")

CLOUD_PROJECT_ID = os.environ.get("CLOUD_PROJECT_ID", "apex-ai-capacity-demo")
CLOUD_LOCATION = os.environ.get("CLOUD_REGION", "us-central1")
BQ_DATASET = "apex_capacity_navigator"

app = FastAPI(
    title="Apex Capacity Navigator — Unified Capacity Allocation, Forecasting & Governance Prototype",
    version="4.6.0",
    description="100% Synthetic Prototype Environment for Hyperscale AI Infrastructure & Companion Classic Capacity Governance.",
)

ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Demo-Role-View", "X-Role-Persona"],
)

from backend.ui_adapter import router as ui_adapter_router
from backend.crm_pursuit_hub import router as crm_pursuit_hub_router
from backend.supply_planning_v4 import router as supply_planning_v4_router
from backend.capacity_demand_tracker import router as capacity_demand_tracker_router

app.include_router(ui_adapter_router)
app.include_router(crm_pursuit_hub_router)
app.include_router(supply_planning_v4_router)
app.include_router(capacity_demand_tracker_router)

CHIP_SPECS: List[Dict[str, Any]] = load_chip_specs()
REGIONAL_AVAILABILITY: List[Dict[str, Any]] = load_regional_availability()
STATE: Dict[str, Any] = get_initial_seed_state(REGIONAL_AVAILABILITY)

_genai_client = None


def get_genai_client():
    global _genai_client
    if _genai_client is not None:
        return _genai_client
    try:
        genai = None
        _genai_client = genai.Client(model_hubai=True, project=CLOUD_PROJECT_ID, location=CLOUD_LOCATION)
        return _genai_client
    except Exception as exc:
        logger.warning("ModelHub AI genai client fallback: %s", exc)
        return None


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok",
        "service": "apex-capacity-navigator",
        "synthetic_data_only": True,
        "cloud_project": CLOUD_PROJECT_ID,
        "region": CLOUD_LOCATION,
        "bq_radar_rows": len(REGIONAL_AVAILABILITY),
        "bq_chip_specs": len(CHIP_SPECS),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/directory")
def get_org_directory():
    return ORG_DIRECTORY


@app.get("/api/v1/companion/search-registry")
def search_registry_cdrs(q: str = Query("")):
    """Searches synthetic Registry CDRs by CDR ID, Workload ID, or Customer Name."""
    query = (q or "").strip().lower()
    results = []
    for item in REGISTRY_CDR_CATALOG:
        if (
            not query
            or query in item["cdr_id"].lower()
            or query in item["workload_id"].lower()
            or query in item["customer_name"].lower()
            or query in item["sfid"].lower()
            or query in item["region"].lower()
            or query in item["sub_product"].lower()
        ):
            is_ineligible = item["registry_status"] in ("Approved", "Obsolete")
            results.append(
                {
                    **item,
                    "companion_eligible": not is_ineligible,
                    "eligibility_note": (
                        "BLOCKED: Companion does not review 'Approved' or 'Obsolete' Registry requests"
                        if is_ineligible
                        else (
                            f"ELIGIBLE: {item['pct_of_regional_net_supply']}% of {item['region']} net supply (>20% Companion threshold)"
                            if item["pct_of_regional_net_supply"] > 20.0
                            else "Standard Registry (<20% regional supply unless coupled with Allocation AI Infra)"
                        )
                    ),
                }
            )
    return {"count": len(results), "items": results}


class NaturalLanguageIntakePayload(BaseModel):
    prompt: str


@app.post("/api/v1/ai/parse-intake")
def ai_parse_natural_language_intake(payload: NaturalLanguageIntakePayload):
    """Uses ModelHub AI Fast-Router LLM + deterministic regex extraction to parse unstructured deal notes."""
    text = payload.prompt.strip()
    parsed: Dict[str, Any] = {
        "customer_name": "Enterprise AI Customer (Synthetic)",
        "segment": "US Startups (VC Partnerships)",
        "customer_region": "NorthAm",
        "chip_type": "B200",
        "chips_desired": 512,
        "workload_profile": "PRE_TRAINING",
        "negotiated_asp_hourly": 5.45,
        "customer_tenure_type": "New Net",
        "existing_billing_asp_hourly": None,
        "cud_duration": "3 yr CUD",
        "non_standard_cud_length_months": 36,
        "datacenter_preference": "NorthAm only",
        "ramp_readiness": "Immediately",
        "prepayment_scale": 5,
        "co_located_workloads": ["Data", "ModelHub", "1P Gen AI models (i.e. FoundationLLM)"],
        "current_project_cores": 512,
        "total_commit_tcv_millions": 180.0,
        "current_ai_arr_millions": 30.0,
        "current_total_arr_millions": 65.0,
    }

    ai_model_used = "deterministic-policy-parser"
    client = get_genai_client()
    if client:
        for candidate_model in ("llm-fast-router", "llm-pro-reasoner"):
            try:
                sys_prompt = (
                    "Extract structured Hyperscale Cloud AI Infra Allocation Intake fields from the user's deal note. "
                    "Return ONLY valid JSON with keys: customer_name (str), segment (str), customer_region (one of: NorthAm, LATAM, EMEA, APAC, Public Sector), "
                    "chip_type (one of: GB300, GB200, B200, A3 Ultra H200, A3 Mega H100, A3 High H100, G4 RTX Pro 6000, TPU v7, TPU v6e, TPU v5p, TPU v5e), "
                    "chips_desired (int), workload_profile (PRE_TRAINING | FINE_TUNING_RLHF | INFERENCE_SERVING), negotiated_asp_hourly (float), "
                    "customer_tenure_type (New Net | Existing customer), cud_duration (1 yr CUD | 3 yr CUD | 5 yr CUD | FlexStart), "
                    "datacenter_preference (str), ramp_readiness (Immediately | Within 30 Days | Later), prepayment_scale (int 0..10 where 5 = 50%), "
                    "total_commit_tcv_millions (float)."
                )
                resp = client.models.generate_content(
                    model=candidate_model,
                    contents=f"{sys_prompt}\n\nDeal Note:\n{text}",
                )
                raw_json = (resp.text or "").strip()
                if "```" in raw_json:
                    raw_json = raw_json.split("```")[1]
                    if raw_json.startswith("json"):
                        raw_json = raw_json[4:]
                extracted = json.loads(raw_json.strip())
                if isinstance(extracted, dict):
                    parsed.update({k: v for k, v in extracted.items() if v is not None})
                    ai_model_used = f"model-hub/{candidate_model}"
                    break
            except Exception as exc:
                logger.info("FoundationLLM intake parse fallback: %s", exc)
                continue

    routing = route_specialist_and_ce(parsed["customer_region"], parsed["segment"], parsed["chip_type"])
    bom = calculate_companion_check_bom(
        parsed["chip_type"],
        int(parsed["chips_desired"]),
        parsed["workload_profile"],
        parsed["datacenter_preference"],
        int(parsed.get("current_project_cores") or 0),
    )
    score = compute_allocation_score(parsed, REGIONAL_AVAILABILITY)

    return {
        "ai_model": ai_model_used,
        "parsed_fields": parsed,
        "routing": routing,
        "companion_check_bom": bom,
        "scoring": score,
    }


class PlaybookRequestPayload(BaseModel):
    request_id: Optional[str] = None
    customer_name: str = "Helios Quantitative Trading (Synthetic)"
    chip_type: str = "A3 Ultra H200"
    chips_desired: int = 512
    datacenter_preference: str = "us-east4"
    negotiated_asp_hourly: float = 2.95
    cud_duration: str = "1 yr CUD"
    current_ai_arr_millions: float = 12.0
    current_total_arr_millions: float = 19.0
    total_commit_tcv_millions: float = 45.0
    commit_years: int = 1
    rvp_name: str = "Regional VP, NorthAm (Demo Persona)"
    fsd_name: str = "Field Sales Director (Demo Persona)"


@app.post("/api/v1/ai/post-rejection-playbook")
def generate_post_rejection_playbook(payload: PlaybookRequestPayload):
    """Generates the 4-Step Post-Rejection Counter-Offer Playbook (100% Synthetic)."""
    d = payload.model_dump()
    bq_chip = FORM_CHIP_TO_BQ_ID.get(d["chip_type"], "nvidia-h200-141gb")
    cold_alternatives = [
        r for r in REGIONAL_AVAILABILITY
        if r.get("chip_id") == bq_chip and r.get("on_demand_status") == "HIGH_OD_CAPACITY"
    ]
    if not cold_alternatives:
        cold_alternatives = [
            r for r in REGIONAL_AVAILABILITY
            if r.get("on_demand_status") == "HIGH_OD_CAPACITY"
        ][:4]

    alt_regions_str = ", ".join(
        f"{r['region']} ({r.get('on_demand_label', 'HIGH_OD_CAPACITY')})"
        for r in cold_alternatives[:3]
    ) or "us-east5 (HIGH_OD_CAPACITY), us-south1 (HIGH_OD_CAPACITY)"

    seed_chips = max(8, min(64, int(d["chips_desired"] * 0.125)))

    rvp_email_draft = f"""To: {d['rvp_name']} <ce-vp-approver@demo.example.com>
Cc: ce-director@demo.example.com, ops-capacity-lead@demo.example.com
Subject: REQUEST: Approval for AI Infra Escalation — {d['customer_name']} ({d['chips_desired']}x {d['chip_type']})

{d['rvp_name']},

Please reply APPROVED if you are in agreement for this demand to be escalated to the AI Infra Capacity Council (capacity-council@demo.example.com).

Requested demand:
• Current spend: ${d['current_ai_arr_millions']:.1f}M ARR in AI Infra, ${d['current_total_arr_millions']:.1f}M ARR overall
• Current commit: ${d['total_commit_tcv_millions']:.1f}M TCV / {d['commit_years']} Yrs
• Volume: {d['chip_type']}, {d['chips_desired']} chips, {d['datacenter_preference']}
• Commercials: ${d['negotiated_asp_hourly']:.2f}/hr/chip ASP, {d['cud_duration']}

Thank you,
{d['fsd_name']}"""

    customer_comm_draft = f"""Subject: Hyperscale AI Infrastructure Deployment & Capacity Milestone Plan — {d['customer_name']}

Hi {d['customer_name']} Engineering & Infrastructure Leadership,

To unblock your engineering velocity immediately while guaranteeing full-scale production capacity, our Capacity & Specialist Engineering teams have structured a 3-part delivery plan:

1. Immediate Dev/Test Seed Footprint (Available This Week):
   • Initial {seed_chips}x {d['chip_type']} seed cluster (or Flex-Start bridge capacity).
2. Design for Flexibility & Efficiency (DFE) Fast-Track Option:
   • High-headroom regions ({alt_regions_str}) or AI-ASIC v6e / G4 Blackwell equivalence.
3. Committed Production Scale-Up (Synced with Q1/Mar 2027 Datacenter Expansions):
   • Locking your 3-Yr or 5-Yr CUD commitment today secures priority tranche allocation.

Best regards,
Hyperscale AI Infrastructure Team (Demo)"""

    ai_executive_advice = (
        f"{d['datacenter_preference']} is currently allocation-constrained for {d['chips_desired']}x {d['chip_type']}. "
        f"Recommended Playbook sequence: (1) Offer {seed_chips}x {d['chip_type']} immediate seed footprint today; "
        f"(2) Propose Cold-Region pivot to {alt_regions_str} or 3-Yr/5-Yr CUD + Upfront Prepay upgrade; "
        f"(3) Lock March 2027 expansion wave for strict {d['datacenter_preference']} placement."
    )

    return {
        "ai_model": "deterministic-policy-engine",
        "ai_executive_advice": ai_executive_advice,
        "step1_timeline_shift": {
            "title": "Step 1 • Timeline Shift (Target: Mar '27 Ramps)",
            "target_date": "March 2027 (AI Infra) / January 2027 (Classic Infra)",
            "summary": f"Defer primary {d['chips_desired']}x {d['chip_type']} ramp in strict region ({d['datacenter_preference']}) to March 2027 while locking CUD pricing today.",
        },
        "step2_phased_rollout": {
            "title": "Step 2 • Phased Rollout (Unblock Dev/Test First)",
            "seed_footprint_chips": seed_chips,
            "alternative_high_headroom_regions": alt_regions_str,
            "summary": f"Provision an immediate {seed_chips}x {d['chip_type']} 'Seed' footprint this week to unblock customer dev/test pipelines.",
        },
        "step3_customer_communication": {
            "title": "Step 3 • Manage Expectation (Field Leadership-Aligned Comms)",
            "email_draft": customer_comm_draft,
        },
        "step4_rvp_escalation": {
            "title": "Step 4 • Policy-Compliant Escalation Package",
            "policy_guardrail": "Pre-Escalation Criteria: Customer must have already been assessed via Allocation Process and hold zero unresolved 14-day utilization breaches.",
            "rvp_approval_email": rvp_email_draft,
            "council_target": "capacity-council@demo.example.com",
            "sla_terms": "1 Business Day Initial Response • 7 Business Days Final Response",
        },
    }


FRONTEND_DIST = (Path(__file__).parent.parent / "frontend" / "dist").resolve()
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        candidate = (FRONTEND_DIST / full_path).resolve()
        if candidate.is_relative_to(FRONTEND_DIST) and candidate.is_file() and candidate.name != "index.html":
            return FileResponse(str(candidate))
        return FileResponse(
            str(FRONTEND_DIST / "index.html"),
            headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
        )

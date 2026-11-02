"""Role-based organizational directory, deterministic scoring engines, DFE calculator, and synthetic seed data for Apex Capacity."""

from __future__ import annotations
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_DIR = Path(__file__).parent / "data"


def load_chip_specs() -> List[Dict[str, Any]]:
    path = DATA_DIR / "chip_specs.json"
    if path.exists():
        return json.loads(path.read_text())
    return []


def load_regional_availability() -> List[Dict[str, Any]]:
    path = DATA_DIR / "regional_availability.json"
    if path.exists():
        return json.loads(path.read_text())
    return []


# ---------------------------------------------------------------------------
# 1. Role-Based Demo Personas (Zero Real Leader LDAPs)
# ---------------------------------------------------------------------------

ORG_DIRECTORY: Dict[str, Any] = {
    "personas": [
        {
            "email": "ops-capacity-lead@demo.example.com",
            "name": "Central Capacity & Operations View",
            "title": "Central Capacity Planning, Allocation & Performance Lead (Demo Persona)",
            "org": "Central Infrastructure Health & Capacity Operations",
            "role": "OPS_CENTRAL",
            "permissions": [
                "VIEW_GLOBAL_SUPPLY",
                "CREATE_INTAKE",
                "EDIT_DFE",
                "CREATE_COMPANION_CARD",
                "COUNCIL_DECIDE",
                "RECLAIM_SLA",
                "RUN_PLAYBOOK",
            ],
            "badge": "Central Ops View • Full Supply & Council Governance",
        },
        {
            "email": "field-specialist-ce@demo.example.com",
            "name": "Field Account Team View (Assigned Accounts Only)",
            "title": "Field Account Representative / Specialist CE (Demo Persona)",
            "org": "Field Account Team (Assigned Accounts Only)",
            "role": "FIELD_REP",
            "permissions": ["CREATE_INTAKE", "EDIT_DFE", "CREATE_COMPANION_CARD", "RUN_PLAYBOOK"],
            "badge": "Field Rep View • Strict Need-to-Know RBAC",
        },
    ],
    "teams": {
        "central_ops": {
            "leader": {
                "name": "Central Capacity & Operations Lead (Demo)",
                "ldap": "ops-capacity-lead@demo.example.com",
                "title": "Manager, Infrastructure Health & Capacity Operations",
                "location": "US-SVL",
            },
            "members": [
                {
                    "name": "Allocation Governance Lead (Demo)",
                    "ldap": "capacity-governance@demo.example.com",
                    "title": "Weekly Accelerator & Companion Compute Governance Lead",
                    "segment": "Global Allocation Governance",
                },
                {
                    "name": "CE Director Approver (Demo)",
                    "ldap": "ce-director@demo.example.com",
                    "title": "Customer Engineering Director (Step 2 Companion Endorser)",
                    "segment": "NorthAm Specialist CE",
                },
                {
                    "name": "CE VP Approver (Demo)",
                    "ldap": "ce-vp-approver@demo.example.com",
                    "title": "VP, Customer Engineering (Step 3 Companion Nominator)",
                    "segment": "NorthAm Customer Engineering",
                },
            ],
        },
        "field_account_team": {
            "leader": {
                "name": "Field Specialist CE (Demo)",
                "ldap": "field-specialist-ce@demo.example.com",
                "title": "AI Infrastructure Specialist CE",
                "location": "US-SFO",
            },
            "members": [
                {
                    "name": "Account Executive / FSR (Demo)",
                    "ldap": "account-fsr@demo.example.com",
                    "title": "Enterprise Field Sales Representative",
                    "segment": "Assigned Strategic AI Accounts",
                }
            ],
        },
    },
}


def route_specialist_and_ce(customer_region: str, segment: str, chip_type: str = "") -> Dict[str, str]:
    """Deterministically routes a deal to synthetic role-based demo personas."""
    return {
        "assigned_specialist_email": "field-specialist-ce@demo.example.com",
        "assigned_specialist_name": "Field Specialist CE (Demo Persona)",
        "assigned_ce_manager_email": "ce-director@demo.example.com",
        "assigned_ce_manager_name": "CE Director (Demo Persona)",
        "assigned_ce_director_email": "ce-director@demo.example.com",
        "assigned_ce_vp_email": "ce-vp-approver@demo.example.com",
        "allocation_regional_poc": "ops-capacity-lead@demo.example.com",
        "companion_regional_poc": "ops-capacity-lead@demo.example.com",
        "pace_intake_owner": "ops-capacity-lead@demo.example.com",
    }


# ---------------------------------------------------------------------------
# 2. Target ASP Benchmarks & Coupled Architecture Sizing ("Companion Check" BOM)
# ---------------------------------------------------------------------------

CHIP_TARGET_ASP: Dict[str, float] = {
    "GB300": 8.20,
    "GB200": 6.80,
    "B200": 5.40,
    "A3 Ultra H200": 3.85,
    "A3 Mega H100": 3.10,
    "A3 High H100": 2.85,
    "A3 Edge H100": 2.65,
    "A100 80GB": 2.10,
    "A100 40GB": 1.60,
    "G4 RTX Pro 6000": 1.35,
    "L4": 0.70,
    "T4": 0.35,
    "V100": 0.95,
    "P100": 0.65,
    "P4": 0.30,
    "TPU v7": 4.80,
    "TPU v6e": 2.40,
    "TPU v5p": 3.20,
    "TPU v5e": 1.20,
    "TPU v4": 1.95,
}

FORM_CHIP_TO_BQ_ID: Dict[str, str] = {
    "GB300": "nvidia-gb300",
    "GB200": "nvidia-gb200",
    "B200": "nvidia-b200",
    "A3 Ultra H200": "nvidia-h200-141gb",
    "A3 Mega H100": "nvidia-h100-mega-80gb",
    "A3 High H100": "nvidia-h100-80gb",
    "A3 Edge H100": "nvidia-h100-80gb",
    "A100 80GB": "nvidia-a100-80gb",
    "A100 40GB": "nvidia-tesla-a100",
    "G4 RTX Pro 6000": "nvidia-rtx-pro-6000",
    "L4": "nvidia-l4",
    "T4": "nvidia-tesla-t4",
    "V100": "nvidia-tesla-v100",
    "P100": "nvidia-tesla-p100",
    "P4": "nvidia-tesla-p4",
    "TPU v7": "tpu-v7x",
    "TPU v6e": "tpu-v6e",
    "TPU v5p": "tpu-v5p",
    "TPU v5e": "tpu-v5e",
    "TPU v4": "tpu-v4",
}

HOT_REGIONS = {"us-east4", "us-east1", "us-west1", "europe-west1", "europe-west3"}

COLD_REGIONS_BY_GEO = {
    "NorthAm": ["us-south1", "us-east5", "us-central1", "us-central2", "us-west4", "us-west8", "northamerica-northeast2"],
    "EMEA": ["europe-west4", "europe-north1", "europe-west9", "europe-southwest1"],
    "APAC": ["asia-southeast1", "asia-northeast2", "asia-south1"],
    "LATAM": ["southamerica-east1", "us-south1"],
}


def normalize_region_name(dc_pref: str) -> str:
    if not dc_pref:
        return "us-central1"
    s = dc_pref.strip().lower()
    if "global" in s or "northam only" in s:
        return "us-east5"
    if "emea only" in s:
        return "europe-west4"
    if "apac only" in s:
        return "asia-southeast1"
    s = s.replace(" ", "-")
    parts = s.split("-")
    if len(parts) == 3 and parts[2].isdigit():
        return f"{parts[0]}-{parts[1]}{parts[2]}"
    return s


def calculate_companion_check_bom(
    chip_type: str,
    chips_desired: int,
    workload_profile: str = "PRE_TRAINING",
    datacenter_preference: str = "US-Central 1",
    current_project_cores: int = 0,
) -> Dict[str, Any]:
    n_chips = max(int(chips_desired or 0), 1)
    is_tpu = "tpu" in (chip_type or "").lower()
    profile = (workload_profile or "PRE_TRAINING").upper()
    norm_region = normalize_region_name(datacenter_preference)

    if is_tpu:
        if "RLHF" in profile or "FINE" in profile:
            k_comp, k_stor, k_net, hd_tb_per_chip = 24.0, 2.0, 0.5, 0.5
        elif "INFER" in profile:
            k_comp, k_stor, k_net, hd_tb_per_chip = 8.0, 0.5, 2.0, 0.25
        else:
            k_comp, k_stor, k_net, hd_tb_per_chip = 16.0, 2.0, 0.5, 0.5
    else:
        if "RLHF" in profile or "FINE" in profile:
            k_comp, k_stor, k_net, hd_tb_per_chip = 8.0, 2.0, 0.5, 0.5
        elif "INFER" in profile:
            k_comp, k_stor, k_net, hd_tb_per_chip = 6.0, 0.5, 2.0, 0.25
        else:
            k_comp, k_stor, k_net, hd_tb_per_chip = 4.0, 2.0, 0.5, 0.5

    storage_cores = max(32, int(math.ceil((n_chips * k_stor) / 32.0) * 32))
    compute_cores = max(64, int(math.ceil((n_chips * k_comp) / 64.0) * 64))
    networking_cores = max(32, int(math.ceil((n_chips * k_net) / 16.0) * 16))
    high_iops_disk_tb = max(16, int(math.ceil(n_chips * hd_tb_per_chip)))

    storage_vms = max(1, storage_cores // 32)
    compute_vms = max(1, compute_cores // 64)
    net_vms = max(1, networking_cores // 16)

    storage_shape = (
        f"{storage_vms}x c4d-standard-32-lssd (Spillover: n4d-standard-32) + "
        f"{high_iops_disk_tb} TB HIGH_IOPS_DISK_ML / HIGH_IOPS_DISK_BALANCED + GCS BUCKET_QUERY"
    )
    compute_shape = (
        f"{compute_vms}x n4d-standard-64 (DFE Rank: N4D > N4 > C4D > C4A > C3 > N2D)"
    )
    networking_shape = (
        f"{net_vms}x n4-highcpu-16 (Spillover: c4d-highcpu-16 w/ Tier_1 gVNIC PSC/NAT)"
    )

    total_classic_cores = storage_cores + compute_cores + networking_cores
    incremental_netted_cores = max(0, total_classic_cores - int(current_project_cores or 0))

    is_hot = norm_region in HOT_REGIONS
    regional_classic_net_supply = 14000 if is_hot else 42000
    pct_regional_supply = round((incremental_netted_cores / regional_classic_net_supply) * 100.0, 1)

    triggers_companion = (
        pct_regional_supply > 20.0
        or incremental_netted_cores >= 5000
        or high_iops_disk_tb >= 250
        or (is_hot and incremental_netted_cores >= 2000)
    )

    trigger_reasons = []
    if pct_regional_supply > 20.0:
        trigger_reasons.append(f"Exceeds >20% Regional Net Supply Gate ({pct_regional_supply}% of {norm_region} pool)")
    if incremental_netted_cores >= 5000:
        trigger_reasons.append(f"Companion Classic Compute/Storage >= 5,000 cores ({incremental_netted_cores:,} netted cores)")
    if high_iops_disk_tb >= 250:
        trigger_reasons.append(f"HighIOPSDisk footprint >= 250 TB ({high_iops_disk_tb:,} TB HIGH_IOPS_DISK_BALANCED/ML)")
    if is_hot and incremental_netted_cores >= 2000:
        trigger_reasons.append(f"Placed in Hot/Constrained Region ({norm_region}) with >= 2,000 companion cores")

    return {
        "companion_storage_machine_shape": storage_shape,
        "companion_storage_cores": storage_cores,
        "companion_compute_machine_shape": compute_shape,
        "companion_compute_cores": compute_cores,
        "companion_networking_machine_shape": networking_shape,
        "companion_networking_cores": networking_cores,
        "high_iops_disk_tb": high_iops_disk_tb,
        "total_companion_cores": total_classic_cores,
        "incremental_netted_cores": incremental_netted_cores,
        "regional_classic_net_supply": regional_classic_net_supply,
        "pct_of_regional_net_supply": pct_regional_supply,
        "requires_companion_review": triggers_companion,
        "trigger_reasons": trigger_reasons,
        "dfe_machine_rank": "N4D > N4 > C4D > C4A > C3D > C3 > N2D > N2 > N1",
        "dfe_region_rank": (
            f"us-south1 (Cold) > us-east5 (Cold) > us-central2 (Cold) > {norm_region} (Requested)"
            if is_hot
            else f"{norm_region} (Cold: High Headroom) > us-south1 > us-east5"
        ),
    }


def compute_allocation_score(payload: Dict[str, Any], regional_rows: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    chip_type = payload.get("chip_type") or "B200"
    asp_raw = payload.get("negotiated_asp_hourly")
    tenure = payload.get("customer_tenure_type") or "New Net"
    existing_asp = payload.get("existing_billing_asp_hourly")
    cud = payload.get("cud_duration") or "3 yr CUD"
    non_std_months = int(payload.get("non_standard_cud_length_months") or 24)
    dc_pref = payload.get("datacenter_preference") or "US-Central 1"
    ramp = payload.get("ramp_readiness") or "Immediately"
    prepay_scale = int(payload.get("prepayment_scale") or 0)
    workloads = payload.get("co_located_workloads") or []
    chips_desired = int(payload.get("chips_desired") or 256)

    target_asp = CHIP_TARGET_ASP.get(chip_type, 3.00)

    is_complete = True
    asp_val: Optional[float] = None
    try:
        if asp_raw is None or str(asp_raw).strip() == "":
            is_complete = False
        else:
            asp_val = float(asp_raw)
            if asp_val <= 0:
                is_complete = False
    except (ValueError, TypeError):
        is_complete = False

    if not is_complete or asp_val is None:
        p_asp = 0.0
        r_target = 0.0
    else:
        r_target = asp_val / target_asp
        if r_target >= 1.10:
            p_asp_base = 22.0
        elif r_target >= 1.00:
            p_asp_base = 18.0 + 40.0 * (r_target - 1.00)
        elif r_target >= 0.85:
            p_asp_base = 10.0 + 53.33 * (r_target - 0.85)
        elif r_target >= 0.70:
            p_asp_base = 3.0 + 46.67 * (r_target - 0.70)
        else:
            p_asp_base = 0.0

        if tenure == "New Net":
            p_asp_uplift = 3.0 if r_target >= 1.0 else 2.0
        else:
            ex_val = float(existing_asp) if existing_asp not in (None, "") else target_asp
            if asp_val > ex_val:
                p_asp_uplift = 3.0
            elif abs(asp_val - ex_val) < 1e-4:
                p_asp_uplift = 1.5
            else:
                p_asp_uplift = 0.0
        p_asp = round(min(25.0, p_asp_base + p_asp_uplift), 1)

    if "5" in str(cud):
        p_cud = 20.0
    elif cud == "3 yr CUD":
        p_cud = 17.0
    elif cud == "Non-Standard CUD":
        if non_std_months >= 60:
            p_cud = 20.0
        elif non_std_months >= 36:
            p_cud = 17.0
        elif non_std_months > 12:
            p_cud = round(12.0 + 5.0 * ((non_std_months - 12) / 24.0), 1)
        else:
            p_cud = round(max(4.0, 12.0 * (non_std_months / 12.0)), 1)
    elif cud == "1 yr CUD":
        p_cud = 12.0
    elif cud == "FlexStart":
        p_cud = 8.0
    else:
        p_cud = 2.0

    prepay_clamped = max(0, min(10, prepay_scale))
    p_prepay = round(1.5 * prepay_clamped, 1)

    if ramp == "Immediately":
        p_ramp = 15.0
    elif ramp == "Within 30 Days":
        p_ramp = 10.0
    else:
        p_ramp = 3.0

    norm_reg = normalize_region_name(dc_pref)
    bq_chip_id = FORM_CHIP_TO_BQ_ID.get(chip_type, "nvidia-b200")
    reg_status = "ALLOCATION_ONLY"
    avail_chips = 0
    if regional_rows:
        for r in regional_rows:
            if r.get("chip_id") == bq_chip_id and r.get("region") == norm_reg:
                reg_status = r.get("on_demand_status") or "AVAILABLE_IN_ZONES"
                avail_chips = int(r.get("available_allocatable_chips") or 0)
                break

    if dc_pref == "Global / Flexible":
        p_flex = 10.0
    elif "only" in dc_pref.lower():
        p_flex = 7.5
    elif reg_status == "HIGH_OD_CAPACITY" or norm_reg not in HOT_REGIONS:
        p_flex = 5.5
    else:
        p_flex = 2.0

    p_attach = 0.0
    for w in workloads:
        wl = w.lower()
        if "foundation_llm" in wl or "1p" in wl:
            p_attach += 2.5
        elif "tpu" in wl or "gpu" in wl:
            p_attach += 2.5
        elif "model_hub" in wl:
            p_attach += 2.0
        elif "data" in wl and "database" not in wl:
            p_attach += 1.5
        elif "database" in wl:
            p_attach += 1.5
    p_attach = round(min(10.0, p_attach), 1)

    p_profile = 5.0 if tenure == "New Net" else 4.0

    total_score = round(p_asp + p_cud + p_prepay + p_ramp + p_flex + p_attach + p_profile, 1)

    if not is_complete:
        tier = "INCOMPLETE_SCORE (Missing Pure Numeric ASP)"
    elif total_score >= 85.0:
        tier = "Tier 1: Recommend Approve — Human Council Decision"
    elif total_score >= 65.0:
        tier = "Tier 2: High Priority (Regional Stack Rank)"
    elif total_score >= 45.0:
        tier = "Tier 3: Standard / Negotiate Commercial Levers"
    else:
        tier = "Tier 4: Counter-Propose (Trigger Post-Rejection Playbook)"

    spot_eligible = (
        is_complete
        and (reg_status == "HIGH_OD_CAPACITY" or avail_chips >= chips_desired)
        and chips_desired <= 256
        and ramp == "Immediately"
    )

    coaching_tips: List[str] = []
    if not is_complete:
        coaching_tips.append(
            f"CRITICAL: Provide a pure numeric hourly ASP (Target for {chip_type} is ${target_asp:.2f}/hr/chip) to unlock up to +25.0 pts."
        )
    elif asp_val and asp_val < target_asp:
        delta_pts = round(21.0 - p_asp, 1)
        if delta_pts > 0:
            coaching_tips.append(
                f"Negotiating ASP from ${asp_val:.2f} to target ${target_asp:.2f}/hr/chip adds +{delta_pts} pts."
            )
    if "5" not in str(cud):
        coaching_tips.append(
            f"Upgrading commitment from '{cud}' to '5 yr CUD' adds +{round(20.0 - p_cud, 1)} pts."
        )
    if prepay_clamped < 5:
        coaching_tips.append(
            f"Adding 50% upfront prepayment (Level 5) adds +{round(7.5 - p_prepay, 1)} pts."
        )
    if p_flex < 7.5:
        coaching_tips.append(
            f"Broadening Data Center Preference from '{dc_pref}' to 'NorthAm only' or a Cold region (us-south1 / us-east5) adds +{round(7.5 - p_flex, 1)} pts."
        )

    return {
        "is_complete": is_complete,
        "total_score": total_score,
        "priority_tier": tier,
        "target_asp_hourly": target_asp,
        "spot_allocation_eligible": spot_eligible,
        "normalized_cloud_region": norm_reg,
        "regional_supply_status": reg_status,
        "regional_available_chips": avail_chips,
        "dimensions": {
            "asp_margin_score": p_asp,
            "asp_margin_max": 25.0,
            "cud_duration_score": p_cud,
            "cud_duration_max": 20.0,
            "prepayment_score": p_prepay,
            "prepayment_max": 15.0,
            "ramp_readiness_score": p_ramp,
            "ramp_readiness_max": 15.0,
            "dc_flexibility_score": p_flex,
            "dc_flexibility_max": 10.0,
            "platform_1p_attach_score": p_attach,
            "platform_1p_attach_max": 10.0,
            "customer_profile_score": p_profile,
            "customer_profile_max": 5.0,
        },
        "coaching_tips": coaching_tips,
    }


def compute_dfe_flexibility_score(
    dfe_machine_rank: str,
    willing_hot_to_cold: bool,
    zonal_requirements: str,
    discount_structure: str,
    uses_high_iops_disk: bool = True,
    ramp_expectation: str = "Immediate",
) -> Dict[str, Any]:
    families = [x.strip() for x in (dfe_machine_rank or "").split(">") if x.strip()]
    has_gen4 = any(f.upper().startswith(("N4", "C4")) for f in families)

    s_machine = 25 if (len(families) >= 3 and has_gen4) else (15 if len(families) >= 2 else 5)
    s_region = 25 if (willing_hot_to_cold and "multi" in (zonal_requirements or "").lower()) else (15 if willing_hot_to_cold else 5)
    s_comm = 20 if "flex" in (discount_structure or "").lower() else (12 if "cud" in (discount_structure or "").lower() else 5)
    s_storage = 15 if uses_high_iops_disk else 5
    s_time = 15 if ramp_expectation != "Immediate" else 10

    total = s_machine + s_region + s_comm + s_storage + s_time
    if total >= 75:
        badge = "High"
    elif total >= 45:
        badge = "Moderate"
    else:
        badge = "Low"

    return {
        "dfe_numeric_score": total,
        "flexibility_score": badge,
        "breakdown": {
            "machine_fungibility": s_machine,
            "regional_zonal_mobility": s_region,
            "commercial_posture": s_comm,
            "storage_modernization": s_storage,
            "timeline_optionality": s_time,
        },
    }


REGISTRY_CDR_CATALOG: List[Dict[str, Any]] = [
    {
        "cdr_id": "CDR-SYNTH-4882",
        "workload_id": "WL-SYNTH-9411",
        "bug_id": "CCA-SYNTH-4882",
        "customer_name": "Northstar Frontier AI (Synthetic)",
        "sfid": "SFDC-SYNTH-001",
        "region": "us-east5",
        "dfe_region_rank": "us-east5 > us-central1 > us-south1",
        "zonal_requirements": "Multi-Zone",
        "product_family": "GCE",
        "sub_product": "C4",
        "dfe_machine_rank": "C4 > N4D > N4 > C3",
        "demand_start_date": "2026-12-01",
        "total_max_value": 11800,
        "current_project_consumption": 2400,
        "incremental_netted_demand": 9400,
        "regional_net_supply": 36000,
        "pct_of_regional_net_supply": 26.1,
        "registry_status": "Pending Companion Review",
        "priority_for_review": True,
        "validated_accurate": True,
    },
    {
        "cdr_id": "CDR-SYNTH-4889",
        "workload_id": "WL-SYNTH-8820",
        "bug_id": "CCA-SYNTH-4889",
        "customer_name": "Stratos Autonomous Robotics (Synthetic)",
        "sfid": "SFDC-SYNTH-002",
        "region": "us-central1",
        "dfe_region_rank": "us-central1 > us-south1 > us-east5",
        "zonal_requirements": "Multi-Zone",
        "product_family": "GCE",
        "sub_product": "C4",
        "dfe_machine_rank": "C4 > N4 > C3",
        "demand_start_date": "2026-11-28",
        "total_max_value": 8000,
        "current_project_consumption": 1800,
        "incremental_netted_demand": 6200,
        "regional_net_supply": 24000,
        "pct_of_regional_net_supply": 25.8,
        "registry_status": "Pending Companion Review",
        "priority_for_review": True,
        "validated_accurate": True,
    },
]


def get_initial_seed_state(regional_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generates synthetic initial seed state."""
    return {
        "allocation_requests": [],
        "companion_cards": [],
        "sla_obligations": [],
        "audit_log": [],
    }

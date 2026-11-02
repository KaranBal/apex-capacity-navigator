# Apex AI Capacity Navigator

**Hyperscale AI Compute Allocation, Demand Forecasting & Agentic Deal Governance Prototype (100% Synthetic Data)**

Apex AI Capacity Navigator is a full-stack decision-support and capacity-governance web application for hyperscale AI infrastructure operations. It unifies four operational pillars into a single control plane:

1. **Pillar 1 — Multi-Step Agentic Deal Evaluator**: Parses unstructured deal notes into structured capacity requests, validates 5-pillar companion infrastructure (Accelerator + Host CPU + Parallel Storage + Network + Egress Gbps), enforces 14-day utilization and 80% capital solvency guardrails, and drafts human-in-the-loop council memos.
2. **Pillar 2 — Regional Demand Forecasting & Supply Alignment**: Decomposes demand into Committed Reservations, Stage- & Score-Weighted Pipeline (`P50 / P75 / P90`), and Run-Rate Buffer against gross and reliability-buffered supply, backed by a 6-month historical backtest (`6.8% WMAPE` vs. `34.2%` raw unweighted pipeline).
3. **Pillar 3 — Transparent 100-Point Allocation Governance**: Ranks large-scale accelerator requests using a deterministic 100-point rubric (`5-Yr > 3-Yr > 1-Yr` commitment hierarchy, linear upfront cash prepayment bonus, flexibility incentives, and a `-25 pt` hard block on unresolved 14-day utilization breaches) coupled with a `>20%` regional companion infrastructure gate.
4. **Pillar 4 — Field Enablement & Alternative Pathways**: Provides a 2-persona RBAC workspace (`OPS_CENTRAL` vs. `FIELD_REP` with Need-to-Know masking) and a 1-click Post-Rejection Playbook that generates phased seed-pod counter-offers, Kubernetes Custom ComputeClass manifests, and customer-ready communications.

---

## Quick Start (Local Development)

### 1. Build the Frontend (`React + TypeScript + Vite`)
```bash
npm --prefix frontend install
npm --prefix frontend run build
```

### 2. Run the FastAPI Server (`Python 3.11+`)
```bash
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8080
```

Then open `http://localhost:8080` in your browser.

---

## Disclaimer
All customer names (`Northstar`, `Stratos`, `Nimbus`, `Helios`, `Kinetix`), ticket IDs, pricing benchmarks, and regional supply figures in this repository are **100% synthetic** and created solely for architectural demonstration.

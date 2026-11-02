import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  Search,
  Calculator,
  ShieldCheck,
  DollarSign,
  Sparkles,
  RefreshCw,
  Layers,
  Lock,
  Unlock,
} from 'lucide-react';
import { VERIFIED_CORPORATE_LINKS } from './IntegrationLinkGuard';

interface TrackerPursuit {
  pursuit_id: string;
  account_name: string;
  nal_segment: string;
  date_added: string;
  sku_tab: string;
  chip_type: string;
  sku_code: string;
  readiness_stage: string;
  stage_badge: string;
  min_chips: number;
  max_chips: number;
  cud_term: string;
  customer_bid_price_hr: number;
  benchmark_price_hr: number;
  price_vs_benchmark_status: string;
  tcv_usd_m: number;
  region_requirement: string;
  vector_workload_url: string | null;
  accelerator_cca_id: string;
  accelerator_cca_url: string | null;
  storage_cca_status: string;
  storage_cca_url: string | null;
  networking_cca_status: string;
  networking_cca_url: string | null;
  compute_cca_status: string;
  compute_cca_url: string | null;
  cns_completeness_score: string;
  intake_form_submitted_by: string;
  cem_review_signoff: string;
  fsm: string;
  cem: string;
  fsr: string;
  ce: string;
  ai_infra_gtm: string;
  ai_infra_ce: string;
  ai_infra_fsa: string;
  executive_brief_url: string | null;
  special_deal_structure_flag: string | null;
  commentary: string;
}

interface BenchmarkSkuRow {
  sku_code: string;
  tab_name: string;
  chip_label: string;
  vm_family: string;
  hardware_category: string;
  list_price_hr: number;
  flex_start_flex_hr: number;
  flex_start_calendar_hr: number;
  cud_1yr_benchmark_hr: number;
  cud_3yr_benchmark_hr: number;
  mega_cluster_floor_hr: number;
  notes: string;
}

interface Props {
  activePersonaEmail: string;
  ntkViewMode?: 'GLOBAL_FLEET' | 'TERRITORY_REDACTED' | 'TERRITORY_STRICT';
  onRefreshLedger?: () => void;
}

const SKU_TAB_OPTIONS = [
  { id: 'ALL', label: 'All Tracker Tabs' },
  { id: 'GOING_TO_ALLOCATION', label: '★ Going to Allocation This Week' },
  { id: 'H100', label: 'H100 Mega (A3 Mega)' },
  { id: 'H200', label: 'H200 (A3 Ultra)' },
  { id: 'B200', label: 'B200 (A4)' },
  { id: 'G4', label: 'G4 (RTX PRO 6000)' },
  { id: 'GB200_GB300', label: 'GB200 / GB300 (A4X)' },
  { id: 'TPU_V6E', label: 'AI-ASIC v6e' },
  { id: 'TPU_V7X', label: 'NextGen-ASIC v7x' },
  { id: 'VR200', label: 'VR200 (Vera Rubin)' },
  { id: 'C4A_A100', label: 'C4A ARMServer / A100' },
];

export function isPursuitInAssignedTerritory(p: TrackerPursuit): boolean {
  const blob = `${p.ai_infra_ce || ''} ${p.ce || ''} ${p.account_name || ''}`.toLowerCase();
  return (
    blob.includes('field specialist ce') ||
    blob.includes('field-specialist-ce') ||
    blob.includes('northstar') ||
    blob.includes('stratos') ||
    blob.includes('vectoria') ||
    blob.includes('cascade')
  );
}

export const InfraCapacityTrackerPanel: React.FC<Props> = ({
  activePersonaEmail,
  ntkViewMode = 'GLOBAL_FLEET',
  onRefreshLedger,
}) => {
  const [activeSubView, setActiveSubView] = useState<'PURSUITS' | 'CUD_SWAP' | 'BENCHMARK_MATRIX'>('PURSUITS');
  const [pursuits, setPursuits] = useState<TrackerPursuit[]>([]);
  const [benchmarkMatrix, setBenchmarkMatrix] = useState<BenchmarkSkuRow[]>([]);
  const [summaryKpis, setSummaryKpis] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [skuTabFilter, setSkuTabFilter] = useState<string>('ALL');
  const [nalFilter, setNalFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [validatingId, setValidatingId] = useState<string | null>(null);

  // Stranded CUD Value-Swap Calculator State (matches POST /api/v1/tracker/cud-swap-calculator)
  const [swapForm, setSwapForm] = useState({
    customer_name: 'Zephyr Edge Compute (Synthetic) — CCA-SYNTH-405',
    source_sku: 'G4 (RTX PRO 6000)',
    source_chips: 64,
    source_rate_hr: 1.98,
    remaining_hours: 23795,
    target_sku: 'H100 Mega (a3-megagpu-8g)',
    target_rate_hr: 5.08,
    target_term_months: 36,
    node_granularity: 8,
    include_upgrade_clause: false,
    upgrade_target_sku: 'VR200 (Vera Rubin) / TPU v7x after Month 24',
  });
  const [swapResult, setSwapResult] = useState<any>(null);
  const [calculatingSwap, setCalculatingSwap] = useState<boolean>(false);

  const fetchTrackerData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (skuTabFilter !== 'ALL') params.set('sku_tab', skuTabFilter);
      if (nalFilter !== 'ALL') params.set('nal_segment', nalFilter);
      if (stageFilter !== 'ALL') params.set('readiness_stage', stageFilter);
      if (ownerFilter !== 'ALL') params.set('owner', ownerFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/v1/tracker/pursuits?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPursuits(data.pursuits || []);
        setBenchmarkMatrix(data.benchmark_pricing_matrix || []);
        setSummaryKpis(data.summary_kpis || null);
      }
    } catch (err) {
      console.error('Failed to load tracker pursuits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, [skuTabFilter, nalFilter, stageFilter, ownerFilter, ntkViewMode]);

  const handleRunCudSwap = async (overrideForm?: typeof swapForm, logTx: boolean = true) => {
    const payload = overrideForm || swapForm;
    setCalculatingSwap(true);
    try {
      const res = await fetch('/api/v1/tracker/cud-swap-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          actor_ldap: activePersonaEmail,
          log_transaction: logTx,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSwapResult(data);
        if (logTx && onRefreshLedger) onRefreshLedger();
      }
    } catch (err) {
      console.error('CUD Swap calculation error:', err);
    } finally {
      setCalculatingSwap(false);
    }
  };

  useEffect(() => {
    if (activeSubView === 'CUD_SWAP' && !swapResult) {
      handleRunCudSwap(undefined, false);
    }
  }, [activeSubView]);

  const handleValidateFirmGate = async (pursuit: TrackerPursuit) => {
    setValidatingId(pursuit.pursuit_id);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/tracker/validate-firm-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pursuit_id: pursuit.pursuit_id,
          cem_reviewer: pursuit.cem || activePersonaEmail.split('@')[0],
          actor_ldap: activePersonaEmail,
        }),
      });
      if (res.ok) {
        await res.json();
        setToastMsg(
          `Validated all 6 FIRM readiness gates for ${pursuit.account_name} (${pursuit.accelerator_cca_id}) and promoted to *GOING TO ALLOCATION THIS WEEK*!`
        );
        setTimeout(() => setToastMsg(null), 5000);
        await fetchTrackerData();
        if (onRefreshLedger) onRefreshLedger();
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(
          errData.detail ||
            `HARD BLOCK: Cannot promote ${pursuit.account_name} to Allocation while an active 14-day utilization SLA breach exists.`
        );
      }
    } catch (err) {
      console.error('Failed to validate FIRM gate:', err);
    } finally {
      setValidatingId(null);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-6 space-y-5 shadow-xl">
      {/* Header & Ground-Truth Cloud Sheets Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Synthetic Deal Intake Sandbox (Illustrative Data)
            </span>
            <h3 className="text-lg font-bold text-white">
              Hyperscale Cloud AI Infra Deal Intake &amp; 5-Pillar Capacity Check (All Segments)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Step 1 Deal Intake across Enterprise, Digital Native &amp; Frontier accounts — verifying{' '}
            <strong className="text-emerald-300">Upfront Cash Prepay (Cash-Flow Priority)</strong>,{' '}
            <strong className="text-slate-200">5-Pillar Full-Stack Capacity (GPU, TPU, CPU, Storage &amp; Data Egress)</strong>,{' '}
            <strong className="text-slate-200">Published Reference CUD Rates</strong>, and{' '}
            <strong className="text-slate-200">Equal-or-Greater Value Contract Swaps</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={VERIFIED_CORPORATE_LINKS['capacity-registry'].url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            capacity-registry (External Customers)
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={VERIFIED_CORPORATE_LINKS['go/acc-prioritization'].url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5"
          >
            go/acc-prioritization (Intake)
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toastMsg}
          </span>
          <button onClick={() => setToastMsg(null)} className="text-emerald-300 hover:text-white text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-between gap-3">
          <span>🚫 {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-300 hover:text-white text-xs underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Strip */}
      {summaryKpis && ntkViewMode === 'GLOBAL_FLEET' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Matched Pursuits</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {summaryKpis.matched_pursuits_count}{' '}
              <span className="text-xs font-normal text-emerald-400">
                (${summaryKpis.total_tcv_usd_m}M TCV)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {summaryKpis.total_min_chips?.toLocaleString()}–{summaryKpis.total_max_chips?.toLocaleString()} Chips
            </div>
          </div>

          <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3">
            <div className="text-[11px] text-indigo-300 uppercase font-semibold">★ FIRM / Going to Allocation</div>
            <div className="text-xl font-bold text-indigo-200 mt-0.5">
              {summaryKpis.firm_or_poc_ready_count}{' '}
              <span className="text-xs font-normal text-indigo-400">FIRM Pursuits</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              6-Point Readiness Gate Verified
            </div>
          </div>

          <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3">
            <div className="text-[11px] text-emerald-300 uppercase font-semibold">Clears Reference Floor</div>
            <div className="text-xl font-bold text-emerald-200 mt-0.5">
              {summaryKpis.clears_or_at_benchmark_count}{' '}
              <span className="text-xs font-normal text-emerald-400">Pursuits</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Customer Bid ≥ Reference CUD $/Hr
            </div>
          </div>

          <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3">
            <div className="text-[11px] text-amber-300 uppercase font-semibold">5-Pillar Full-Stack Check</div>
            <div className="text-xl font-bold text-amber-200 mt-0.5">
              5 Pillars{' '}
              <span className="text-xs font-normal text-amber-400">Enforced</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              GPU, TPU, CPU, Storage & Data Egress
            </div>
          </div>

          <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3">
            <div className="text-[11px] text-cyan-300 uppercase font-semibold">Allocated / Won</div>
            <div className="text-xl font-bold text-cyan-200 mt-0.5">
              {summaryKpis.allocated_or_won_count}{' '}
              <span className="text-xs font-normal text-cyan-400">Closed / Allocated</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Prism Media AI • Boreal Sovereign AI (Synthetic)
            </div>
          </div>
        </div>
      )}

      {/* Sub-View Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubView('PURSUITS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubView === 'PURSUITS'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Step 1 Deal Intake &amp; 5-Pillar Full-Stack Check ({ntkViewMode === 'GLOBAL_FLEET' ? pursuits.length : pursuits.filter(isPursuitInAssignedTerritory).length})
          </button>

          <button
            onClick={() => setActiveSubView('CUD_SWAP')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubView === 'CUD_SWAP'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Equal-or-Greater Value Contract Swap &amp; Next-Gen Refresh Calculator
          </button>

          <button
            onClick={() => setActiveSubView('BENCHMARK_MATRIX')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubView === 'BENCHMARK_MATRIX'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Target Price Floors &amp; FlexStart / Multi-Year Commitment Rates ($/Chip/Hr)
          </button>
        </div>

        <button
          onClick={fetchTrackerData}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Tracker
        </button>
      </div>

      {/* SUB-VIEW 1: 15-TAB DEMAND TRACKER & 4-PILLAR CNS CCA EXPLORER */}
      {activeSubView === 'PURSUITS' && (
        <div className="space-y-4">
          {/* SKU Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {SKU_TAB_OPTIONS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSkuTabFilter(tab.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  skuTabFilter === tab.id
                    ? 'bg-indigo-500 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Secondary Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTrackerData()}
                placeholder="Search synthetic customer, CCA-SYNTH-401, WL-SYNTH..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={nalFilter}
              onChange={(e) => setNalFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="ALL">All NAL Segments (Activation / Acquisition / Growth / MME)</option>
              <option value="Activation">Activation NAL</option>
              <option value="Acquisition">Acquisition NAL</option>
              <option value="Growth">Growth NAL</option>
              <option value="Mid-Market">Mid-Market (MME)</option>
            </select>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="ALL">All Readiness Stages</option>
              <option value="FIRM_GOING_TO_ALLOCATION">★ FIRM — Going to Allocation This Week</option>
              <option value="FIRM">FIRM (Ready for Allocation)</option>
              <option value="FIRM_POC">FIRM - PoC Capacity (Flex-Start)</option>
              <option value="CAPACITY_ALLOCATED_WON">Allocated / Closed Won</option>
              <option value="LIKELY_X">x - Likely (Pending Final Gate)</option>
              <option value="REQUALIFY_CHECK_CNS">Requalify — Check 5-Pillar Full-Stack Check</option>
              <option value="EARLY_Y">y - Early (2027 Pre-Booking)</option>
            </select>

            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="ALL">All AI Infra GTM / CE Owners</option>
              <option value="Field Specialist CE">Field Specialist CE</option>
              <option value="Enterprise CE">Enterprise CE</option>
              <option value="GTM Specialist Lead">GTM Specialist Lead</option>
              <option value="Startup Specialist CE">Startup Specialist CE</option>
            </select>
          </div>

          {/* Pursuits Cards List */}
          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {pursuits
              .filter((p) => (ntkViewMode !== 'GLOBAL_FLEET' ? isPursuitInAssignedTerritory(p) : true))
              .map((p) => {
              const inTerritory = isPursuitInAssignedTerritory(p);
              const isRedacted = false;
              const isGoingToAllocation = p.readiness_stage === 'FIRM_GOING_TO_ALLOCATION' || p.sku_tab === 'GOING_TO_ALLOCATION';
              const isFirm =
                isGoingToAllocation ||
                p.readiness_stage === 'FIRM' ||
                p.readiness_stage === 'FIRM_POC' ||
                p.readiness_stage === 'CAPACITY_ALLOCATED_WON';
              const needsCnsRequalify = p.readiness_stage === 'REQUALIFY_CHECK_CNS';

              return (
                <div
                  key={p.pursuit_id}
                  className={`rounded-xl p-4 border transition-all ${
                    isRedacted
                      ? 'bg-slate-950/60 border-slate-800/80 opacity-85'
                      : isGoingToAllocation
                      ? 'bg-indigo-950/25 border-indigo-500/40'
                      : needsCnsRequalify
                      ? 'bg-amber-950/15 border-amber-500/30'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    {/* Left Column: Customer, SKU, Account Governance Chain */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isRedacted ? (
                          <span className="text-sm font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            [NTK Redacted — Out-of-Territory Account • {p.pursuit_id}]
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-white">{p.account_name}</span>
                        )}

                        {inTerritory ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Unlock className="w-3 h-3" />
                            NTK Authorized (Assigned Territory)
                          </span>
                        ) : ntkViewMode === 'GLOBAL_FLEET' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            Global Fleet Admin View ({p.ai_infra_ce} Territory)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Outside Assigned Territory ({p.nal_segment} NAL)
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {p.chip_type} ({p.min_chips === p.max_chips ? `${p.max_chips}` : `${p.min_chips}–${p.max_chips}`} Chips)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">
                          {p.nal_segment} NAL
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isFirm
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : needsCnsRequalify
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {p.stage_badge}
                        </span>
                      </div>

                      {/* Account Team & CEM Governance Line */}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                        <span>
                          <strong className="text-slate-300">AI Infra GTM/CE:</strong> {p.ai_infra_gtm} / {p.ai_infra_ce}
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-slate-300">FSM:</strong> {p.fsm}
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-slate-300">FSR:</strong> {isRedacted ? '🔒 [NTK Restricted]' : p.fsr}
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-slate-300">CE:</strong> {p.ce}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-300 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          CEM ({p.cem}): {p.cem_review_signoff}
                        </span>
                      </div>

                      {/* Special Deal Structure & Technical Notes */}
                      {p.special_deal_structure_flag && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>Deal Structure: {p.special_deal_structure_flag}</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {isRedacted
                          ? `🔒 Need-to-Know (NTK) Territory ACL: Customer identity, commercial bid pricing, and deal commentary are restricted to the assigned Salesforce AccountTeamMember & Buganizer CCA ACL (${p.ai_infra_ce} / ${p.fsm} territory). Hardware ask (${p.min_chips}–${p.max_chips}x ${p.sku_code} in ${p.region_requirement}) remains visible for regional capacity queue contention.`
                          : p.commentary}
                      </p>
                    </div>

                    {/* Right Column: Reference CUD Pricing Comparison & 6-Point Gate Action */}
                    <div className="flex flex-col items-end justify-between gap-2 min-w-[260px] bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      <div className="w-full flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">
                          Bid vs. Reference ({p.cud_term})
                        </span>
                        <span className="text-xs font-bold text-white">
                          {isRedacted ? '🔒 $**.*M TCV (NTK)' : `$${p.tcv_usd_m.toFixed(2)}M TCV`}
                        </span>
                      </div>

                      <div className="w-full flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-300">
                          Bid:{' '}
                          <strong className="text-white">
                            {isRedacted ? '🔒 $*.**/hr' : `$${p.customer_bid_price_hr.toFixed(2)}/hr`}
                          </strong>{' '}
                          <span className="text-slate-500">vs</span> Ref Floor:{' '}
                          <strong className="text-indigo-300">${p.benchmark_price_hr.toFixed(2)}/hr</strong>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.price_vs_benchmark_status.includes('CLEARS')
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : p.price_vs_benchmark_status.includes('AT')
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {p.price_vs_benchmark_status.replace('BENCHMARK', 'FLOOR')}
                        </span>
                      </div>

                      <div className="w-full flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span className="truncate max-w-[240px]" title={p.region_requirement}>
                          Region: <strong className="text-slate-200">{p.region_requirement}</strong>
                        </span>
                      </div>

                      <div className="w-full flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-slate-300">
                          CNS Gate: <strong className="text-emerald-400">{p.cns_completeness_score}</strong>
                        </span>
                        {!isRedacted && !isGoingToAllocation && p.readiness_stage !== 'CAPACITY_ALLOCATED_WON' && (
                          <button
                            onClick={() => handleValidateFirmGate(p)}
                            disabled={validatingId === p.pursuit_id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {validatingId === p.pursuit_id ? 'Promoting...' : 'Validate & Send to Allocation'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Bar: 4-Pillar CNS + Accelerator CCAs & Vector / Doc Links */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
                    {isRedacted ? (
                      <div className="flex items-center gap-2 text-[11px] text-amber-300/90 font-mono">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          4-Pillar CCA IDs, Vector Workload IDs, and Customer Executive Brief Doc are locked to Assigned Territory ACL ({p.ai_infra_ce}). Switch to Global Fleet View (ops-capacity-lead@demo.example.com) in the top header to inspect.
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* 5-Pillar Full-Stack Check */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            4-Pillar CNS + GPU CCAs:
                          </span>

                          {p.accelerator_cca_url ? (
                            <a
                              href={p.accelerator_cca_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              GPU/TPU: {p.accelerator_cca_id}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                              GPU/TPU: {p.accelerator_cca_id}
                            </span>
                          )}

                          {p.storage_cca_url ? (
                            <a
                              href={p.storage_cca_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Storage: {p.storage_cca_status}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px]">
                              Storage: {p.storage_cca_status}
                            </span>
                          )}

                          {p.networking_cca_url ? (
                            <a
                              href={p.networking_cca_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Net: {p.networking_cca_status}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px]">
                              Net: {p.networking_cca_status}
                            </span>
                          )}

                          {p.compute_cca_url ? (
                            <a
                              href={p.compute_cca_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              CPU: {p.compute_cca_status}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px]">
                              CPU: {p.compute_cca_status}
                            </span>
                          )}
                        </div>

                        {/* Vector Workload & Exec Brief Links */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.vector_workload_url && (
                            <a
                              href={p.vector_workload_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono flex items-center gap-1"
                            >
                              Vector Link
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {p.executive_brief_url && (
                            <a
                              href={p.executive_brief_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1"
                            >
                              Customer Exec Brief Doc
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: STRANDED CUD VALUE-SWAP & NEXT-GEN UPGRADE CALCULATOR */}
      {activeSubView === 'CUD_SWAP' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                Stranded CUD Value-Swap &amp; 24-Month VR200 Upgrade Simulator
              </h4>
              <span className="text-[11px] text-slate-400">Synthetic CUD Value-Swap Scenarios</span>
            </div>

            {/* Synthetic Presets */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const preset = {
                    customer_name: 'Zephyr Edge Compute (Synthetic) — CCA-SYNTH-405',
                    source_sku: 'G4 (RTX PRO 6000)',
                    source_chips: 64,
                    source_rate_hr: 1.98,
                    remaining_hours: 23795,
                    target_sku: 'H100 Mega (a3-megagpu-8g)',
                    target_rate_hr: 5.08,
                    target_term_months: 36,
                    node_granularity: 8,
                    include_upgrade_clause: false,
                    upgrade_target_sku: 'VR200 (Vera Rubin) / TPU v7x after Month 24',
                  };
                  setSwapForm(preset);
                  handleRunCudSwap(preset, true);
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 text-xs font-semibold"
              >
                Preset 1: Zephyr Edge 64x G4 → 24x H100 Mega ($3.02M → $3.20M)
              </button>

              <button
                onClick={() => {
                  const preset = {
                    customer_name: 'Apex Cloud Systems (Synthetic) — CCA-SYNTH-406',
                    source_sku: 'H100 Mega (160x)',
                    source_chips: 160,
                    source_rate_hr: 3.50,
                    remaining_hours: 17520,
                    target_sku: 'B200 / GB300 (a4-highgpu-8g)',
                    target_rate_hr: 4.55,
                    target_term_months: 36,
                    node_granularity: 8,
                    include_upgrade_clause: true,
                    upgrade_target_sku: 'VR200 (Vera Rubin) after Month 24',
                  };
                  setSwapForm(preset);
                  handleRunCudSwap(preset, true);
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-semibold"
              >
                Preset 2: Apex Cloud B200/GB300 + 24-Mo VR200 Upgrade
              </button>

              <button
                onClick={() => {
                  const preset = {
                    customer_name: 'Vectoria Foundation Labs (Synthetic) — CCA-SYNTH-404',
                    source_sku: 'TPU v5p (4,096x Legacy Ask)',
                    source_chips: 4096,
                    source_rate_hr: 2.10,
                    remaining_hours: 26280,
                    target_sku: 'NextGen-ASIC v7x',
                    target_rate_hr: 3.78,
                    target_term_months: 36,
                    node_granularity: 64,
                    include_upgrade_clause: true,
                    upgrade_target_sku: 'Next-Gen Pod Refresh Option',
                  };
                  setSwapForm(preset);
                  handleRunCudSwap(preset, true);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-xs font-semibold"
              >
                Preset 3: Vectoria Labs v5p → v7x ASIC-v7 (41% MFU Benchmark)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="text-slate-400 block mb-1">Customer / Deal Reference</label>
                <input
                  type="text"
                  value={swapForm.customer_name}
                  onChange={(e) => setSwapForm({ ...swapForm, customer_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Stranded / Current SKU</label>
                <input
                  type="text"
                  value={swapForm.source_sku}
                  onChange={(e) => setSwapForm({ ...swapForm, source_sku: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Stranded Chips Qty</label>
                <input
                  type="number"
                  value={swapForm.source_chips}
                  onChange={(e) => setSwapForm({ ...swapForm, source_chips: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Current Rate ($/Chip/Hr)</label>
                <input
                  type="number"
                  step="0.01"
                  value={swapForm.source_rate_hr}
                  onChange={(e) => setSwapForm({ ...swapForm, source_rate_hr: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Remaining CUD Hours</label>
                <input
                  type="number"
                  value={swapForm.remaining_hours}
                  onChange={(e) => setSwapForm({ ...swapForm, remaining_hours: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Replacement SKU</label>
                <input
                  type="text"
                  value={swapForm.target_sku}
                  onChange={(e) => setSwapForm({ ...swapForm, target_sku: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Target Bid Rate ($/Chip/Hr)</label>
                <input
                  type="number"
                  step="0.01"
                  value={swapForm.target_rate_hr}
                  onChange={(e) => setSwapForm({ ...swapForm, target_rate_hr: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">New Commit Term (Months)</label>
                <input
                  type="number"
                  value={swapForm.target_term_months}
                  onChange={(e) => setSwapForm({ ...swapForm, target_term_months: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Node Granularity (Min 8 GPUs)</label>
                <input
                  type="number"
                  value={swapForm.node_granularity}
                  onChange={(e) => setSwapForm({ ...swapForm, node_granularity: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={swapForm.include_upgrade_clause}
                  onChange={(e) =>
                    setSwapForm({ ...swapForm, include_upgrade_clause: e.target.checked })
                  }
                  className="rounded border-slate-700"
                />
                Include Month-24 Next-Gen Upgrade Clause (VR200 / TPU v7x)
              </label>

              <button
                onClick={() => handleRunCudSwap(undefined, true)}
                disabled={calculatingSwap}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" />
                {calculatingSwap ? 'Calculating...' : 'Run CUD Value-Swap Analysis'}
              </button>
            </div>
          </div>

          {/* Swap Output Card */}
          <div className="lg:col-span-6 bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 space-y-4">
            {swapResult ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-xs text-emerald-400 font-bold uppercase">
                      Value-Neutral CUD Swap Verdict ({swapResult.tcv_preservation_pct}% TCV Preserved)
                    </div>
                    <h4 className="text-base font-bold text-white mt-0.5">{swapResult.customer_name}</h4>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ✓ {swapResult.recommended_target_chips}x CHIPS ({swapResult.recommended_nodes} NODES)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">Retired Stranded CUD Value</div>
                    <div className="text-base font-bold text-slate-200 mt-1">
                      ${(swapResult.remaining_value_usd / 1_000_000).toFixed(3)}M
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {swapResult.source_chips}x {swapResult.source_sku}
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">Replacement Commit TCV</div>
                    <div className="text-base font-bold text-emerald-300 mt-1">
                      ${(swapResult.new_tcv_usd / 1_000_000).toFixed(3)}M
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {swapResult.recommended_target_chips}x {swapResult.target_sku} ({swapResult.target_term_months}m)
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400">Net TCV Expansion Delta</div>
                    <div
                      className={`text-base font-bold mt-1 ${
                        swapResult.net_tcv_delta_usd >= 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {swapResult.net_tcv_delta_usd >= 0 ? '+' : ''}$
                      {(swapResult.net_tcv_delta_usd / 1_000).toFixed(1)}K
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {swapResult.tcv_preservation_pct}% Spend Preservation
                    </div>
                  </div>
                </div>

                {swapResult.include_upgrade_clause && (
                  <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1">
                    <div className="font-bold text-purple-300">
                      Month-24 Contractual Next-Gen Upgrade Clause:
                    </div>
                    <div>
                      Customer may exchange into <strong>{swapResult.upgrade_target_sku}</strong> at Month 24 subject to ≥100% remaining TCV preservation and 4-Pillar CNS CCA verification.
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <div className="font-bold text-white">Executive Deal Desk Summary:</div>
                  <p className="leading-relaxed">{swapResult.summary}</p>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400">Running CUD Value-Swap calculation...</div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: PUBLISHED CUD REFERENCE PRICING MATRIX */}
      {activeSubView === 'BENCHMARK_MATRIX' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                <th className="py-2.5 px-3">SKU Tab</th>
                <th className="py-2.5 px-3">Hardware SKU &amp; VM Family</th>
                <th className="py-2.5 px-3">List ($/hr)</th>
                <th className="py-2.5 px-3">Flex-Start / Cal ($/hr)</th>
                <th className="py-2.5 px-3">1-Yr CUD Ref (-30%)</th>
                <th className="py-2.5 px-3">3-Yr CUD Ref (-55%)</th>
                <th className="py-2.5 px-3">Mega Floor</th>
                <th className="py-2.5 px-3">Synthetic Deal Precedents &amp; Guidance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {benchmarkMatrix.map((row) => (
                <tr key={row.sku_code} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">{row.tab_name}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-white">{row.chip_label}</div>
                    <div className="text-[11px] font-mono text-slate-400">{row.vm_family}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">${row.list_price_hr?.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-cyan-300">
                    ${row.flex_start_flex_hr?.toFixed(2)} / ${row.flex_start_calendar_hr?.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">
                    ${row.cud_1yr_benchmark_hr?.toFixed(2)}/hr
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-300">
                    ${row.cud_3yr_benchmark_hr?.toFixed(2)}/hr
                  </td>
                  <td className="py-2.5 px-3 text-purple-300">
                    ${row.mega_cluster_floor_hr?.toFixed(2)}/hr
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 max-w-md">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

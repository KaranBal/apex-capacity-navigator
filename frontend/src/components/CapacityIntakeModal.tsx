import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  HardDrive,
  Network,
  Server,
  X,
  ArrowRight,
  Loader2,
  Bot,
  Activity,
} from 'lucide-react';
import { AllocationScoreBreakdown, CompanionCheckResult, DfeScorecardResult } from '../types';

interface CapacityIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (result: any) => void;
  activePersonaEmail: string;
}

const DEFAULT_FORM = {
  customer_name: 'Northstar Frontier AI (Synthetic)',
  vector_opportunity_id: 'VEC-SYNTH-2012',
  registry_cdr_id: 'CDR-SYNTH-4115',
  registry_cca_id: 'HZ-SYNTH-4115',
  telemetry_plan_id: 'GIB-SYNTH-8821',
  sub_region: 'NORTHAM-West-Strategic',
  account_executive_ldap: 'account-fsr@demo.example.com',
  ce_lead_ldap: 'field-specialist-ce@demo.example.com',
  specialist_ldap: 'gtm-specialist@demo.example.com',
  rvp_approver_ldap: 'ce-vp-approver@demo.example.com',
  chip_name: 'AI-ASIC v6e',
  requested_chips: 8192,
  primary_region: 'us-east5',
  alternate_regions: ['us-central1', 'us-south1'],
  ideal_start_date: '2026-11-20',
  must_have_by_date: '2026-12-20',
  target_delivery_date: '2026-12-01',
  flexible_delivery_window: true,
  consumption_model: '5-Yr CUD',
  deal_tcv_usd_m: 310.0,
  upfront_prepay_pct: 30,
  contract_stage: 'Contract Signed',
  contract_duration_months: 60,
  customer_tier: 'Strategic AI / Frontier Lab',
  technical_validation_stage: 'PoC Completed / Benchmark Verified',
  workload_type: 'Frontier Pre-Training & Production Inference',
  workload_description:
    'Synthetic 8,192-chip AI-ASIC v6e pod (5-Yr CUD with 30% upfront cash prepay) and coupled C4 coordinator nodes + ParallelFS.',
  willing_to_shift_generation: true,
  storage_dependency: 'Yes - ParallelFS / Lustre',
  storage_cores: 2800,
  compute_dependency: 'Yes - C4/C3 Host Coordinator Nodes',
  compute_cores: 5400,
  networking_dependency: 'Yes - Cross-Region RoCE / Cloud Interconnect',
  networking_cores: 1200,
  egress_gbps: 640,
  auto_create_companion_if_needed: true,
};

export const CapacityIntakeModal: React.FC<CapacityIntakeModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  activePersonaEmail,
}) => {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [nlPrompt, setNlPrompt] = useState(
    'Customer: Northstar Frontier AI (Synthetic). Requesting 8,192x AI-ASIC v6e chips in us-east5 (flexible to us-central1, us-south1), $310.0M 5-year (60m) CUD Contract Signed with 30% upfront cash prepay. Strategic AI / Frontier Lab tier, PoC Completed / Benchmark Verified. Companion footprint: 5,400 C4 host vCPUs, 2,800 ParallelFS storage vCPUs, 1,200 RoCE network vCPUs, and 640 Gbps data egress.'
  );
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simScore, setSimScore] = useState<AllocationScoreBreakdown | null>(null);
  const [simCompanion, setSimCompanion] = useState<CompanionCheckResult | null>(null);
  const [simDfe, setSimDfe] = useState<DfeScorecardResult | null>(null);

  // Multi-Step Agentic Deal Evaluator trace state
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [agentTraceResult, setAgentTraceResult] = useState<any | null>(null);

  const flexDays = React.useMemo(() => {
    const d1 = new Date(form.ideal_start_date);
    const d2 = new Date(form.must_have_by_date);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    return Number.isNaN(diff) ? 0 : Math.max(0, diff);
  }, [form.ideal_start_date, form.must_have_by_date]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/v1/allocation/score-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Role-Persona': activePersonaEmail,
          },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const data = await res.json();
          setSimScore(data.score_breakdown);
          setSimCompanion(data.companion_check);
          setSimDfe(data.dfe_scorecard);
        }
      } catch (e) {
        console.error(e);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [form, isOpen, activePersonaEmail]);

  if (!isOpen) return null;

  const syncFormFromParsed = (p: any) => {
    if (!p) return form;
    const nextForm = {
      ...form,
      customer_name: p.customer_name ?? form.customer_name,
      chip_name: p.chip_name ?? form.chip_name,
      requested_chips: Number(p.requested_chips ?? form.requested_chips),
      primary_region: p.primary_region ?? form.primary_region,
      alternate_regions: Array.isArray(p.alternate_regions)
        ? p.alternate_regions
        : form.alternate_regions,
      target_delivery_date: p.target_delivery_date ?? form.target_delivery_date,
      must_have_by_date: p.target_delivery_date ?? form.must_have_by_date,
      flexible_delivery_window:
        typeof p.flexible_delivery_window === 'boolean'
          ? p.flexible_delivery_window
          : form.flexible_delivery_window,
      consumption_model: p.consumption_model ?? form.consumption_model,
      deal_tcv_usd_m: Number(p.deal_tcv_usd_m ?? form.deal_tcv_usd_m),
      upfront_prepay_pct: Number(p.upfront_prepay_pct ?? 0),
      contract_stage: p.contract_stage ?? form.contract_stage,
      contract_duration_months: Number(
        p.contract_duration_months ?? form.contract_duration_months
      ),
      customer_tier: p.customer_tier ?? form.customer_tier,
      technical_validation_stage:
        p.technical_validation_stage ?? form.technical_validation_stage,
      workload_type: p.workload_type ?? form.workload_type,
      workload_description: p.workload_description ?? form.workload_description,
      willing_to_shift_generation:
        typeof p.willing_to_shift_generation === 'boolean'
          ? p.willing_to_shift_generation
          : form.willing_to_shift_generation,
      storage_dependency: p.storage_dependency ?? form.storage_dependency,
      storage_cores: Number(p.storage_cores ?? form.storage_cores),
      compute_dependency: p.compute_dependency ?? form.compute_dependency,
      compute_cores: Number(p.compute_cores ?? form.compute_cores),
      networking_dependency: p.networking_dependency ?? form.networking_dependency,
      networking_cores: Number(p.networking_cores ?? form.networking_cores),
      egress_gbps: Number(p.egress_gbps ?? form.egress_gbps),
    };
    setForm(nextForm);
    return nextForm;
  };

  const handleAiParse = async (customText?: string) => {
    const textToParse = (customText ?? nlPrompt).trim();
    if (!textToParse) return;
    setIsParsingAi(true);
    setAiSummary(null);
    try {
      const res = await fetch('/api/v1/ai/parse-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersonaEmail,
        },
        body: JSON.stringify({ raw_text: textToParse }),
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.parsed_payload || {};
        syncFormFromParsed(p);
        setAiSummary(
          p.ai_extraction_summary ||
            `Extracted intake fields using ${data.model}.`
        );
        await handleRunAgenticEvaluator({ raw_text: textToParse });
      }
    } finally {
      setIsParsingAi(false);
    }
  };

  const handleRunAgenticEvaluator = async (overridePayload?: any) => {
    setIsRunningAgent(true);
    try {
      const trimmedPrompt = nlPrompt.trim();
      const payloadToSend =
        overridePayload ||
        (trimmedPrompt ? { raw_text: trimmedPrompt } : { ...form });
      const res = await fetch('/api/v1/agent/evaluate-deal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersonaEmail,
        },
        body: JSON.stringify(payloadToSend),
      });
      if (res.ok) {
        const evalData = await res.json();
        setAgentTraceResult(evalData);
        if (evalData.parsed_intake && payloadToSend.raw_text) {
          syncFormFromParsed(evalData.parsed_intake);
        }
      }
    } finally {
      setIsRunningAgent(false);
    }
  };

  const handleApplyPreset = async (presetId: 'APPROVE' | 'BREACH' | 'COUNTER') => {
    if (presetId === 'APPROVE') {
      const text =
        'Customer: Northstar Frontier AI (Synthetic). Requesting 8,192x AI-ASIC v6e chips in us-east5 (flexible to us-central1, us-south1), $310.0M 5-year (60m) CUD Contract Signed with 30% upfront cash prepay. Strategic AI / Frontier Lab tier, PoC Completed / Benchmark Verified. Companion footprint: 5,400 C4 host vCPUs, 2,800 ParallelFS storage vCPUs, 1,200 RoCE network vCPUs, and 640 Gbps data egress.';
      setNlPrompt(text);
      await handleAiParse(text);
    } else if (presetId === 'BREACH') {
      const text =
        'Customer: Stratos Autonomous Robotics (Synthetic). Requesting 4,096x AI-ASIC v6e chips in us-central1 (flexible to us-east5), $128.0M 3-year (36m) CUD Contract Signed with 15% upfront cash prepay. Strategic AI / Frontier Lab tier, PoC Completed / Benchmark Verified. Companion footprint: 2,200 N4 host vCPUs, 1,200 HighIOPSDisk storage vCPUs, 400 network vCPUs, and 320 Gbps data egress.';
      setNlPrompt(text);
      await handleAiParse(text);
    } else {
      const text =
        'Customer: Helios Quantitative Trading (Synthetic). Requesting 1,536x NVIDIA GB200 NVL72 chips locked to us-east4 (strict single region, no shift), $85.0M 1-year (12m) CUD Proposal Submitted with 0% upfront prepay. Enterprise Focus tier, Architecture Approved by CE Specialist. Companion footprint: 4,200 C4 host vCPUs, 2,100 ParallelFS storage vCPUs, 800 interconnect vCPUs, and 180 Gbps data egress.';
      setNlPrompt(text);
      await handleAiParse(text);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/allocation/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersonaEmail,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated(data);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-white/95 dark:bg-[#0c0c0f]/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                DEAL INTAKE &amp; 4-STEP AI EVALUATOR (100% Synthetic Demo)
              </span>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Unified Deal Intake, 5-Pillar Companion Check &amp; Agentic Evaluator
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Pick one of the 3 preset scenarios below or paste any free-text deal note to parse fields and run the 4-step Agentic Deal Evaluator.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 columns: AI Parser + Form Fields */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-5">
            {/* ModelHub AI Deal Notes Parser + 3 Preset Deal Buttons */}
            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  ModelHub AI Natural Language Intake Parser (<code className="font-mono">llm-fast-router</code>)
                </div>
                <button
                  type="button"
                  onClick={() => handleAiParse()}
                  disabled={isParsingAi}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-all"
                >
                  {isParsingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Parsing &amp; Evaluating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Parse Free-Text &amp; Evaluate
                    </>
                  )}
                </button>
              </div>

              {/* 3 Preset Deal Scenario Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-blue-800 dark:text-blue-300">
                  Quick Presets:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('APPROVE')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                >
                  1. Northstar (8,192x TPU v6e • $310M • Recommend Approve)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('BREACH')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-600/15 hover:bg-rose-600/25 text-rose-800 dark:text-rose-300 border border-rose-500/30"
                >
                  2. Stratos (4,096x TPU v6e • $128M • Blocked by 14d Breach)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('COUNTER')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-600/15 hover:bg-amber-600/25 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                >
                  3. Helios (1,536x GB200 in us-east4 • $85M • Counter-Option Shift)
                </button>
              </div>

              <textarea
                rows={2}
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                placeholder="Paste synthetic customer email, Vector notes, or capacity-registry CCA details..."
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
              />
              {aiSummary && (
                <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{aiSummary}</span>
                </div>
              )}
            </div>

            {/* Section 1: Commercial & Opportunity Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  1. Customer / Account Name (Synthetic)
                </label>
                <input
                  type="text"
                  required
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  2. Customer Strategic Tier
                </label>
                <select
                  value={form.customer_tier}
                  onChange={(e) => setForm({ ...form, customer_tier: e.target.value })}
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                >
                  <option value="Strategic AI / Frontier Lab">Strategic AI / Frontier Lab</option>
                  <option value="Digital Native">Digital Native</option>
                  <option value="Enterprise Focus">Enterprise Focus</option>
                  <option value="Standard">Standard</option>
                  <option value="Early / Unverified Tier">Early / Unverified Tier</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  3. Vector Opportunity ID
                </label>
                <input
                  type="text"
                  value={form.vector_opportunity_id}
                  onChange={(e) => setForm({ ...form, vector_opportunity_id: e.target.value })}
                  className="w-full text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  4. Registry CCA / CDR Ticket (<code className="font-mono">capacity-registry</code>)
                </label>
                <input
                  type="text"
                  value={form.registry_cca_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      registry_cca_id: e.target.value,
                      registry_cdr_id: e.target.value,
                    })
                  }
                  placeholder="HZ-SYNTH-99410 or CDR-SYNTH-307110"
                  className="w-full text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  5. Accelerator SKU (<code className="font-mono">chip_specs</code>)
                </label>
                <select
                  value={form.chip_name}
                  onChange={(e) => setForm({ ...form, chip_name: e.target.value })}
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                >
                  <option value="NextGen-ASIC v7">NextGen-ASIC v7</option>
                  <option value="AI-ASIC v6e">AI-ASIC v6e</option>
                  <option value="TPU v5p">TPU v5p</option>
                  <option value="NVIDIA GB200 NVL72">NVIDIA GB200 NVL72</option>
                  <option value="NVIDIA B200">NVIDIA B200</option>
                  <option value="NVIDIA H200">NVIDIA H200</option>
                  <option value="NVIDIA H100">NVIDIA H100</option>
                  <option value="NVIDIA L4">NVIDIA L4</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  6. Requested Chips Count{' '}
                  <span className="text-[10px] font-mono text-blue-600">
                    ({form.requested_chips >= 5000 ? 'WHALE TIER (5,000+)' : form.requested_chips >= 64 ? 'TORSO BUCKET (64–5,000)' : 'TAIL BUCKET (≤64)'})
                  </span>
                </label>
                <input
                  type="number"
                  min={8}
                  step={8}
                  value={form.requested_chips}
                  onChange={(e) => setForm({ ...form, requested_chips: Number(e.target.value) })}
                  className="w-full text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  7. Primary Requested Region
                </label>
                <select
                  value={form.primary_region}
                  onChange={(e) => setForm({ ...form, primary_region: e.target.value })}
                  className="w-full text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                >
                  <option value="us-east5">us-east5 (Columbus)</option>
                  <option value="us-central1">us-central1 (Iowa - Cold Option)</option>
                  <option value="us-east4">us-east4 (Virginia - Hot)</option>
                  <option value="us-west1">us-west1 (Oregon)</option>
                  <option value="us-south1">us-south1 (Dallas - Cold Option)</option>
                  <option value="europe-west4">europe-west4 (Netherlands)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  8. Committed Deal TCV ($M USD)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={form.deal_tcv_usd_m}
                  onChange={(e) => setForm({ ...form, deal_tcv_usd_m: Number(e.target.value) })}
                  className="w-full text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                />
              </div>
            </div>

            {/* Commercial Cash-Flow Prepay & Contract Duration Controls */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                  9A. Upfront Cash Prepay % ({form.upfront_prepay_pct}% → +{Math.round((form.upfront_prepay_pct / 100) * 10 * 10) / 10} pts)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={form.upfront_prepay_pct}
                    onChange={(e) =>
                      setForm({ ...form, upfront_prepay_pct: Number(e.target.value) })
                    }
                    className="flex-1 accent-emerald-600 cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 w-12 text-right">
                    {form.upfront_prepay_pct}%
                  </span>
                </div>
                <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/70 mt-0.5">
                  Directly funds data center CapEx & improves Platform Free Cash Flow.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                  9B. Contract Duration (5-Yr &gt; 3-Yr &gt; 1-Yr)
                </label>
                <select
                  value={form.contract_duration_months}
                  onChange={(e) =>
                    setForm({ ...form, contract_duration_months: Number(e.target.value) })
                  }
                  className="w-full text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                >
                  <option value={60}>60 Months (5-Year CUD — 20/20 pts Full Useful Life)</option>
                  <option value={36}>36 Months (3-Year CUD — 17/20 pts Standard Commit)</option>
                  <option value={12}>12 Months (1-Year CUD — 14/20 pts Short Commit)</option>
                  <option value={1}>1–3 Months (Flex-Start / Calendar — 11/20 pts)</option>
                </select>
              </div>
            </div>

            {/* Dual Delivery Timeline: Ideal Start Date vs. Must-Have-By Date */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                  Dual Delivery Window: Ideal Start vs. Must-Have-By Date
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                    flexDays >= 21
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : flexDays >= 10
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  Flex Window: {flexDays} Days{' '}
                  {flexDays >= 21
                    ? '(+6 pt DFE Wave Match Boost)'
                    : flexDays < 10
                    ? '(Drop-Dead Risk: Seed Pod Required)'
                    : '(Moderate Buffer)'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-indigo-900 dark:text-indigo-200 mb-1">
                    8A. Ideal Start Date (Preferred Customer Ramp)
                  </label>
                  <input
                    type="date"
                    value={form.ideal_start_date}
                    onChange={(e) => setForm({ ...form, ideal_start_date: e.target.value })}
                    className="w-full text-sm font-mono rounded-lg border border-indigo-300 bg-white px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-rose-800 dark:text-rose-300 mb-1">
                    8B. Must-Have-By Date (Hard Drop-Dead Date)
                  </label>
                  <input
                    type="date"
                    value={form.must_have_by_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        must_have_by_date: e.target.value,
                        target_delivery_date: e.target.value,
                      })
                    }
                    className="w-full text-sm font-mono rounded-lg border border-rose-300 bg-white px-3 py-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  10. Contractual Commitment Stage
                </label>
                <select
                  value={form.contract_stage}
                  onChange={(e) => setForm({ ...form, contract_stage: e.target.value })}
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                >
                  <option value="Contract Signed">Contract Signed</option>
                  <option value="Committed Deal / Redlines">Committed Deal / Redlines</option>
                  <option value="Proposal Submitted">Proposal Submitted</option>
                  <option value="Early Pipeline / Uncommitted">Early Pipeline / Uncommitted</option>
                  <option value="Early / Unverified">Early / Unverified</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  11. Consumption Mechanism
                </label>
                <select
                  value={form.consumption_model}
                  onChange={(e) => setForm({ ...form, consumption_model: e.target.value })}
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                >
                  <option value="5-Yr CUD">5-Yr CUD</option>
                  <option value="3-Yr CUD">3-Yr CUD</option>
                  <option value="3-5Yr CUD">3-5Yr CUD</option>
                  <option value="1-Yr CUD">1-Yr CUD</option>
                  <option value="1-3Yr CUD">1-3Yr CUD</option>
                  <option value="Flex-Start / Calendar">Flex-Start / Calendar</option>
                  <option value="Flex-Start">Flex-Start</option>
                  <option value="Calendar Mode">Calendar Mode</option>
                  <option value="Spot Preemptible">Spot Preemptible</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  12. Technical Validation Stage
                </label>
                <select
                  value={form.technical_validation_stage}
                  onChange={(e) =>
                    setForm({ ...form, technical_validation_stage: e.target.value })
                  }
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                >
                  <option value="PoC Completed / Benchmark Verified">
                    PoC Completed / Benchmark Verified
                  </option>
                  <option value="Architecture Approved by CE Specialist">
                    Architecture Approved by CE Specialist
                  </option>
                  <option value="Discovery In Progress">Discovery In Progress</option>
                  <option value="Unverified / Discovery">Unverified / Discovery</option>
                </select>
              </div>
            </div>

            {/* DFE Flexibility Toggles */}
            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.flexible_delivery_window}
                  onChange={(e) =>
                    setForm({ ...form, flexible_delivery_window: e.target.checked })
                  }
                  className="rounded border-zinc-300 text-blue-600"
                />
                Flexible Delivery Date (+/- 30 Days)
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.willing_to_shift_generation}
                  onChange={(e) =>
                    setForm({ ...form, willing_to_shift_generation: e.target.checked })
                  }
                  className="rounded border-zinc-300 text-blue-600"
                />
                Open to Generation Shift (e.g., B200 ↔ ASIC-v7 / H200 ↔ ASIC-v6e)
              </label>
            </div>

            {/* Section 2: Mandatory 5-Pillar "Companion Check" Companion Classic Infra BOM */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  5-Pillar Full-Stack Check (GPU/TPU + CPU + Storage + Networking + Data Egress)
                </span>
                <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
                  &gt;20% Regional Supply = Auto Companion 2.0 Card
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" /> Storage Cores
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={form.storage_cores}
                    onChange={(e) =>
                      setForm({ ...form, storage_cores: Number(e.target.value) })
                    }
                    className="w-full text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Server className="w-3.5 h-3.5" /> Host CPU Cores
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={form.compute_cores}
                    onChange={(e) =>
                      setForm({ ...form, compute_cores: Number(e.target.value) })
                    }
                    className="w-full text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Network className="w-3.5 h-3.5" /> Net Cores
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={form.networking_cores}
                    onChange={(e) =>
                      setForm({ ...form, networking_cores: Number(e.target.value) })
                    }
                    className="w-full text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Egress (Gbps)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={form.egress_gbps}
                    onChange={(e) =>
                      setForm({ ...form, egress_gbps: Number(e.target.value) })
                    }
                    className="w-full text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'Submitting to Allocation Queue...' : 'Submit Allocation Intake & Sync DataWarehouse'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Right 5 columns: Live 0-100 Score Simulator, 5-Pillar Check & 4-Step Agentic Deal Evaluator */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1-Click Multi-Step Agentic Deal Evaluator */}
            <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-600 text-white">
                    PILLAR 1: AGENTIC TOOLS ENGINEERING
                  </span>
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 mt-1">
                    Multi-Step Agentic Deal Evaluator (`POST /api/v1/agent/evaluate-deal`)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleRunAgenticEvaluator()}
                  disabled={isRunningAgent}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Bot className="w-3.5 h-3.5" />
                  {isRunningAgent ? 'Thinking with Fast-Router LLM (~6–9s)...' : 'Run 4-Step Agent Trace'}
                </button>
              </div>
              {agentTraceResult && (
                <div className="space-y-2 pt-2 border-t border-indigo-200/70 dark:border-indigo-800/70 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-1 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 font-bold">
                      Verdict: {agentTraceResult.recommendation_status}
                    </span>
                    <span className="text-zinc-500">
                      Model: {agentTraceResult.ai_model} • {agentTraceResult.total_latency_ms}ms
                    </span>
                  </div>
                  {agentTraceResult.fields_not_provided?.length > 0 && (
                    <div className="text-[11px] font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                      Fields defaulted (not explicitly in prompt): {agentTraceResult.fields_not_provided.join(', ')}
                    </div>
                  )}
                  {agentTraceResult.tool_trace?.map((st: any) => (
                    <div
                      key={st.step}
                      className="p-2.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-indigo-200/60 dark:border-indigo-800/60 space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-indigo-700 dark:text-indigo-300">
                          Step {st.step}: {st.tool_name}()
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            st.status.includes('BLOCKED') || st.status.includes('ESCALATION')
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {st.status} • {st.latency_ms}ms
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300">{st.summary}</p>
                    </div>
                  ))}
                  {agentTraceResult.draft_allocation_memo && (
                    <pre className="p-2.5 rounded-lg bg-zinc-900 text-indigo-100 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                      {agentTraceResult.draft_allocation_memo}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {simScore && (
              <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                      Live Pre-Allocation Score Simulator
                    </span>
                    <h3
                      className={`text-sm font-bold mt-0.5 ${
                        simScore.has_active_utilization_breach
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {simScore.cutline_status}
                    </h3>
                  </div>
                  <div
                    className={`px-3.5 py-2 rounded-xl font-mono text-2xl font-bold ${
                      simScore.has_active_utilization_breach
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                        : simScore.total_score >= 80
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : simScore.total_score >= 65
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {simScore.total_score}
                    <span className="text-xs font-normal opacity-75">/100</span>
                  </div>
                </div>

                {/* Dimension Bars */}
                <div className="space-y-2.5">
                  {Object.entries(simScore.dimensions).map(([key, dim]) => {
                    const isPenalty = dim.score < 0;
                    const pct = isPenalty ? 100 : Math.round((dim.score / Math.max(1, dim.max)) * 100);
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span
                            className={`font-medium capitalize ${
                              isPenalty
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`font-mono font-semibold ${
                              isPenalty
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {dim.score}/{dim.max} pts
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isPenalty
                                ? 'bg-rose-600'
                                : pct >= 75
                                ? 'bg-emerald-500'
                                : pct >= 50
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {dim.rationale}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Coaching tips */}
                {simScore.coaching_tips.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Pre-Flight Deal Coaching (Increase Cut-Line Odds):
                    </div>
                    {simScore.coaching_tips.map((tip, idx) => (
                      <p key={idx} className="text-xs text-amber-800 dark:text-amber-200/90">
                        • {tip}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Coupled Companion Check Verdict */}
            {simCompanion && (
              <div
                className={`p-4 rounded-xl border ${
                  simCompanion.requires_companion_escalation
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    5-Pillar Companion BOM Verdict
                  </span>
                  <span className="font-mono text-xs font-bold">
                    {simCompanion.companion_pct_of_regional_supply}% of {form.primary_region} Supply
                  </span>
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-2">
                  {simCompanion.escalation_reason}
                </p>
                {simCompanion.requires_companion_escalation && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Submitting this Allocation request will automatically generate a linked 4-Tab Companion 2.0 Card in Tab 4!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

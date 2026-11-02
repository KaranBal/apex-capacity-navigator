import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Plus,
  Filter,
  ShieldCheck,
  Award,
  BookOpen,
  Cpu,
  DollarSign,
  RefreshCw,
  FileCheck2,
  X,
  ExternalLink,
} from 'lucide-react';
import { VERIFIED_CORPORATE_LINKS } from './IntegrationLinkGuard';

interface HistoricDecision {
  decision_id: string;
  decision_date: string;
  decision_forum: string;
  decision_outcome: string;
  customer_name: string;
  customer_segment: string;
  strategic_pod_vertical: string;
  sfdc_account_id: string;
  vector_opportunity_id: string;
  vector_workload_id: string;
  related_deal_id: string;
  requested_sku: string;
  requested_chips: number;
  requested_region: string;
  approved_sku: string;
  approved_chips: number;
  approved_region: string;
  consumption_mechanism: string;
  allocation_score_before: number;
  allocation_score_after: number;
  tcv_usd_m: number;
  commercial_incentive_applied: string;
  firm_readiness_status: string;
  vector_pbo_tagged: string;
  dfe_benchmark_cited: string;
  decision_maker_ldap: string;
  co_approver_ldap: string;
  decision_rationale: string;
  precedent_tags: string[];
  similarity_score?: number;
}

interface Props {
  activePersonaEmail: string;
  onRefreshParent?: () => void;
}

const PRECEDENT_QUICK_QUERIES = [
  {
    label: 'H100/H200 → G4 (RTX Pro 6000) or ASIC-v6e v6e Pivots',
    query:
      'Show historic decisions where H100 or H200 requests were pivoted to G4 (RTX PRO 6000 Blackwell) or AI-ASIC v6e using DFE price-performance benchmarks.',
  },
  {
    label: '>256 Chip CUD Renewals & <64 Chip FlexStart Gate',
    query:
      'Show historic decisions enforcing the >256 chip Renewal Deal-Room Reference Floor repricing rule and routing <64 chip deals to Flex-Start/Calendar instead of CUD.',
  },
  {
    label: 'Hot Region us-east4 Rejections & Cold Region Seed Pods',
    query:
      'Show historic rulings where constrained us-east4 GPU requests were rejected or shifted to Q1 2027 wave with an immediate Cold Region us-central1 seed pod.',
  },
  {
    label: 'Commercial Accelerators (Intel CDAC, Catalyst Lite, Propel, PSF)',
    query:
      'Which historic capacity decisions applied Intel CDAC ($500K 50/50 match), Catalyst Lite, Propel funding, PSF, or NVIDIA GPU Trials?',
  },
];

export const HistoricDecisionsTab: React.FC<Props> = ({
  activePersonaEmail,
  onRefreshParent,
}) => {
  const [decisions, setDecisions] = useState<HistoricDecision[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [playbookData, setPlaybookData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchText, setSearchText] = useState<string>('');
  const [forumFilter, setForumFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL');
  const [segmentFilter, setSegmentFilter] = useState<string>('ALL');

  // Selected Decision for Master-Detail Drawer
  const [selectedDecision, setSelectedDecision] = useState<HistoricDecision | null>(null);

  // AI Precedent Lookup State
  const [lookupQuery, setLookupQuery] = useState<string>(
    PRECEDENT_QUICK_QUERIES[0].query
  );
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);

  // Log New Decision Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);
  const [showPlaybookRef, setShowPlaybookRef] = useState<boolean>(false);

  // Universal Persistent Transaction Memory Ledger State (/api/v1/transactions)
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txTypeFilter, setTxTypeFilter] = useState<string>('ALL');
  const [txSearch, setTxSearch] = useState<string>('');
  const [loadingTx, setLoadingTx] = useState<boolean>(false);

  const [newDecisionForm, setNewDecisionForm] = useState({
    customer_name: 'Cascade Agentic Labs (Synthetic)',
    customer_segment: 'Leading AI Lab',
    decision_forum: 'Allocation Council (Tue)',
    decision_outcome: 'APPROVED_WITH_DFE_PIVOT',
    sfdc_account_id: 'VEC-SYNTH-0018Y008',
    vector_opportunity_id: 'VEC-SYNTH-0068Y008',
    vector_workload_id: 'WL-SYNTH-008',
    related_deal_id: 'TET-2026-0419',
    requested_sku: 'H200 (141GB)',
    requested_chips: 512,
    requested_region: 'us-east4',
    approved_sku: 'AI-ASIC v6e',
    approved_chips: 512,
    approved_region: 'us-east5',
    consumption_mechanism: '3-Year CUD (Standard Pod)',
    allocation_score_before: 71,
    allocation_score_after: 91,
    tcv_usd_m: 34.5,
    commercial_incentive_applied: 'Catalyst Lite + PSF (10% 1st Yr ARR) + vLLM on TPU',
    firm_readiness_status: 'Firm (Customer RED + Internal BLACK Verified)',
    vector_pbo_tagged: 'Infra AI / Infrastructure AI / Stage 3.0 Committed',
    dfe_benchmark_cited:
      'ASIC-v6e v6e delivers 3.18x better training & 1.8x better inference price-perf vs H200 ($2.70/hr vs $10.50/hr)',
    decision_rationale:
      'Customer Firm (RED) and Internal Firm (BLACK) verified. Pivoted 512x H200 in constrained us-east4 to 512x ASIC-v6e v6e in us-east5 (Standard Pod Pool), boosting Allocation score from 71 to 91/100.',
  });

  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const params = new URLSearchParams();
      if (txTypeFilter !== 'ALL') params.set('transaction_type', txTypeFilter);
      if (txSearch.trim()) params.set('q', txSearch.trim());
      const res = await fetch(`/api/v1/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  const fetchDecisions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set('q', searchText.trim());
      if (forumFilter !== 'ALL') params.set('forum', forumFilter);
      if (outcomeFilter !== 'ALL') params.set('outcome', outcomeFilter);
      if (segmentFilter !== 'ALL') params.set('segment', segmentFilter);

      const res = await fetch(`/api/v1/decisions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDecisions(data.decisions || []);
        setSummary(data.summary || null);
        if (data.playbook_dfe_and_commercial) {
          setPlaybookData(data.playbook_dfe_and_commercial);
        }
        if (data.decisions?.length > 0 && !selectedDecision) {
          setSelectedDecision(data.decisions[0]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunLookup = async (customQuery?: string) => {
    const q = customQuery ?? lookupQuery;
    if (customQuery) setLookupQuery(customQuery);
    setIsLookingUp(true);
    try {
      const res = await fetch('/api/v1/decisions/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersonaEmail,
        },
        body: JSON.stringify({
          query: q,
          forum: forumFilter,
          outcome: outcomeFilter,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLookupResult(data);
        if (data.precedents?.length > 0) {
          setSelectedDecision(data.precedents[0]);
        }
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, [forumFilter, outcomeFilter, segmentFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [txTypeFilter]);

  useEffect(() => {
    handleRunLookup(PRECEDENT_QUICK_QUERIES[0].query);
  }, []);

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDecision(true);
    try {
      const res = await fetch('/api/v1/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersonaEmail,
        },
        body: JSON.stringify({
          ...newDecisionForm,
          decision_maker_ldap: activePersonaEmail,
          co_approver_ldap: 'gtm-director@demo.example.com',
          precedent_tags: [
            newDecisionForm.approved_sku.split(' ')[0],
            newDecisionForm.approved_region,
            newDecisionForm.decision_outcome,
            'DataWarehouse-Ledger',
          ],
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setIsNewModalOpen(false);
        await fetchDecisions();
        await fetchTransactions();
        if (created.decision) {
          setSelectedDecision(created.decision);
        }
        if (onRefreshParent) onRefreshParent();
      }
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const outcomeBadgeClass = (outcome: string) => {
    if (outcome.includes('DFE_PIVOT')) {
      return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30';
    }
    if (outcome.includes('APPROVED') || outcome.includes('VERIFIED')) {
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30';
    }
    if (outcome.includes('REPRICED')) {
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30';
    }
    if (outcome.includes('REJECTED') || outcome.includes('RECLAIMED')) {
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30';
    }
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Universal Persistent Transaction Memory Ledger (v4.0) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#121216] border border-blue-200 dark:border-blue-900/60 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-600 text-white">
                <Database className="w-3 h-3" />
                UNIVERSAL PERSISTENT TRANSACTION MEMORY LEDGER
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                apex-ai-capacity-demo:apex_capacity_navigator.transaction_memory_ledger
              </span>
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              Immutable Audit Log of Every Action (Registry Link, GTM Elevation, Forecast Save, SLA Reclaim & Council Ruling)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                placeholder="Search transactions, HZ-2026, LDAP..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <button
              onClick={() => fetchTransactions()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTx ? 'animate-spin' : ''}`} />
              Filter / Sync
            </button>
          </div>
        </div>

        {/* Transaction Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Transactions' },
            { id: 'ELEVATE_DEAL_GTM', label: '⚡ GTM Lead Elevations' },
            { id: 'LINK_REGISTRY_CCA', label: '🔗 capacity-registry CCA Links' },
            { id: 'FORECAST_SCENARIO_SAVED', label: '📊 Saved Forecast Scenarios' },
            { id: 'COUNCIL_TRANSITION', label: '🏛️ Council Transitions' },
            { id: 'SLA_RECLAIM', label: '⏱️ SLA Reclamations' },
            { id: 'VERIFY_STRATEGIC_POD_ACCOUNT', label: '✅ STRATEGIC_POD Verifications' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTxTypeFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                txTypeFilter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto max-h-72 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase text-zinc-500">
              <tr>
                <th className="py-2 px-3">Tx ID & Time</th>
                <th className="py-2 px-3">Transaction Type</th>
                <th className="py-2 px-3">Actor LDAP</th>
                <th className="py-2 px-3">Customer & Registry CCA</th>
                <th className="py-2 px-3">Region & SKU</th>
                <th className="py-2 px-3">Audit Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {transactions.map((tx) => (
                <tr key={tx.transaction_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <td className="py-2 px-3 font-mono whitespace-nowrap">
                    <div className="font-bold text-blue-600 dark:text-blue-400">{tx.transaction_id}</div>
                    <div className="text-[10px] text-zinc-500">{String(tx.timestamp || '').slice(0, 19).replace('T', ' ')}</div>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        tx.transaction_type.includes('ELEVATE')
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : tx.transaction_type.includes('REGISTRY')
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : tx.transaction_type.includes('FORECAST')
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{tx.actor_ldap}</div>
                    <div className="text-[10px] text-zinc-500">{tx.actor_role}</div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{tx.customer_name}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <a
                        href="https://registry.corp.cloud.com/customers?tab=external"
                        target="_blank"
                        rel="noreferrer"
                        title="Seeded record ID stored in DataWarehouse Ledger (direct object deep-link awaiting Registry REST API sync — click to open live capacity-registry portal)"
                        className="text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        {tx.registry_cca_id || tx.target_record_id}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        ⏳ API Sync Pending
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="font-semibold">{tx.region}</div>
                    <div className="text-[10px] text-zinc-500">
                      {tx.sku_or_family} ({tx.chips_or_cores_delta?.toLocaleString()} chips • ${tx.tcv_usd_m}M)
                    </div>
                  </td>
                  <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300 max-w-md">
                    {tx.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Top Executive Banner & DataWarehouse Ledger Status */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                <Database className="w-3 h-3" />
                WAREHOUSE HISTORIC DECISIONS LEDGER
              </span>
              <a
                href={VERIFIED_CORPORATE_LINKS['go/ai-infra:playbook'].url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:underline"
              >
                go/ai-infra:playbook (✅ Live Deck)
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <a
                href={VERIFIED_CORPORATE_LINKS['go/aiinfra-capacity-guide'].url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:underline"
              >
                go/aiinfra-capacity-guide (✅ Live Doc)
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Historic Governance Decisions Database, AI Precedent Lookup & Global Sales Playbook
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-4xl">
              Every Allocation Council ruling, Coupled Companion 2.0 approval, Project STRATEGIC_POD leader verification,{' '}
              <code className="font-mono">&gt;256 chip</code> Renewal Deal-Room repricing, and SLA reclamation is immutably persisted in DataWarehouse (
              <code className="font-mono text-blue-600 dark:text-blue-400">
                {summary?.warehouse_table ||
                  'apex-ai-capacity-demo:apex_capacity_navigator.historic_decisions_ledger'}
              </code>
              ) and indexed with ModelHub AI 768-dim embeddings for instant precedent lookup.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchDecisions()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync DataWarehouse Ledger
            </button>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Governance Decision to DB
            </button>
          </div>
        </div>

        {/* 5 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/70">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
            <div className="text-[11px] font-medium text-zinc-500">
              Total Decisions in DataWarehouse
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {summary?.total_decisions_in_db ?? decisions.length}
            </div>
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              100% Immutable Audit Trail
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
            <div className="text-[11px] font-medium text-zinc-500">
              Approved / Verified Rulings
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary?.approved_or_verified_count ?? 9}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Customer RED + Internal BLACK
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
            <div className="text-[11px] font-medium text-zinc-500">
              DFE Hardware / Region Pivots
            </div>
            <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
              {summary?.dfe_pivot_count ?? 5}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              G4 RTX 6000 • ASIC-v6e v6e • v7
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
            <div className="text-[11px] font-medium text-zinc-500">
              SLA Reclamations & Appeals
            </div>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {summary?.reclaimed_sla_count ?? 1} Reclaimed
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Returned to Saleable Cloud Flex Pool
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
            <div className="text-[11px] font-medium text-zinc-500">
              Total Governed Deal TCV
            </div>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              ${summary?.total_governed_tcv_usd_m ?? 603.4}M
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              5.9x AI Infra Halo Effect
            </div>
          </div>
        </div>
      </div>

      {/* AI-Powered Historic Decision & Precedent Lookup Engine */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 text-zinc-100 border border-indigo-500/30 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold tracking-tight">
              AI Historic Decision & Precedent Lookup (ModelHub AI{' '}
              <code className="font-mono text-indigo-300">text-embedding-004</code> +{' '}
              <code className="font-mono text-indigo-300">llm-fast-router</code>)
            </h3>
          </div>
          {lookupResult && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-indigo-300">
              <span>Embeddings: {lookupResult.embedding_model}</span>
              <span>•</span>
              <span>Synthesizer: {lookupResult.llm_model}</span>
            </div>
          )}
        </div>

        {/* Search Input + Button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunLookup()}
              placeholder="Ask for historic precedents by SKU, region, DFE pivot (G4, ASIC-v6e, ASIC-v7), >256 chip renewal, or commercial program..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700 text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-400"
            />
          </div>
          <button
            onClick={() => handleRunLookup()}
            disabled={isLookingUp}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white whitespace-nowrap transition-colors"
          >
            {isLookingUp ? 'Searching DataWarehouse Precedents...' : 'Lookup Historic Precedents'}
          </button>
        </div>

        {/* Quick Precedent Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-zinc-400 mr-1">
            1-Click Precedent Queries:
          </span>
          {PRECEDENT_QUICK_QUERIES.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleRunLookup(item.query)}
              className="px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800/90 hover:bg-indigo-500/20 text-zinc-200 hover:text-indigo-200 border border-zinc-700 hover:border-indigo-500/40 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* AI Precedent Ruling Box */}
        {lookupResult && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
            <div className="lg:col-span-6 p-4 rounded-xl bg-zinc-900/90 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">
                  ModelHub AI Fast-Router LLM Precedent Ruling
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  {lookupResult.total_decisions_searched} Decisions Scanned
                </span>
              </div>
              <div className="text-xs text-zinc-200 whitespace-pre-line leading-relaxed">
                {lookupResult.ai_precedent_ruling}
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(lookupResult.precedents || []).slice(0, 4).map((p: HistoricDecision) => (
                <div
                  key={p.decision_id}
                  onClick={() => setSelectedDecision(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedDecision?.decision_id === p.decision_id
                      ? 'bg-indigo-950/60 border-indigo-400'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[11px] font-bold text-indigo-300">
                      {p.decision_id}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                      {Math.round((p.similarity_score || 0.85) * 100)}% Match
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-1 truncate">
                    {p.customer_name}
                  </div>
                  <div className="text-[11px] text-zinc-300 mt-0.5">
                    {p.requested_chips.toLocaleString()}x {p.requested_sku} ({p.requested_region}) →{' '}
                    <span className="text-emerald-300 font-semibold">
                      {p.approved_chips.toLocaleString()}x {p.approved_sku} ({p.approved_region})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-1.5">
                    <span>
                      Score: {p.allocation_score_before} → {p.allocation_score_after}/100
                    </span>
                    <span>${p.tcv_usd_m}M TCV</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filterable Historic Decisions Table + Master-Detail Audit Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Filterable Ledger Table */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800/80 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Historic Capacity Decisions Ledger ({decisions.length} Records)
              </h3>
              <p className="text-xs text-zinc-500">
                Click any decision row to inspect full Before/After SKU, Get-To-FIRM readiness, DFE math & rationale
              </p>
            </div>
          </div>

          {/* Multi-Facet Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchDecisions()}
                placeholder="Filter ID, account, SKU..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              />
            </div>

            <select
              value={forumFilter}
              onChange={(e) => setForumFilter(e.target.value)}
              aria-label="Filter by Governance Forum"
              className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <option value="ALL">All Governance Forums</option>
              <option value="Allocation Council">Allocation Council (Tue)</option>
              <option value="Companion 2.0">Companion 2.0 Forum (Tue/Thu)</option>
              <option value="STRATEGIC_POD">STRATEGIC_POD GTM Verification</option>
              <option value="Renewal Deal-Room">Renewal Deal-Room (&gt;256 Chips)</option>
              <option value="RVP Exception">RVP Exception Appeal</option>
              <option value="SLA Reclamation">SLA Reclamation & Recycled Pool</option>
              <option value="Obidos">Obidos Fast-Track / &lt;64 Chip FlexStart</option>
            </select>

            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              aria-label="Filter by Decision Outcome"
              className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <option value="ALL">All Decision Outcomes</option>
              <option value="APPROVED">APPROVED</option>
              <option value="APPROVED_WITH_DFE_PIVOT">APPROVED_WITH_DFE_PIVOT</option>
              <option value="APPROVED_COUPLED_COMPANION">APPROVED_COUPLED_COMPANION</option>
              <option value="VERIFIED_P0_BOOST">VERIFIED_P0_BOOST</option>
              <option value="REPRICED_RENEWAL_APPROVED">REPRICED_RENEWAL_APPROVED</option>
              <option value="REJECTED_SHIFTED_TO_2027_WAVE">REJECTED_SHIFTED_TO_2027_WAVE</option>
              <option value="RECLAIMED_TO_GDM_POOL">RECLAIMED_TO_FlexStart_FLEX_POOL</option>
            </select>

            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              aria-label="Filter by Customer Segment"
              className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <option value="ALL">All Customer Segments</option>
              <option value="Leading AI Lab">Leading AI Lab (&gt;75% Opp)</option>
              <option value="Digital Native">Digital Native & AI Startup</option>
              <option value="Traditional Enterprise">Traditional Enterprise</option>
            </select>
          </div>

          {/* Decisions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono uppercase text-zinc-500">
                  <th className="py-2.5 px-2">Decision ID</th>
                  <th className="py-2.5 px-2">Customer & Forum</th>
                  <th className="py-2.5 px-2">Requested → Approved Footprint</th>
                  <th className="py-2.5 px-2">Score</th>
                  <th className="py-2.5 px-2">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {decisions.map((d) => {
                  const isSelected = selectedDecision?.decision_id === d.decision_id;
                  return (
                    <tr
                      key={d.decision_id}
                      onClick={() => setSelectedDecision(d)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-500/10 dark:bg-blue-500/15'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                      }`}
                    >
                      <td className="py-3 px-2 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        <div>{d.decision_id}</div>
                        <div className="text-[10px] font-normal text-zinc-500">
                          {d.decision_date.slice(0, 10)}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {d.customer_name}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {d.decision_forum} •{' '}
                          <span className="font-mono">{d.decision_maker_ldap.split('@')[0]}@</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-[11px] text-zinc-500">
                          {d.requested_chips.toLocaleString()}x {d.requested_sku} ({d.requested_region})
                        </div>
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          {d.approved_chips.toLocaleString()}x {d.approved_sku} ({d.approved_region})
                        </div>
                      </td>
                      <td className="py-3 px-2 font-mono whitespace-nowrap">
                        <span className="text-zinc-500">{d.allocation_score_before}</span>
                        <ArrowRight className="w-3 h-3 inline mx-0.5 text-zinc-400" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {d.allocation_score_after}
                        </span>
                        <div className="text-[10px] text-zinc-500">${d.tcv_usd_m}M</div>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${outcomeBadgeClass(
                            d.decision_outcome
                          )}`}
                        >
                          {d.decision_outcome}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Cols: Master-Detail Decision Audit Inspector */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800/80 shadow-sm space-y-4">
          {selectedDecision ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {selectedDecision.decision_id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${outcomeBadgeClass(
                        selectedDecision.decision_outcome
                      )}`}
                    >
                      {selectedDecision.decision_outcome}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {selectedDecision.customer_name}
                  </h3>
                  <div className="text-xs text-zinc-500">
                    {selectedDecision.customer_segment} • {selectedDecision.strategic_pod_vertical}
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    ${selectedDecision.tcv_usd_m}M TCV
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {selectedDecision.decision_date.slice(0, 10)}
                  </div>
                </div>
              </div>

              {/* Before -> After Footprint Comparison Card */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="text-[11px] font-mono uppercase font-bold text-zinc-500">
                  Footprint & Priority Score Transformation
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800">
                    <div className="text-[10px] font-mono text-zinc-500">INITIAL REQUEST</div>
                    <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {selectedDecision.requested_chips.toLocaleString()}x {selectedDecision.requested_sku}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500">
                      Region: {selectedDecision.requested_region} • Pre-Score:{' '}
                      {selectedDecision.allocation_score_before}/100
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/30">
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      GOVERNANCE RULING
                    </div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {selectedDecision.approved_chips.toLocaleString()}x {selectedDecision.approved_sku}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      Region: {selectedDecision.approved_region} • Final Score:{' '}
                      {selectedDecision.allocation_score_after}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* Get-To-FIRM & Vector PBO Metadata */}
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                      "Get To FIRM" Gate Status:
                    </span>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {selectedDecision.firm_readiness_status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                      Vector Workload PBO Tags:
                    </span>
                    <span className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                      {selectedDecision.vector_pbo_tagged}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                      SFDC / Vector Opp / Deal ID:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {selectedDecision.sfdc_account_id} • {selectedDecision.vector_opportunity_id} •{' '}
                        {selectedDecision.related_deal_id}
                      </span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        title="Seeded Salesforce / Vector CRM record IDs awaiting live Vector OAuth deep-link integration"
                      >
                        ⏳ Vector CRM Sync Pending
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Quantitative Playbook DFE Benchmark Cited</span>
                    <a
                      href={VERIFIED_CORPORATE_LINKS['go/ai-infra:playbook'].url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] hover:underline"
                    >
                      go/ai-infra:playbook (✅ Live) <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="text-xs text-zinc-800 dark:text-zinc-200">
                    {selectedDecision.dfe_benchmark_cited}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                  <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                    Commercial Incentive & Consumption Mechanism
                  </div>
                  <div className="text-xs text-zinc-800 dark:text-zinc-200">
                    <strong>{selectedDecision.consumption_mechanism}</strong> —{' '}
                    {selectedDecision.commercial_incentive_applied}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span>DECISION RATIONALE & PRECEDENT NOTES</span>
                    <span>
                      Approvers: {selectedDecision.decision_maker_ldap.split('@')[0]}@ &{' '}
                      {selectedDecision.co_approver_ldap.split('@')[0]}@
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {selectedDecision.decision_rationale}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(selectedDecision.precedent_tags || []).map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-500 py-12 text-center">
              Select a historic governance decision to inspect its full audit record.
            </div>
          )}
        </div>
      </div>

      {/* Playbook & Field Guide Reference Matrix (Collapsible to avoid clutter) */}
      {playbookData && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Reference Drawer: Field Guide (<code className="font-mono">go/aiinfra-capacity-guide</code>),
                Playbook (<code className="font-mono">go/ai-infra:playbook</code>) & Commissioning Stages
              </h3>
              <p className="text-xs text-zinc-500">
                On-demand reference for "Get To FIRM" gates, DFE price-perf benchmarks, illustrative pod commissioning stages &amp; telemetry sources
              </p>
            </div>
            <button
              onClick={() => setShowPlaybookRef(!showPlaybookRef)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
            >
              {showPlaybookRef ? 'Hide Playbook Reference' : 'View Playbook Reference Rules'}
            </button>
          </div>

          {showPlaybookRef && (
            <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Panel 1: "Get To FIRM" Dual Gate + Vector Workload PBO Schema */}
                <div className="lg:col-span-4 p-4 rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase font-mono">
                      1. "Get To FIRM" Dual Gate & Vector PBO Schema
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-500">
                      Early → Likely → Firm
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                    <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      Customer Firm (RED — Sales / AE Owned)
                    </div>
                    <ul className="text-[11px] text-zinc-700 dark:text-zinc-300 space-y-1 list-disc pl-4">
                      {(playbookData.get_to_firm_gate?.customer_firm_red || []).map(
                        (item: string, i: number) => (
                          <li key={i}>{item}</li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 space-y-1">
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Internal Firm (BLACK — Infra GTM / CE Owned)
                    </div>
                    <ul className="text-[11px] text-zinc-700 dark:text-zinc-300 space-y-1 list-disc pl-4">
                      {(playbookData.get_to_firm_gate?.internal_firm_black || []).map(
                        (item: string, i: number) => (
                          <li key={i}>{item}</li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Renewal (&gt;256 Chips) & Small Deal (&lt;64 Chips) Rules
                    </div>
                    <ul className="text-[11px] text-zinc-700 dark:text-zinc-300 space-y-1 list-disc pl-4">
                      {(playbookData.get_to_firm_gate?.renewal_and_sizing_rules || []).map(
                        (item: string, i: number) => (
                          <li key={i}>{item}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>

                {/* Panel 2: Quantitative DFE Chip Benchmarks */}
                <div className="lg:col-span-5 p-4 rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase font-mono">
                      2. Quantitative DFE Hardware Pivot Benchmarks
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                      5.9x AI Infra Halo Effect
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {(playbookData.dfe_chip_benchmarks || []).map((b: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-1"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {b.chip}
                          </span>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                            {b.list_or_cud_price}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {b.price_perf_advantage}
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          {b.best_fit_and_pivot}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 3: Commercial Programs & Deal Accelerators */}
                <div className="lg:col-span-3 p-4 rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                      3. Commercial Deal Accelerators
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                      Pre & Post-Sales
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(playbookData.commercial_programs || []).map((c: any, i: number) => {
                      const rawLink = String(c.go_link || '');
                      const primaryShortlink = rawLink.split('•')[0].trim();
                      const verifiedEntry =
                        VERIFIED_CORPORATE_LINKS[primaryShortlink] ||
                        (rawLink.includes('submitpsf')
                          ? VERIFIED_CORPORATE_LINKS['go/fundingsupport']
                          : VERIFIED_CORPORATE_LINKS['go/startpropel']);
                      const isDeprecatedSubmitPsf = rawLink.includes('submitpsf');

                      return (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {c.program}
                            </span>
                            {isDeprecatedSubmitPsf ? (
                              <span
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                title="go/submitpsf form was deprecated 10/14/25; automatically remapped to live go/fundingsupport & Vector CRM"
                              >
                                ⚠️ Form Remapped
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                ✅ Live Portal
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {c.funding_cap}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
                            <span>{c.stage}</span>
                            <a
                              href={verifiedEntry?.url || `http://${primaryShortlink}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                              title={verifiedEntry?.note || 'Verified corporate portal'}
                            >
                              {isDeprecatedSubmitPsf ? 'go/fundingsupport (Vector)' : c.go_link}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 2: Illustrative Pod Commissioning Stages & Telemetry Sources */}
              {(playbookData.pod_commissioning_milestones || playbookData.authoritative_telemetry_sources) && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Panel 4: Illustrative Pod Commissioning Stages */}
                  <div className="lg:col-span-7 p-4 rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase font-mono">
                            4. Illustrative Pod Commissioning Stages (Synthetic)
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Illustrative commissioning stage quantiles for capacity supply-wave modeling
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        10% Platform Reliability Holdback
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-mono">
                            <th className="py-1.5 pr-2">Stage</th>
                            <th className="py-1.5 px-2">Fast (P10)</th>
                            <th className="py-1.5 px-2">Median (P50)</th>
                            <th className="py-1.5 px-2">Tail (P90)</th>
                            <th className="py-1.5 px-2">Target SLO</th>
                            <th className="py-1.5 pl-2">Readiness Gate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                          {(playbookData.pod_commissioning_milestones || []).map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                              <td className="py-1.5 pr-2 font-mono font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                {m.milestone}
                              </td>
                              <td className="py-1.5 px-2 font-mono text-emerald-600 dark:text-emerald-400">
                                {m.fast_track_days ?? 14}d
                              </td>
                              <td className="py-1.5 px-2 font-mono font-bold text-amber-600 dark:text-amber-400">
                                {m.median_days ?? 45}d
                              </td>
                              <td className="py-1.5 px-2 font-mono text-rose-600 dark:text-rose-400">
                                {m.tail_days ?? 75}d
                              </td>
                              <td className="py-1.5 px-2 font-mono text-blue-600 dark:text-blue-400">
                                {m.nextgen_target_slo_days ?? 60}d
                              </td>
                              <td className="py-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                                {m.gate}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Panel 5: Authoritative Plx & Capacity Control Plane Systems of Record */}
                  <div className="lg:col-span-5 p-4 rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase font-mono">
                        5. Authoritative Telemetry & Control Plane Sources
                      </span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={VERIFIED_CORPORATE_LINKS['go/tpu-occupancy'].url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20"
                        >
                          go/tpu-occupancy (✅ Live) <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <a
                          href={VERIFIED_CORPORATE_LINKS['go/deciml'].url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20"
                        >
                          go/deciml (✅ Live) <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(playbookData.authoritative_telemetry_sources || []).map((src: any, idx: number) => {
                        const isF1Table =
                          String(src.system).includes('ti_parm') ||
                          String(src.system).includes('sc_visibility') ||
                          String(src.system).includes('Borg');
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-0.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300">
                                {src.system}
                              </span>
                              {isF1Table ? (
                                <span
                                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  title="Awaiting scheduled DataWarehouse Data Transfer Service (DTS) feed; seeded snapshot active"
                                >
                                  ⏳ Awaiting Scheduled DTS Feed
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  ✅ Verified Portal
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                              {src.purpose}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal to Log New Governance Decision to DataWarehouse */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Log New Governance Decision to DataWarehouse (historic_decisions_ledger)
                </h3>
                <p className="text-xs text-zinc-500">
                  Persists to DataWarehouse + Persistent Institutional Memory + 768-dim Vector Index
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDecision} className="p-5 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newDecisionForm.customer_name}
                    onChange={(e) =>
                      setNewDecisionForm({ ...newDecisionForm, customer_name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Governance Forum</label>
                  <select
                    value={newDecisionForm.decision_forum}
                    onChange={(e) =>
                      setNewDecisionForm({ ...newDecisionForm, decision_forum: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="Allocation Council (Tue)">Allocation Council (Tue)</option>
                    <option value="Companion 2.0 Forum (Tue/Thu)">Companion 2.0 Forum (Tue/Thu)</option>
                    <option value="STRATEGIC_POD GTM Verification">STRATEGIC_POD GTM Verification</option>
                    <option value="Renewal Deal-Room (>256 Chips)">
                      Renewal Deal-Room (&gt;256 Chips)
                    </option>
                    <option value="RVP Exception Appeal">RVP Exception Appeal</option>
                    <option value="SLA Reclamation & Recycled Pool">
                      SLA Reclamation & Recycled Pool
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Decision Outcome</label>
                  <select
                    value={newDecisionForm.decision_outcome}
                    onChange={(e) =>
                      setNewDecisionForm({ ...newDecisionForm, decision_outcome: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="APPROVED_WITH_DFE_PIVOT">APPROVED_WITH_DFE_PIVOT</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="APPROVED_COUPLED_COMPANION">APPROVED_COUPLED_COMPANION</option>
                    <option value="VERIFIED_P0_BOOST">VERIFIED_P0_BOOST</option>
                    <option value="REPRICED_RENEWAL_APPROVED">REPRICED_RENEWAL_APPROVED</option>
                    <option value="REJECTED_SHIFTED_TO_2027_WAVE">
                      REJECTED_SHIFTED_TO_2027_WAVE
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Deal TCV ($M USD)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newDecisionForm.tcv_usd_m}
                    onChange={(e) =>
                      setNewDecisionForm({
                        ...newDecisionForm,
                        tcv_usd_m: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Requested SKU & Region</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDecisionForm.requested_sku}
                      onChange={(e) =>
                        setNewDecisionForm({ ...newDecisionForm, requested_sku: e.target.value })
                      }
                      className="flex-1 px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                    <input
                      type="text"
                      value={newDecisionForm.requested_region}
                      onChange={(e) =>
                        setNewDecisionForm({
                          ...newDecisionForm,
                          requested_region: e.target.value,
                        })
                      }
                      className="w-28 px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Approved SKU & Region</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDecisionForm.approved_sku}
                      onChange={(e) =>
                        setNewDecisionForm({ ...newDecisionForm, approved_sku: e.target.value })
                      }
                      className="flex-1 px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                    <input
                      type="text"
                      value={newDecisionForm.approved_region}
                      onChange={(e) =>
                        setNewDecisionForm({
                          ...newDecisionForm,
                          approved_region: e.target.value,
                        })
                      }
                      className="w-28 px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Quantitative Playbook DFE Benchmark Cited
                </label>
                <input
                  type="text"
                  value={newDecisionForm.dfe_benchmark_cited}
                  onChange={(e) =>
                    setNewDecisionForm({
                      ...newDecisionForm,
                      dfe_benchmark_cited: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Decision Rationale</label>
                <textarea
                  rows={3}
                  value={newDecisionForm.decision_rationale}
                  onChange={(e) =>
                    setNewDecisionForm({
                      ...newDecisionForm,
                      decision_rationale: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecision}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  {isSubmittingDecision
                    ? 'Writing to DataWarehouse...'
                    : 'Commit Decision to DataWarehouse Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

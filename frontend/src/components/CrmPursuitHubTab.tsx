import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
  ShieldCheck,
  Database,
  Cpu,
  Layers,
  ArrowUpRight,
  BookOpen,
  Zap,
  Building2,
  Tag,
  Award,
  RefreshCw,
  X,
} from 'lucide-react';

interface SfdcStrategicPodHubProps {
  activePersona: string;
  onRefreshGlobal: () => Promise<void>;
}

export const CrmPursuitHubTab: React.FC<SfdcStrategicPodHubProps> = ({
  activePersona,
  onRefreshGlobal,
}) => {
  const [hubData, setHubData] = useState<any>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Semantic Vector Search state
  const [searchQuery, setSearchQuery] = useState<string>(
    'Which Salesforce Vector CRM accounts have GPU-to-TPU roadmaps, Project Bloom pods, or FlexStart Calendar bridge pods?'
  );
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [vectorResponse, setVectorResponse] = useState<any>(null);
  const [isSearchingVector, setIsSearchingVector] = useState<boolean>(false);

  // Account Matrix Filter & Selected Account for Leader Verification
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [verifyForm, setVerifyForm] = useState({
    strategic_pod_tier: 'GTM P0 (Top 100)',
    strategic_pod_vertical: '',
    tpu_journey_stage: '',
    gpu_to_tpu_roadmap_verified: true,
    bloom_pod_tier: '',
    bloom_commercial_route: '',
    verification_notes: '',
  });
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyBanner, setVerifyBanner] = useState<string>('');

  // Seller/CE Nomination Modal state
  const [isNominateOpen, setIsNominateOpen] = useState<boolean>(false);
  const [isSubmittingNom, setIsSubmittingNom] = useState<boolean>(false);
  const [nomForm, setNomForm] = useState({
    account_name: 'Aether Sovereign AI (Synthetic)',
    sfdc_account_id: 'VEC-SYNTH-0018Y009',
    vector_opportunity_id: 'VEC-SYNTH-0068Y009',
    vector_workload_id: 'WL-SYNTH-009',
    sub_region: 'NORTHAM-East-Strategic',
    t3m_gpu_spend_m: 6.5,
    t3m_tpu_spend_m: 1.2,
    strategic_pod_vertical: '1. Model Training (Frontier & Foundation LLM Pre/Post-Training)',
    tpu_journey_stage: '4. TPU Explorer ($4K–$1M Annualized TPU ARR)',
    gpu_to_tpu_roadmap_verified: true,
    bloom_pod_tier: 'S02 (Standard 1-Pod Slice — 1,024 Chips / 8MW)',
    bloom_commercial_route: 'Sell-Through (Strategic NeoCloud JV)',
    verification_notes:
      'Seller/CE nomination via Salesforce Vector CRM sync: $30.8M annualized AI ARR expanding from H200 to NextGen-ASIC v7 + Bloom S02.',
  });

  // Persistent Memory Creation state
  const [newMemTitle, setNewMemTitle] = useState<string>('');
  const [newMemContent, setNewMemContent] = useState<string>('');
  const [newMemCategory, setNewMemCategory] = useState<string>(
    'Project STRATEGIC_POD & GTM Leader Guidance'
  );
  const [isSavingMem, setIsSavingMem] = useState<boolean>(false);

  const fetchHubState = async () => {
    setIsLoading(true);
    try {
      const headers = { 'X-Role-Persona': activePersona };
      const [acctRes, memRes] = await Promise.all([
        fetch('/api/v1/sfdc/accounts', { headers }),
        fetch('/api/v1/memory', { headers }),
      ]);
      if (acctRes.ok) {
        const d = await acctRes.json();
        setHubData(d);
        if (!selectedAccount && d.accounts?.length > 0) {
          // Default select Helios Quantitative Trading (Synthetic) or first account
          const cit =
            d.accounts.find((a: any) => a.sfdc_account_id === 'VEC-SYNTH-0018Y004') ||
            d.accounts[0];
          handleSelectAccountForReview(cit);
        }
      }
      if (memRes.ok) {
        const md = await memRes.json();
        setMemories(md.memories || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const runVectorSearch = async (customQuery?: string, customFilter?: string) => {
    const q = customQuery !== undefined ? customQuery : searchQuery;
    const sf = customFilter !== undefined ? customFilter : sourceFilter;
    setIsSearchingVector(true);
    try {
      const res = await fetch('/api/v1/vector-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersona,
        },
        body: JSON.stringify({
          query: q,
          source_filter: sf,
          top_k: 6,
        }),
      });
      if (res.ok) {
        setVectorResponse(await res.json());
      }
    } finally {
      setIsSearchingVector(false);
    }
  };

  useEffect(() => {
    fetchHubState();
    runVectorSearch();
  }, [activePersona]);

  const handleSelectAccountForReview = (acct: any) => {
    setSelectedAccount(acct);
    setVerifyForm({
      strategic_pod_tier:
        acct.strategic_pod_tier === 'Nominated (strategic-pod-program-nominate)'
          ? 'GTM P0 (Top 100)'
          : acct.strategic_pod_tier || 'GTM P0 (Top 100)',
      strategic_pod_vertical: acct.strategic_pod_vertical || '',
      tpu_journey_stage: acct.tpu_journey_stage || '',
      gpu_to_tpu_roadmap_verified: true,
      bloom_pod_tier: acct.bloom_pod_tier || '',
      bloom_commercial_route: acct.bloom_commercial_route || '',
      verification_notes:
        acct.verification_notes ||
        `Verified by ${activePersona}: Confirmed STRATEGIC_POD vertical & 2027 GPU->TPU roadmap.`,
    });
  };

  const handleVerifyAccount = async () => {
    if (!selectedAccount) return;
    setIsVerifying(true);
    setVerifyBanner('');
    try {
      const res = await fetch(
        `/api/v1/sfdc/accounts/${selectedAccount.sfdc_account_id}/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Role-Persona': activePersona,
          },
          body: JSON.stringify({
            ...verifyForm,
            verified_by_ldap: activePersona,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedAccount(data.account);
        const boostMsg = data.updated_allocation_request
          ? ` Linked Allocation deal ${data.updated_allocation_request.request_id} boosted to ${data.updated_allocation_request.priority_score}/100!`
          : '';
        setVerifyBanner(
          `Verified ${data.account.account_name} (${data.account.sfdc_account_id}) as ${data.account.strategic_pod_tier} (+${data.account.allocation_priority_boost_pts}pt Allocation Boost) & persisted to DataWarehouse!${boostMsg}`
        );
        await fetchHubState();
        await onRefreshGlobal();
        await runVectorSearch();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNominateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNom(true);
    try {
      const res = await fetch('/api/v1/sfdc/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersona,
        },
        body: JSON.stringify({
          ...nomForm,
          nominated_by_ldap: activePersona,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsNominateOpen(false);
        await fetchHubState();
        handleSelectAccountForReview(data.account);
        setVerifyBanner(
          `Successfully linked Salesforce Account ${data.account.sfdc_account_id} (${data.account.account_name}) via strategic-pod-program-nominate and indexed in Persistent Memory!`
        );
        await runVectorSearch();
      }
    } finally {
      setIsSubmittingNom(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemTitle.trim() || !newMemContent.trim()) return;
    setIsSavingMem(true);
    try {
      const res = await fetch('/api/v1/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersona,
        },
        body: JSON.stringify({
          author_ldap: activePersona,
          author_role: 'GTM / CE / Capacity Governance',
          category: newMemCategory,
          sfdc_account_id: selectedAccount?.sfdc_account_id || 'GLOBAL',
          title: newMemTitle,
          content: newMemContent,
          tags: ['Persistent Memory', 'DataWarehouse Synced', activePersona],
        }),
      });
      if (res.ok) {
        setNewMemTitle('');
        setNewMemContent('');
        await fetchHubState();
        await runVectorSearch();
      }
    } finally {
      setIsSavingMem(false);
    }
  };

  const accounts: any[] = hubData?.accounts || [];
  const filteredAccounts = accounts.filter((a) => {
    if (tierFilter === 'ALL') return true;
    if (tierFilter === 'P0') return a.strategic_pod_tier.includes('P0');
    if (tierFilter === 'P1') return a.strategic_pod_tier.includes('P1');
    if (tierFilter === 'PENDING')
      return a.verified_status !== 'VERIFIED BY GTM LEADERSHIP';
    return true;
  });

  const summary = hubData?.summary || {
    program_target_total: 366,
    program_p0_cap: 100,
    program_p1_cap: 266,
    active_tracked_accounts: 6,
    verified_by_leadership_count: 4,
    total_tracked_ai_arr_m: 629.7,
  };

  const gdmPool = hubData?.gdm_and_cross_pa?.gdm_gqm_pool;
  const bloomTiers: any[] = hubData?.bloom_pod_tiers || [];
  const verticals: string[] = hubData?.strategic_pod_verticals || [];
  const journeyStages: string[] = hubData?.tpu_journey_stages || [];

  return (
    <div className="space-y-6">
      {/* Top Banner: First-Principles Architecture Header */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                STAGE 0 → STAGE 3 UNIFIED FUNNEL
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                strategic-pod-program-targets • strategic-pod-program-nominate • Looker 32305
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                Flex-Start Pool • go/bloom_pitch • ModelHub AI Vector Search
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Salesforce (Vector CRM) & Project STRATEGIC_POD Verification Hub + Semantic Vector Search
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Links synthetic <strong>Salesforce Account (`VEC-SYNTH-0018Y...`)</strong>,{' '}
              <strong>Vector Opportunity (`VEC-SYNTH-0068Y...`)</strong>, and{' '}
              <strong>Concord T3M GPU/TPU Revenue</strong> records with Seller/CE nominations (
              <code className="font-mono">strategic-pod-program-nominate</code>) and 1-click{' '}
              <strong>
                GTM Leadership Verification (Role-Based Approvers)
              </strong>{' '}
              across the <strong>12 STRATEGIC_POD Verticals</strong>, the{' '}
              <strong>Land · Expand · Transform TPU Journey</strong>,{' '}
              <strong>Project Bloom (`S01–S05`)</strong>, and{' '}
              <strong>FlexStart Calendar &amp; Flex Capacity Pool</strong> bridges.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsNominateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Link Salesforce CRM / Nominate Account (strategic-pod-program-nominate)
            </button>
          </div>
        </div>

        {/* 4 Core KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-zinc-950/60 p-3.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Project STRATEGIC_POD Target Cap</span>
              <Award className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                {summary.program_target_total}
              </span>
              <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                {summary.program_p0_cap} P0 • {summary.program_p1_cap} P1
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {summary.verified_by_leadership_count}/{summary.active_tracked_accounts} active focal
              pursuits verified by GTM leaders
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-zinc-950/60 p-3.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Concord T3M Annualized AI ARR</span>
              <Building2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                ${summary.total_tracked_ai_arr_m}M
              </span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                Looker ID 32305
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Joined Vector CRM Open Pursuits + Concord T3M * 4 ARR
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-zinc-950/60 p-3.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>FlexStart Calendar & Flex Pool</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                {gdmPool?.available_instant_bridge_chips?.toLocaleString() || '2,560'} Chips
              </span>
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
                +640 Recycled
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              14-day SLA reclaimed chips recycled into Flex-Start / Obidos PoC pool
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800/90 bg-zinc-50/70 dark:bg-zinc-950/60 p-3.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Obidos Builder TTFC & Vector Index</span>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                21 mins
              </span>
              <span className="text-xs font-mono text-purple-600 dark:text-purple-400">
                SLA &lt; 30m TTFC
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {vectorResponse?.total_indexed_documents || 22} docs indexed in ModelHub 768-d Vector
              Store
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: ModelHub AI Semantic Vector Search & Fast-Router LLM Synthesis */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              ModelHub AI Semantic Vector Search (`text-embedding-004`) + Fast-Router LLM Grounded
              RAG
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            <span>Embedding: {vectorResponse?.embedding_model || 'model-hub/text-embedding-004'}</span>
            <span>•</span>
            <span>Synthesizer: {vectorResponse?.llm_model || 'model-hub/llm-fast-router'}</span>
          </div>
        </div>

        {/* Search Input & Source Filter */}
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runVectorSearch()}
              placeholder="Search across Salesforce Vector CRM, Project STRATEGIC_POD, Allocation, Companion 2.0, Project Bloom & Persistent Memory..."
              className="w-full pl-10 pr-4 py-2 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            aria-label="Vector Corpus Filter"
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              runVectorSearch(searchQuery, e.target.value);
            }}
            className="px-3 py-2 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
          >
            <option value="ALL">All 5 Enterprise Corpora</option>
            <option value="Salesforce">Salesforce Vector CRM & STRATEGIC_POD</option>
            <option value="Persistent">Persistent Institutional Memory</option>
            <option value="Allocation">Allocation Accelerator Deals</option>
            <option value="Companion">Companion 2.0 Classic Infra Cards</option>
            <option value="Internal">Project Bloom / FlexStart / Builder Policies</option>
          </select>
          <button
            onClick={() => runVectorSearch()}
            disabled={isSearchingVector}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isSearchingVector ? 'Embedding & Searching...' : 'Vector Search & Synthesize'}
          </button>
        </div>

        {/* Preset 1-Click Semantic Queries */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mr-1">
            Quick Vector Queries:
          </span>
          {[
            'Which Salesforce Vector CRM accounts have GPU-to-TPU roadmaps or Project Bloom pods?',
            'How does 14-day SLA reclamation recycle idle capacity into FlexStart Calendar & Obidos PoC pools?',
            'Show Helios Quantitative Trading (Synthetic) spend and how GTM leader verification boosts TET-2026-0415 above 80 pts',
            'Show Robotics, Physical AI, and World Model Training pursuits across STRATEGIC_POD verticals',
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setSearchQuery(preset);
                runVectorSearch(preset, sourceFilter);
              }}
              className="px-2.5 py-1 rounded-md text-[11px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Fast-Router LLM Synthesis + Top Vector Matches */}
        {vectorResponse && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
            <div className="lg:col-span-5 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Fast-Router LLM Grounded Synthesis
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                  {vectorResponse.llm_model}
                </span>
              </div>
              <div className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed">
                {vectorResponse.ai_synthesis}
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(vectorResponse.results || []).slice(0, 4).map((hit: any) => (
                <div
                  key={hit.doc_id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-3 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 truncate">
                        {hit.source_type}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {(hit.similarity_score * 100).toFixed(1)}% cosine
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1.5 line-clamp-1">
                      {hit.title}
                    </h4>
                    <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                      {hit.subtitle}
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {hit.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {verifyBanner && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{verifyBanner}</span>
          </div>
          <button
            onClick={() => setVerifyBanner('')}
            className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 2: Master-Detail Salesforce Vector CRM + Project STRATEGIC_POD Verification Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Salesforce Vector CRM & Project STRATEGIC_POD Accounts Table */}
        <div className="lg:col-span-7 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Salesforce (Vector CRM) + Concord T3M Accounts (`strategic-pod-program-targets`)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select any account to inspect Vector CRM metadata or stamp GTM Leader Verification
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'ALL', label: `All (${accounts.length})` },
                { id: 'P0', label: 'GTM P0 (Top 100)' },
                { id: 'P1', label: 'GTM P1 (266)' },
                { id: 'PENDING', label: 'Pending Verification' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTierFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    tierFilter === f.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                  <th className="py-2.5 pr-3">Account & Vector CRM IDs</th>
                  <th className="py-2.5 px-3">STRATEGIC_POD Tier & Vertical</th>
                  <th className="py-2.5 px-3">Concord ARR (T3M)</th>
                  <th className="py-2.5 px-3">TPU Journey & Bloom</th>
                  <th className="py-2.5 pl-3">Leader Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/70 text-xs">
                {filteredAccounts.map((acct) => {
                  const isSelected =
                    selectedAccount?.sfdc_account_id === acct.sfdc_account_id;
                  const isVerified =
                    acct.verified_status === 'VERIFIED BY GTM LEADERSHIP';
                  return (
                    <tr
                      key={acct.sfdc_account_id}
                      onClick={() => handleSelectAccountForReview(acct)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-500/10 dark:bg-blue-500/15'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <td className="py-3 pr-3">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {acct.account_name}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                          SFDC: {acct.sfdc_account_id} • Opp: {acct.vector_opportunity_id}
                        </div>
                        <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                          Workload: {acct.vector_workload_id}
                          {acct.linked_allocation_request_id
                            ? ` • Linked: ${acct.linked_allocation_request_id}`
                            : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            acct.strategic_pod_tier.includes('P0')
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                              : acct.strategic_pod_tier.includes('P1')
                              ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {acct.strategic_pod_tier}
                        </span>
                        <div className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-1 line-clamp-1">
                          {acct.strategic_pod_vertical}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono tabular-nums">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          ${acct.annualized_ai_arr_m}M ARR
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          GPU T3M: ${acct.t3m_gpu_spend_m}M
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          TPU T3M: ${acct.t3m_tpu_spend_m}M
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1">
                          {acct.tpu_journey_stage}
                        </div>
                        <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 mt-0.5 line-clamp-1">
                          Bloom: {acct.bloom_pod_tier}
                        </div>
                        {acct.gpu_to_tpu_roadmap_verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                            ✓ 2027 Rule: GPU→TPU
                          </span>
                        )}
                      </td>

                      <td className="py-3 pl-3">
                        {isVerified ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> VERIFIED
                            </span>
                            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                              by {acct.verified_by_ldap}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3" /> NEEDS LEADER STAMP
                            </span>
                            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                              Nom: {acct.nominated_by_ldap}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Cols: GTM Leader Verification & Labeling Panel */}
        <div className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 shadow-sm space-y-4">
          {selectedAccount ? (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-mono font-bold uppercase text-blue-600 dark:text-blue-400">
                      GTM LEADERSHIP VERIFICATION WORKBENCH
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {selectedAccount.account_name}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    SFDC: {selectedAccount.sfdc_account_id} • Vector Opp:{' '}
                    {selectedAccount.vector_opportunity_id} • Workload:{' '}
                    {selectedAccount.vector_workload_id}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                  Acting as: {activePersona.split('@')[0]}@
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Important Account Tier (`strategic-pod-program-targets`)
                    </label>
                    <select
                      value={verifyForm.strategic_pod_tier}
                      onChange={(e) =>
                        setVerifyForm({ ...verifyForm, strategic_pod_tier: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="GTM P0 (Top 100)">GTM P0 (Top 100 Strategic)</option>
                      <option value="GTM P1 (266 Target)">GTM P1 (266 High-Potential)</option>
                      <option value="Standard Tracked">Standard Tracked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Project Bloom Pod Blueprint (`S01–S05`)
                    </label>
                    <select
                      value={verifyForm.bloom_pod_tier}
                      onChange={(e) =>
                        setVerifyForm({ ...verifyForm, bloom_pod_tier: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      {bloomTiers.map((b) => (
                        <option
                          key={b.pod_tier}
                          value={`${b.pod_tier} — ${b.chips.toLocaleString()} Chips / ${b.power_mw}MW`}
                        >
                          {b.pod_tier} ({b.chips.toLocaleString()} Chips / {b.power_mw}MW)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    12 Project STRATEGIC_POD Target Verticals / Workloads
                  </label>
                  <select
                    value={verifyForm.strategic_pod_vertical}
                    onChange={(e) =>
                      setVerifyForm({ ...verifyForm, strategic_pod_vertical: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    {verticals.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    TPU Customer Journey Milestone (`Land · Expand · Transform`)
                  </label>
                  <select
                    value={verifyForm.tpu_journey_stage}
                    onChange={(e) =>
                      setVerifyForm({ ...verifyForm, tpu_journey_stage: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    {journeyStages.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-blue-700 dark:text-blue-300">
                      2027 Rule: "GPU Ties to TPU" & Bloom Migration Verified
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Awards <strong>+15 pt Allocation Priority Score Boost</strong> when GPU capacity
                      is paired with a verified Cloud TPU / TorchTPU / Bloom roadmap.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={verifyForm.gpu_to_tpu_roadmap_verified}
                    onChange={(e) =>
                      setVerifyForm({
                        ...verifyForm,
                        gpu_to_tpu_roadmap_verified: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    GTM Leadership Verification Rationale (Persisted to DataWarehouse Memory)
                  </label>
                  <textarea
                    rows={2}
                    value={verifyForm.verification_notes}
                    onChange={(e) =>
                      setVerifyForm({ ...verifyForm, verification_notes: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <button
                  onClick={handleVerifyAccount}
                  disabled={isVerifying}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isVerifying
                    ? 'Persisting Leader Verification to DataWarehouse...'
                    : `Verify & Label as ${activePersona} (+15pt Allocation Boost)`}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* SECTION 3: Persistent Institutional Memory Vault + Flex-Start & Project Bloom Blueprints */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 6 Cols: Persistent Institutional Memory Vault */}
        <div className="lg:col-span-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-500" />
                Persistent Institutional Memory Vault (`DataWarehouse + Vector Indexed`)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Deal precedents, leader verifications & DFE decisions persisted across sessions
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300">
              {memories.length} Memories Stored
            </span>
          </div>

          <form onSubmit={handleAddMemory} className="space-y-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={newMemTitle}
                onChange={(e) => setNewMemTitle(e.target.value)}
                placeholder="Memory Title (e.g., Stratos Robotics us-south1 DFE Precedent)..."
                className="px-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
              />
              <select
                value={newMemCategory}
                onChange={(e) => setNewMemCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
              >
                <option value="Project STRATEGIC_POD & GTM Leader Guidance">
                  Project STRATEGIC_POD & GTM Leader Guidance
                </option>
                <option value="FlexStart Calendar & Flex Capacity Pool Pattern">
                  FlexStart Calendar & Flex Capacity Pool
                </option>
                <option value="CE DFE & Coupled Companion 2.0 Precedent">
                  CE DFE & Coupled Companion 2.0 Precedent
                </option>
                <option value="Salesforce Vector CRM Verification">
                  Salesforce Vector CRM Verification
                </option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newMemContent}
                onChange={(e) => setNewMemContent(e.target.value)}
                placeholder="Write institutional memory note to persist to DataWarehouse & ModelHub Vector Search..."
                className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
              />
              <button
                type="submit"
                disabled={isSavingMem}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shrink-0 disabled:opacity-50"
              >
                {isSavingMem ? 'Saving...' : '+ Save Memory'}
              </button>
            </div>
          </form>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {memories.map((m) => (
              <div
                key={m.memory_id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {m.title}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {m.memory_id} • {m.author_ldap}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {m.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right 6 Cols: FlexStart Calendar / Flex Capacity Pool & Project Bloom (S01-S05) */}
        <div className="lg:col-span-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              Stage 1 & Stage 2 Velocity: FlexStart Calendar Flex Pool, Obidos TTFC & Project Bloom
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              How FlexStart Calendar Bridge Pods, FlexCUDs & Project Bloom S01–S05 Pods power
              Stage 1 & Stage 2
            </p>
          </div>

          {/* Active Stage 1 Bridge Allocations & Obidos PoCs */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Active Stage 1 FlexStart Calendar Bridge Allocations & Obidos Fast-Track PoCs (`TTFC &lt; 30m`)
            </div>
            {(gdmPool?.active_emergency_loans || []).map((loan: any) => (
              <div
                key={loan.loan_id}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">
                    {loan.loan_id}: {loan.customer_name} ({loan.chips}x {loan.chip_type} in{' '}
                    {loan.region})
                  </div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    {loan.mechanism} • Duration: {loan.duration_days}d
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  TTFC: {loan.ttfc_minutes} mins
                </span>
              </div>
            ))}
          </div>

          {/* Project Bloom S01-S05 Pod Matrix */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Project Bloom Dedicated TPU Pod Blueprints (`80% NeoCloud / 20% Direct CapEx FCF Split`)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {bloomTiers.slice(0, 4).map((b) => (
                <div
                  key={b.pod_tier}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100">
                    <span>{b.pod_tier}</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">
                      {b.chips.toLocaleString()} Chips ({b.power_mw}MW)
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    {b.tco_savings_vs_iaas}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                    {b.architecture}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Seller / CE Nomination & Salesforce Vector CRM Link (strategic-pod-program-nominate) */}
      {isNominateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Link Salesforce (Vector CRM) Account & Nominate (`strategic-pod-program-nominate`)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Sellers & CEs add records here for GTM Leadership (`gtm-director@demo.example.com`, `ce-director@demo.example.com`) to verify
                </p>
              </div>
              <button
                onClick={() => setIsNominateOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleNominateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Customer Account Name</label>
                  <input
                    type="text"
                    required
                    value={nomForm.account_name}
                    onChange={(e) => setNomForm({ ...nomForm, account_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Salesforce Account ID (`0018Y...`)</label>
                  <input
                    type="text"
                    required
                    value={nomForm.sfdc_account_id}
                    onChange={(e) => setNomForm({ ...nomForm, sfdc_account_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Vector Opportunity ID (`0068Y...`)</label>
                  <input
                    type="text"
                    required
                    value={nomForm.vector_opportunity_id}
                    onChange={(e) =>
                      setNomForm({ ...nomForm, vector_opportunity_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Vector Workload ID (`aBJKf...`)</label>
                  <input
                    type="text"
                    required
                    value={nomForm.vector_workload_id}
                    onChange={(e) =>
                      setNomForm({ ...nomForm, vector_workload_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Concord T3M GPU Spend ($M)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={nomForm.t3m_gpu_spend_m}
                    onChange={(e) =>
                      setNomForm({ ...nomForm, t3m_gpu_spend_m: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Concord T3M TPU Spend ($M)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={nomForm.t3m_tpu_spend_m}
                    onChange={(e) =>
                      setNomForm({ ...nomForm, t3m_tpu_spend_m: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Proposed STRATEGIC_POD Vertical (1–12)</label>
                <select
                  value={nomForm.strategic_pod_vertical}
                  onChange={(e) => setNomForm({ ...nomForm, strategic_pod_vertical: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                >
                  {verticals.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">TPU Customer Journey Stage</label>
                <select
                  value={nomForm.tpu_journey_stage}
                  onChange={(e) => setNomForm({ ...nomForm, tpu_journey_stage: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                >
                  {journeyStages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNominateOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNom}
                  className="px-4 py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {isSubmittingNom
                    ? 'Linking Salesforce Record...'
                    : 'Link CRM Record & Submit for Leader Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

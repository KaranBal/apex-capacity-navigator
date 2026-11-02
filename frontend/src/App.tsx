import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Layers,
  ShieldAlert,
  Database,
  BarChart3,
  Sun,
  Moon,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Lock,
  UserCheck,
  RefreshCw,
  Mail,
  Copy,
  Check,
  ExternalLink,
  X,
  History,
  Search,
  Zap,
  Link2,
  Calendar,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AllocationRequest,
  CompanionCard,
  SlaObligation,
  ChipSpec,
  RegionalAvailability,
  RolePersona,
  RegionalDemandBucket,
} from './types';
import { ExecutiveCharts } from './components/Charts';
import { CapacityIntakeModal } from './components/CapacityIntakeModal';
import { CompanionBomBuilderTab } from './components/CompanionBomBuilderTab';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { CrmPursuitHubTab } from './components/CrmPursuitHubTab';
import { HistoricDecisionsTab } from './components/HistoricDecisionsTab';
import { PlanningOpsHubTab } from './components/PlanningOpsHubTab';
import { InfraCapacityTrackerPanel } from './components/InfraCapacityTrackerPanel';
import {
  IntegrationLinkPreviewModal,
  IntegrationDirectoryModal,
  PreviewLinkContext,
  isSyntheticRegistryOrCrmUrl,
} from './components/IntegrationLinkGuard';

const PERSONAS: RolePersona[] = [
  {
    email: 'ops-capacity-lead@demo.example.com',
    name: 'Infrastructure Operations Lead (Synthetic)',
    role: 'Manager, Infra Health & Consumption (Central Capacity & Ops)',
    persona_label: 'Central Capacity & Ops Lead (OPS_CENTRAL)',
  },
  {
    email: 'infra-perf-director@demo.example.com',
    name: 'Global Infra Performance Director (Synthetic)',
    role: 'Director, Global Infrastructure Performance & Investments',
    persona_label: 'Global Infra Performance Director (OPS_CENTRAL)',
  },
  {
    email: 'capacity-council@demo.example.com',
    name: 'Allocation Governance Lead (Synthetic)',
    role: 'AI Infrastructure Allocation Governance Lead',
    persona_label: 'Allocation Governance Lead (OPS_CENTRAL)',
  },
  {
    email: 'field-specialist-ce@demo.example.com',
    name: 'Field Specialist CE (Synthetic)',
    role: 'AI Infrastructure Specialist / Account CE (Assigned Accounts Only)',
    persona_label: 'Field Specialist CE — Assigned Only (FIELD_REP)',
  },
  {
    email: 'account-fsr@demo.example.com',
    name: 'Field Sales Representative (Synthetic)',
    role: 'Account Executive / FSR (Assigned Accounts Only)',
    persona_label: 'Field Account FSR — Assigned Only (FIELD_REP)',
  },
  {
    email: 'ce-director@demo.example.com',
    name: 'Customer Engineering Director (Synthetic)',
    role: 'Director, Customer Engineering (AI & Infra Approver)',
    persona_label: 'CE Director Approver (OPS_CENTRAL)',
  },
];

function formatDateReadable(isoOrDate?: string): string {
  if (!isoOrDate) return 'TBD';
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('apex_theme');
    return saved ? saved === 'dark' : false;
  });
  const [activeTab, setActiveTab] = useState<
    'planning' | 'tracker' | 'allocation' | 'companion' | 'sfdc_strategic_pod' | 'salesview' | 'decisions'
  >('planning');
  const [showGuidedPath, setShowGuidedPath] = useState<boolean>(true);
  const [showProdTable, setShowProdTable] = useState<boolean>(false);

  const [activePersona, setActivePersona] = useState<string>('ops-capacity-lead@demo.example.com');
  const [ntkViewMode, setNtkViewMode] = useState<
    'GLOBAL_FLEET' | 'TERRITORY_REDACTED' | 'TERRITORY_STRICT'
  >('GLOBAL_FLEET');

  const isWhaleInAssignedTerritory = (req: AllocationRequest): boolean => {
    return (
      req.ce_lead_ldap === 'field-specialist-ce@demo.example.com' ||
      req.account_executive_ldap === 'field-specialist-ce@demo.example.com' ||
      req.elevated_by_ldap === 'field-specialist-ce@demo.example.com' ||
      ['TET-2026-0401', 'TET-2026-0402', 'TET-2026-0409'].includes(req.request_id)
    );
  };

  const handleSelectDemoPersona = (
    personaEmail: string,
    mode: 'GLOBAL_FLEET' | 'TERRITORY_REDACTED' | 'TERRITORY_STRICT'
  ) => {
    (window as any).__APEX_ROLE_VIEW = mode === 'GLOBAL_FLEET' ? 'OPS_CENTRAL' : 'FIELD_REP';
    (window as any).__APEX_PERSONA = personaEmail;
    setActivePersona(personaEmail);
    setNtkViewMode(mode);
    if (mode !== 'GLOBAL_FLEET' && (activeTab === 'planning' || activeTab === 'salesview')) {
      setActiveTab('tracker');
    }
  };

  const [overviewData, setOverviewData] = useState<any>(null);
  const [allocationRequests, setAllocationRequests] = useState<AllocationRequest[]>([]);
  const [companionCards, setCompanionCards] = useState<CompanionCard[]>([]);
  const [slaObligations, setSlaObligations] = useState<SlaObligation[]>([]);
  const [chipSpecs, setChipSpecs] = useState<ChipSpec[]>([]);
  const [regionalAvail, setRegionalAvail] = useState<RegionalAvailability[]>([]);
  const [registryBuckets, setRegistryBuckets] = useState<RegionalDemandBucket[]>([]);
  const [pyramidSummary, setPyramidSummary] = useState<any>(null);
  const [txCount, setTxCount] = useState<number>(8);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals & Drawers
  const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isRegistryLinkOpen, setIsRegistryLinkOpen] = useState<boolean>(false);
  const [showExecutiveChartsDrawer, setShowExecutiveChartsDrawer] = useState<boolean>(false);
  const [showHwSpecsDrawer, setShowHwSpecsDrawer] = useState<boolean>(false);

  // Allocation & Registry Queue Controls (v4.0)
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationRequest | null>(null);
  const [slideAgentTrace, setSlideAgentTrace] = useState<any>(null);
  const [runningSlideAgent, setRunningSlideAgent] = useState<boolean>(false);
  const [allocationStageFilter, setAllocationStageFilter] = useState<string>('ALL');
  const [allocationRegionFilter, setAllocationRegionFilter] = useState<string>('ALL');
  const [allocationSearchQuery, setAllocationSearchQuery] = useState<string>('');
  const [allocationSortBy, setAllocationSortBy] = useState<
    'ELEVATED_FIRST' | 'TCV_DESC' | 'MUST_HAVE_ASC' | 'SCORE_DESC' | 'REGION_ASC'
  >('ELEVATED_FIRST');
  const [pyramidViewMode, setPyramidViewMode] = useState<'SPLIT' | 'WHALES' | 'BUCKETS'>('SPLIT');
  const [expandedBucketId, setExpandedBucketId] = useState<string | null>('BKT-USE5-V6E-TORSO');
  const [allocationPage, setAllocationPage] = useState<number>(1);
  const allocationPageSize = 8;

  // Quick Link capacity-registry CCA Modal State
  const [linkForm, setLinkForm] = useState({
    registry_cca_id: 'HZ-2026-99512',
    customer_name: 'Vanguard Code Reasoning (Synthetic)',
    forum_target: 'AI_INFRA_ALLOCATION',
    region: 'us-east5',
    chip_name: 'AI-ASIC v6e',
    requested_chips: 128,
    deal_tcv_usd_m: 6.4,
    ideal_start_date: '2026-11-18',
    must_have_by_date: '2026-12-15',
    vector_opportunity_id: 'VEC-SYNTH-0068Y012',
    customer_tier: 'Digital Native',
    consumption_model: 'Flex-Start',
    is_gtm_elevated: false,
    elevation_note: '',
  });
  const [linkingRegistry, setLinkingRegistry] = useState<boolean>(false);
  const [linkBanner, setLinkBanner] = useState<string | null>(null);
  const [previewLinkContext, setPreviewLinkContext] = useState<PreviewLinkContext | null>(null);
  const [isLinkDirectoryOpen, setIsLinkDirectoryOpen] = useState<boolean>(false);

  // Sales View & SLA Controls
  const [salesSubView, setSalesSubView] = useState<'AVAILABILITY' | 'SLA_PLAYBOOK'>('AVAILABILITY');
  const [hwTypeFilter, setHwTypeFilter] = useState<string>('ALL');
  const [coldRegionOnly, setColdRegionOnly] = useState<boolean>(false);
  const [customerSafeObfuscation, setCustomerSafeObfuscation] = useState<boolean>(true);
  const [chipSearch, setChipSearch] = useState<string>('');
  const [availPage, setAvailPage] = useState<number>(1);
  const availPageSize = 10;

  // Post-Rejection Playbook & SLA state
  const [selectedRejectedId, setSelectedRejectedId] = useState<string>('TET-2026-0415');
  const [playbookResult, setPlaybookResult] = useState<any>(null);
  const [isGeneratingPlaybook, setIsGeneratingPlaybook] = useState<boolean>(false);
  const [copiedRvpEmail, setCopiedRvpEmail] = useState<boolean>(false);
  const [copiedComputeClassYaml, setCopiedComputeClassYaml] = useState<boolean>(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('apex_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('apex_theme', 'light');
    }
  }, [isDark]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const headers = { 'X-Role-Persona': activePersona };
      const [ovRes, tetRes, rubRes, slaRes, csRes, bktRes, txRes] = await Promise.all([
        fetch('/api/v1/overview', { headers }),
        fetch('/api/v1/allocation/requests', { headers }),
        fetch('/api/v1/companion/cards', { headers }),
        fetch('/api/v1/sla/obligations', { headers }),
        fetch('/api/v1/capacity/sales-view', { headers }),
        fetch('/api/v1/registry/buckets', { headers }),
        fetch('/api/v1/transactions', { headers }),
      ]);

      if (ovRes.ok) setOverviewData(await ovRes.json());
      if (tetRes.ok) {
        const td = await tetRes.json();
        setAllocationRequests(td.requests || []);
        if (selectedAllocation) {
          const updated = (td.requests || []).find(
            (r: AllocationRequest) => r.request_id === selectedAllocation.request_id
          );
          if (updated) setSelectedAllocation(updated);
        }
      }
      if (rubRes.ok) {
        const rd = await rubRes.json();
        setCompanionCards(rd.cards || []);
      }
      if (slaRes.ok) {
        const sd = await slaRes.json();
        setSlaObligations(sd.obligations || []);
      }
      if (csRes.ok) {
        const cd = await csRes.json();
        setChipSpecs(cd.chip_specs || []);
        setRegionalAvail(cd.regional_availability || []);
      }
      if (bktRes.ok) {
        const bd = await bktRes.json();
        setRegistryBuckets(bd.buckets || []);
        setPyramidSummary(bd.pyramid_summary || null);
      }
      if (txRes.ok) {
        const txd = await txRes.json();
        setTxCount(txd.total_count || (txd.transactions || []).length);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [activePersona, ntkViewMode]);

  const handleRunSlideAgentEvaluation = async (req: AllocationRequest) => {
    setRunningSlideAgent(true);
    setSlideAgentTrace(null);
    try {
      const res = await fetch('/api/v1/agent/evaluate-deal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersona,
        },
        body: JSON.stringify({
          request_id: req.request_id,
          customer_name: req.customer_name,
          customer_tier: req.customer_tier,
          chip_name: req.chip_name,
          requested_chips: req.requested_chips,
          primary_region: req.primary_region,
          alternate_regions: req.alternate_regions,
          flexible_delivery_window: req.flexible_delivery_window,
          willing_to_shift_generation: req.willing_to_shift_generation,
          workload_type: req.workload_type,
          consumption_model: req.consumption_model,
          contract_duration_months: req.contract_duration_months ?? req.cud_term_months,
          contract_stage: req.contract_stage,
          technical_validation_stage: req.technical_validation_stage,
          upfront_prepay_pct: req.upfront_prepay_pct ?? 0,
          deal_tcv_usd_m: req.deal_tcv_usd_m,
          storage_cores: req.storage_cores,
          compute_cores: req.compute_cores,
          networking_cores: req.networking_cores,
          egress_gbps: req.egress_gbps ?? req.companion_check?.egress_gbps ?? 40,
        }),
      });
      if (res.ok) {
        setSlideAgentTrace(await res.json());
      }
    } finally {
      setRunningSlideAgent(false);
    }
  };

  // Filtered & Sorted Allocation Whale Requests (v4.0 + v4.6 NTK)
  const filteredAndSortedAllocation = useMemo(() => {
    const q = allocationSearchQuery.trim().toLowerCase();
    const list = allocationRequests.filter((r) => {
      if (ntkViewMode !== 'GLOBAL_FLEET' && !isWhaleInAssignedTerritory(r)) return false;
      if (allocationStageFilter !== 'ALL' && String(r.stage_step) !== allocationStageFilter) return false;
      if (allocationRegionFilter !== 'ALL' && r.primary_region !== allocationRegionFilter) return false;
      if (q) {
        const hay = `${r.customer_name} ${r.request_id} ${r.registry_cdr_id} ${r.registry_cca_id || ''} ${r.chip_name} ${r.primary_region} ${r.account_executive_ldap} ${r.ce_lead_ldap} ${r.elevation_note || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (allocationSortBy === 'ELEVATED_FIRST') {
        const aEl = a.is_gtm_elevated ? 1 : 0;
        const bEl = b.is_gtm_elevated ? 1 : 0;
        if (aEl !== bEl) return bEl - aEl;
        const aRank = a.elevation_rank ?? 999;
        const bRank = b.elevation_rank ?? 999;
        if (aRank !== bRank) return aRank - bRank;
        return b.deal_tcv_usd_m - a.deal_tcv_usd_m;
      }
      if (allocationSortBy === 'TCV_DESC') {
        return b.deal_tcv_usd_m - a.deal_tcv_usd_m;
      }
      if (allocationSortBy === 'MUST_HAVE_ASC') {
        const da = a.must_have_by_date || a.target_delivery_date || '2099-12-31';
        const db = b.must_have_by_date || b.target_delivery_date || '2099-12-31';
        return da.localeCompare(db);
      }
      if (allocationSortBy === 'SCORE_DESC') {
        return b.priority_score - a.priority_score;
      }
      if (allocationSortBy === 'REGION_ASC') {
        return a.primary_region.localeCompare(b.primary_region) || b.deal_tcv_usd_m - a.deal_tcv_usd_m;
      }
      return 0;
    });
  }, [allocationRequests, allocationStageFilter, allocationRegionFilter, allocationSearchQuery, allocationSortBy, ntkViewMode]);

  // Filtered Torso & Tail Regional Buckets
  const filteredBuckets = useMemo(() => {
    const q = allocationSearchQuery.trim().toLowerCase();
    return registryBuckets.filter((b) => {
      if (allocationRegionFilter !== 'ALL' && b.region !== allocationRegionFilter) return false;
      if (q) {
        const sampleText = (b.sample_tickets || [])
          .map((t) => `${t.registry_cca_id} ${t.customer_name} ${t.owner_ldap}`)
          .join(' ');
        const hay = `${b.bucket_id} ${b.region} ${b.chip_name} ${b.demand_tier} ${sampleText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [registryBuckets, allocationRegionFilter, allocationSearchQuery]);

  const totalAllocationPages = Math.max(1, Math.ceil(filteredAndSortedAllocation.length / allocationPageSize));
  const paginatedAllocation = filteredAndSortedAllocation.slice(
    (allocationPage - 1) * allocationPageSize,
    allocationPage * allocationPageSize
  );

  // Filtered Regional Availability
  const filteredAvail = useMemo(() => {
    return regionalAvail.filter((r) => {
      if (hwTypeFilter !== 'ALL' && r.hardware_type !== hwTypeFilter) return false;
      if (coldRegionOnly && !r.dfe_cold_region_recommended) return false;
      if (
        chipSearch &&
        !r.chip_name.toLowerCase().includes(chipSearch.toLowerCase()) &&
        !r.region.toLowerCase().includes(chipSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [regionalAvail, hwTypeFilter, coldRegionOnly, chipSearch]);

  const totalAvailPages = Math.max(1, Math.ceil(filteredAvail.length / availPageSize));
  const paginatedAvail = filteredAvail.slice(
    (availPage - 1) * availPageSize,
    availPage * availPageSize
  );

  const handleToggleElevate = async (req: AllocationRequest, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionBusyId(req.request_id);
    try {
      const nextState = !req.is_gtm_elevated;
      const res = await fetch(`/api/v1/allocation/requests/${req.request_id}/elevate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersona,
        },
        body: JSON.stringify({
          elevated: nextState,
          actor_ldap: activePersona,
          elevation_note: nextState
            ? `Elevated by ${activePersona.split('@')[0]}@ for priority Allocation Council review.`
            : '',
        }),
      });
      if (res.ok) {
        await fetchAllData();
      }
    } finally {
      setActionBusyId(null);
    }
  };

  const handlePromoteBucketTicket = async (bucketId: string, ccaId: string) => {
    setActionBusyId(ccaId);
    try {
      const res = await fetch(`/api/v1/registry/buckets/${bucketId}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersona,
        },
        body: JSON.stringify({
          registry_cca_id: ccaId,
          actor_ldap: activePersona,
          elevation_note: `Promoted from Torso/Tail bucket ${bucketId} by ${activePersona.split('@')[0]}@ for individual Whale review.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLinkBanner(data.routing_explanation || `Promoted ${ccaId} to Individual Whale Queue!`);
        await fetchAllData();
      }
    } finally {
      setActionBusyId(null);
    }
  };

  const handleLinkRegistrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkingRegistry(true);
    setLinkBanner(null);
    try {
      const res = await fetch('/api/v1/registry/link-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersona,
        },
        body: JSON.stringify({
          ...linkForm,
          owner_ldap: activePersona,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLinkBanner(data.routing_explanation);
        setIsRegistryLinkOpen(false);
        await fetchAllData();
        setActiveTab('allocation');
      }
    } finally {
      setLinkingRegistry(false);
    }
  };

  const handleAllocationTransition = async (
    req: AllocationRequest,
    decision: 'Approved' | 'Rejected - Capacity Constrained' | 'In Forum Queue'
  ) => {
    setActionBusyId(req.request_id);
    try {
      const stageMap: Record<string, { stage: string; step: number }> = {
        Approved: { stage: 'Step 4: Allocated & Approved', step: 4 },
        'Rejected - Capacity Constrained': {
          stage: 'Step 5: Post-Rejection Playbook & RVP Exception',
          step: 5,
        },
        'In Forum Queue': { stage: 'Step 3: Allocation Forum Prioritization', step: 3 },
      };
      const target = stageMap[decision];
      const res = await fetch(`/api/v1/allocation/requests/${req.request_id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersona,
        },
        body: JSON.stringify({
          new_stage: target.stage,
          new_stage_step: target.step,
          council_decision: decision,
          allocated_chips: decision === 'Approved' ? req.requested_chips : 0,
          allocated_region: decision === 'Approved' ? req.primary_region : 'Pending',
          allocated_date: decision === 'Approved' ? req.must_have_by_date || req.target_delivery_date : 'TBD',
        }),
      });
      if (res.ok) {
        await fetchAllData();
      }
    } finally {
      setActionBusyId(null);
    }
  };

  const handleGeneratePlaybook = async (requestId: string) => {
    setSelectedRejectedId(requestId);
    setIsGeneratingPlaybook(true);
    try {
      const res = await fetch('/api/v1/ai/post-rejection-playbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersona,
        },
        body: JSON.stringify({ request_id: requestId }),
      });
      if (res.ok) {
        setPlaybookResult(await res.json());
      }
    } finally {
      setIsGeneratingPlaybook(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'salesview' && salesSubView === 'SLA_PLAYBOOK' && !playbookResult) {
      handleGeneratePlaybook(selectedRejectedId);
    }
  }, [activeTab, salesSubView]);

  const handleSlaAction = async (
    obligationId: string,
    action: 'confirm_customer' | 'verify_telemetry_ramp' | 'reclaim_capacity'
  ) => {
    setActionBusyId(obligationId);
    try {
      const res = await fetch(`/api/v1/sla/obligations/${obligationId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersona,
        },
        body: JSON.stringify({ action, telemetry_verified_ramp_pct: 85 }),
      });
      if (res.ok) {
        await fetchAllData();
      }
    } finally {
      setActionBusyId(null);
    }
  };

  const kpis = overviewData?.kpis || {
    total_allocation_requests: 5,
    total_requested_chips: 22016,
    total_allocated_chips: 12288,
    total_pipeline_tcv_usd_m: 677.5,
    active_companion_cards: 4,
    coupled_allocation_companion_deals: 3,
    sla_at_risk_or_breached: 2,
    warehouse_chip_skus_count: 20,
    warehouse_regional_slices_count: 221,
  };

  const linkFlexDays = useMemo(() => {
    const d1 = new Date(linkForm.ideal_start_date);
    const d2 = new Date(linkForm.must_have_by_date);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    return Number.isNaN(diff) ? 0 : Math.max(0, diff);
  }, [linkForm.ideal_start_date, linkForm.must_have_by_date]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 dark:bg-[#09090b] dark:text-zinc-100">
      {/* Top Navigation & Identity Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c0c0f]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Apex Capacity Navigator
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  <Lock className="w-2.5 h-2.5" /> 4 PILLARS: AGENTIC TOOLS · DEMAND FORECASTING · CAPACITY PLANNING · PERFORMANCE MGMT
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  🧪 DEMO MOCKUP — FICTIONAL ACCOUNTS &amp; ILLUSTRATIVE FIGURES (BUILT IN ~2 DAYS WITH FOUNDATION_LLM AGENTIC CODING)
                </span>
                <button
                  onClick={() => setActiveTab('decisions')}
                  title="Open Decision Log & Equal-Value Contract Swaps"
                  className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                >
                  <Database className="w-3 h-3" />
                  Decision Log ({txCount})
                </button>
                <button
                  onClick={() => setIsLinkDirectoryOpen(true)}
                  title="Inspect Synthetic Demo Data Sources & Production Integration Roadmap"
                  className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                >
                  <Link2 className="w-3 h-3" />
                  Link &amp; Integration Status
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                GTM Infrastructure Performance &amp; Expansion • Agentic Tools Engineering, Demand Forecasting, Capacity Planning &amp; Performance Management
              </p>
            </div>
          </div>

          {/* Right Controls: Demo Role View Switcher, Role Selector, Link Registry CCA, New Intake, AI Assistant, Dark Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 2-Persona Demo Role View Switcher */}
            <div
              className="inline-flex items-center rounded-lg p-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              title="Demo Role View: Switch between Central Ops View (OPS_CENTRAL) and Field Rep View (FIELD_REP — Assigned Accounts Only)"
            >
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400">
                Demo Role View:
              </span>
              <button
                type="button"
                onClick={() => handleSelectDemoPersona('ops-capacity-lead@demo.example.com', 'GLOBAL_FLEET')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  ntkViewMode === 'GLOBAL_FLEET'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <span>🌐 Central Ops (OPS_CENTRAL)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemoPersona('field-specialist-ce@demo.example.com', 'TERRITORY_STRICT')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  ntkViewMode !== 'GLOBAL_FLEET'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>🎯 Field Rep (Assigned Only)</span>
              </button>
            </div>

            {/* Active Role Persona Switcher */}
            <div className="relative z-30 flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <select
                aria-label="Active Role Persona"
                value={activePersona}
                onChange={(e) => {
                  const nextEmail = e.target.value;
                  if (
                    [
                      'ops-capacity-lead@demo.example.com',
                      'infra-perf-director@demo.example.com',
                      'capacity-council@demo.example.com',
                    ].includes(nextEmail)
                  ) {
                    handleSelectDemoPersona(nextEmail, 'GLOBAL_FLEET');
                  } else {
                    handleSelectDemoPersona(nextEmail, 'TERRITORY_STRICT');
                    if (activeTab === 'planning' || activeTab === 'salesview') {
                      setActiveTab('tracker');
                    }
                  }
                }}
                className="bg-transparent text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                {PERSONAS.map((p) => (
                  <option
                    key={p.email}
                    value={p.email}
                    className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  >
                    {p.persona_label}
                  </option>
                ))}
              </select>
            </div>

            {/* + Link capacity-registry CCA Button */}
            <button
              onClick={() => setIsRegistryLinkOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all"
            >
              <Link2 className="w-3.5 h-3.5" />
              + Link capacity-registry CCA
            </button>

            {/* New Allocation Intake Button */}
            <button
              onClick={() => setIsIntakeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New Deal Intake &amp; AI Evaluator
            </button>

            {/* Ask Apex AI Copilot Button */}
            <button
              onClick={() => setIsAiDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Apex AI
            </button>

            {/* Refresh Live DataWarehouse Data */}
            <button
              onClick={fetchAllData}
              title="Refresh Synthetic Demo State"
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Dark/Light Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              aria-label="Toggle Dark or Light Mode"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Workspace Navigation Bar */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-zinc-100 dark:border-zinc-800/60">
          {[
            ...(ntkViewMode === 'GLOBAL_FLEET'
              ? [
                  {
                    id: 'planning',
                    pillar: 'FORECAST',
                    label: 'Demand Forecast & Capacity Planning',
                    icon: BarChart3,
                    badge: 'Global Supply & FlexStart Pool',
                  },
                ]
              : []),
            {
              id: 'tracker',
              pillar: 'STEP 1',
              label: 'Deal Intake & 5-Pillar Capacity Check',
              icon: Zap,
              badge: ntkViewMode === 'GLOBAL_FLEET' ? 'All Accounts • Prepay Priority' : 'My Assigned Accounts Only',
            },
            {
              id: 'allocation',
              pillar: 'STEP 2',
              label: 'Prioritization & Counter-Options',
              icon: Cpu,
              badge:
                ntkViewMode === 'GLOBAL_FLEET'
                  ? `${allocationRequests.length} Whales • ${registryBuckets.length} Buckets`
                  : `${filteredAndSortedAllocation.length} Assigned Deals`,
            },
            {
              id: 'companion',
              pillar: 'FULL-STACK',
              label: 'Coupled CPU, Storage & Egress Review',
              icon: Layers,
              badge: ntkViewMode === 'GLOBAL_FLEET' ? `${companionCards.length} Reviews` : 'Assigned Reviews',
            },
            ...(ntkViewMode === 'GLOBAL_FLEET'
              ? [
                  {
                    id: 'salesview',
                    pillar: 'STEP 3',
                    label: 'Post-Allocation Utilization & Follow-Through',
                    icon: ShieldAlert,
                    badge: `${kpis.sla_at_risk_or_breached} Follow-Ups`,
                  },
                ]
              : []),
            {
              id: 'sfdc_strategic_pod',
              pillar: 'STRATEGIC_POD',
              label: 'STRATEGIC_POD Nomination & NeoCloud Routing',
              icon: Sparkles,
              badge: 'Nomination & Approval',
            },
            {
              id: 'decisions',
              pillar: 'AUDIT',
              label: 'Decision Log & Contract Swaps',
              icon: History,
              badge: `${txCount} Records`,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                  active
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {tab.pillar}
                </span>
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    active
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Compact 1-Line Demo Role View Strip */}
        <div
          className={`rounded-xl px-3.5 py-2 border flex flex-wrap items-center justify-between gap-2 text-xs transition-all ${
            ntkViewMode === 'GLOBAL_FLEET'
              ? 'bg-indigo-50/70 dark:bg-indigo-950/25 border-indigo-200 dark:border-indigo-800/70 text-indigo-950 dark:text-indigo-200'
              : 'bg-amber-50/80 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800/70 text-amber-950 dark:text-amber-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                ntkViewMode === 'GLOBAL_FLEET'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              <Lock className="w-3 h-3" />
              {ntkViewMode === 'GLOBAL_FLEET'
                ? 'Demo Role View: Central Ops (OPS_CENTRAL — Full Supply & Queue View)'
                : 'Demo Role View: Field Rep (FIELD_REP — Scoped to Assigned Accounts Only)'}
            </span>
            <span className="text-[11px]">
              {ntkViewMode === 'GLOBAL_FLEET' ? (
                <>
                  Shows illustrative regional capacity headroom, FlexStart pools, and all synthetic customer requests across Enterprise, Digital Native &amp; Frontier segments.
                </>
              ) : (
                <>
                  Demonstrates role-scoped visibility (<code className="font-mono">X-Demo-Role-View: FIELD_REP</code>): API responses return <b>only accounts assigned to the active field rep persona</b> while keeping global supply balances in Central Ops view.
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectDemoPersona('ops-capacity-lead@demo.example.com', 'GLOBAL_FLEET')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                ntkViewMode === 'GLOBAL_FLEET'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              🌐 Central Ops View
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemoPersona('field-specialist-ce@demo.example.com', 'TERRITORY_STRICT')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                ntkViewMode !== 'GLOBAL_FLEET'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white/80 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              🎯 Field Rep View (Assigned Accounts Only)
            </button>
            <button
              type="button"
              onClick={() => setShowProdTable(!showProdTable)}
              className="ml-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 hover:bg-indigo-600/20"
            >
              {showProdTable ? 'Hide Prototype → Production Table' : 'Prototype → Production Path'}
            </button>
            <button
              type="button"
              onClick={() => setShowGuidedPath(!showGuidedPath)}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 hover:bg-blue-600/20"
            >
              {showGuidedPath ? 'Hide 3-Step Guide' : 'Show 3-Step Guide'}
            </button>
          </div>
        </div>

        {/* Collapsible Prototype -> Production Architecture Table */}
        {showProdTable && (
          <div className="bg-white dark:bg-[#0c0c0f] border border-indigo-200 dark:border-indigo-800/70 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-600 text-white">
                  PROTOTYPE → PRODUCTION ARCHITECTURE
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  How this 2-Day Agentic Coding Mockup Maps to Production CLOUD Infrastructure
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowProdTable(false)}
                className="text-xs text-zinc-500 hover:underline"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase text-zinc-500">
                    <th className="py-1.5 px-2">Capability Layer</th>
                    <th className="py-1.5 px-2">Mockup Today (Built in ~2 Days with FoundationLLM Agentic Coding)</th>
                    <th className="py-1.5 px-2">Production Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/70">
                  <tr>
                    <td className="py-1.5 px-2 font-semibold">Data &amp; CRM</td>
                    <td className="py-1.5 px-2 text-zinc-600 dark:text-zinc-400">
                      Synthetic JSON &amp; DataWarehouse tables (<code className="font-mono">apex-ai-capacity-demo.apex_capacity_navigator</code>) with fictional accounts
                    </td>
                    <td className="py-1.5 px-2 text-zinc-700 dark:text-zinc-300">
                      Scheduled DataWarehouse Data Transfer from Vector CRM, Registry demand views, and cluster utilization telemetry
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 font-semibold">Access Control</td>
                    <td className="py-1.5 px-2 text-zinc-600 dark:text-zinc-400">
                      Demo Role View toggle (<code className="font-mono">X-Demo-Role-View: OPS_CENTRAL | FIELD_REP</code>)
                    </td>
                    <td className="py-1.5 px-2 text-zinc-700 dark:text-zinc-300">
                      Cloud IAP + DataWarehouse row-level access policies keyed to authenticated user identity
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 font-semibold">Forecasting</td>
                    <td className="py-1.5 px-2 text-zinc-600 dark:text-zinc-400">
                      Illustrative stage-weighted pipeline + parametric scenario bands (Early 15% · Likely 55% · Customer Firm 85% · Contracted 100%)
                    </td>
                    <td className="py-1.5 px-2 text-zinc-700 dark:text-zinc-300">
                      Historical conversion calibration + weekly WMAPE / Bias backtesting against realized deployments
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 font-semibold">AI Deal Evaluator</td>
                    <td className="py-1.5 px-2 text-zinc-600 dark:text-zinc-400">
                      4-step tool trace + ModelHub AI <code className="font-mono">llm-fast-router</code> synthesis with deterministic rule fallback
                    </td>
                    <td className="py-1.5 px-2 text-zinc-700 dark:text-zinc-300">
                      Same 4-step tool contract wired to live DataWarehouse tables, emitting structured recommendations for human Council sign-off
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Collapsible 3-Step Guided Field & Planning Workflow */}
        {showGuidedPath && (
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-600 text-white">
                  START HERE • 3-STEP FIELD &amp; PLANNING WORKFLOW
                </span>
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Select a workflow stage below or click &ldquo;+ New Deal Intake &amp; AI Evaluator&rdquo; above:
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Illustrative 4-Pillar Prototype • Human-in-the-Loop Council Decisions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Step 1: Deal Intake & Full-Stack Capacity Check */}
              <div
                onClick={() => setActiveTab('tracker')}
                className={`cursor-pointer p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  activeTab === 'tracker'
                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700'
                    : 'bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-blue-400'
                }`}
              >
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold inline-flex items-center justify-center">
                      1
                    </span>
                    Step 1: Deal Intake &amp; Full-Stack Capacity Check
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Verify commercial readiness (pricing, term, <b>upfront cash prepay</b>) and check the full 5-pillar footprint across <b>GPU, TPU, CPU, Storage, and Data Egress</b>.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600 shrink-0 mt-1" />
              </div>

              {/* Step 2: Deal Prioritization & Counter-Option Simulator */}
              <div
                onClick={() => setActiveTab('allocation')}
                className={`cursor-pointer p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  activeTab === 'allocation'
                    ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700'
                    : 'bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-amber-400'
                }`}
              >
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold inline-flex items-center justify-center">
                      2
                    </span>
                    Step 2: Prioritization &amp; Counter-Option Simulator
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Rank requests by <b>Upfront Prepay</b>, <b>5-Yr &gt; 3-Yr &gt; 1-Yr term</b>, <b>STRATEGIC_POD approval</b> &amp; <b>Inference pull-through</b>. Generate alternate region/chip, starter-cluster, FlexStart, or NeoCloud options.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
              </div>

              {/* Step 3: Post-Allocation Follow-Through & Contract Swaps */}
              <div
                onClick={() => setActiveTab(ntkViewMode === 'GLOBAL_FLEET' ? 'salesview' : 'decisions')}
                className={`cursor-pointer p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  activeTab === 'salesview' || activeTab === 'decisions'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700'
                    : 'bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-emerald-400'
                }`}
              >
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold inline-flex items-center justify-center">
                      3
                    </span>
                    Step 3: Follow-Through, Utilization &amp; Contract Swaps
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Track post-approval contract signature and <b>14-day hardware utilization telemetry</b> to reclaim idle reservations or structure <b>equal-or-greater value contract swaps</b>.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
              </div>
            </div>
          </div>
        )}

        {linkBanner && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{linkBanner}</span>
            </div>
            <button
              onClick={() => setLinkBanner(null)}
              className="text-emerald-700 hover:underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* WORKSPACE 1 (EXPAND): PLANNING, $/MW REVENUE DENSITY & CLOSED-LOOP GSC FORECAST HUB */}
        {activeTab === 'planning' && (
          <div className="space-y-4">
            <PlanningOpsHubTab
              key={ntkViewMode}
              activeRoleEmail={activePersona}
              ntkViewMode={ntkViewMode}
              onNavigateToQueue={(region, mode) => {
                if (region) setAllocationRegionFilter(region);
                if (mode) setPyramidViewMode(mode);
                setActiveTab('allocation');
              }}
              onOpenDealDesk={() => setActiveTab('tracker')}
              onTransactionRecorded={fetchAllData}
            />

            <div className="flex justify-end">
              <button
                onClick={() => setShowExecutiveChartsDrawer(!showExecutiveChartsDrawer)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                {showExecutiveChartsDrawer ? 'Hide Deep-Dive Rubric Charts' : 'Show Rubric & Risk Deep-Dive Charts'}
                {showExecutiveChartsDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showExecutiveChartsDrawer && (
              <ExecutiveCharts
                allocationRequests={allocationRequests}
                regionalAvailability={regionalAvail}
                isDark={isDark}
                onSelectDeal={(deal) => {
                  setSelectedAllocation(deal);
                  setSlideAgentTrace(null);
                  setActiveTab('allocation');
                }}
              />
            )}
          </div>
        )}

        {/* WORKSPACE 2 (OPTIMIZE): DEAL DESK & REGIONAL DEMAND TRACKER */}
        {activeTab === 'tracker' && (
          <div className="space-y-4">
            <InfraCapacityTrackerPanel
              key={ntkViewMode}
              activePersonaEmail={activePersona}
              ntkViewMode={ntkViewMode}
              onRefreshLedger={fetchAllData}
            />
          </div>
        )}

        {/* WORKSPACE 3 (ALLOCATE): ALLOCATION & GO/REGISTRY 3-TIER DEMAND PYRAMID QUEUE */}
        {activeTab === 'allocation' && (
          <div className="space-y-4">
            {/* 3-Tier Demand Pyramid Summary Strip */}
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-600 text-white">
                      3-TIER GO/REGISTRY DEMAND PYRAMID
                    </span>
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      Individual Whales (5,000+ Chips) + Regional Torso (64–5,000) &amp; Long-Tail (≤64 / FlexStart) Aggregate Buckets
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {ntkViewMode === 'GLOBAL_FLEET' ? (
                      <>
                        Stacks all three demand tiers across Enterprise, Digital Native &amp; Frontier accounts: Whales (5,000+ chips), Mid-Size / Torso (64–5,000 chips), and Tail (≤64 chips / FlexStart). Prioritizes <b>Upfront Cash Prepay</b>, <b>5-Yr &gt; 3-Yr &gt; 1-Yr commitments</b>, and <b>Production Inference (5.9x Cloud pull-through)</b>.
                      </>
                    ) : (
                      <>
                        Showing <b>only your assigned accounts ({filteredAndSortedAllocation.length})</b>. Unassigned accounts and Cloud&rsquo;s overall regional capacity balances are hidden under Need-to-Know access controls.
                      </>
                    )}
                  </p>
                </div>

                {/* View Mode Toggle + Link Registry Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-100 dark:bg-zinc-900">
                    {[
                      { id: 'SPLIT', label: 'Split Pyramid (Whales + Buckets)' },
                      { id: 'WHALES', label: `Whales Only (${filteredAndSortedAllocation.length})` },
                      { id: 'BUCKETS', label: `Torso/Tail Buckets (${filteredBuckets.length})` },
                    ].map((vm) => (
                      <button
                        key={vm.id}
                        onClick={() => setPyramidViewMode(vm.id as any)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          pyramidViewMode === vm.id
                            ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {vm.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsRegistryLinkOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    + Link capacity-registry CCA
                  </button>
                </div>
              </div>

              {/* Search, Region Filter, Stage Filter & GTM Multi-Sort Bar */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2.5">
                {/* Free-Text Search */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={allocationSearchQuery}
                    onChange={(e) => {
                      setAllocationSearchQuery(e.target.value);
                      setAllocationPage(1);
                    }}
                    placeholder="Search Customer, Registry CCA (HZ-2026 / CDR), SKU, Region, or Owner LDAP..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Region Filter */}
                <select
                  value={allocationRegionFilter}
                  onChange={(e) => {
                    setAllocationRegionFilter(e.target.value);
                    setAllocationPage(1);
                  }}
                  aria-label="Filter by Region"
                  className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5 font-medium"
                >
                  <option value="ALL">All Regions</option>
                  <option value="us-east5">us-east5 (Columbus)</option>
                  <option value="us-east4">us-east4 (Virginia)</option>
                  <option value="us-central1">us-central1 (Iowa)</option>
                  <option value="us-south1">us-south1 (Dallas)</option>
                  <option value="europe-west4">europe-west4 (Netherlands)</option>
                  <option value="us-west1">us-west1 (Oregon)</option>
                </select>

                {/* Stage Filter */}
                <select
                  value={allocationStageFilter}
                  onChange={(e) => {
                    setAllocationStageFilter(e.target.value);
                    setAllocationPage(1);
                  }}
                  aria-label="Filter by Allocation Stage"
                  className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5 font-medium"
                >
                  <option value="ALL">All Forum Stages</option>
                  <option value="2">Step 2: Regional Gate</option>
                  <option value="3">Step 3: Forum Queue</option>
                  <option value="4">Step 4: Allocated</option>
                  <option value="5">Step 5: Post-Rejection</option>
                </select>

                {/* GTM Lead Multi-Sort Dropdown */}
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    GTM Sort:
                  </span>
                  <select
                    value={allocationSortBy}
                    onChange={(e) => setAllocationSortBy(e.target.value as any)}
                    aria-label="Sort Allocation Queue"
                    className="bg-transparent text-xs font-semibold text-amber-900 dark:text-amber-200 focus:outline-none cursor-pointer"
                  >
                    <option value="ELEVATED_FIRST">⚡ GTM Elevated First + $ TCV</option>
                    <option value="TCV_DESC">💰 Opportunity Size ($ TCV High → Low)</option>
                    <option value="MUST_HAVE_ASC">⏰ Must-Have-By Date (Urgent First)</option>
                    <option value="SCORE_DESC">🎯 Allocation Score (0–100 High → Low)</option>
                    <option value="REGION_ASC">🌍 Region (Alphabetical)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TIER 1: INDIVIDUAL WHALE DEALS TABLE + SLIDE-OVER INSPECTOR */}
            {(pyramidViewMode === 'SPLIT' || pyramidViewMode === 'WHALES') && (
              <div className="flex flex-col lg:flex-row gap-5 items-start">
                <div
                  className={`${
                    selectedAllocation ? 'w-full lg:w-2/3' : 'w-full'
                  } transition-all duration-300 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden`}
                >
                  <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Tier 1: Individual Whale Deals (5,000+ Chips or ≥$100M TCV or ⚡ GTM-Elevated)
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Click ⚡ to Elevate/Pin for Central Capacity Council &amp; CE Review
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase text-zinc-500 bg-zinc-50/60 dark:bg-zinc-900/40">
                          <th className="py-3 px-3">GTM Pin</th>
                          <th className="py-3 px-3">Account &amp; capacity-registry CCA</th>
                          <th className="py-3 px-3">Region &amp; SKU Footprint</th>
                          <th className="py-3 px-3">Ideal Start → Must-Have-By</th>
                          <th className="py-3 px-3">Deal TCV</th>
                          <th className="py-3 px-3">Allocation Score</th>
                          <th className="py-3 px-3">Forum Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/70 text-xs">
                        {paginatedAllocation.map((req) => {
                          const isSelected = selectedAllocation?.request_id === req.request_id;
                          const flexDays = req.flexibility_window_days ?? 21;
                          const inTerritory = isWhaleInAssignedTerritory(req);
                          const isRedactedWhale =
                            ntkViewMode === 'TERRITORY_REDACTED' && !inTerritory;
                          return (
                            <tr
                              key={req.request_id}
                              onClick={() => {
                                setSelectedAllocation(req);
                                setSlideAgentTrace(null);
                              }}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/80 dark:bg-blue-950/30'
                                  : isRedactedWhale
                                  ? 'bg-zinc-100/60 dark:bg-zinc-900/30 opacity-85'
                                  : req.is_gtm_elevated
                                  ? 'bg-amber-50/40 dark:bg-amber-950/15 hover:bg-amber-50/70'
                                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                              }`}
                            >
                              {/* 1-Click GTM Elevate / Pin Button */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <button
                                  onClick={(e) => handleToggleElevate(req, e)}
                                  disabled={actionBusyId === req.request_id || isRedactedWhale}
                                  title={
                                    isRedactedWhale
                                      ? 'Out-of-territory account (Need-to-Know ACL required to elevate)'
                                      : req.is_gtm_elevated
                                      ? `Elevated by ${req.elevated_by_ldap} — Click to unpin`
                                      : 'Click to Elevate / Pin deal to top of GTM queue'
                                  }
                                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold inline-flex items-center gap-1 border transition-all ${
                                    req.is_gtm_elevated
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-amber-400 hover:text-amber-600'
                                  }`}
                                >
                                  <Zap className="w-3 h-3" />
                                  {req.is_gtm_elevated ? 'PINNED' : 'Elevate'}
                                </button>
                              </td>

                              {/* Account & Clickable capacity-registry CCA Link */}
                              <td className="py-3 px-3">
                                <div className="font-bold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-1.5">
                                  {isRedactedWhale ? (
                                    <span className="font-mono text-zinc-500 dark:text-zinc-400">
                                      🔒 [NTK Redacted — Out-of-Territory Whale • {req.request_id}]
                                    </span>
                                  ) : (
                                    <span>{req.customer_name}</span>
                                  )}
                                  {ntkViewMode !== 'GLOBAL_FLEET' && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                        inTerritory
                                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                          : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                                      }`}
                                    >
                                      {inTerritory ? '🔓 Assigned Territory' : '🔒 NTK Masked'}
                                    </span>
                                  )}
                                  {req.is_gtm_elevated && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                      ⚡ {(req.elevated_by_ldap || 'GTM').split('@')[0]}@
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[11px] text-zinc-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span>{req.request_id}</span>
                                  <span>•</span>
                                  {isRedactedWhale ? (
                                    <span className="text-[10px] font-mono text-zinc-400">
                                      🔒 CCA &amp; Vector ACL Scoped ({req.ce_lead_ldap})
                                    </span>
                                  ) : isSyntheticRegistryOrCrmUrl(
                                    req.registry_url,
                                    (req as any).has_custom_live_url
                                  ) ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const hzId = req.registry_cca_id || req.registry_cdr_id || req.request_id;
                                        setPreviewLinkContext({
                                          recordId: hzId,
                                          title: `${req.customer_name} (${hzId})`,
                                          subtitle: `${req.requested_chips.toLocaleString()}x ${req.chip_name} in ${req.primary_region} • $${req.deal_tcv_usd_m}M TCV`,
                                          intendedUrl: req.registry_url || `http://capacity-registry/${hzId}`,
                                          fallbackLivePortalUrl:
                                            'https://registry.corp.cloud.com/customers?tab=external',
                                          fallbackPortalLabel:
                                            'Open Live capacity-registry External Customers Portal',
                                          statusType: 'AWAITING_REGISTRY_API',
                                          statusBadge: '⏳ Awaiting Registry API / Input URL',
                                          explanation: `Record ${hzId} is pre-seeded in Apex Capacity Navigator's Persistent Ledger. Direct deep-linking to individual Registry ticket objects (registry.corp.cloud.com/${hzId}) is awaiting the live Registry REST / Vector CRM integration or a user-supplied production ticket URL below.`,
                                          metadata: {
                                            'Registry CCA / CDR ID': hzId,
                                            'Allocation Request ID': req.request_id,
                                            Customer: req.customer_name,
                                            'Region & SKU': `${req.primary_region} • ${req.chip_name}`,
                                            'Requested Chips': req.requested_chips.toLocaleString(),
                                            'Deal TCV ($M)': `$${req.deal_tcv_usd_m}M`,
                                            'Ideal Start → Must-Have-By': `${req.ideal_start_date || 'N/A'} → ${req.must_have_by_date || 'N/A'} (${req.flexibility_window_days ?? 0}d flex)`,
                                            'Vector Opp ID': req.vector_opportunity_id,
                                          },
                                        });
                                      }}
                                      title="Pre-seeded CCA awaiting live Registry API integration or custom URL input — click to preview or bind a live URL"
                                      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold"
                                    >
                                      <span>{req.registry_cca_id || req.registry_cdr_id}</span>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                        ⏳ Sync Pending
                                      </span>
                                    </button>
                                  ) : (
                                    <a
                                      href={req.registry_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                                    >
                                      <span>{req.registry_cca_id || req.registry_cdr_id}</span>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                        ✅ Live URL
                                      </span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              </td>

                              {/* Region & SKU */}
                              <td className="py-3 px-3">
                                <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                                  {req.requested_chips.toLocaleString()}x {req.chip_name}
                                </div>
                                <div className="font-mono text-[11px] text-zinc-500">
                                  {req.primary_region} ({req.consumption_model})
                                </div>
                              </td>

                              {/* Dual Delivery Window: Ideal Start -> Must-Have-By */}
                              <td className="py-3 px-3 font-mono text-[11px]">
                                <div className="text-zinc-600 dark:text-zinc-400">
                                  Ideal: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{req.ideal_start_date || '2026-11-25'}</span>
                                </div>
                                <div className="text-rose-600 dark:text-rose-400 font-semibold">
                                  Must-Have: {req.must_have_by_date || req.target_delivery_date}
                                </div>
                                <div className="mt-0.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      flexDays >= 21
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : flexDays >= 10
                                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                    }`}
                                  >
                                    Flex: {flexDays}d ({req.wave_match_status || 'WAVE_MATCH'})
                                  </span>
                                </div>
                              </td>

                              {/* Deal TCV */}
                              <td className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                {isRedactedWhale ? (
                                  <span className="text-[11px] text-zinc-400 font-normal">
                                    🔒 NTK Redacted
                                  </span>
                                ) : (
                                  `$${req.deal_tcv_usd_m}M`
                                )}
                              </td>

                              {/* Allocation Score */}
                              <td className="py-3 px-3 w-36">
                                <div className="flex items-center justify-between font-mono text-xs mb-1">
                                  <span className="font-bold">{req.priority_score}/100</span>
                                  <span className="text-[10px] text-zinc-500">
                                    {req.priority_score >= 80
                                      ? 'Tier-1'
                                      : req.priority_score >= 65
                                      ? 'Band-2'
                                      : 'Below'}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      req.priority_score >= 80
                                        ? 'bg-emerald-500'
                                        : req.priority_score >= 65
                                        ? 'bg-blue-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${req.priority_score}%` }}
                                  />
                                </div>
                              </td>

                              {/* Forum Status */}
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    req.council_decision.includes('Approved')
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : req.council_decision.includes('Rejected')
                                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                  }`}
                                >
                                  {req.council_decision}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      Showing {(allocationPage - 1) * allocationPageSize + 1}–
                      {Math.min(allocationPage * allocationPageSize, filteredAndSortedAllocation.length)} of{' '}
                      {filteredAndSortedAllocation.length} Whale deals
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAllocationPage(1)}
                        disabled={allocationPage === 1}
                        className="p-1 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAllocationPage((p) => Math.max(1, p - 1))}
                        disabled={allocationPage === 1}
                        className="p-1 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2 font-mono">
                        {allocationPage} / {totalAllocationPages}
                      </span>
                      <button
                        onClick={() => setAllocationPage((p) => Math.min(totalAllocationPages, p + 1))}
                        disabled={allocationPage === totalAllocationPages}
                        className="p-1 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAllocationPage(totalAllocationPages)}
                        disabled={allocationPage === totalAllocationPages}
                        className="p-1 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Slide-Over Investigation / Action Panel */}
                {selectedAllocation && (
                  <div className="w-full lg:w-1/3 transition-all duration-300 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-lg">
                    <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {selectedAllocation.request_id} • {selectedAllocation.registry_cca_id || selectedAllocation.registry_cdr_id}
                          </span>
                          {selectedAllocation.is_gtm_elevated && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-white">
                              ⚡ GTM ELEVATED
                            </span>
                          )}
                          {(selectedAllocation as any).has_active_14d_utilization_breach && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white">
                              🚫 14-DAY UTILIZATION BREACH (-25 PTS)
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                          {selectedAllocation.customer_name}
                        </h3>
                        <p className="text-xs text-zinc-500">{selectedAllocation.stage}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                            💰 Upfront Prepay: {(selectedAllocation as any).upfront_cash_prepay_pct ?? 50}%
                          </span>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-bold">
                            📅 Term: {(selectedAllocation as any).commitment_term_months ?? 36}m ({((selectedAllocation as any).commitment_term_months ?? 36) / 12} Yr)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold">
                            🌐 Egress: {selectedAllocation.companion_network_egress_gbps ?? 200} Gbps
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedAllocation(null)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 14-Day Utilization Breach Guardrail Alert */}
                    {(selectedAllocation as any).has_active_14d_utilization_breach && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>🚫 BLOCKED BY 14-DAY UTILIZATION BREACH (-25 PTS)</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Account has an unverified or under-utilized prior reservation (&lt;50% hardware utilization after Day 14). New expansion approvals are hard-blocked until existing reservation telemetry reaches ≥85% or idle chips are reclaimed to the pool.
                        </p>
                      </div>
                    )}

                    {/* Dual Timeline & Supply Wave Alignment Box */}
                    <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Ideal Start vs. Must-Have-By Window
                        </span>
                        <span className="font-mono">
                          {selectedAllocation.flexibility_window_days ?? 21}d Flex
                        </span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Ideal Start: <b>{selectedAllocation.ideal_start_date || '2026-11-25'}</b></span>
                        <span className="text-rose-600 dark:text-rose-400">
                          Must-Have: <b>{selectedAllocation.must_have_by_date || selectedAllocation.target_delivery_date}</b>
                        </span>
                      </div>
                      <div className="text-[11px] text-indigo-800 dark:text-indigo-300 pt-0.5">
                        {selectedAllocation.matched_supply_wave_label || 'Aligned with upcoming regional commissioning wave (Illustrative)'}
                      </div>
                    </div>

                    {/* Council & GTM Action Bar */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono uppercase text-zinc-500">
                        GTM Leadership &amp; Council Actions ({activePersona.split('@')[0]}@)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleToggleElevate(selectedAllocation)}
                          disabled={actionBusyId === selectedAllocation.request_id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            selectedAllocation.is_gtm_elevated
                              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          {selectedAllocation.is_gtm_elevated ? 'Remove GTM Elevation' : '⚡ Elevate / Pin (GTM Lead)'}
                        </button>
                        <button
                          onClick={() => handleAllocationTransition(selectedAllocation, 'Approved')}
                          disabled={
                            actionBusyId === selectedAllocation.request_id ||
                            Boolean((selectedAllocation as any).has_active_14d_utilization_breach)
                          }
                          title={
                            (selectedAllocation as any).has_active_14d_utilization_breach
                              ? 'Blocked: Resolve 14-day hardware utilization breach before approving new expansion'
                              : 'Approve Allocation'
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {(selectedAllocation as any).has_active_14d_utilization_breach
                            ? '🚫 Approval Blocked (14d Breach)'
                            : 'Approve Allocation'}
                        </button>
                        <button
                          onClick={() =>
                            handleAllocationTransition(
                              selectedAllocation,
                              'Rejected - Capacity Constrained'
                            )
                          }
                          disabled={actionBusyId === selectedAllocation.request_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject (Trigger Playbook)
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRejectedId(selectedAllocation.request_id);
                            setSalesSubView('SLA_PLAYBOOK');
                            setActiveTab('salesview');
                            handleGeneratePlaybook(selectedAllocation.request_id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          4-Step Playbook &amp; RVP Email
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRunSlideAgentEvaluation(selectedAllocation)}
                          disabled={runningSlideAgent}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm disabled:opacity-50 transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {runningSlideAgent
                            ? 'Running 4-Step Agentic Deal Evaluator...'
                            : '🤖 Run 4-Step Agentic Deal Evaluator (Tool Trace + Draft Memo)'}
                        </button>
                      </div>
                    </div>

                    {/* 4-Step Agentic Deal Evaluator Trace Output */}
                    {slideAgentTrace && (
                      <div className="p-3.5 rounded-xl bg-indigo-950/90 text-indigo-100 border border-indigo-700 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-indigo-800 pb-2">
                          <span className="font-mono font-bold text-indigo-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            4-Step Agentic Tool-Calling Trace ({slideAgentTrace.workflow_id || 'LIVE'})
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {slideAgentTrace.recommendation_status || 'EVALUATED'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {(slideAgentTrace.tool_trace || []).map((step: any) => (
                            <div
                              key={step.step}
                              className="p-2 rounded-lg bg-indigo-900/50 border border-indigo-800/80 space-y-0.5"
                            >
                              <div className="flex items-center justify-between font-mono text-[11px]">
                                <span className="font-bold text-amber-300">
                                  Step {step.step}: {step.tool_name}()
                                </span>
                                <span className="text-[10px] text-emerald-300">{step.status}</span>
                              </div>
                              <div className="text-[11px] text-indigo-200">{step.summary}</div>
                            </div>
                          ))}
                        </div>
                        {slideAgentTrace.draft_allocation_memo && (
                          <div className="pt-1 space-y-1">
                            <div className="font-mono text-[10px] uppercase text-indigo-300 font-bold">
                              Generated Allocation Decision Memo:
                            </div>
                            <pre className="p-2.5 rounded-lg bg-black/50 text-indigo-100 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                              {slideAgentTrace.draft_allocation_memo}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 7-Dimension Score Breakdown */}
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">
                          7-Dimension Allocation Score Breakdown
                        </span>
                        <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                          {selectedAllocation.priority_score}/100 pts
                        </span>
                      </div>
                      {Object.entries(selectedAllocation.score_breakdown.dimensions).map(
                        ([k, d]) => (
                          <div key={k} className="text-xs space-y-0.5">
                            <div className="flex justify-between">
                              <span className="text-zinc-600 dark:text-zinc-400 capitalize">
                                {k.replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono font-semibold">
                                {d.score}/{d.max}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500">{d.rationale}</div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Coupled Companion Check Summary */}
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">
                          5-Pillar Full-Stack Check (GPU, TPU, CPU, Storage &amp; Data Egress)
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                          {selectedAllocation.companion_check.companion_pct_of_regional_supply}% Supply
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {selectedAllocation.companion_check.escalation_reason}
                      </p>
                      {selectedAllocation.linked_companion_card_id && (
                        <button
                          onClick={() => setActiveTab('companion')}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Open Linked Companion 2.0 Card ({selectedAllocation.linked_companion_card_id})
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TIER 2 & TIER 3: TORSO (64-255 CHIPS) & LONG-TAIL (<64 CHIPS / FlexStart) REGIONAL AGGREGATE BUCKETS */}
            {ntkViewMode === 'GLOBAL_FLEET' && (pyramidViewMode === 'SPLIT' || pyramidViewMode === 'BUCKETS') && (
              <div className="bg-white dark:bg-[#0c0c0f] border border-amber-300/80 dark:border-amber-800/70 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                        Tier 2 (Torso: 64–5,000 Chips) &amp; Tier 3 (Long-Tail: ≤64 Chips / FlexStart) Regional capacity-registry Aggregate Buckets
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                        🛡️ NTK Privacy-Preserving Aggregate (No Individual Account ACL Required)
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70 mt-0.5">
                      Aggregates {pyramidSummary?.torso_plus_tail_ticket_count || 528} smaller <code className="font-mono">capacity-registry</code> CCA requests so they count 100% toward regional demand without leaking confidential out-of-territory customer identities or flooding the Whale table.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredBuckets.map((bkt) => {
                    const isExpanded = expandedBucketId === bkt.bucket_id;
                    return (
                      <div key={bkt.bucket_id} className="p-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  bkt.demand_tier === 'TORSO'
                                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                                    : 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30'
                                }`}
                              >
                                {bkt.tier_label}
                              </span>
                              <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                {bkt.region} • {bkt.chip_name}
                              </span>
                              {isSyntheticRegistryOrCrmUrl(
                                bkt.registry_query_url,
                                (bkt as any).has_custom_live_url
                              ) ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewLinkContext({
                                      recordId: bkt.bucket_id,
                                      title: `${bkt.region} • ${bkt.chip_name} (${bkt.tier_label})`,
                                      subtitle: `${bkt.ticket_count} Aggregated capacity-registry CCAs • ${bkt.total_requested_chips.toLocaleString()} Chips • $${bkt.total_tcv_usd_m}M TCV`,
                                      intendedUrl: bkt.registry_query_url,
                                      fallbackLivePortalUrl:
                                        'https://registry.corp.cloud.com/customers?tab=external',
                                      fallbackPortalLabel:
                                        'Open Live capacity-registry External Customers Portal',
                                      statusType: 'AWAITING_COHORT_FEED',
                                      statusBadge: '⏳ Awaiting Registry Cohort Feed',
                                      explanation: `Registry's web UI redirects URL query-string filters (${bkt.registry_query_url}) to the root customer table (/customers?tab=external). Pre-filtered cohort deep-linking is awaiting the automated DataWarehouse Registry Cohort Data Transfer feed, while all ${bkt.ticket_count} CCAs (${bkt.total_requested_chips.toLocaleString()} chips) are aggregated natively in this bucket.`,
                                      metadata: {
                                        'Bucket ID': bkt.bucket_id,
                                        'Demand Tier': bkt.tier_label,
                                        'Region & SKU': `${bkt.region} • ${bkt.chip_name}`,
                                        'Aggregated CCAs': bkt.ticket_count,
                                        'Aggregated Chips': bkt.total_requested_chips.toLocaleString(),
                                        'Aggregated TCV ($M)': `$${bkt.total_tcv_usd_m}M`,
                                        'Recommended DFE Pathway': bkt.recommended_dfe_pathway,
                                        'Earliest Ideal → Must-Have': `${bkt.earliest_ideal_start_date} → ${bkt.earliest_must_have_by_date}`,
                                      },
                                    })
                                  }
                                  className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>View all {bkt.ticket_count} CCAs in capacity-registry</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                    ⏳ Cohort Feed Pending
                                  </span>
                                </button>
                              ) : (
                                <a
                                  href={bkt.registry_query_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>View all {bkt.ticket_count} CCAs in capacity-registry (✅ Linked)</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              <b>DFE Pathway:</b> {bkt.recommended_dfe_pathway} |{' '}
                              <span className="font-mono">
                                Earliest Ideal: {bkt.earliest_ideal_start_date} → Earliest Must-Have: {bkt.earliest_must_have_by_date}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right font-mono">
                              <div className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                                {bkt.total_requested_chips.toLocaleString()} chips ({bkt.ticket_count} CCAs)
                              </div>
                              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                ${bkt.total_tcv_usd_m}M Aggregate TCV
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                setExpandedBucketId(isExpanded ? null : bkt.bucket_id)
                              }
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1"
                            >
                              {isExpanded ? 'Hide Sample CCAs' : `Inspect CCAs (${bkt.sample_tickets?.length || 0})`}
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Sample Tickets Drawer */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-zinc-200/70 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {(bkt.sample_tickets || []).map((st) => {
                              const isSampleInTerritory =
                                st.owner_ldap === 'field-specialist-ce@demo.example.com' ||
                                st.owner_ldap === activePersona;
                              const isSampleRedacted =
                                ntkViewMode !== 'GLOBAL_FLEET' && !isSampleInTerritory;
                              return (
                                <div
                                  key={st.registry_cca_id}
                                  className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      {isSampleRedacted ? (
                                        <span className="font-mono font-bold text-zinc-500 inline-flex items-center gap-1">
                                          <span>🔒 {st.registry_cca_id}</span>
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30">
                                            NTK Masked
                                          </span>
                                        </span>
                                      ) : isSyntheticRegistryOrCrmUrl(
                                        st.registry_url,
                                        (st as any).has_custom_live_url
                                      ) ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewLinkContext({
                                              recordId: st.registry_cca_id,
                                              title: `${st.customer_name} (${st.registry_cca_id})`,
                                              subtitle: `${st.chips}x ${bkt.chip_name} in ${bkt.region} • $${st.tcv_usd_m}M TCV`,
                                              intendedUrl: st.registry_url,
                                              fallbackLivePortalUrl:
                                                'https://registry.corp.cloud.com/customers?tab=external',
                                              fallbackPortalLabel:
                                                'Open Live capacity-registry External Customers Portal',
                                              statusType: 'AWAITING_REGISTRY_API',
                                              statusBadge: '⏳ Awaiting Registry API / Input URL',
                                              explanation: `Sample Torso/Tail ticket ${st.registry_cca_id} (${st.customer_name}) is tracked inside regional cohort bucket ${bkt.bucket_id}. Direct ticket object deep-linking is awaiting the live Registry REST connector or a custom ticket URL input below.`,
                                              metadata: {
                                                'Registry CCA ID': st.registry_cca_id,
                                                Customer: st.customer_name,
                                                'Parent Bucket': `${bkt.bucket_id} (${bkt.tier_label})`,
                                                'Region & SKU': `${bkt.region} • ${bkt.chip_name}`,
                                                'Requested Chips': st.chips,
                                                'Deal TCV ($M)': `$${st.tcv_usd_m}M`,
                                                'Ideal Start → Must-Have': `${st.ideal_start_date} → ${st.must_have_by_date}`,
                                                'Owner LDAP': st.owner_ldap,
                                              },
                                            })
                                          }
                                          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                        >
                                          <span>{st.registry_cca_id}</span>
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                            ⏳ Sync Pending
                                          </span>
                                        </button>
                                      ) : (
                                        <a
                                          href={st.registry_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                                        >
                                          <span>{st.registry_cca_id} (✅ Live)</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      )}
                                      <span className="font-mono font-bold text-emerald-600">
                                        {st.chips} chips • {isSampleRedacted ? '🔒 TCV' : `$${st.tcv_usd_m}M`}
                                      </span>
                                    </div>
                                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-1 flex items-center gap-1.5">
                                      {isSampleRedacted ? (
                                        <span className="font-mono text-zinc-500">
                                          🔒 [NTK Redacted — Out-of-Territory Account]
                                        </span>
                                      ) : (
                                        <span>{st.customer_name}</span>
                                      )}
                                      {ntkViewMode !== 'GLOBAL_FLEET' && isSampleInTerritory && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                          🔓 Assigned
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                                      Ideal: {st.ideal_start_date} → Must-Have: {st.must_have_by_date}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-400">
                                      Owner: {st.owner_ldap}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handlePromoteBucketTicket(bkt.bucket_id, st.registry_cca_id)}
                                    disabled={actionBusyId === st.registry_cca_id || isSampleRedacted}
                                    title={
                                      isSampleRedacted
                                        ? 'Need-to-Know (NTK) Territory ACL required to promote out-of-territory ticket'
                                        : 'Promote to Individual Whale Queue'
                                    }
                                    className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 hover:text-white disabled:opacity-50 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <Zap className="w-3 h-3" />
                                    {isSampleRedacted
                                      ? '🔒 NTK Locked (Out-of-Territory)'
                                      : '⚡ Promote to Individual Whale Queue'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 3: COMPANION 2.0 CLASSIC INFRA BUILDER */}
        {activeTab === 'companion' && (
          <CompanionBomBuilderTab
            key={ntkViewMode}
            companionCards={companionCards}
            activePersonaEmail={activePersona}
            onRefresh={fetchAllData}
          />
        )}

        {/* WORKSPACE 4: SALESFORCE VECTOR CRM, PROJECT STRATEGIC_POD & SEMANTIC SEARCH */}
        {activeTab === 'sfdc_strategic_pod' && (
          <CrmPursuitHubTab
            key={ntkViewMode}
            activePersona={activePersona}
            onRefreshGlobal={fetchAllData}
          />
        )}

        {/* WORKSPACE 5: CAPACITY SALES VIEW & USE-IT-OR-LOSE-IT SLA GUARD */}
        {activeTab === 'salesview' && (
          <div className="space-y-5">
            {/* Sub-View Switcher: Regional Sales View (221 Slices) vs. SLA Guard & Post-Rejection Playbook */}
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSalesSubView('AVAILABILITY')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    salesSubView === 'AVAILABILITY'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Regional Availability Explorer ({kpis.warehouse_regional_slices_count} Slices)
                </button>
                <button
                  onClick={() => setSalesSubView('SLA_PLAYBOOK')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    salesSubView === 'SLA_PLAYBOOK'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Use-It-or-Lose-It SLA Guard &amp; 4-Step Playbook ({kpis.sla_at_risk_or_breached} At-Risk)
                </button>
              </div>

              {salesSubView === 'AVAILABILITY' && (
                <button
                  onClick={() => setShowHwSpecsDrawer(!showHwSpecsDrawer)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-900 hover:bg-blue-50 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1"
                >
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  {showHwSpecsDrawer ? 'Hide Hardware Spec Catalog' : `Show Hardware Spec Catalog (${chipSpecs.length} SKUs)`}
                </button>
              )}
            </div>

            {salesSubView === 'AVAILABILITY' ? (
              <div className="space-y-4">
                {/* Collapsible Hardware Spec Drawer (Collapsed by default to eliminate clutter) */}
                {showHwSpecsDrawer && (
                  <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          CLOUD AI Accelerator Hardware Catalog (<code className="font-mono">chip_specs</code> — Public &amp; GA TPU/GPU Generations)
                        </h2>
                        <p className="text-xs text-zinc-500">
                          Click any SKU card to filter the 221-row Regional Availability table below.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                        Pod Topology: High-Speed Interconnect Slice Sizing (Illustrative)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {chipSpecs.slice(0, 10).map((chip) => (
                        <div
                          key={chip.chip_name}
                          onClick={() => setChipSearch(chip.chip_name.split(' ')[0])}
                          className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 cursor-pointer transition-all"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                              {chip.chip_name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                              {chip.hardware_type}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                            <div>HBM: {chip.memory_size_gb} GB</div>
                            <div>BW: {chip.memory_bandwidth_tbps} TB/s</div>
                            <div>FP8: {chip.fp8_tflops} TF</div>
                            <div>Max Pod: {chip.max_scale_chips}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 221 Regional Availability Slices Table */}
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={chipSearch}
                        onChange={(e) => {
                          setChipSearch(e.target.value);
                          setAvailPage(1);
                        }}
                        placeholder="Filter by Chip SKU or Region (e.g. ASIC-v7, us-central1)..."
                        className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 w-72"
                      />
                      <select
                        value={hwTypeFilter}
                        onChange={(e) => {
                          setHwTypeFilter(e.target.value);
                          setAvailPage(1);
                        }}
                        className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5"
                      >
                        <option value="ALL">All Hardware (TPU + GPU)</option>
                        <option value="TPU">Hyperscale Cloud TPU Only</option>
                        <option value="GPU">NVIDIA GPU Only</option>
                      </select>
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 cursor-pointer px-2">
                        <input
                          type="checkbox"
                          checked={coldRegionOnly}
                          onChange={(e) => {
                            setColdRegionOnly(e.target.checked);
                            setAvailPage(1);
                          }}
                          className="rounded border-zinc-300"
                        />
                        DFE Cold Regions Only (Fast Approval)
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                        <input
                          type="checkbox"
                          checked={customerSafeObfuscation}
                          onChange={(e) => setCustomerSafeObfuscation(e.target.checked)}
                          className="rounded border-indigo-400"
                        />
                        Customer-Safe Obfuscation Mode (Power-of-2 Buckets &amp; Zonal Ranks 1–5)
                      </label>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">
                      {filteredAvail.length} Regional Slices Matched
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono uppercase text-zinc-500 bg-zinc-50/60 dark:bg-zinc-900/40">
                          <th className="py-3 px-4">Chip SKU</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Region &amp; Geography</th>
                          <th className="py-3 px-4">Zones</th>
                          <th className="py-3 px-4">Consumption Modes</th>
                          <th className="py-3 px-4">
                            {customerSafeObfuscation
                              ? 'Customer-Safe Power-of-2 Bucket & Zonal Rank'
                              : 'Internal Stockout Risk / DFE Guidance'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/70 text-xs">
                        {paginatedAvail.map((row, idx) => (
                          <tr
                            key={`${row.chip_name}-${row.region}-${idx}`}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                          >
                            <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                              {row.chip_name}
                            </td>
                            <td className="py-3 px-4 font-mono">{row.hardware_type}</td>
                            <td className="py-3 px-4 font-mono">
                              <span className="font-semibold">{row.region}</span>{' '}
                              <span className="text-zinc-500">({row.geography})</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-500">
                              {row.zone_count} zones ({row.zones})
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              {row.consumption_modes}
                            </td>
                            <td className="py-3 px-4">
                              {customerSafeObfuscation ? (
                                <div className="flex flex-col gap-0.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold w-fit ${
                                      row.dfe_cold_region_recommended
                                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    }`}
                                  >
                                    {row.obfuscated_bucket_chips || '256 – 512 Chips (Power-of-2 Bucket)'}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-500">
                                    {row.zonal_rank || 'Rank 2 (High Flex-Start Headroom)'}
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    row.dfe_cold_region_recommended
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {row.stockout_risk_tier}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      Showing {(availPage - 1) * availPageSize + 1}–
                      {Math.min(availPage * availPageSize, filteredAvail.length)} of{' '}
                      {filteredAvail.length} regional rows
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAvailPage(1)}
                        disabled={availPage === 1}
                        className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAvailPage((p) => Math.max(1, p - 1))}
                        disabled={availPage === 1}
                        className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2 font-mono">
                        {availPage} / {totalAvailPages}
                      </span>
                      <button
                        onClick={() => setAvailPage((p) => Math.min(totalAvailPages, p + 1))}
                        disabled={availPage === totalAvailPages}
                        className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAvailPage(totalAvailPages)}
                        disabled={availPage === totalAvailPages}
                        className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* SLA Reclamation Tracker + 4-Step Post-Rejection Playbook */
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          STEP 3: POST-ALLOCATION UTILIZATION TELEMETRY &amp; IDLE CAPACITY RECLAMATION
                        </span>
                        <span className="text-xs font-mono text-zinc-500">
                          Central Capacity Governance: <code className="font-mono">ops-capacity-lead@demo.example.com</code>
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                        7-Day Post-Approval Contract Confirmation, 14-Day Hardware Utilization Ramp &amp; Abandoned Reservation Cleanup
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {slaObligations.map((ob) => (
                      <div
                        key={ob.obligation_id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                          ob.sla_status.includes('BREACH')
                            ? 'bg-rose-500/5 border-rose-500/40'
                            : ob.sla_status.includes('AT RISK')
                            ? 'bg-amber-500/5 border-amber-500/40'
                            : 'bg-emerald-500/5 border-emerald-500/30'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {ob.obligation_id} • {ob.source_record_id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                ob.sla_status.includes('BREACH')
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                  : ob.sla_status.includes('AT RISK')
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {ob.sla_status}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {ob.customer_name}
                          </h4>
                          <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            {ob.resource_summary} • {ob.region}
                          </div>
                          <div className="text-xs text-zinc-500">
                            <strong>Rule:</strong> {ob.sla_rule_name} | <strong>14-Day Utilization Ramp:</strong>{' '}
                            {ob.telemetry_verified_ramp_pct}%
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 bg-white/60 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 font-mono">
                            {ob.recommended_action}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                          <button
                            onClick={() => handleSlaAction(ob.obligation_id, 'confirm_customer')}
                            disabled={actionBusyId === ob.obligation_id}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            Confirm Contract Signed
                          </button>
                          <button
                            onClick={() => handleSlaAction(ob.obligation_id, 'verify_telemetry_ramp')}
                            disabled={actionBusyId === ob.obligation_id}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
                          >
                            Simulate 85% Ramp Verification
                          </button>
                          <button
                            onClick={() => handleSlaAction(ob.obligation_id, 'reclaim_capacity')}
                            disabled={actionBusyId === ob.obligation_id}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
                          >
                            Reclaim Idle Hardware to Pool
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4-Step Post-Rejection Playbook */}
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        STEP 2 COUNTER-OPTIONS • ALTERNATE REGION/CHIP, STARTER CLUSTER, FlexStart & NEOCLOUD ROUTING
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                        Automated Deal Counter-Options (Alternate Region/Chip, Phased Starter Cluster, Field FlexStart, or NeoCloud Overflow)
                      </h3>
                    </div>
                    <select
                      value={selectedRejectedId}
                      onChange={(e) => handleGeneratePlaybook(e.target.value)}
                      className="text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
                    >
                      {allocationRequests.map((r) => (
                        <option key={r.request_id} value={r.request_id}>
                          {r.request_id} — {r.customer_name} ({r.chip_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {playbookResult && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-5 space-y-3">
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                          <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            Step 1: Shift Timeline to Supply-Aligned Window
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {playbookResult.step1_shift_timeline}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Step 2: Immediate Small Dev/Test Seed Footprint + Kubernetes ComputeClass
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {playbookResult.step2_small_dev_test_capacity}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                          <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                            Step 3: Field-Aligned Customer Talking Points
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {playbookResult.step3_customer_communication_script}
                          </p>
                        </div>
                      </div>

                      <div className="lg:col-span-7 space-y-4">
                        {playbookResult.gke_compute_class_yaml && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                Dynamic Kubernetes Custom ComputeClass (cloud.cloud.com/v1)
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(playbookResult.gke_compute_class_yaml);
                                  setCopiedComputeClassYaml(true);
                                  setTimeout(() => setCopiedComputeClassYaml(false), 2000);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white"
                              >
                                {copiedComputeClassYaml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedComputeClassYaml ? 'Copied YAML' : 'Copy YAML'}
                              </button>
                            </div>
                            <pre className="p-3 rounded-xl bg-zinc-900 text-indigo-200 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                              {playbookResult.gke_compute_class_yaml}
                            </pre>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                              Step 4: Official RVP Approval Email Template
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `To: ${playbookResult.rvp_email_to}\nCC: ${playbookResult.rvp_email_cc}\nSubject: ${playbookResult.rvp_email_subject}\n\n${playbookResult.rvp_email_body}`
                                );
                                setCopiedRvpEmail(true);
                                setTimeout(() => setCopiedRvpEmail(false), 2000);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            >
                              {copiedRvpEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedRvpEmail ? 'Copied RVP Email' : 'Copy RVP Email'}
                            </button>
                          </div>
                          <pre className="p-3.5 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                            Subject: {playbookResult.rvp_email_subject}
                            {'\n\n'}
                            {playbookResult.rvp_email_body}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 6: PERSISTENT TRANSACTION MEMORY LEDGER & HISTORIC DECISIONS DB */}
        {activeTab === 'decisions' && (
          <HistoricDecisionsTab
            activePersonaEmail={activePersona}
            onRefreshParent={fetchAllData}
          />
        )}
      </main>

      {/* MODAL: + LINK NEW GO/REGISTRY CCA TICKET (WHALE VS. TORSO/TAIL AUTO-ROUTER) */}
      {isRegistryLinkOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-white">
                    capacity-registry CCA LINKER
                  </span>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Link Newly Filed capacity-registry CCA Ticket (AI Infra Allocation or Companion)
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Automatically routes Whale deals (5,000+ chips or ≥$100M TCV or GTM-Elevated) to Individual Queue, and Torso (64–5,000) / Tail (≤64) deals into Regional Aggregate Buckets.
                </p>
              </div>
              <button
                onClick={() => setIsRegistryLinkOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLinkRegistrySubmit} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    capacity-registry CCA or CDR Ticket ID
                  </label>
                  <input
                    type="text"
                    required
                    value={linkForm.registry_cca_id}
                    onChange={(e) => setLinkForm({ ...linkForm, registry_cca_id: e.target.value })}
                    placeholder="HZ-2026-99512 or CDR00308112"
                    className="w-full px-3 py-2 font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Target Governance Forum</label>
                  <select
                    value={linkForm.forum_target}
                    onChange={(e) => setLinkForm({ ...linkForm, forum_target: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  >
                    <option value="AI_INFRA_ALLOCATION">AI Infra & Accelerators (Allocation + Torso/Tail Pyramid)</option>
                    <option value="CLASSIC_COMPANION">Classic Compute / Storage &gt;20% (Companion 2.0)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Customer / Account Name</label>
                  <input
                    type="text"
                    required
                    value={linkForm.customer_name}
                    onChange={(e) => setLinkForm({ ...linkForm, customer_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Primary Region</label>
                  <select
                    value={linkForm.region}
                    onChange={(e) => setLinkForm({ ...linkForm, region: e.target.value })}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  >
                    <option value="us-east5">us-east5 (Columbus)</option>
                    <option value="us-east4">us-east4 (Virginia)</option>
                    <option value="us-central1">us-central1 (Iowa)</option>
                    <option value="us-south1">us-south1 (Dallas)</option>
                    <option value="europe-west4">europe-west4 (Netherlands)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Accelerator / Machine SKU</label>
                  <select
                    value={linkForm.chip_name}
                    onChange={(e) => setLinkForm({ ...linkForm, chip_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  >
                    <option value="AI-ASIC v6e">AI-ASIC v6e</option>
                    <option value="NextGen-ASIC v7x">NextGen-ASIC v7x</option>
                    <option value="NVIDIA H200">NVIDIA H200</option>
                    <option value="NVIDIA B200 (Blackwell)">NVIDIA B200 (Blackwell)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Requested Chips</label>
                    <input
                      type="number"
                      min={8}
                      step={8}
                      value={linkForm.requested_chips}
                      onChange={(e) =>
                        setLinkForm({ ...linkForm, requested_chips: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Deal TCV ($M)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={linkForm.deal_tcv_usd_m}
                      onChange={(e) =>
                        setLinkForm({ ...linkForm, deal_tcv_usd_m: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                    />
                  </div>
                </div>
              </div>

              {/* Dual Delivery Dates: Ideal Start Date vs. Must-Have-By Date */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200">
                    Dual Delivery Dates: Ideal Start vs. Must-Have-By Date
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-100 text-indigo-800">
                    Flexibility Window: {linkFlexDays} Days
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-indigo-900 dark:text-indigo-200 mb-1">
                      Ideal Start Date (Preferred Ramp)
                    </label>
                    <input
                      type="date"
                      value={linkForm.ideal_start_date}
                      onChange={(e) => setLinkForm({ ...linkForm, ideal_start_date: e.target.value })}
                      className="w-full px-3 py-1.5 font-mono rounded-lg border border-indigo-300 bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-rose-700 dark:text-rose-300 mb-1">
                      Must-Have-By Date (Hard Drop-Dead Date)
                    </label>
                    <input
                      type="date"
                      value={linkForm.must_have_by_date}
                      onChange={(e) =>
                        setLinkForm({ ...linkForm, must_have_by_date: e.target.value })
                      }
                      className="w-full px-3 py-1.5 font-mono rounded-lg border border-rose-300 bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>
              </div>

              {/* Auto-Tier Preview + GTM Override */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    Auto-Classified Demand Pyramid Tier:
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-500 text-white">
                    {linkForm.requested_chips >= 5000 ||
                    linkForm.deal_tcv_usd_m >= 100 ||
                    linkForm.is_gtm_elevated
                      ? 'TIER 1: INDIVIDUAL WHALE ROW'
                      : linkForm.requested_chips >= 64
                      ? 'TIER 2: REGIONAL TORSO BUCKET (64–5,000)'
                      : 'TIER 3: REGIONAL LONG-TAIL BUCKET (≤64)'}
                  </span>
                </div>
                <label className="inline-flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={linkForm.is_gtm_elevated}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, is_gtm_elevated: e.target.checked })
                    }
                    className="rounded text-amber-600"
                  />
                  ⚡ GTM Lead Elevation Override (Pin as Individual Whale regardless of chip count)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegistryLinkOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkingRegistry}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm"
                >
                  {linkingRegistry
                    ? 'Linking capacity-registry CCA & Writing Ledger...'
                    : 'Link capacity-registry CCA & Persist to Memory Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals & Slide-Over Drawers */}
      <CapacityIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onCreated={() => {
          fetchAllData();
          setActiveTab('allocation');
        }}
        activePersonaEmail={activePersona}
      />
      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        activePersonaEmail={activePersona}
      />
      <IntegrationLinkPreviewModal
        context={previewLinkContext}
        onClose={() => setPreviewLinkContext(null)}
        activePersonaEmail={activePersona}
        onUrlAttached={() => {
          fetchAllData();
        }}
      />
      <IntegrationDirectoryModal
        isOpen={isLinkDirectoryOpen}
        onClose={() => setIsLinkDirectoryOpen(false)}
      />
    </div>
  );
}
export default App;

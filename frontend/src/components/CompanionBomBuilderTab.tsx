import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertOctagon,
  FileText,
  ShieldCheck,
  Award,
  Sparkles,
  Copy,
  Check,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { CompanionCard } from '../types';

interface CompanionBomBuilderTabProps {
  companionCards: CompanionCard[];
  activePersonaEmail: string;
  onRefresh: () => void;
}

export const CompanionBomBuilderTab: React.FC<CompanionBomBuilderTabProps> = ({
  companionCards,
  activePersonaEmail,
  onRefresh,
}) => {
  const [selectedCard, setSelectedCard] = useState<CompanionCard | null>(
    companionCards[0] || null
  );
  const [activeSubTab, setActiveSubTab] = useState<'tab1' | 'tab2' | 'tab3' | 'tab4' | 'slide'>(
    'tab1'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedSlide, setCopiedSlide] = useState(false);

  const handleCdrSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/v1/companion/cdr-lookup?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: { 'X-Role-Persona': activePersonaEmail },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleApprovalAction = async (
    cardId: string,
    action: 'ced_endorse' | 'ce_vp_nominate' | 'forum_approve' | 'forum_reject'
  ) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/v1/companion/cards/${cardId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersonaEmail,
        },
        body: JSON.stringify({
          action,
          approver_ldap: activePersonaEmail,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCard(data.card);
        onRefresh();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const generateSlideMarkdown = (card: CompanionCard) => {
    const t1 = card.tab1_account_commercial;
    const t2 = card.tab2_cdr_line_items;
    const t3 = card.tab3_workload_dfe;
    const t4 = card.tab4_strategic_responses;
    return `# COMPANION 2.0 INTAKE CARD — ${card.customer_name} (${card.card_id})
**Registry CDR:** ${card.registry_cdr_id} | **Vector Opp:** ${card.vector_opportunity_id} | **Coupled Allocation ID:** ${card.linked_allocation_request_id || 'Standalone Classic Infra'}
**Stage:** ${card.stage} | **CED Endorser:** ${card.approvals.ced_endorsed_by || 'Pending'} | **CE VP Nominator:** ${card.approvals.ce_vp_nominated_by || 'Pending'}

## 1. Account Team & Commercial Summary
- **Customer Tier:** ${t1.customer_tier} (${t1.sub_region})
- **AE / CE / CED / VP:** ${t1.account_executive_ldap} / ${t1.ce_lead_ldap} / ${t1.ced_approver_ldap} / ${t1.ce_vp_nominator_ldap}
- **Current Run-Rate ARR:** $${t1.current_annual_run_rate_usd_m}M | **Incremental ARR:** +$${t1.incremental_arr_usd_m}M | **Deal TCV:** $${t1.total_deal_tcv_usd_m}M (${t1.commercial_stage})

## 2. Registry CDR Netted Demand & >20% Regional Gate
- **Target Region / Zone / SKU:** ${t2.region} (${t2.zone}) — ${t2.machine_family} + ${t2.pd_ssd_tb} TB PD-SSD
- **Gross Requested Cores:** ${t2.gross_requested_cores.toLocaleString()} vCPUs
- **Less Current Consumed Cores:** -${t2.current_consumed_cores.toLocaleString()} vCPUs
- **Net Incremental Cores:** **${t2.net_incremental_cores.toLocaleString()} vCPUs** (${t2.pct_of_regional_supply}% of ${t2.region} available supply — ${t2.exceeds_20pct_threshold ? 'EXCEEDS >20% COMPANION GATE' : 'Within 20% Gate'})
- **Target Delivery Date:** ${t2.target_delivery_date}

## 3. Workload Attributes & DFE Classification
- **Workload Category:** ${t3.workload_category} | **Latency Sensitivity:** ${t3.latency_sensitivity}
- **DFE Classification:** ${t3.dfe_classification} | **Alternate Regions:** ${t3.alternate_region_candidates.join(', ')}
- **Alternate Machine Families:** ${t3.alternate_machine_families.join(', ')} | **Spot/FlexStart Eligible:** ${t3.spot_or_flex_start_eligible_pct}%

## 4. Slide 3 Mandatory Strategic Responses (companion-infra-gate-intake-template)
1. **Business Justification:** ${t4.q1_business_justification}
2. **Impact if Delayed/Denied:** ${t4.q2_impact_if_delayed_or_denied}
3. **Why Specific Region & SKU:** ${t4.q3_why_specific_region_and_sku}
4. **Customer Ramp & 45-Day Plan:** ${t4.q4_customer_ramp_and_45day_plan}
5. **DFE Alternatives Exhausted:** ${t4.q5_dfe_alternatives_exhausted}
6. **Associated with Allocation Approval?:** ${t4.q6_associated_with_allocation_approval}
`;
  };

  const handleCopySlide = () => {
    if (!selectedCard) return;
    navigator.clipboard.writeText(generateSlideMarkdown(selectedCard));
    setCopiedSlide(true);
    setTimeout(() => setCopiedSlide(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining replacement of broken companion-infra-gate-intake-tool */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              CLOUD-NATIVE REPLACEMENT FOR companion-infra-gate-intake-tool
            </span>
            <span className="text-xs font-mono text-zinc-500">
              Replaces offline legacy intake server
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            Companion 2.0 Four-Tab Intake Card Builder & CED / CE VP Approval Chain
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Enforces pre-intake Registry CDR validation (blocking <code className="font-mono">Approved</code>/<code className="font-mono">Obsolete</code> CDRs), computes Netted Demand (<code className="font-mono">Gross - Current Consumed</code>), and links coupled Allocation accelerator approvals.
          </p>
        </div>

        {/* Multi-Key CDR Lookup Form */}
        <form onSubmit={handleCdrSearch} className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search CDR ID (e.g. CDR00305992) or Customer..."
              className="pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 w-72 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all"
          >
            {isSearching ? 'Checking...' : 'Validate CDR'}
          </button>
        </form>
      </div>

      {/* CDR Pre-Filter Search Results */}
      {searchResults && (
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Registry CDR Pre-Filter Validation Results ({searchResults.length} found)
            </h3>
            <button
              onClick={() => setSearchResults(null)}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Clear Search
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchResults.map((cdr) => (
              <div
                key={cdr.registry_cdr_id}
                className={`p-3.5 rounded-lg border flex flex-col justify-between gap-2 ${
                  cdr.eligible_for_companion_intake
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-rose-500/5 border-rose-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {cdr.registry_cdr_id}
                      </span>
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        • {cdr.customer_name}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      {cdr.region} ({cdr.zone}) • {cdr.machine_family} • Gross:{' '}
                      {cdr.gross_requested_cores.toLocaleString()} cores | Consumed:{' '}
                      {cdr.current_consumed_cores.toLocaleString()} cores
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                      cdr.eligible_for_companion_intake
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {cdr.cdr_status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {cdr.eligible_for_companion_intake ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span
                    className={
                      cdr.eligible_for_companion_intake
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300 font-medium'
                    }
                  >
                    {cdr.status_reason}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Active Companion 2.0 Cards Queue */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">
            Active Companion 2.0 Escalation Cards ({companionCards.length})
          </h3>
          {companionCards.map((card) => {
            const isSelected = selectedCard?.card_id === card.card_id;
            return (
              <div
                key={card.card_id}
                onClick={() => setSelectedCard(card)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50/60 dark:bg-blue-950/25 border-blue-500 shadow-sm'
                    : 'bg-white dark:bg-[#0c0c0f] border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {card.card_id} • {card.registry_cdr_id}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Stage {card.stage_step}/5
                  </span>
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {card.customer_name}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                  {card.tab2_cdr_line_items.region} •{' '}
                  {card.tab2_cdr_line_items.net_incremental_cores.toLocaleString()} Net Cores (
                  {card.tab2_cdr_line_items.pct_of_regional_supply}% Regional Supply)
                </p>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
                  <span className="text-zinc-500 truncate">{card.stage}</span>
                  {card.linked_allocation_request_id && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono text-[11px]">
                      Coupled: {card.linked_allocation_request_id}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 8 Cols: 4-Tab Companion 2.0 Card Inspector & Approval Workflow */}
        <div className="lg:col-span-8">
          {selectedCard ? (
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5 shadow-sm">
              {/* Top Card Header & Approval Chain Stepper */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {selectedCard.card_id}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">
                      CDR: {selectedCard.registry_cdr_id}
                    </span>
                    {selectedCard.linked_allocation_request_id && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400">
                        Coupled Allocation: {selectedCard.linked_allocation_request_id}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {selectedCard.customer_name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Current Lifecycle Stage: <strong className="text-zinc-800 dark:text-zinc-200">{selectedCard.stage}</strong>
                  </p>
                </div>

                {/* Role-Based Approval Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleApprovalAction(selectedCard.card_id, 'ced_endorse')}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-all"
                    title="Endorse as Customer Engineering Director (ce-director@demo.example.com)"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {selectedCard.approvals.ced_endorsed_by
                      ? `CED Endorsed (${selectedCard.approvals.ced_endorsed_by.split('@')[0]})`
                      : 'Stage 2: CED Endorse'}
                  </button>
                  <button
                    onClick={() => handleApprovalAction(selectedCard.card_id, 'ce_vp_nominate')}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all"
                    title="Nominate as CE Vice President (ce-vp-approver@demo.example.com)"
                  >
                    <Award className="w-3.5 h-3.5" />
                    {selectedCard.approvals.ce_vp_nominated_by
                      ? `VP Nominated (${selectedCard.approvals.ce_vp_nominated_by.split('@')[0]})`
                      : 'Stage 3: CE VP Nominate'}
                  </button>
                  <button
                    onClick={() => handleApprovalAction(selectedCard.card_id, 'forum_approve')}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Stage 4: Forum Approve & Start 14d SLA
                  </button>
                </div>
              </div>

              {/* 4-Tab Navigation + Slide Preview */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                {[
                  { id: 'tab1', label: 'Tab 1: Account & Commercial (10 Fields)' },
                  { id: 'tab2', label: 'Tab 2: CDR Netted Demand & >20% Gate' },
                  { id: 'tab3', label: 'Tab 3: Workload & DFE Ranker (8 Attrs)' },
                  { id: 'tab4', label: 'Tab 4: 6 Slide-3 Strategic Responses' },
                  { id: 'slide', label: 'Slide-Ready Executive Export' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveSubTab(t.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeSubTab === t.id
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab 1 Content */}
              {activeSubTab === 'tab1' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(selectedCard.tab1_account_commercial).map(([k, v]) => (
                    <div
                      key={k}
                      className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800"
                    >
                      <div className="text-[11px] font-mono uppercase text-zinc-500">
                        {k.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
                        {typeof v === 'number' ? `$${v}M USD` : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 2 Content: Netted Demand Calculator */}
              {activeSubTab === 'tab2' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono uppercase font-bold text-amber-700 dark:text-amber-300">
                        Automated Netted Demand Formula (Total Demand - Current Consumption)
                      </span>
                      <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
                        {selectedCard.tab2_cdr_line_items.gross_requested_cores.toLocaleString()} Gross{' '}
                        - {selectedCard.tab2_cdr_line_items.current_consumed_cores.toLocaleString()}{' '}
                        Consumed ={' '}
                        <span className="text-amber-600 dark:text-amber-400">
                          {selectedCard.tab2_cdr_line_items.net_incremental_cores.toLocaleString()}{' '}
                          Net vCPUs
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {selectedCard.tab2_cdr_line_items.pct_of_regional_supply}%
                      </div>
                      <div className="text-xs text-zinc-500">
                        of {selectedCard.tab2_cdr_line_items.region} Net Supply (Gate: &gt;20%)
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs text-zinc-500">Target Region & Zone</span>
                      <div className="text-sm font-mono font-bold mt-1">
                        {selectedCard.tab2_cdr_line_items.region} ({selectedCard.tab2_cdr_line_items.zone})
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs text-zinc-500">Machine Family & Storage</span>
                      <div className="text-sm font-mono font-bold mt-1">
                        {selectedCard.tab2_cdr_line_items.machine_family} •{' '}
                        {selectedCard.tab2_cdr_line_items.pd_ssd_tb} TB SSD
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs text-zinc-500">Target Delivery Date</span>
                      <div className="text-sm font-mono font-bold mt-1">
                        {selectedCard.tab2_cdr_line_items.target_delivery_date}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3 Content: 8 Workload Attributes & DFE Ranker */}
              {activeSubTab === 'tab3' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(selectedCard.tab3_workload_dfe).map(([k, v]) => (
                    <div
                      key={k}
                      className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="text-[11px] font-mono uppercase text-zinc-500">
                        {k.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                        {Array.isArray(v) ? v.join(', ') : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4 Content: 6 Required Slide 3 Strategic Responses */}
              {activeSubTab === 'tab4' && (
                <div className="space-y-3">
                  {[
                    {
                      label: 'Q1. Business Justification & Revenue Impact',
                      val: selectedCard.tab4_strategic_responses.q1_business_justification,
                    },
                    {
                      label: 'Q2. Customer Impact if Delayed or Denied',
                      val: selectedCard.tab4_strategic_responses.q2_impact_if_delayed_or_denied,
                    },
                    {
                      label: 'Q3. Technical Constraint: Why This Specific Region & SKU?',
                      val: selectedCard.tab4_strategic_responses.q3_why_specific_region_and_sku,
                    },
                    {
                      label: 'Q4. Customer Ramp Schedule & 45-Day Delivery Verification',
                      val: selectedCard.tab4_strategic_responses.q4_customer_ramp_and_45day_plan,
                    },
                    {
                      label: 'Q5. Dynamic Footprint Enablement (DFE) Alternatives Exhausted',
                      val: selectedCard.tab4_strategic_responses.q5_dfe_alternatives_exhausted,
                    },
                    {
                      label:
                        'Q6. Coupled Architecture: Is this associated with an accelerator delivery approved through Allocation?',
                      val: selectedCard.tab4_strategic_responses.q6_associated_with_allocation_approval,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {item.label}
                      </div>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 mt-1 leading-relaxed">
                        {item.val}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Slide Export Preview */}
              {activeSubTab === 'slide' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Formatted for direct paste into <code className="font-mono">companion-infra-gate-intake-template</code> Slide 3
                    </span>
                    <button
                      onClick={handleCopySlide}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      {copiedSlide ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied to Clipboard
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Slide Markdown
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto leading-relaxed">
                    {generateSlideMarkdown(selectedCard)}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

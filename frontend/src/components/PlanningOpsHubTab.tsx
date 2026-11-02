import React, { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  BarChart3, Search, Sparkles, Sliders, AlertTriangle, CheckCircle2,
  Layers, ArrowUpRight, Save, RefreshCw, ShieldAlert, Cpu, Globe, Zap,
  Radio, FileCode, X, ChevronDown, ChevronUp, Activity
} from 'lucide-react';

interface PlanningOpsHubTabProps {
  activeRoleEmail: string;
  ntkViewMode?: 'GLOBAL_FLEET' | 'TERRITORY_REDACTED' | 'TERRITORY_STRICT';
  onNavigateToQueue?: (regionFilter?: string, viewMode?: 'WHALES' | 'BUCKETS' | 'SPLIT') => void;
  onOpenDealDesk?: () => void;
  onTransactionRecorded?: () => void;
}

export const PlanningOpsHubTab: React.FC<PlanningOpsHubTabProps> = ({
  activeRoleEmail,
  onNavigateToQueue,
  onOpenDealDesk,
  onTransactionRecorded,
}) => {
  const [theaterFilter, setTheaterFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [chipFilter, setChipFilter] = useState<string>('ALL');
  const [includeTorsoTail, setIncludeTorsoTail] = useState<boolean>(true);
  const [hotToColdPct, setHotToColdPct] = useState<number>(0);
  const [gpuToTpuPct, setGpuToTpuPct] = useState<number>(0);
  const [torsoTailDwsPct, setTorsoTailDwsPct] = useState<number>(0);
  const [showDfeSimulator, setShowDfeSimulator] = useState<boolean>(false);
  const [showBacktestPanel, setShowBacktestPanel] = useState<boolean>(true);

  const [forecastData, setForecastData] = useState<any>(null);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(false);

  // Free-text analytics search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState<boolean>(false);

  // Scenario save state
  const [scenarioName, setScenarioName] = useState<string>('');
  const [savingScenario, setSavingScenario] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Closed-Loop Supply Signal State
  const [emittingSignalKey, setEmittingSignalKey] = useState<string | null>(null);
  const [emittedSignalModal, setEmittedSignalModal] = useState<any>(null);

  const fetchForecast = useCallback(async () => {
    setLoadingForecast(true);
    try {
      const params = new URLSearchParams({
        theater: theaterFilter,
        region: regionFilter,
        chip_name: chipFilter,
        include_torso_tail: String(includeTorsoTail),
        hot_to_cold_pct: String(hotToColdPct),
        gpu_to_tpu_pct: String(gpuToTpuPct),
        torso_tail_flex_start_g4_pct: String(torsoTailDwsPct),
      });
      const res = await fetch(`/api/v1/planning/forecast?${params.toString()}`);
      const data = await res.json();
      setForecastData(data);
    } catch (err) {
      console.error('Failed to fetch planning forecast:', err);
    } finally {
      setLoadingForecast(false);
    }
  }, [theaterFilter, regionFilter, chipFilter, includeTorsoTail, hotToColdPct, gpuToTpuPct, torsoTailDwsPct]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const handleRunSearch = async (presetQuery?: string) => {
    const q = (presetQuery !== undefined ? presetQuery : searchQuery).trim();
    if (!q) return;
    if (presetQuery !== undefined) setSearchQuery(presetQuery);
    setSearching(true);
    try {
      const res = await fetch('/api/v1/planning/search-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setSearchResult(data);
    } catch (err) {
      console.error('Analytics search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!forecastData?.kpis) return;
    setSavingScenario(true);
    setSaveBanner(null);
    try {
      const title =
        scenarioName.trim() ||
        `DFE Plan (${theaterFilter}/${regionFilter === 'ALL' ? 'All Regions' : regionFilter}: Cold ${hotToColdPct}% / TPU ${gpuToTpuPct}% / FlexStart ${torsoTailDwsPct}%)`;
      const res = await fetch('/api/v1/planning/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_name: title,
          actor_ldap: activeRoleEmail,
          region_filter: regionFilter,
          chip_filter: chipFilter,
          include_torso_tail: includeTorsoTail,
          hot_to_cold_pct: hotToColdPct,
          gpu_to_tpu_pct: gpuToTpuPct,
          torso_tail_flex_start_g4_pct: torsoTailDwsPct,
          resulting_net_balance_chips: forecastData.kpis.net_balance_chips,
          Protected_tcv_usd_m: forecastData.kpis.total_stacked_tcv_usd_m,
          notes: `Saved from Planning & Operations Hub (Theater=${theaterFilter}, Torso/Tail=${includeTorsoTail})`,
        }),
      });
      const data = await res.json();
      if (data.status === 'saved') {
        setSaveBanner(`Saved scenario "${title}" to Persistent Transaction Memory Ledger (${data.scenario.scenario_id}).`);
        setScenarioName('');
        fetchForecast();
        if (onTransactionRecorded) onTransactionRecorded();
      }
    } catch (err) {
      console.error('Error saving scenario:', err);
    } finally {
      setSavingScenario(false);
    }
  };

  const handleEmitProcurementSignal = async (row: any) => {
    const key = `${row.region}-${row.chip_name}`;
    setEmittingSignalKey(key);
    try {
      const deficitChips = Math.max(256, Math.abs(row.net_balance_chips));
      const res = await fetch('/api/v1/planning/procurement-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: row.region,
          chip_name: row.chip_name,
          deficit_chips: deficitChips,
          actor_ldap: activeRoleEmail,
          signal_type: 'CAPACITY_EXPANSION_SIGNAL',
          notes: `Illustrative capacity expansion signal emitted from Macro Forecast Hub (${row.theater} / ${row.regulatory_gate}).`,
        }),
      });
      const data = await res.json();
      if (data.status === 'emitted') {
        setEmittedSignalModal(data);
        if (onTransactionRecorded) onTransactionRecorded();
      }
    } catch (err) {
      console.error('Error emitting supply signal:', err);
    } finally {
      setEmittingSignalKey(null);
    }
  };

  const kpis = forecastData?.kpis || {
    whale_demand_chips: 0,
    torso_demand_chips: 0,
    tail_demand_chips: 0,
    total_stacked_demand_chips: 0,
    effective_supply_chips: 0,
    foundation_llm_1p_cotenancy_chips: 0,
    reliability_reserve_chips: 0,
    net_balance_chips: 0,
    torso_tail_share_pct: 0,
    total_stacked_tcv_usd_m: 0,
    total_power_load_mw: 0,
    avg_revenue_yield_usd_m_per_mw: 0,
    avg_telemetry_realization_pct: 0,
    gsc_po_trigger_status: 'BALANCED',
    must_have_breach_risk_count: 0,
    must_have_breach_risk_chips: 0,
    must_have_breach_risk_tcv_usd_m: 0,
    false_green_region_count: 0,
    false_green_regions: [],
  };

  const rows: any[] = forecastData?.rows || [];
  const theaterSummary: Record<string, any> = forecastData?.theater_summary || {};
  const backtest = forecastData?.forecast_backtest || null;

  const getStackedForecastChartOption = () => {
    const labels = rows.map(
      (r) =>
        `${r.region}\n${r.chip_name
          .replace('AI-ASIC v6e', 'v6e')
          .replace('NextGen-ASIC v7x', 'v7x')
          .replace('NVIDIA ', '')
          .replace(' (Blackwell)', '')}`
    );
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: [
          'Tier 1: Whale Demand (5,000+ chips)',
          'Tier 2: Torso Registry Bucket (64–5,000)',
          'Tier 3: Long-Tail / FlexStart (≤64)',
          'Net Saleable Supply (After 10% Reliability Reserve)',
        ],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#475569' },
      },
      grid: { left: '3%', right: '3%', bottom: '15%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 10, color: '#334155', interval: 0 },
      },
      yAxis: {
        type: 'value',
        name: 'Chips',
        axisLabel: { fontSize: 10, color: '#64748b' },
      },
      series: [
        {
          name: 'Tier 1: Whale Demand (5,000+ chips)',
          type: 'bar',
          stack: 'demand',
          data: rows.map((r) => r.whale_demand_chips),
          itemStyle: { color: '#1a73e8' },
        },
        {
          name: 'Tier 2: Torso Registry Bucket (64–5,000)',
          type: 'bar',
          stack: 'demand',
          data: rows.map((r) => r.torso_demand_chips),
          itemStyle: { color: '#f59e0b' },
        },
        {
          name: 'Tier 3: Long-Tail / FlexStart (≤64)',
          type: 'bar',
          stack: 'demand',
          data: rows.map((r) => r.tail_demand_chips),
          itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: 'Net Saleable Supply (After 10% Reliability Reserve)',
          type: 'line',
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 3, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          data: rows.map(
            (r) =>
              r.net_of_reliability_supply_chips ??
              Math.round((r.effective_supply_chips || 0) * 0.9)
          ),
        },
      ],
    };
  };

  const presetQueries = [
    'us-east4 H200 deficit and torso demand',
    'all elevated deals with must-have date in Q4',
    'APAC Tokyo or Public Sector regulated demand',
    'drop-dead must-have breach risk deals',
  ];

  const theaterTabs = [
    { id: 'ALL', label: '🌐 All Global Fleet', sub: 'NorthAm + EMEA + APAC + Public Sector' },
    { id: 'NORTHAM', label: '🇺🇸 NorthAm Commercial', sub: 'us-east5 • us-east4 • us-central1 • us-south1' },
    { id: 'EMEA', label: '🇪🇺 EMEA Sovereign', sub: 'europe-west4 (GDPR Boundary)' },
    { id: 'APAC', label: '🌏 APAC Regulated', sub: 'asia-northeast1 (Tokyo FISC/MAS)' },
    { id: 'PUBLIC_SECTOR', label: '🏛️ Public Sector', sub: 'us-east4-regulated (Regulated Enclave)' },
  ];

  return (
    <div className="space-y-4">
      {forecastData?.rbac_notice && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-medium">
          🔒 <b>Demo Role View Scoped:</b> {forecastData.rbac_notice}
        </div>
      )}

      {/* Top Bar: Global Theater Selector + Free-Text Semantic Analytics Search */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                EXPAND · ALLOCATE · OPTIMIZE (ILLUSTRATIVE PROTOTYPE)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                3-Tier Cloud Demand + Parametric Scenario Bands (P50/P75/P90) + Illustrative WMAPE Backtest
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 mt-1">
              Global Infrastructure Performance, Stage-Weighted Demand Forecasting &amp; Capacity Planning
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenDealDesk && (
              <button
                onClick={onOpenDealDesk}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                Open Deal Desk &amp; Tracker (9 Synthetic Pursuits)
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowBacktestPanel(!showBacktestPanel)}
              className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              {showBacktestPanel ? 'Hide Quantile & Backtest' : 'Show Quantile & Backtest'}
            </button>
            <button
              onClick={() => setShowDfeSimulator(!showDfeSimulator)}
              className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              {showDfeSimulator ? 'Hide Advanced Simulation' : 'Advanced Simulation & What-If Sliders'}
              {showDfeSimulator ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => fetchForecast()}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingForecast ? 'animate-spin text-blue-600' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Global Theater Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            Global Theater:
          </span>
          {theaterTabs.map((t) => {
            const active = theaterFilter === t.id;
            const summary = t.id !== 'ALL' ? theaterSummary[t.id] : null;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheaterFilter(t.id);
                  setRegionFilter('ALL');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-indigo-400'
                }`}
              >
                <span>{t.label}</span>
                {summary && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      active
                        ? 'bg-indigo-800 text-indigo-100'
                        : summary.net_balance_chips >= 0
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {summary.net_balance_chips >= 0 ? '+' : ''}
                    {summary.net_balance_chips.toLocaleString()} chips • {summary.power_load_mw}MW
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Free-Text Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunSearch()}
              placeholder="Ask or search across Global Theaters, Whales, Torso/Tail buckets, or $/MW yield (e.g., 'us-east4 H200 deficit and torso demand')..."
              className="w-full pl-10 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => handleRunSearch()}
            disabled={searching}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {searching ? 'Analyzing...' : 'Run Analytics Search'}
          </button>
          {searchResult && (
            <button
              onClick={() => {
                setSearchResult(null);
                setSearchQuery('');
              }}
              className="px-3 py-1.5 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 rounded-lg text-xs font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Preset Query Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Instant Queries:</span>
          {presetQueries.map((pq) => (
            <button
              key={pq}
              onClick={() => handleRunSearch(pq)}
              className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-900 hover:bg-blue-50 hover:text-blue-700 text-slate-600 dark:text-zinc-400 font-medium border border-slate-200 dark:border-zinc-800 transition-colors"
            >
              {pq}
            </button>
          ))}
        </div>

        {/* Analytics Search Result Drawer */}
        {searchResult && (
          <div className="mt-2 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-indigo-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                    Planning & Operations Analytics Synthesis ({searchResult.total_matched_chips?.toLocaleString()} Chips | ${searchResult.total_matched_tcv_usd_m}M TCV)
                  </div>
                  <p className="text-xs text-slate-100 mt-1 leading-relaxed">{searchResult.ai_synthesis}</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-800/80 text-indigo-200 whitespace-nowrap">
                {searchResult.matched_whale_count} Whales • {searchResult.matched_bucket_count} Torso/Tail Buckets
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5 Executive Planning & Investment KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: 3-Tier Stacked Demand */}
        <div className="bg-white dark:bg-[#0c0c0f] rounded-xl p-3.5 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              1. Stacked 3-Tier Demand
            </span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-100 mt-1">
            {kpis.total_stacked_demand_chips.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-slate-500">chips</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600 dark:text-zinc-400">
            <span>W: <b>{kpis.whale_demand_chips.toLocaleString()}</b></span>
            <span>T: <b>{kpis.torso_demand_chips.toLocaleString()}</b></span>
            <span>L: <b>{kpis.tail_demand_chips.toLocaleString()}</b></span>
          </div>
          <div className="mt-1.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded inline-block">
            ${kpis.total_stacked_tcv_usd_m.toLocaleString()}M TCV ({kpis.torso_tail_share_pct}% Torso/Tail)
          </div>
        </div>

        {/* Card 2: Effective 3P Supply vs. FlexStart Pool */}
        <div className="bg-white dark:bg-[#0c0c0f] rounded-xl p-3.5 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              2. Saleable Cloud Supply & Dedicated Field FlexStart Pool
            </span>
            <Cpu className="w-4 h-4 text-emerald-600" />
          </div>
          <div className={`text-xl font-extrabold mt-1 ${kpis.net_balance_chips >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {kpis.net_balance_chips >= 0 ? '+' : ''}
            {kpis.net_balance_chips.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-slate-500">net chips</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-600 dark:text-zinc-400">
            Net of 10% Reserve: <b>{(kpis.net_of_reliability_supply_chips ?? (kpis.effective_supply_chips - (kpis.reliability_reserve_chips || 0))).toLocaleString()}</b> • Gross: <b>{kpis.effective_supply_chips.toLocaleString()}</b>
          </div>
          <div className="mt-1.5 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-900 px-2 py-0.5 rounded inline-block">
            10% Reliability Buffer: {kpis.reliability_reserve_chips?.toLocaleString() || 0} chips
          </div>
        </div>

        {/* Card 3: Data Center Power & $/MW Revenue Density */}
        <div className="bg-white dark:bg-[#0c0c0f] rounded-xl p-3.5 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              3. DC Power & $/MW Yield
            </span>
            <Zap className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            ${kpis.avg_revenue_yield_usd_m_per_mw}M{' '}
            <span className="text-xs font-semibold text-slate-500">/ MW / Yr</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-600 dark:text-zinc-400">
            Supply Fleet Power: <b>{kpis.total_power_load_mw} MW</b> across {rows.length} pools
          </div>
          <div className="mt-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded inline-block">
            30d Commit Utilization: {kpis.avg_telemetry_realization_pct}% Realized
          </div>
        </div>

        {/* Card 4: Must-Have-By Drop-Dead Risk */}
        <div className="bg-white dark:bg-[#0c0c0f] rounded-xl p-3.5 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              4. Must-Have Breach Risk
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">
            ${kpis.must_have_breach_risk_tcv_usd_m}M{' '}
            <span className="text-xs font-semibold text-slate-500">
              ({kpis.must_have_breach_risk_count} Whales)
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-600 dark:text-zinc-400">
            <b>{kpis.must_have_breach_risk_chips.toLocaleString()} chips</b> precede regional wave
          </div>
          <div className="mt-1.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded inline-block">
            Action: Seed Pod Bridge or Cold Spillover
          </div>
        </div>

        {/* Card 5: False-Green Alert & Supply Signal */}
        <div className="bg-white dark:bg-[#0c0c0f] rounded-xl p-3.5 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              5. False-Green & Supply Signal
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-extrabold text-rose-600 mt-1">
            {kpis.false_green_region_count}{' '}
            <span className="text-xs font-semibold text-slate-500">False-Green Pools</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-600 dark:text-zinc-400">
            Supply Signal: <b>{kpis.gsc_po_trigger_status}</b>
          </div>
          <div className="mt-1.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded truncate">
            {kpis.false_green_regions?.length > 0
              ? kpis.false_green_regions.join(' • ')
              : 'All pools aligned with Torso/Tail'}
          </div>
        </div>
      </div>

      {/* Stage-Calibrated + DataWarehouse ML (TimesFM) Quantile Forecast & 6-Month Rolling Backtest Panel */}
      {showBacktestPanel && backtest && (
        <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-emerald-300/80 dark:border-emerald-800/70 p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-600 text-white">
                  PILLAR 2: DEMAND FORECASTING METHODOLOGY & ILLUSTRATIVE BACKTEST
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                  {backtest.methodology || backtest.model_architecture}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Illustrative Stage-Weighted Funnel &amp; 80% Capital Cap (Mockup: <code className="font-mono">Early = 15%</code>, <code className="font-mono">Likely = 55%</code>, <code className="font-mono">Customer Firm = 85%</code>, <code className="font-mono">Contracted = 100%</code>) • Production Path: DataWarehouse ML <code className="font-mono">AI.FORECAST</code> (<code className="font-mono">TimesFM</code>).
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold">
                6-Mo Rolling WMAPE: {backtest.overall_wmape_pct ?? backtest.accuracy_governance?.wmape_6mo_rolling_pct ?? 6.8}% (Target ≤8.0% • Illustrative Synthetic Backtest)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-bold">
                Forecast Bias: {backtest.overall_bias_pct ?? backtest.accuracy_governance?.forecast_bias_pct ?? -1.4}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                <div className="text-[10px] text-slate-400">Raw Unadjusted Ask</div>
                <div className="text-sm font-bold text-slate-700 dark:text-zinc-200 mt-0.5">
                  {(backtest.quantiles_next_quarter_chips?.raw_unadjusted_pipeline_chips ?? backtest.registry_90d_quantiles?.unadjusted_raw_crm_ask_chips ?? backtest.quantiles_chips?.unadjusted_raw_ask_chips ?? 51800).toLocaleString()}
                </div>
                <div className="text-[10px] text-rose-500">100% Face Value</div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800">
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">P50 Expected</div>
                <div className="text-sm font-extrabold text-emerald-800 dark:text-emerald-200 mt-0.5">
                  {(backtest.quantiles_next_quarter_chips?.p50_expected_commit_chips ?? backtest.registry_90d_quantiles?.p50_expected_demand_chips ?? backtest.quantiles_chips?.p50_expected_chips ?? 33992).toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-600">Operational Plan</div>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800">
                <div className="text-[10px] text-blue-700 dark:text-blue-300 font-bold">P75 Buffer</div>
                <div className="text-sm font-extrabold text-blue-800 dark:text-blue-200 mt-0.5">
                  {(backtest.quantiles_next_quarter_chips?.p75_upside_buffer_chips ?? backtest.registry_90d_quantiles?.p75_buffer_demand_chips ?? backtest.quantiles_chips?.p75_upside_buffer_chips ?? 37731).toLocaleString()}
                </div>
                <div className="text-[10px] text-blue-600">Regional Safety</div>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800">
                <div className="text-[10px] text-purple-700 dark:text-purple-300 font-bold">P90 Peak CapEx</div>
                <div className="text-sm font-extrabold text-purple-800 dark:text-purple-200 mt-0.5">
                  {(backtest.quantiles_next_quarter_chips?.p90_supply_planning_envelope_chips ?? backtest.registry_90d_quantiles?.p90_supply_cap_demand_chips ?? backtest.quantiles_chips?.p90_supply_chain_cap_chips ?? 42150).toLocaleString()}
                </div>
                <div className="text-[10px] text-purple-600">Supply Ceiling</div>
              </div>
            </div>

            <div className="lg:col-span-7 overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-1.5 px-2">Month</th>
                    <th className="py-1.5 px-2 text-right">Raw CRM Ask</th>
                    <th className="py-1.5 px-2 text-right">P50 Forecast</th>
                    <th className="py-1.5 px-2 text-right">Actual Landed (Synthetic)</th>
                    <th className="py-1.5 px-2 text-right">WMAPE %</th>
                    <th className="py-1.5 px-2 text-right">Bias %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {(backtest.monthly_backtest_series || backtest.monthly_backtest || []).map((m: any) => (
                    <tr key={m.month}>
                      <td className="py-1 px-2 font-bold text-slate-700 dark:text-zinc-300">{m.month}</td>
                      <td className="py-1 px-2 text-right text-slate-400">{(m.raw_crm_ask_chips ?? m.raw_pipeline_chips ?? m.raw_unadjusted_ask_chips)?.toLocaleString()}</td>
                      <td className="py-1 px-2 text-right text-emerald-600 font-semibold">{(m.stage_weighted_p50_chips ?? m.predicted_p50_chips ?? m.p50_forecast_chips)?.toLocaleString()}</td>
                      <td className="py-1 px-2 text-right font-bold text-slate-900 dark:text-zinc-100">{(m.actual_landed_chips ?? m.actual_deployed_chips)?.toLocaleString()}</td>
                      <td className="py-1 px-2 text-right text-blue-600">{m.abs_pct_error ?? m.wmape_pct ?? m.ape_pct}%</td>
                      <td className="py-1 px-2 text-right text-slate-500">{m.bias_pct > 0 ? `+${m.bias_pct}` : m.bias_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Main Split: Stacked ECharts + Optional Collapsible What-If DFE Simulator */}
      <div className={`grid grid-cols-1 ${showDfeSimulator ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-4`}>
        {/* Chart + Filter Controls */}
        <div className={`${showDfeSimulator ? 'lg:col-span-2' : ''} bg-white dark:bg-[#0c0c0f] rounded-xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm flex flex-col justify-between`}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Stacked Regional Demand (Whale + Torso + Long-Tail) vs. Net Saleable Supply
                </h3>
                <p className="text-[11px] text-slate-500">
                  Bars show stacked Hyperscale Cloud demand tiers (Whales 5,000+, Torso 64–5,000, Tail ≤64); green line shows Net Saleable Cloud Supply (after FlexStart buffer & 10% reliability reserve).
                </p>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  aria-label="Filter Forecast by Region"
                  className="text-xs border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 font-medium text-slate-700 dark:text-zinc-200"
                >
                  <option value="ALL">All Regions ({theaterFilter})</option>
                  <option value="us-east5">us-east5 (Columbus)</option>
                  <option value="us-east4">us-east4 (Virginia)</option>
                  <option value="us-central1">us-central1 (Iowa)</option>
                  <option value="us-south1">us-south1 (Dallas)</option>
                  <option value="europe-west4">europe-west4 (Netherlands GDPR)</option>
                  <option value="asia-northeast1">asia-northeast1 (Tokyo FISC/MAS)</option>
                  <option value="us-east4-regulated">us-east4-regulated (Regulated / Sovereign)</option>
                </select>

                <select
                  value={chipFilter}
                  onChange={(e) => setChipFilter(e.target.value)}
                  aria-label="Filter Forecast by Accelerator SKU"
                  className="text-xs border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 font-medium text-slate-700 dark:text-zinc-200"
                >
                  <option value="ALL">All Accelerator SKUs</option>
                  <option value="AI-ASIC v6e">AI-ASIC v6e</option>
                  <option value="NextGen-ASIC v7x">NextGen-ASIC v7x</option>
                  <option value="NVIDIA H200">NVIDIA H200</option>
                  <option value="NVIDIA B200 (Blackwell)">NVIDIA B200 (Blackwell)</option>
                </select>

                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTorsoTail}
                    onChange={(e) => setIncludeTorsoTail(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  Include Torso & Tail (capacity-registry)
                </label>
              </div>
            </div>

            <div className="h-[310px] w-full mt-2">
              <ReactECharts option={getStackedForecastChartOption()} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Right 1/3: Interactive What-If DFE Simulator */}
        {showDfeSimulator && (
          <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    What-If DFE Supply Simulator
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sovereign-geofenced demand shaping before Tuesday Allocation / Thursday Companion Council.
                  </p>
                </div>
                {(hotToColdPct > 0 || gpuToTpuPct > 0 || torsoTailDwsPct > 0) && (
                  <button
                    onClick={() => {
                      setHotToColdPct(0);
                      setGpuToTpuPct(0);
                      setTorsoTailDwsPct(0);
                    }}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    Reset Sliders
                  </button>
                )}
              </div>

              {/* Slider 1: Hot to Cold Region Spillover */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">
                  <span>1. Hot → Cold Region Spillover (Geofenced)</span>
                  <span className="text-blue-600 font-bold">{hotToColdPct}%</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Shifts NorthAm <code className="font-mono">us-east4/5</code> to <code className="font-mono">us-central1 / us-south1</code>. Automatically locks <code className="font-mono">EMEA GDPR</code>, <code className="font-mono">APAC FISC</code> & <code className="font-mono">Regulated Zones</code>.
                </p>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={hotToColdPct}
                  onChange={(e) => setHotToColdPct(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 2: GPU to TPU Pivot */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">
                  <span>2. GPU (H200/B200) → TPU (v6e/v7x) Pivot</span>
                  <span className="text-indigo-600 font-bold">{gpuToTpuPct}%</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Migrate inference & fine-tuning workloads to ASIC-v6e v6e / ASIC-v7 v7x pools.
                </p>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={gpuToTpuPct}
                  onChange={(e) => setGpuToTpuPct(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Slider 3: Torso & Tail Offload to Flex-Start / G4 */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">
                  <span>3. Torso/Tail → Flex-Start & G4 Offload</span>
                  <span className="text-amber-600 font-bold">{torsoTailDwsPct}%</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Route Torso/Tail tickets to Flex-Start or G4 (RTX PRO 6000) without fixed reservations.
                </p>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={torsoTailDwsPct}
                  onChange={(e) => setTorsoTailDwsPct(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Save Scenario to Persistent Memory Ledger */}
            <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 mt-3 space-y-2">
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="Optional scenario name (e.g., Q4 East-to-Central Spillover)..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-zinc-700 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSaveScenario}
                disabled={savingScenario}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {savingScenario ? 'Saving to DataWarehouse Ledger...' : 'Save Forecast Scenario to Memory Ledger'}
              </button>
              {saveBanner && (
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>{saveBanner}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Regional Supply vs. 3-Tier Stacked Demand + DC Revenue Density & Closed-Loop Supply Signal Table */}
      <div className="bg-white dark:bg-[#0c0c0f] rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-zinc-900/60">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">
              Regional Saleable Cloud Supply, Flex-Start Pool, $/MW Revenue Density & Closed-Loop Supply Signal Matrix
            </h3>
            <p className="text-[11px] text-slate-500">
              Click <b>"📡 Emit Supply Signal"</b> on any Deficit / False-Green pool to emit an atomic Supply Expansion Trigger, <code className="font-mono">CapacityPlanningSignal</code>, and coupled Thursday Companion 2.0 Host CPU/Storage reservation.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/60 dark:bg-zinc-900/40">
                <th className="py-2.5 px-3">Region × SKU & Sovereign Gate</th>
                <th className="py-2.5 px-3 text-right">3-Tier Demand (W / T / L)</th>
                <th className="py-2.5 px-3 text-right">Total Stacked</th>
                <th className="py-2.5 px-3 text-right">Saleable Cloud Supply</th>
                <th className="py-2.5 px-3 text-right">Net Balance</th>
                <th className="py-2.5 px-3 text-right">Supply MW & $/MW Yield</th>
                <th className="py-2.5 px-3">Next Wave & Status</th>
                <th className="py-2.5 px-3 text-right">Closed-Loop Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70 text-xs">
              {rows.map((r) => {
                const rowKey = `${r.region}-${r.chip_name}`;
                const isEmitting = emittingSignalKey === rowKey;
                return (
                  <tr key={rowKey} className="hover:bg-slate-50/90 dark:hover:bg-zinc-900/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <span>{r.region}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                          {r.theater}
                        </span>
                      </div>
                      <div className="text-[11px] font-normal text-slate-500">{r.chip_name}</div>
                      {r.regulatory_gate && r.regulatory_gate !== 'Commercial Standard' && (
                        <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                          🛡️ {r.regulatory_gate}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                      <span className="text-blue-700 dark:text-blue-400 font-semibold">{r.whale_demand_chips.toLocaleString()}</span>
                      {' / '}
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">{r.torso_demand_chips.toLocaleString()}</span>
                      {' / '}
                      <span className="text-purple-700 dark:text-purple-400 font-semibold">{r.tail_demand_chips.toLocaleString()}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-zinc-100">
                      {r.total_stacked_demand_chips.toLocaleString()}
                      <div className="text-[10px] font-normal text-slate-500">${r.total_tcv_usd_m}M TCV</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                      {(r.net_of_reliability_supply_chips ?? (r.effective_supply_chips - (r.reliability_reserve_chips || 0))).toLocaleString()}
                      <div className="text-[10px] font-normal text-slate-400">
                        Gross: {r.effective_supply_chips.toLocaleString()} • 10% Rel: -{r.reliability_reserve_chips || 0}
                      </div>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        r.net_balance_chips >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {r.net_balance_chips >= 0 ? '+' : ''}
                      {r.net_balance_chips.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <div className="font-bold text-indigo-700 dark:text-indigo-300">
                        ${r.revenue_yield_usd_m_per_mw}M/MW
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {r.power_load_mw} MW • Util: <b>{r.telemetry_realization_pct}%</b>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {r.status === 'SURPLUS' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            SURPLUS
                          </span>
                        )}
                        {r.status === 'FALSE_GREEN_DEFICIT' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            FALSE GREEN (TORSO/TAIL DEFICIT)
                          </span>
                        )}
                        {r.status === 'DEFICIT_ACTION_REQUIRED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            DEFICIT • SUPPLY TRIGGER
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Wave: {r.next_wave_date} ({r.lead_time_days}d lead)
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        {r.net_balance_chips < 0 && (
                          <button
                            onClick={() => handleEmitProcurementSignal(r)}
                            disabled={isEmitting}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-[11px] inline-flex items-center gap-1 shadow-xs transition-colors"
                            title="Emit Closed-Loop Supply Expansion Trigger + CapacityPlanningSignal + Coupled Companion 2.0 CNS Signal"
                          >
                            <Radio className="w-3 h-3" />
                            {isEmitting ? 'Emitting...' : '📡 Emit Supply Signal'}
                          </button>
                        )}
                        {onNavigateToQueue && (
                          <button
                            onClick={() => onNavigateToQueue(r.region, 'SPLIT')}
                            className="px-2.5 py-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-700 text-slate-700 dark:text-zinc-200 font-semibold text-[11px] inline-flex items-center gap-1"
                          >
                            Queue
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closed-Loop Supply Expansion Signal Modal */}
      {emittedSignalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800">
                  CLOSED-LOOP SUPPLY SIGNAL PERSISTED TO WAREHOUSE LEDGER
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mt-1 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  Supply Expansion Trigger & CapacityPlanningSignal ({emittedSignalModal.signal_id})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bridges ML Demand Forecast deficit directly to Supply Planning & Platform Reliability.
                </p>
              </div>
              <button
                onClick={() => setEmittedSignalModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                <div className="text-[10px] font-mono uppercase text-slate-400">Supply Trigger ID</div>
                <div className="font-mono font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                  {emittedSignalModal.gsc_po_id}
                </div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {emittedSignalModal.deficit_chips?.toLocaleString()} chips • {emittedSignalModal.estimated_mw_delta} MW
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                <div className="text-[10px] font-mono uppercase text-slate-400">Coupled Companion 2.0 Host CPU</div>
                <div className="font-mono font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                  {emittedSignalModal.coupled_companion_cns_signal?.host_vcpus_required?.toLocaleString()} vCPUs
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {emittedSignalModal.coupled_companion_cns_signal?.host_series}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                <div className="text-[10px] font-mono uppercase text-slate-400">Coupled HighIOPSDisk & RoCE</div>
                <div className="font-mono font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                  {emittedSignalModal.coupled_companion_cns_signal?.high_iops_disk_ml_tb_required?.toLocaleString()} TB
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {emittedSignalModal.coupled_companion_cns_signal?.roce_400g_ports_required?.toLocaleString()} × 400G Ports
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono font-bold uppercase text-slate-500 mb-1">
                CapacityPlanningSignal (capacity_config.proto):
              </div>
              <pre className="p-3 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                {emittedSignalModal.autocap_proto_snippet}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setEmittedSignalModal(null)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

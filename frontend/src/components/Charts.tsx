import React from 'react';
import ReactECharts from 'echarts-for-react';
import { AllocationRequest, RegionalAvailability } from '../types';

interface ChartsProps {
  allocationRequests: AllocationRequest[];
  regionalAvailability: RegionalAvailability[];
  isDark: boolean;
  onSelectDeal?: (req: AllocationRequest) => void;
}

export const ExecutiveCharts: React.FC<ChartsProps> = ({
  allocationRequests,
  regionalAvailability,
  isDark,
  onSelectDeal,
}) => {
  const textColor = isDark ? '#e4e4e7' : '#27272a';
  const subTextColor = isDark ? '#a1a1aa' : '#71717a';
  const gridBorderColor = isDark ? '#27272a' : '#e4e4e7';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';

  // Chart 1: Queued & Allocated Accelerator Demand vs. Regional Availability Slices by Chip SKU
  const chipCounts: Record<string, { queued: number; allocated: number; rejected: number; regionsAvailable: number }> = {};
  allocationRequests.forEach((r) => {
    if (!chipCounts[r.chip_name]) {
      chipCounts[r.chip_name] = { queued: 0, allocated: 0, rejected: 0, regionsAvailable: 0 };
    }
    if (r.council_decision.includes('Approved')) {
      chipCounts[r.chip_name].allocated += r.allocated_chips || r.requested_chips;
    } else if (r.council_decision.includes('Rejected')) {
      chipCounts[r.chip_name].rejected += r.requested_chips;
    } else {
      chipCounts[r.chip_name].queued += r.requested_chips;
    }
  });

  regionalAvailability.forEach((ra) => {
    if (chipCounts[ra.chip_name] && ra.availability_status === 'Available') {
      chipCounts[ra.chip_name].regionsAvailable += 1;
    }
  });

  const chipNames = Object.keys(chipCounts);
  const allocatedSeries = chipNames.map((c) => chipCounts[c].allocated);
  const queuedSeries = chipNames.map((c) => chipCounts[c].queued);
  const rejectedSeries = chipNames.map((c) => chipCounts[c].rejected);

  const demandSupplyOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: tooltipBg,
      borderColor: gridBorderColor,
      textStyle: { color: textColor, fontFamily: 'DM Sans, sans-serif', fontSize: 12 },
    },
    legend: {
      data: ['Allocated / Approved (Chips)', 'Active Forum Queue (Chips)', 'Rejected / Needs Mar-2027 Shift (Chips)'],
      top: 0,
      textStyle: { color: subTextColor, fontFamily: 'DM Sans, sans-serif', fontSize: 12 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '6%',
      top: '16%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: chipNames,
      axisLine: { lineStyle: { color: gridBorderColor } },
      axisLabel: { color: textColor, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'Total Chips',
      nameTextStyle: { color: subTextColor, fontFamily: 'DM Sans, sans-serif' },
      splitLine: { lineStyle: { color: gridBorderColor, type: 'dashed' } },
      axisLabel: { color: subTextColor, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
    },
    series: [
      {
        name: 'Allocated / Approved (Chips)',
        type: 'bar',
        stack: 'total',
        barMaxWidth: 44,
        itemStyle: { color: '#10b981', borderRadius: [0, 0, 0, 0] },
        data: allocatedSeries,
      },
      {
        name: 'Active Forum Queue (Chips)',
        type: 'bar',
        stack: 'total',
        barMaxWidth: 44,
        itemStyle: { color: '#3b82f6' },
        data: queuedSeries,
      },
      {
        name: 'Rejected / Needs Mar-2027 Shift (Chips)',
        type: 'bar',
        stack: 'total',
        barMaxWidth: 44,
        itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
        data: rejectedSeries,
      },
    ],
  };

  // Chart 2: Allocation Priority Score (0-100) vs. Deal TCV ($M) & Cut-Line Scatter Matrix
  const scatterData = allocationRequests.map((r) => ({
    value: [
      r.deal_tcv_usd_m,
      r.priority_score,
      r.requested_chips,
      r.customer_name,
      r.chip_name,
      r.request_id,
      r.council_decision,
      r.primary_region,
    ],
    itemStyle: {
      color:
        r.priority_score >= 80
          ? '#10b981'
          : r.priority_score >= 65
          ? '#3b82f6'
          : '#f43f5e',
      opacity: 0.88,
      shadowBlur: 8,
      shadowColor: 'rgba(0, 0, 0, 0.2)',
    },
  }));

  const cutlineScatterOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBg,
      borderColor: gridBorderColor,
      textStyle: { color: textColor, fontFamily: 'DM Sans, sans-serif', fontSize: 12 },
      formatter: (params: any) => {
        const [tcv, score, chips, cust, sku, id, decision, reg] = params.data.value;
        return `
          <div style="font-weight:700;margin-bottom:4px;">${cust} (${id})</div>
          <div>SKU: <b>${chips.toLocaleString()}x ${sku}</b> (${reg})</div>
          <div>Deal TCV: <b>$${tcv}M</b> | Allocation Score: <b>${score}/100</b></div>
          <div>Status: <b>${decision}</b></div>
        `;
      },
    },
    grid: {
      left: '4%',
      right: '6%',
      bottom: '10%',
      top: '14%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Committed Deal TCV ($M USD)',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: subTextColor, fontFamily: 'DM Sans, sans-serif', fontSize: 12 },
      splitLine: { lineStyle: { color: gridBorderColor, type: 'dashed' } },
      axisLabel: {
        color: subTextColor,
        fontFamily: 'JetBrains Mono, monospace',
        formatter: '${value}M',
      },
    },
    yAxis: {
      type: 'value',
      name: 'Allocation Priority Score (0-100)',
      min: 20,
      max: 105,
      nameTextStyle: { color: subTextColor, fontFamily: 'DM Sans, sans-serif', fontSize: 12 },
      splitLine: { lineStyle: { color: gridBorderColor, type: 'dashed' } },
      axisLabel: { color: subTextColor, fontFamily: 'JetBrains Mono, monospace' },
    },
    series: [
      {
        name: 'Allocation Requests',
        type: 'scatter',
        symbolSize: (val: any) => Math.max(16, Math.min(48, Math.sqrt(val[2]) * 1.1)),
        data: scatterData,
        label: {
          show: true,
          position: 'top',
          formatter: (param: any) => param.data.value[3].split(' ')[0],
          color: textColor,
          fontSize: 11,
          fontFamily: 'DM Sans, sans-serif',
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 1.5 },
          data: [
            {
              yAxis: 80,
              lineStyle: { color: '#10b981' },
              label: {
                formatter: 'Tier-1 Auto Cut-Line (80 pts)',
                color: '#10b981',
                position: 'insideEndTop',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
              },
            },
            {
              yAxis: 65,
              lineStyle: { color: '#f59e0b' },
              label: {
                formatter: 'Council Trade-Off Floor (65 pts)',
                color: '#f59e0b',
                position: 'insideEndBottom',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
              },
            },
          ],
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* 1 Chart Per Row as mandated by building-data-apps design system */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Accelerator Pipeline Volume by Chip Family (Allocated vs. Active Forum Queue vs. Rejected)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Live aggregation across Allocation forum requests in <code className="font-mono">apex-ai-capacity-demo.apex_capacity_navigator</code>
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            go/acc-prioritization
          </span>
        </div>
        <div className="h-[340px] w-full">
          <ReactECharts option={demandSupplyOption} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>

      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Allocation Priority Score (0–100) vs. Committed Deal TCV ($M) & Allocation Cut-Line Matrix
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Bubble size represents requested accelerator volume. Deals below 65 pts require DFE flexible-region shifts or Jan/Mar 2027 timeline alignment.
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            7-Dimension Priority Rubric Engine
          </span>
        </div>
        <div className="h-[360px] w-full">
          <ReactECharts
            option={cutlineScatterOption}
            style={{ height: '100%', width: '100%' }}
            onEvents={{
              click: (params: any) => {
                if (params?.data?.value && onSelectDeal) {
                  const id = params.data.value[5];
                  const found = allocationRequests.find((r) => r.request_id === id);
                  if (found) onSelectDeal(found);
                }
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

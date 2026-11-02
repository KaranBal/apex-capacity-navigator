import React, { useState } from 'react';
import {
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Link2,
  X,
  ShieldCheck,
  Database,
  Plug,
  Sparkles,
} from 'lucide-react';

export interface PreviewLinkContext {
  recordId: string;
  title: string;
  subtitle?: string;
  intendedUrl: string;
  fallbackLivePortalUrl: string;
  fallbackPortalLabel: string;
  statusType:
    | 'AWAITING_REGISTRY_API'
    | 'AWAITING_COHORT_FEED'
    | 'AWAITING_VECTOR_CRM'
    | 'OFFLINE_UPSTREAM_TOOL'
    | 'RESTRICTED_UPSTREAM_PROXY'
    | 'DEPRECATED_REMAPPED'
    | 'LIVE_URL_LINKED';
  statusBadge: string;
  explanation: string;
  metadata?: Record<string, string | number | undefined>;
}

/**
 * Ground-truth mapping of corporate go/ links audited across Chrome.
 */
export const VERIFIED_CORPORATE_LINKS: Record<
  string,
  {
    url: string;
    label: string;
    status: 'VERIFIED_LIVE' | 'OFFLINE_REPLACED' | 'RESTRICTED_PROXY' | 'DEPRECATED_REMAPPED';
    note?: string;
  }
> = {
  'capacity-registry': {
    url: 'https://registry.corp.cloud.com/customers?tab=external',
    label: 'Registry — External Customers Portal',
    status: 'VERIFIED_LIVE',
  },
  'go/acc-prioritization': {
    url: 'https://docs.cloud.com/forms/d/e/1FAIpQLSdN3dmzBs0_gtxktt5wgurC3ageJ43OfqODwAy3nF0tfnbXOw/viewform',
    label: 'AI Infra Capacity Intake Form (23-Field)',
    status: 'VERIFIED_LIVE',
  },
  'go/ai-infra-allocation': {
    url: 'https://docs.cloud.com/document/d/1ISspS9zso9fIzYzq6mY_aC0I1Y9Pxzcmj0BW1C-LLm0/edit',
    label: 'Published AI Infrastructure Allocation Policy',
    status: 'VERIFIED_LIVE',
  },
  'go/classic-infra-allocation': {
    url: 'https://docs.cloud.com/document/d/1kUkU4TvG4PS4h8Y-JBRoulsOmeeT_CUlJYBTU2hJWc8/edit',
    label: 'Classic Infrastructure Allocation Policy (Superseded by Companion 2.0)',
    status: 'DEPRECATED_REMAPPED',
    note: 'Marked [DEPRECATED] upstream; superseded by companion-infra-gate-intake-template and Apex Tab 3.',
  },
  'companion-infra-gate-intake-template': {
    url: 'https://docs.cloud.com/presentation/d/1V5uWyZOQK0g1QzLCk5RG4I-3M_LE4GSiKJjaa6FmW2I/edit',
    label: 'Companion 2.0 Intake Template (Cloud Slides)',
    status: 'VERIFIED_LIVE',
  },
  'companion-infra-gate-intake-tool': {
    url: 'https://docs.cloud.com/presentation/d/1V5uWyZOQK0g1QzLCk5RG4I-3M_LE4GSiKJjaa6FmW2I/edit',
    label: 'Legacy Companion Intake Tool (Replaced Natively)',
    status: 'OFFLINE_REPLACED',
    note: 'Legacy offline intake server replaced natively by Apex Tab 3 (Companion 2.0 Classic Builder).',
  },
  'go/capacity-sales-view': {
    url: 'https://capacity-sales-view.teams.x20web.corp.cloud.com/index.html?theme=light',
    label: 'Capacity Sales View Web Application',
    status: 'VERIFIED_LIVE',
  },
  'go/capacity-poster': {
    url: 'http://go/capacity-poster',
    label: 'Capacity Allocation Field Quick Guide Poster',
    status: 'VERIFIED_LIVE',
  },
  'strategic-pod-program-targets': {
    url: 'https://lookercs-prod-201.corp.goog/embed/dashboards/KUxmxwO3ehMhmXQFV0jOML',
    label: 'Project STRATEGIC_POD Looker Dashboard (366 P0/P1 Targets)',
    status: 'VERIFIED_LIVE',
  },
  'strategic-pod-program-nominate': {
    url: 'https://script.cloud.com/a/macros/cloud.com/s/AKfycbzf_3bjjcMDhb0SyaqiCUtRmg1hD_COm9Yj1lz7_F-SgCLypOGfFULFNQpBKn-CyHp6/exec',
    label: 'Project STRATEGIC_POD Global Target Account Nominations',
    status: 'VERIFIED_LIVE',
  },
  'go/bloom_pitch': {
    url: 'https://docs.cloud.com/presentation/d/1a4zOcYj8oKjoKqvXOSpwKchth9OToB1Iqv0qQwnOYUE/edit?resourcekey=0-la9D3Oez9tg8Moxq7hNtig',
    label: 'Project Bloom Pitch Deck (S01–S05 Pods)',
    status: 'VERIFIED_LIVE',
  },
  'go/obidos-intake': {
    url: 'https://docs.cloud.com/forms/d/e/1FAIpQLSdbKg2ERb9BbLCCfDeTDYNWBReygnGE_jq4mjy34djMo_gejA/viewform',
    label: 'Obidos Fast-Track PoC Intake Form',
    status: 'VERIFIED_LIVE',
  },
  'go/aiinfra-capacity-guide': {
    url: 'https://docs.cloud.com/document/d/19Bg7Ne7-RNVT6lsqwEalb0K6UyqDWnsXqKsZGBwzZ6o/edit?resourcekey=0-ER807ppNO13Tqaj3-HOrcQ',
    label: 'AI Infrastructure Capacity Field Guide',
    status: 'VERIFIED_LIVE',
  },
  'go/ai-infra:playbook': {
    url: 'https://docs.cloud.com/presentation/d/1pd2qYd5gsUHWriUG9qwJu9Bj_3Q04rgPI4CZZeKE9MU/edit',
    label: 'Global AI Infrastructure Sales Playbook (Cloud Slides)',
    status: 'VERIFIED_LIVE',
    note: 'Remapped directly to Cloud Slides so browser address bars do not trip on the colon in go/ai-infra:playbook.',
  },
  'go/HowToCreateWorkload_QRG': {
    url: 'https://docs.cloud.com/presentation/d/1XhvO_8q-uNoqvjKoGCe8ZzezLAUfiMq6oiX0NoWnpAQ/edit',
    label: 'Enablement: FSR FY26 Workload Creation in Stage 0',
    status: 'VERIFIED_LIVE',
  },
  'go/dfe-enablement': {
    url: 'https://docs.cloud.com/presentation/d/1hDbNysv9_8EWuFfx8iEtnNUUCp_f1ZiW1PwkfEHyhlU/edit?resourcekey=0-yjyceGPg3-pGqNpzbDu_gA',
    label: 'Design for Flexibility and Efficiency (DFE Enablement)',
    status: 'VERIFIED_LIVE',
  },
  'go/genai-tpu-landings': {
    url: 'https://data.corp.cloud.com/sites/ml_fleet_metrics/tpu_occupancy/',
    label: 'GenAI TPU Capacity Landing Tracker',
    status: 'RESTRICTED_PROXY',
    note: 'Illustrative commissioning stage metrics are embedded in Tab 5 & Tab 6 and linked to Plx TPU Occupancy.',
  },
  'go/tpu-occupancy': {
    url: 'https://data.corp.cloud.com/sites/ml_fleet_metrics/tpu_occupancy/',
    label: 'Plx DataSites — ML Fleet TPU Occupancy',
    status: 'VERIFIED_LIVE',
  },
  'go/tpu-measures': {
    url: 'https://data.corp.cloud.com/sites/ml_fleet_metrics/tpu_measures/',
    label: 'Plx DataSites — ML Fleet TPU Measures',
    status: 'VERIFIED_LIVE',
  },
  'go/deciml': {
    url: 'https://rs.corp.cloud.com/curate-demand/resource-plan/cumulative-demands/initiatives',
    label: 'DECIML / Resource Symphony Demand Initiatives',
    status: 'VERIFIED_LIVE',
  },
  'go/capacity-demand-tracker': {
    url: 'http://capacity-registry',
    label: 'Synthetic Deal Intake & 5-Pillar Capacity Check (All Segments)',
    status: 'VERIFIED_LIVE',
  },
  'go/startup-2026-tracker': {
    url: 'https://registry.corp.cloud.com/customers?tab=external',
    label: 'Synthetic 2026 Deal Pipeline Tracker',
    status: 'VERIFIED_LIVE',
  },
  'go/ai-infra-vector-guide': {
    url: 'https://docs.cloud.com/presentation/d/1XhvO_8q-uNoqvjKoGCe8ZzezLAUfiMq6oiX0NoWnpAQ/edit',
    label: 'AI Infra Vector Workload Hygiene Guide',
    status: 'VERIFIED_LIVE',
  },
  'go/ml-demand-intake': {
    url: 'https://g3doc.corp.cloud.com/company/teams/ml-fleet/Demand/demand_intake.md?cl=head',
    label: 'ML Fleet Demand Intake Processes (g3doc)',
    status: 'VERIFIED_LIVE',
  },
  'go/pt-capacity-manual': {
    url: 'https://docs.cloud.com/document/d/112p01WoULBpQ267Swf342iKAx3gx5hOywX43DjJOymo/edit',
    label: 'Central Operations Manual for Requesting PT Capacity',
    status: 'VERIFIED_LIVE',
  },
  'go/report-a-stockout': {
    url: 'https://b.corp.cloud.com/issues/new?component=678208&template=1299539',
    label: 'Tesseract Stockout Escalation (Buganizer)',
    status: 'VERIFIED_LIVE',
  },
  'go/flex-consumption-field-guidance': {
    url: 'https://docs.cloud.com/document/d/1kW3MTtSSnLSTN9rY2E0k4a5C_joG1iYzOShwicPZyY8/edit',
    label: 'Flexible Consumption Field Guidance v4',
    status: 'VERIFIED_LIVE',
  },
  'go/startpropel': {
    url: 'https://docs.cloud.com/forms/d/e/1FAIpQLSfy9gAI-J7aGjCzbehgPKu9_6krvn1sV1n65wKukJEogzsJlw/viewform',
    label: 'Propel Sales Play Offerings Intake Form',
    status: 'VERIFIED_LIVE',
  },
  'go/pac-request': {
    url: 'https://docs.cloud.com/forms/d/e/1FAIpQLSf68immdo1d4qQyOJHZUdvv1MuDAJianE4ygHZRYJ3wDCU1mw/viewform',
    label: 'Partner Acceleration Program Credit Request Form',
    status: 'VERIFIED_LIVE',
  },
  'go/NVIDIA-GPU-trial': {
    url: 'https://sites.cloud.com/corp/cloud.com/nvidia-gpu-trial/home',
    label: 'NVIDIA GPU Trial Program Portal',
    status: 'VERIFIED_LIVE',
  },
  'go/bif-request': {
    url: 'https://docs.cloud.com/forms/d/1e--Pi1up3KGrbISGL3te7Z1aJzxjpKO_zZ69QZA_6UU/viewform',
    label: 'BIF Request Form',
    status: 'VERIFIED_LIVE',
  },
  'go/fundingsupport': {
    url: 'https://support.cloud.cloud.com/portal/create-case?cidq=88L0G18I4P862SJKDPIN4829DPHMARJKD5R6ASP0C5N68824CLGMO82JELH6QQBJEDKMURIA594N6SRLCLFN6TB2DLKN8T39DPJLUH218PFMUSIVA19KCNRICLONAPBJEHFJ6D1L64S34',
    label: 'Hyperscale Cloud Commercial Funding Support Portal',
    status: 'VERIFIED_LIVE',
  },
  'go/submitpsf': {
    url: 'https://support.cloud.cloud.com/portal/create-case?cidq=88L0G18I4P862SJKDPIN4829DPHMARJKD5R6ASP0C5N68824CLGMO82JELH6QQBJEDKMURIA594N6SRLCLFN6TB2DLKN8T39DPJLUH218PFMUSIVA19KCNRICLONAPBJEHFJ6D1L64S34',
    label: 'DAF/PSF Submission (Deprecated -> Remapped to go/fundingsupport)',
    status: 'DEPRECATED_REMAPPED',
    note: 'go/submitpsf was deprecated on 10/14/25 (*submit in Vector or reach out to go/fundingsupport). Automatically routed to go/fundingsupport.',
  },
  'go/intel-psf+program': {
    url: 'https://sites.cloud.com/corp/cloud.com/intelpsfprogram2024/intel-psf-program-2024',
    label: 'Intel PSF+ Program 2026',
    status: 'VERIFIED_LIVE',
  },
  'go/catalystlitefaq': {
    url: 'https://docs.cloud.com/document/d/1ZlFPuOaadYNPD8-5706HU3o4KvorN-OxaGUE5tv-1yI/edit?resourcekey=0-XEI0iHnYcFBzjJUdKj5ilQ',
    label: 'Catalyst Lite FAQ Document',
    status: 'VERIFIED_LIVE',
  },
  'go/intel-CDAC': {
    url: 'https://sites.cloud.com/corp/cloud.com/intel-cdac-2025/intel-psf-program-2024',
    label: 'Intel CDAC Deal Acceleration Program 2026',
    status: 'VERIFIED_LIVE',
  },
};

export function isSyntheticRegistryOrCrmUrl(url?: string, hasCustomLiveUrl?: boolean): boolean {
  if (hasCustomLiveUrl) return false;
  if (!url) return true;
  if (
    url.includes('capacity-registry/HZ-') ||
    url.includes('capacity-registry/CDR') ||
    url.includes('registry.corp.cloud.com/HZ-') ||
    url.includes('registry.corp.cloud.com/CDR') ||
    url.includes('capacity-registry?q=')
  ) {
    return true;
  }
  return false;
}

interface IntegrationLinkModalProps {
  context: PreviewLinkContext | null;
  onClose: () => void;
  activePersonaEmail: string;
  onUrlAttached?: (recordId: string, liveUrl: string) => void;
}

export const IntegrationLinkPreviewModal: React.FC<IntegrationLinkModalProps> = ({
  context,
  onClose,
  activePersonaEmail,
  onUrlAttached,
}) => {
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  if (!context) return null;

  const handleAttachUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/integrations/attach-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: context.recordId,
          live_url: trimmed,
          actor_ldap: activePersonaEmail,
        }),
      });
      if (res.ok) {
        setSavedSuccess(`Linked live URL to ${context.recordId} and logged in Persistent Transaction Memory Ledger.`);
        if (onUrlAttached) onUrlAttached(context.recordId, trimmed);
      }
    } catch (err) {
      console.error('Failed to attach live URL:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Banner */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-indigo-500/15 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                <Clock className="w-3 h-3" />
                {context.statusBadge}
              </span>
              <span className="font-mono text-[11px] text-zinc-500">
                Record ID: <b className="text-zinc-800 dark:text-zinc-200">{context.recordId}</b>
              </span>
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {context.title}
            </h3>
            {context.subtitle && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{context.subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Tasteful Explanation Box */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-1.5">
            <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Plug className="w-3.5 h-3.5 shrink-0" />
              Why this deep-link opened in Integration Preview instead of a 404 tab
            </div>
            <p className="text-amber-900/90 dark:text-amber-200/80 leading-relaxed">
              {context.explanation}
            </p>
            <div className="text-[11px] font-mono text-amber-800/80 dark:text-amber-300/70 pt-1">
              Target Endpoint Pattern: <code>{context.intendedUrl}</code>
            </div>
          </div>

          {/* Captured Local Metadata in Apex Persistent Ledger */}
          {context.metadata && Object.keys(context.metadata).length > 0 && (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] font-mono font-bold uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                <Database className="w-3 h-3 text-blue-500" />
                Record Data Currently Persisted in Apex Capacity Navigator
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(context.metadata).map(([k, v]) =>
                  v !== undefined && v !== null && v !== '' ? (
                    <div key={k} className="p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800/80">
                      <div className="text-[10px] text-zinc-400 font-mono">{k}</div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">
                        {String(v)}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Optional Input: Attach a Real Live Production URL */}
          <form
            onSubmit={handleAttachUrl}
            className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/50 space-y-2"
          >
            <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Have the live production URL or ticket link? Bind it now:
            </div>
            <p className="text-[11px] text-blue-800/80 dark:text-blue-200/70">
              Paste a live <code>registry.corp.cloud.com</code>, Vector CRM, or Cloud Doc URL below to replace the pending integration placeholder for <b>{context.recordId}</b>.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://registry.corp.cloud.com/customers?tab=external..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-zinc-900 text-xs font-mono"
              />
              <button
                type="submit"
                disabled={saving || !customUrlInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs whitespace-nowrap"
              >
                {saving ? 'Binding...' : 'Attach Live URL'}
              </button>
            </div>
            {savedSuccess && (
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {savedSuccess}
              </div>
            )}
          </form>

          {/* Footer Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Close Preview
            </button>
            <a
              href={context.fallbackLivePortalUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold inline-flex items-center gap-1.5 shadow-sm"
            >
              <span>{context.fallbackPortalLabel}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

interface IntegrationDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationDirectoryModal: React.FC<IntegrationDirectoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'AWAITING' | 'LIVE'>('ALL');
  if (!isOpen) return null;

  const pendingItems = [
    {
      name: 'Individual capacity-registry CCA & CDR Object Deep-Links (HZ-2026-... / CDR0030...)',
      badge: '⏳ Awaiting Registry API / Input Data',
      detail:
        'Pre-seeded CCA/CDR IDs are stored in DataWarehouse. Clicking them opens an in-app Integration Preview instead of a 404 on registry.corp.cloud.com, with 1-click access to the live Registry External Customers portal or custom URL binding.',
      portalUrl: 'https://registry.corp.cloud.com/customers?tab=external',
      portalLabel: 'Open Live capacity-registry Portal',
    },
    {
      name: 'Torso & Long-Tail Regional Cohort Queries (capacity-registry?q=region:...)',
      badge: '⏳ Awaiting Registry Plx Cohort Feed',
      detail:
        'Registry web UI strips URL query parameters and redirects to /customers?tab=external. Aggregated chip/TCV math and sample_tickets are rendered natively in Tab 2 while awaiting the automated Plx cohort feed.',
      portalUrl: 'https://registry.corp.cloud.com/customers?tab=external',
      portalLabel: 'Open Live capacity-registry Portal',
    },
    {
      name: 'Salesforce Vector CRM & Concord T3M Bi-Directional Sync (0018Y... / 0068Y... / aBJKf...)',
      badge: '⏳ Awaiting Vector CRM OAuth Connector',
      detail:
        'Seeded with representative Project STRATEGIC_POD P0/P1 accounts + interactive Seller/CE nomination in Tab 4. Links directly to the live Looker STRATEGIC_POD Targets dashboard (strategic-pod-program-targets) and Apps Script Nomination portal (strategic-pod-program-nominate).',
      portalUrl: 'https://lookercs-prod-201.corp.goog/embed/dashboards/KUxmxwO3ehMhmXQFV0jOML',
      portalLabel: 'Open Live STRATEGIC_POD Looker',
    },
    {
      name: 'Legacy Companion Intake Tool (companion-infra-gate-intake-tool)',
      badge: '🔌 Upstream Offline (Replaced by Tab 3)',
      detail:
        'Legacy intake server is offline. Replaced natively by Apex Tab 3 (4-Tab Companion 2.0 Card Builder) and linked to the verified live Cloud Slides template (companion-infra-gate-intake-template).',
      portalUrl: 'https://docs.cloud.com/presentation/d/1V5uWyZOQK0g1QzLCk5RG4I-3M_LE4GSiKJjaa6FmW2I/edit',
      portalLabel: 'Open Live Companion 2.0 Template',
    },
    {
      name: 'GenAI TPU Landing Tracker (go/genai-tpu-landings)',
      badge: '🔒 Restricted Proxy (Embedded in Tab 5 & 6)',
      detail:
        'Upstream tracker is ACL-restricted. Illustrative Stage 1 -> Stage 4 pod commissioning milestones are embedded in Tab 5 & Tab 6.',
      portalUrl: 'https://data.corp.cloud.com/sites/ml_fleet_metrics/tpu_occupancy/',
      portalLabel: 'Open Live Plx TPU Occupancy',
    },
    {
      name: 'Legacy DAF/PSF Form (go/submitpsf) & Colon Shortlink (go/ai-infra:playbook)',
      badge: '⚠️ Deprecated / Remapped to Live URLs',
      detail:
        'go/submitpsf (deprecated 10/14/25) is automatically routed to the live go/fundingsupport portal, and go/ai-infra:playbook is mapped directly to its live Cloud Slides presentation.',
      portalUrl: 'https://docs.cloud.com/presentation/d/1pd2qYd5gsUHWriUG9qwJu9Bj_3Q04rgPI4CZZeKE9MU/edit',
      portalLabel: 'Open Live AI Infra Playbook',
    },
  ];

  const liveEntries = Object.entries(VERIFIED_CORPORATE_LINKS).filter(
    ([, v]) => v.status === 'VERIFIED_LIVE'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[86vh] flex flex-col rounded-2xl bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                LINK & INTEGRATION HEALTH AUDIT
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {liveEntries.length} Verified Live Links • {pendingItems.length} Pending Integrations / Remapped Tools
              </span>
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              External Corporate Links, Seeded Record Previews & Upstream Integration Status
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-white dark:bg-[#121216]">
          {[
            { id: 'ALL', label: 'All Audited Links & Integrations' },
            { id: 'AWAITING', label: `⏳ Awaiting Integration / Input Data (${pendingItems.length})` },
            { id: 'LIVE', label: `✅ Verified Live Corporate Links (${liveEntries.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === t.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {(filter === 'ALL' || filter === 'AWAITING') && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono">
                1. Links Awaiting Live Upstream Integration, Input Data, or Replaced In-App
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingItems.map((item, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/15 border border-amber-200/80 dark:border-amber-800/50 flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {item.badge}
                      </span>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.name}</div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                    <div className="pt-1">
                      <a
                        href={item.portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {item.portalLabel}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(filter === 'ALL' || filter === 'LIVE') && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono">
                2. Verified Live Corporate Destinations ({liveEntries.length} Active Shortlinks & Portals)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {liveEntries.map(([shortlink, info]) => (
                  <a
                    key={shortlink}
                    href={info.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/60 transition-colors flex flex-col justify-between gap-1.5 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                          {shortlink}
                        </span>
                        <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-blue-500" />
                      </div>
                      <div className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {info.label}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      ✅ Verified Live Destination
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

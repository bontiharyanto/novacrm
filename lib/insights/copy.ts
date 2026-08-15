import type {
  InsightCard,
  InsightKind,
  InsightNarrative,
  InsightSeverity,
  InsightSignals,
} from '@/lib/insights/schema';

function isId(signals: InsightSignals) {
  return signals.locale === 'id';
}

function connectBody(signals: InsightSignals) {
  return isId(signals)
    ? 'AI belum terhubung. Buka Settings → Integrations, isi penyedia AI + API key, lalu jalankan insight ini.'
    : 'AI is not connected. Open Settings → Integrations, add an AI provider + API key, then run this insight.';
}

export function factsBody(kind: InsightKind, signals: InsightSignals) {
  const id = isId(signals);
  if (kind === 'queue_pressure') {
    const aging = signals.queue.aging.slice(0, 3).map((row) => row.number).join(', ');
    return id
      ? `${signals.queue.open} tiket masih open, ${signals.queue.unassigned} belum di-assign.${aging ? ` Aging: ${aging}.` : ''} Assign antrian unassigned sebelum SLA ikut tertarik.`
      : `${signals.queue.open} tickets are open, ${signals.queue.unassigned} unassigned.${aging ? ` Aging: ${aging}.` : ''} Assign the unassigned queue before SLA clocks follow.`;
  }
  if (kind === 'sla_risk') {
    return id
      ? `${signals.sla.slaBreached} tiket sudah breach, ${signals.sla.slaRisk} masih di jendela risiko. CAB review ${signals.sla.cabReview}, change darurat ${signals.sla.emergencyChanges}. Eskalasi breach hari ini; jaga tiket yang due dalam 24–48 jam.`
      : `${signals.sla.slaBreached} tickets are breached, ${signals.sla.slaRisk} still in the risk window. CAB review ${signals.sla.cabReview}, emergency changes ${signals.sla.emergencyChanges}. Escalate breaches today; watch clocks due in 24–48h.`;
  }
  if (kind === 'workforce_load') {
    const gap = signals.workforce.forecast.filter((row) => row.gap > 0).length;
    return id
      ? `${signals.workforce.overCap} agen di kapasitas, ${signals.workforce.underUtilised} masih longgar, ${gap} hari roster di bawah volume. Geser load dari group yang over cap.`
      : `${signals.workforce.overCap} agents at cap, ${signals.workforce.underUtilised} under-utilised, ${gap} roster days below volume. Shift load off groups that are over cap.`;
  }
  const hot = signals.accounts.accounts.filter((row) => row.slaBreached > 0 || row.slaRisk > 0).slice(0, 3);
  const names = hot.map((row) => `${row.code} (${row.slaBreached} breach)`).join(', ');
  return id
    ? `${signals.accounts.accounts.length} akun pada filter ini.${names ? ` Perlu perhatian: ${names}.` : ' Tidak ada akun dengan breach pada snapshot ini.'}`
    : `${signals.accounts.accounts.length} accounts on this filter.${names ? ` Needs attention: ${names}.` : ' No accounts with a live breach on this snapshot.'}`;
}

function severityForQueue(signals: InsightSignals): InsightSeverity {
  if (signals.queue.unassigned >= 8 || signals.queue.open >= 40) return 'danger';
  if (signals.queue.unassigned > 0 || signals.queue.open >= 15) return 'warning';
  if (signals.queue.open === 0) return 'success';
  return 'info';
}

function severityForSla(signals: InsightSignals): InsightSeverity {
  if (signals.sla.slaBreached > 0 || signals.sla.emergencyChanges > 0) return 'danger';
  if (signals.sla.slaRisk > 0 || signals.sla.cabReview > 0) return 'warning';
  return 'success';
}

function severityForWorkforce(signals: InsightSignals): InsightSeverity {
  const gap = signals.workforce.forecast.filter((row) => row.gap > 0).length;
  if (signals.workforce.overCap > 0) return 'danger';
  if (gap > 0 || signals.workforce.underUtilised > 0) return 'warning';
  return 'info';
}

function severityForAccounts(signals: InsightSignals): InsightSeverity {
  const breached = signals.accounts.accounts.reduce((sum, row) => sum + row.slaBreached, 0);
  const risk = signals.accounts.accounts.reduce((sum, row) => sum + row.slaRisk, 0);
  if (breached > 0) return 'danger';
  if (risk > 0) return 'warning';
  if (signals.accounts.accounts.length === 0) return 'info';
  return 'success';
}

export function snapshotNarrative(kind: InsightKind, signals: InsightSignals): InsightNarrative {
  const id = isId(signals);
  if (kind === 'queue_pressure') {
    return {
      title: id
        ? `Antrian: ${signals.queue.open} open, ${signals.queue.unassigned} belum assign`
        : `Queue: ${signals.queue.open} open, ${signals.queue.unassigned} unassigned`,
      summary: id
        ? 'Tiket open, belum assign, dan aging pada filter desk aktif.'
        : 'Open, unassigned, and aging tickets on the active desk filter.',
      body: signals.aiConfigured ? factsBody('queue_pressure', signals) : connectBody(signals),
      severity: severityForQueue(signals),
    };
  }
  if (kind === 'sla_risk') {
    const calm = signals.sla.slaBreached === 0 && signals.sla.slaRisk === 0;
    return {
      title: calm
        ? id
          ? 'Risiko SLA dalam rentang terkendali'
          : 'SLA risk is within control'
        : id
          ? `${signals.sla.slaBreached} breach, ${signals.sla.slaRisk} berisiko`
          : `${signals.sla.slaBreached} breached, ${signals.sla.slaRisk} at risk`,
      summary: id
        ? 'Prakiraan breach SLA 24–48 jam dari jam live, plus CAB dan change darurat.'
        : '24–48h SLA breach forecast from live clocks plus CAB and emergency changes.',
      body: signals.aiConfigured ? factsBody('sla_risk', signals) : connectBody(signals),
      severity: severityForSla(signals),
    };
  }
  if (kind === 'workforce_load') {
    return {
      title: id
        ? `Snapshot utilisasi: ${signals.workforce.overCap} over, ${signals.workforce.underUtilised} under`
        : `Utilisation snapshot: ${signals.workforce.overCap} over, ${signals.workforce.underUtilised} under`,
      summary: id
        ? 'Occupancy group, agen di kapasitas, dan gap roster versus volume tiket.'
        : 'Group occupancy, agents at cap, and roster gap versus ticket volume.',
      body: signals.aiConfigured ? factsBody('workforce_load', signals) : connectBody(signals),
      severity: severityForWorkforce(signals),
    };
  }
  const n = signals.accounts.accounts.length;
  const focus = signals.accountCode;
  return {
    title: focus
      ? id
        ? `Kesehatan akun ${focus}`
        : `Account health · ${focus}`
      : id
        ? `Snapshot kesehatan akun (${n} akun)`
        : `Account health snapshot (${n} accounts)`,
    summary: id
      ? 'Antrian open dan SLA per akun dari tiket live (kode saja, tanpa PII pemohon).'
      : 'Per-account open queue and SLA using live tickets (codes only, no requester PII).',
    body: signals.aiConfigured ? factsBody('account_health', signals) : connectBody(signals),
    severity: severityForAccounts(signals),
  };
}

export function snapshotCard(kind: InsightKind, signals: InsightSignals): InsightCard {
  const narrative = snapshotNarrative(kind, signals);
  return {
    kind,
    ...narrative,
    source: 'snapshot',
    model: 'snapshot',
    tokensIn: 0,
    tokensOut: 0,
    latencyMs: 0,
    generatedAt: new Date().toISOString(),
  };
}

const CALM = /tidak ada[\s\S]{0,48}(?:sla|ancaman|risiko|breach)|no [\s\S]{0,24}(?:sla|threat|risk|breach)|keseimbangan sla|within control|semua aman/i;

export function composeNarrative(
  kind: InsightKind,
  signals: InsightSignals,
  parsed: InsightNarrative | null,
): InsightNarrative {
  const fallback = snapshotNarrative(kind, signals);
  if (!parsed) return fallback;
  const blob = `${parsed.title} ${parsed.summary} ${parsed.body}`;
  const hot =
    (kind === 'sla_risk' && (signals.sla.slaBreached > 0 || signals.sla.slaRisk > 0)) ||
    (kind === 'queue_pressure' && (signals.queue.unassigned > 0 || signals.queue.open >= 15)) ||
    (kind === 'workforce_load' && signals.workforce.overCap > 0) ||
    (kind === 'account_health' && signals.accounts.accounts.some((row) => row.slaBreached > 0));
  if (hot && CALM.test(blob)) {
    return { ...fallback, body: factsBody(kind, signals) };
  }
  const mismatch = isId(signals) && looksEnglish(`${parsed.title} ${parsed.summary} ${parsed.body}`);
  const rank: Record<InsightSeverity, number> = { info: 0, success: 0, warning: 1, danger: 2 };
  return {
    title: mismatch ? fallback.title : parsed.title,
    summary: mismatch || !parsed.summary ? fallback.summary : parsed.summary,
    body: mismatch || !parsed.body ? factsBody(kind, signals) : parsed.body,
    severity: rank[fallback.severity] > rank[parsed.severity] ? fallback.severity : parsed.severity,
  };
}

function looksEnglish(text: string) {
  const english = (text.match(/\b(the|and|are|with|tickets|queue|breach|agents|unassigned)\b/gi) ?? []).length;
  const indonesian = (text.match(/\b(yang|tiket|sudah|belum|dari|untuk|antrian|agen|akun)\b/gi) ?? []).length;
  return english >= 2 && indonesian === 0;
}

export function payloadForKind(kind: InsightKind, signals: InsightSignals) {
  if (kind === 'queue_pressure') return signals.queue;
  if (kind === 'sla_risk') return signals.sla;
  if (kind === 'workforce_load') return signals.workforce;
  return signals.accounts;
}

export function audienceForRole(role: string, locale: 'en' | 'id' = 'en') {
  const id = locale === 'id';
  if (role === 'agent') {
    return id
      ? 'Pembaca: agent service desk. Sarankan tiket yang bisa diambil atau dieskalasi sekarang. Jangan bahas pengaturan tenant.'
      : 'Audience: service-desk agent. Recommend tickets they can pick up or escalate now. Do not discuss tenant settings.';
  }
  if (role === 'team_lead') {
    return id
      ? 'Pembaca: team lead. Fokus antrian group, kerja belum assign, dan siapa yang over kapasitas (angka saja).'
      : 'Audience: team lead. Focus on group queue, unassigned work, and who is at cap (counts only).';
  }
  if (role === 'supervisor') {
    return id
      ? 'Pembaca: supervisor. Fokus jam SLA, occupancy, dispatch, dan cegah breach 24–48 jam.'
      : 'Audience: supervisor. Focus on SLA clocks, occupancy, dispatch, and 24–48h breach prevention.';
  }
  if (role === 'manager') {
    return id
      ? 'Pembaca: manager. Fokus kesehatan akun, CAB, change darurat, dan beban lintas group.'
      : 'Audience: manager. Focus on account health, CAB, emergency changes, and cross-group load.';
  }
  return id
    ? 'Pembaca: admin tenant. Bahas kesehatan desk, tenaga kerja, risiko akun, dan apakah AI/integrasi perlu perhatian — tanpa membocorkan rahasia.'
    : 'Audience: tenant admin. Cover desk health, workforce, account risk, and whether AI/integrations need attention — without revealing secrets.';
}

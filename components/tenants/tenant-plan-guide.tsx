'use client';

import { TENANT_PLAN_FEATURES, TENANT_PLAN_GUIDE, TENANT_PLAN_LABEL, type TenantPlan } from '@/lib/tenants/schema';
import { cn } from '@/lib/utils';

export function TenantPlanGuide({ plan }: { plan: TenantPlan }) {
  const guide = TENANT_PLAN_GUIDE[plan];
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2.5">
        <p className="text-xs font-medium text-zinc-200">
          {TENANT_PLAN_LABEL[plan]}
          <span className="ml-2 font-normal text-zinc-500">{guide.price}</span>
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{guide.includes}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-600">Not included: {guide.excludes}</p>
      </div>
      <div className="overflow-hidden rounded-md border border-zinc-800">
        <div className="grid grid-cols-[minmax(0,1.4fr)_4.5rem_5.5rem_5.5rem] gap-2 border-b border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          <span>Scope</span>
          <span>Trial</span>
          <span>Standard</span>
          <span>Enterprise</span>
        </div>
        {TENANT_PLAN_FEATURES.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(0,1.4fr)_4.5rem_5.5rem_5.5rem] gap-2 border-b border-zinc-800/80 px-3 py-1.5 last:border-b-0"
          >
            <span className="truncate text-xs text-zinc-400">{row.label}</span>
            {(['trial', 'standard', 'enterprise'] as const).map((key) => (
              <span
                key={key}
                className={cn('text-xs', plan === key ? 'text-blue-300' : 'text-zinc-500')}
              >
                {row[key]}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-4 text-zinc-600">
        Prices are a proposal (manual invoice). This dropdown only stores the plan label — it does not meter tickets
        or charge a card.
      </p>
    </div>
  );
}

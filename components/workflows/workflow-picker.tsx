'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { WORKFLOW_TEMPLATES } from '@/lib/workflows/templates';

export function WorkflowPicker() {
  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <div>
          <Link href="/workflows" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Automation
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-white">New flow</h1>
          <p className="mt-1 text-sm text-zinc-500">Pick a complexity, then edit nodes on the canvas.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {WORKFLOW_TEMPLATES.map((item) => (
            <Link
              key={item.id}
              href={`/workflows/new?template=${item.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{item.title}</p>
              <p className="mt-2 text-sm font-medium text-white">{item.name}</p>
              <p className="mt-1 text-[12px] leading-5 text-zinc-500">{item.hint}</p>
            </Link>
          ))}
        </div>
      </div>
      <aside className="border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4 text-sm leading-6 text-zinc-400">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">How to choose</p>
            <p>
              <span className="text-zinc-200">Standard</span> — one trigger, one action. Assign or notify.
            </p>
            <p>
              <span className="text-zinc-200">Normal</span> — several steps in a line. Triage inbound messages.
            </p>
            <p>
              <span className="text-zinc-200">Complex</span> — if/else on priority, type, or category. Machine alerts.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

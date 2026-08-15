'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { TicketStatus } from '@/lib/tickets/schema';

export type ProblemOption = { id: string; number: string; title: string; status: string };
export type RelatedIncident = { id: string; number: string; title: string; status: TicketStatus };

export function TicketRca({
  isProblem,
  problemId,
  problemNumber,
  problemTitle,
  problemWorkaround,
  problems,
  relatedIncidents,
  linkableIncidents,
  workaround,
  knownError,
  disabled,
  onProblemId,
  onWorkaround,
  onKnownError,
  onSaveProblem,
  onLinkIncident,
}: {
  isProblem: boolean;
  problemId?: string;
  problemNumber?: string;
  problemTitle?: string;
  problemWorkaround?: string;
  problems: ProblemOption[];
  relatedIncidents: RelatedIncident[];
  linkableIncidents: ProblemOption[];
  workaround: string;
  knownError: boolean;
  disabled?: boolean;
  onProblemId: (id: string) => void;
  onWorkaround: (value: string) => void;
  onKnownError: (value: boolean) => void;
  onSaveProblem: () => void;
  onLinkIncident: (incidentId: string) => void;
}) {
  if (isProblem) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">RCA / known error</p>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={knownError} onChange={(event) => onKnownError(event.target.checked)} />
          Known error
        </label>
        <Textarea
          rows={4}
          value={workaround}
          onChange={(event) => onWorkaround(event.target.value)}
          placeholder="Workaround agents can give callers while the root cause is open."
        />
        <Button size="sm" variant="outline" className="w-full" disabled={disabled} onClick={onSaveProblem}>
          Save RCA
        </Button>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Related incidents</p>
          {relatedIncidents.length === 0 ? (
            <p className="mt-1 text-xs text-zinc-500">None linked yet.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {relatedIncidents.map((item) => (
                <li key={item.id}>
                  <Link href={`/tickets/${item.id}`} className="flex items-center justify-between text-xs text-blue-300 hover:text-blue-200">
                    <span className="truncate font-mono">{item.number}</span>
                    <Badge tone="neutral">{item.status}</Badge>
                  </Link>
                  <p className="truncate text-[11px] text-zinc-500">{item.title}</p>
                </li>
              ))}
            </ul>
          )}
          <Select
            className="mt-2"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) onLinkIncident(event.target.value);
              event.target.value = '';
            }}
          >
            <option value="">Link an incident…</option>
            {linkableIncidents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.number} · {item.title}
              </option>
            ))}
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Related problem</p>
      <Select value={problemId ?? ''} onChange={(event) => onProblemId(event.target.value)}>
        <option value="">None</option>
        {problems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.number} · {item.title}
          </option>
        ))}
      </Select>
      <Button size="sm" variant="outline" className="w-full" disabled={disabled} onClick={onSaveProblem}>
        Save problem link
      </Button>
      {problemNumber ? (
        <p className="text-xs text-zinc-400">
          <Link href={`/tickets/${problemId}`} className="text-blue-300 hover:text-blue-200">
            {problemNumber}
          </Link>
          {problemTitle ? ` · ${problemTitle}` : ''}
        </p>
      ) : null}
      {problemWorkaround ? <p className="text-xs leading-5 text-zinc-500">Workaround: {problemWorkaround}</p> : null}
    </div>
  );
}

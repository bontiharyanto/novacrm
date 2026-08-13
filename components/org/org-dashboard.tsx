import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { AssignmentGroup, AssignmentGroupKind, OrgUnit, SupportTier } from '@/lib/org/schema';
import { supportTierLabel } from '@/lib/tickets/pending';

const kindLabel: Record<AssignmentGroupKind, string> = {
  assignment: 'Assignment',
  cab: 'CAB',
  fulfillment: 'Fulfillment',
  oncall: 'On-call',
};

export function OrgDashboard({
  units,
  groups,
  canCreate,
  accountName,
  accountType,
}: {
  units: OrgUnit[];
  groups: AssignmentGroup[];
  canCreate: boolean;
  accountName?: string;
  accountType?: string;
}) {
  const divisions = units.filter((unit) => unit.type === 'division');

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Configuration</p>
            <h1 className="text-2xl font-semibold text-zinc-50">Organization</h1>
            {accountName ? <p className="mt-1 text-sm text-zinc-500">{accountName}</p> : null}
          </div>
          {canCreate ? (
            <div className="flex gap-2">
              <Link
                href="/org/units/new?type=division"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
              >
                New division
              </Link>
              <Link
                href="/org/groups/new"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
              >
                <Plus className="h-3.5 w-3.5" /> New group
              </Link>
            </div>
          ) : null}
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-50">Divisi / Unit</h2>
            {canCreate ? (
              <Link href="/org/units/new?type=unit" className="text-xs text-blue-300 hover:text-blue-200">
                New unit
              </Link>
            ) : null}
          </div>
          {divisions.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
              {accountType === 'customer'
                ? 'Org tree is for Internal staff. Use assignment groups for this customer L1 queue.'
                : 'No divisions yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {divisions.map((division) => {
                const children = units.filter((unit) => unit.parentId === division.id);
                return (
                  <div key={division.id} className="overflow-hidden rounded-xl border border-zinc-800">
                    <Link
                      href={`/org/units/${division.id}`}
                      className="flex items-center justify-between bg-zinc-900/60 px-4 py-3 hover:bg-zinc-900"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-50">{division.name}</p>
                        <p className="text-xs text-zinc-500">{division.managerName ?? 'No manager'}</p>
                      </div>
                      <Badge tone="info">Division</Badge>
                    </Link>
                    {children.map((unit) => (
                      <Link
                        key={unit.id}
                        href={`/org/units/${unit.id}`}
                        className="flex items-center justify-between border-t border-zinc-800 px-4 py-2.5 pl-8 hover:bg-zinc-900/80"
                      >
                        <div>
                          <p className="text-sm text-zinc-200">{unit.name}</p>
                          <p className="text-xs text-zinc-500">{unit.managerName ?? 'No manager'}</p>
                        </div>
                        <Badge>Unit</Badge>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-50">Assignment groups</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {groups.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">No groups on this account.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Group</th>
                    <th className="px-3 py-2 font-medium">Kind</th>
                    <th className="px-3 py-2 font-medium">Tier</th>
                    <th className="px-3 py-2 font-medium">Members</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/80">
                      <td className="px-3 py-2.5">
                        <Link href={`/org/groups/${group.id}`} className="text-zinc-50 hover:text-blue-200">
                          {group.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">{kindLabel[group.kind]}</td>
                      <td className="px-3 py-2.5 text-zinc-400">
                        {group.tier ? supportTierLabel[group.tier as SupportTier] : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{group.memberCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-4 border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Units</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{units.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Groups</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{groups.length}</p>
          </CardContent>
        </Card>
        <p className="text-sm leading-6 text-zinc-400">
          Divisi and unit are the HR tree (requester home, manager line). Groups are queues: assign incidents, CAB,
          fulfillment. A person can sit in one unit and many groups.
        </p>
      </aside>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CI_CLASS_GROUP_META,
  DEFAULT_CI_CLASSES,
  getCiClass,
  groupCiClasses,
  type CiClass,
} from '@/lib/cmdb/classes';

type AssetOption = { id: string; name: string; assetTag: string };
type CiOption = { id: string; name: string; type: string };

const REL_TYPES = ['depends_on', 'runs_on', 'hosted_on', 'contains', 'connects', 'protects', 'uses', 'impacts'];

export function CmdbCreate() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('service');
  const [assetId, setAssetId] = useState('');
  const [site, setSite] = useState('');
  const [hostIp, setHostIp] = useState('');
  const [role, setRole] = useState('');
  const [cidr, setCidr] = useState('');
  const [vlan, setVlan] = useState('');
  const [gateway, setGateway] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relationType, setRelationType] = useState('depends_on');
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [cis, setCis] = useState<CiOption[]>([]);
  const [classes, setClasses] = useState<CiClass[]>(DEFAULT_CI_CLASSES);
  const [newGroup, setNewGroup] = useState<CiClass['groupKey']>('custom');
  const [newLabel, setNewLabel] = useState('');
  const [newHint, setNewHint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const catalog = classes.length > 0 ? classes : DEFAULT_CI_CLASSES;
  const groups = groupCiClasses(catalog);
  const meta = getCiClass(type, catalog) ?? getCiClass('service', catalog) ?? catalog[0];
  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === assetId), [assets, assetId]);
  const selectedTarget = useMemo(() => cis.find((item) => item.id === targetId), [cis, targetId]);
  const showHostIp = ['endpoint', 'printer', 'server', 'database'].includes(type);
  const showNetwork = type === 'network';

  useEffect(() => {
    void fetch('/api/assets')
      .then((response) => response.json())
      .then((payload) => setAssets(payload.data ?? []))
      .catch(() => setAssets([]));
    void fetch('/api/cmdb')
      .then((response) => response.json())
      .then((payload) => setCis(payload.data ?? []))
      .catch(() => setCis([]));
    void fetch('/api/cmdb/classes')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data?.length) setClasses(payload.data);
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 1) {
      setError('Name is required. Type it in the field below the title.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    const response = await fetch('/api/cmdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        type,
        assetId: assetId || undefined,
        attributes: {
          ...(site.trim() ? { site: site.trim() } : {}),
          ...(role.trim() ? { role: role.trim() } : {}),
          ...(hostIp.trim() ? { ip: hostIp.trim() } : {}),
        },
        segment: cidr.trim()
          ? { cidr: cidr.trim(), vlan, gateway, purpose: role === 'ap' ? 'wifi' : role === 'edge' ? 'wan' : 'user' }
          : undefined,
        relations: targetId ? [{ targetId, type: relationType }] : [],
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data?.id) {
      setError(payload.error ?? 'Unable to create CI.');
      setIsSubmitting(false);
      return;
    }
    router.push(`/cmdb/${payload.data.id}`);
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/cmdb" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
              <ArrowLeft className="h-3.5 w-3.5" /> CMDB
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-white">New {meta?.label.toLowerCase() ?? 'CI'}</h1>
            <p className="mt-1 text-sm text-zinc-500">{meta?.hint}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push('/cmdb')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create CI'}
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={type === 'business_service' ? 'Internet banking' : 'prod-app-01'}
            required
            autoFocus
            className="font-mono text-base"
          />
        </div>

        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{group.label}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => setType(item.slug)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5',
                      type === item.slug
                        ? 'border-blue-500/40 bg-blue-500/10'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
                    )}
                  >
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">{item.hint || 'Custom type'}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="space-y-4 border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4 text-sm leading-6 text-zinc-400">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">What to pick</p>
            <p>
              <span className="text-zinc-200">Service offering</span> — business service / application / worker that
              users consume.
            </p>
            <p>
              <span className="text-zinc-200">Infrastructure</span> — server, database, switch, firewall.
            </p>
            <p>
              <span className="text-zinc-200">End user</span> — laptop, mobile, printer (devices). People/logins are
              under Users, not CMDB.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Add CI type</p>
            <div className="space-y-1.5">
              <Label htmlFor="newGroup">Group</Label>
              <Select id="newGroup" value={newGroup} onChange={(event) => setNewGroup(event.target.value as CiClass['groupKey'])}>
                {CI_CLASS_GROUP_META.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newLabel">Card name</Label>
              <Input id="newLabel" value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="CCTV" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newHint">Hint</Label>
              <Input id="newHint" value={newHint} onChange={(event) => setNewHint(event.target.value)} placeholder="Camera / NVR" />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={newLabel.trim().length < 2}
              onClick={() => {
                void fetch('/api/cmdb/classes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ groupKey: newGroup, label: newLabel.trim(), hint: newHint.trim() }),
                })
                  .then((response) => response.json())
                  .then((payload) => {
                    if (payload.error || !payload.data) {
                      setError(payload.error ?? 'Unable to add type');
                      return;
                    }
                    setClasses((current) => [...current, payload.data]);
                    setType(payload.data.slug);
                    setNewLabel('');
                    setNewHint('');
                  });
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add card
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Inventory</p>
            <div className="space-y-1.5">
              <Label htmlFor="asset">Linked asset</Label>
              <Select id="asset" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
                <option value="">None</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.assetTag} · {asset.name}
                  </option>
                ))}
              </Select>
              {selectedAsset ? (
                <p className="text-[11px] text-zinc-500">{selectedAsset.name} — same account only.</p>
              ) : (
                <p className="text-[11px] text-zinc-600">Optional. Must belong to the active account.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site">Site</Label>
              <Input id="site" value={site} onChange={(event) => setSite(event.target.value)} placeholder="Jakarta HQ" />
            </div>
            {showHostIp ? (
              <div className="space-y-1.5">
                <Label htmlFor="hostIp">Host IP</Label>
                <Input
                  id="hostIp"
                  value={hostIp}
                  onChange={(event) => setHostIp(event.target.value)}
                  placeholder="10.20.3.41"
                  className="font-mono"
                />
              </div>
            ) : null}
            {showNetwork ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Network role</Label>
                  <Select id="role" value={role} onChange={(event) => setRole(event.target.value)}>
                    <option value="">None</option>
                    <option value="wan">WAN / circuit</option>
                    <option value="edge">Firewall / edge</option>
                    <option value="core">Core switch</option>
                    <option value="access">Access switch</option>
                    <option value="ap">Access point</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cidr">IP segment</Label>
                  <Input
                    id="cidr"
                    value={cidr}
                    onChange={(event) => setCidr(event.target.value)}
                    placeholder="10.20.2.0/24"
                    className="font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="vlan">VLAN</Label>
                    <Input id="vlan" value={vlan} onChange={(event) => setVlan(event.target.value)} placeholder="20" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gateway">Gateway</Label>
                    <Input
                      id="gateway"
                      value={gateway}
                      onChange={(event) => setGateway(event.target.value)}
                      placeholder="10.20.2.1"
                      className="font-mono"
                    />
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Relationship</p>
            <div className="space-y-1.5">
              <Label htmlFor="relType">Type</Label>
              <Select id="relType" value={relationType} onChange={(event) => setRelationType(event.target.value)}>
                {REL_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">Target CI</Label>
              <Select id="target" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                <option value="">None</option>
                {cis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              {selectedTarget ? (
                <p className="text-[11px] text-zinc-500">
                  {name || 'This CI'} {relationType.replace('_', ' ')} {selectedTarget.name}
                </p>
              ) : (
                <p className="text-[11px] text-zinc-600">Optional. Drawn on the graph after create.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </aside>
    </motion.form>
  );
}

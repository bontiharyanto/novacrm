'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AssetItem = {
  id: string;
  name: string;
  assetTag: string;
  type: 'laptop' | 'server' | 'network' | 'printer' | 'mobile';
  status: 'active' | 'in_repair' | 'retired' | 'lost';
  assignedTo?: string;
  location?: string;
  createdAt: string;
};

export function AssetDashboard() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetItem['type']>('laptop');
  const [status, setStatus] = useState<AssetItem['status']>('active');
  const [assignedTo, setAssignedTo] = useState('');

  async function loadAssets() {
    const response = await fetch('/api/assets');
    const payload = await response.json();
    setAssets(payload.data ?? []);
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, status, assignedTo }),
    });

    setName('');
    setType('laptop');
    setStatus('active');
    setAssignedTo('');
    await loadAssets();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-blue-400">Asset Management</p>
          <h1 className="text-3xl font-bold text-white">Inventory</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create asset</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Asset name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Laptop A-01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={type}
                onChange={(event) => setType(event.target.value as AssetItem['type'])}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="laptop">Laptop</option>
                <option value="server">Server</option>
                <option value="network">Network</option>
                <option value="printer">Printer</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value as AssetItem['status'])}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="in_repair">In Repair</option>
                <option value="retired">Retired</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned to</Label>
              <Input id="assignedTo" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Operations team" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create asset</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asset list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assets.length === 0 ? (
            <p className="text-zinc-400">No assets yet.</p>
          ) : (
            assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div>
                  <p className="font-medium text-white">{asset.name}</p>
                  <p className="text-xs text-zinc-400">{asset.assetTag} • {asset.type} • {asset.status}</p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <div>{asset.assignedTo || 'Unassigned'}</div>
                  <div>{asset.location || 'No location'}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

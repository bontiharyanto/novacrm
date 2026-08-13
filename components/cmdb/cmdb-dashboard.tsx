'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRealtimeTable } from '@/lib/supabase/realtime';

type CmdbItem = {
  id: string;
  name: string;
  type: string;
  assetId?: string;
  attributes: Record<string, string>;
  relations: Array<{ targetId: string; type: string }>;
  createdAt: string;
};

export function CmdbDashboard() {
  const [items, setItems] = useState<CmdbItem[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('service');

  const loadItems = useCallback(async () => {
    const response = await fetch('/api/cmdb');
    const payload = await response.json();
    setItems(payload.data ?? []);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useRealtimeTable('cmdb_items', loadItems);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await fetch('/api/cmdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, attributes: { owner: 'operations' }, relations: [] }),
    });

    setName('');
    setType('service');
    await loadItems();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-blue-400">CMDB</p>
          <h1 className="text-3xl font-bold text-white">Configuration items</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add configuration item</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Primary Application Server" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="type">Type</Label>
              <Input id="type" value={type} onChange={(event) => setType(event.target.value)} placeholder="server" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create CMDB item</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CMDB list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-zinc-400">No CMDB items yet.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <p className="font-medium text-white">{item.name}</p>
                <p className="text-xs text-zinc-400">{item.type} • {item.relations.length} relations</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

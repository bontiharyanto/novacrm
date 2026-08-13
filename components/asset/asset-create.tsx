'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ASSET_STATUSES, type AssetStatus } from '@/lib/assets/schema';
import { DEFAULT_ASSET_TYPES, type AssetTypeOption } from '@/lib/assets/types';

export function AssetCreate() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('laptop');
  const [types, setTypes] = useState<AssetTypeOption[]>(DEFAULT_ASSET_TYPES);
  const [newType, setNewType] = useState('');
  const [status, setStatus] = useState<AssetStatus>('active');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [cost, setCost] = useState('');
  const [usefulLifeMonths, setUsefulLifeMonths] = useState('36');
  const [location, setLocation] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/assets/types')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data?.length) setTypes(payload.data);
      })
      .catch(() => undefined);
  }, []);

  async function addType() {
    if (newType.trim().length < 2) return;
    const response = await fetch('/api/assets/types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newType.trim() }),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload.error || !payload.data) {
      setError(payload.error ?? 'Unable to add type');
      return;
    }
    setTypes((current) => [...current, payload.data]);
    setType(payload.data.slug);
    setNewType('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    const response = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type,
        status,
        brand,
        model,
        serial,
        purchaseDate,
        warrantyExpiry,
        cost,
        usefulLifeMonths,
        location,
        assignedTo,
        notes,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data?.id) {
      setError(payload.error ?? 'Unable to create asset.');
      setIsSubmitting(false);
      return;
    }
    router.push(`/assets/${payload.data.id}`);
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex min-h-[calc(100vh-3.5rem)] flex-col"
    >
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/assets" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
              <ArrowLeft className="h-3.5 w-3.5" /> Assets
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-zinc-50">New asset</h1>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push('/assets')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || name.trim().length < 1}>
              {isSubmitting ? 'Creating...' : 'Create asset'}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" value={brand} onChange={(event) => setBrand(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={model} onChange={(event) => setModel(event.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="serial">Serial</Label>
              <Input id="serial" value={serial} onChange={(event) => setSerial(event.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} />
            </div>
            {error ? <p className="text-sm text-rose-400 sm:col-span-2">{error}</p> : null}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <Select id="type" value={type} onChange={(event) => setType(event.target.value)}>
                  {types.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newType}
                  onChange={(event) => setNewType(event.target.value)}
                  placeholder="Add type: CCTV, UPS…"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={newType.trim().length < 2}
                  onClick={() => void addType()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select id="status" value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)}>
                  {ASSET_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignedTo">Assigned to</Label>
                <Input id="assignedTo" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Financial / warranty</p>
              <div className="space-y-1.5">
                <Label htmlFor="purchaseDate">Purchase date</Label>
                <Input id="purchaseDate" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="warrantyExpiry">Warranty expiry</Label>
                <Input id="warrantyExpiry" type="date" value={warrantyExpiry} onChange={(event) => setWarrantyExpiry(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">Cost (IDR)</Label>
                <Input id="cost" type="number" min="0" value={cost} onChange={(event) => setCost(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="life">Useful life (months)</Label>
                <Input id="life" type="number" min="1" value={usefulLifeMonths} onChange={(event) => setUsefulLifeMonths(event.target.value)} />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </motion.form>
  );
}

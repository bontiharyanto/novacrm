'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { VariableBuilder } from '@/components/catalog/variable-builder';
import { CATALOG_ICONS } from '@/lib/catalog/schema';
import type { CatalogCategory, CatalogItem, CatalogVariable, CatalogVariableSet } from '@/lib/catalog/schema';
import { TICKET_TYPES, ticketTypeMeta } from '@/lib/tickets/process';

export function CatalogItemEditor({ itemId }: { itemId?: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('clipboard');
  const [categoryId, setCategoryId] = useState('');
  const [variableSetId, setVariableSetId] = useState('');
  const [ticketType, setTicketType] = useState<(typeof TICKET_TYPES)[number]>('request');
  const [priority, setPriority] = useState('medium');
  const [isActive, setIsActive] = useState(true);
  const [variables, setVariables] = useState<CatalogVariable[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [sets, setSets] = useState<CatalogVariableSet[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/catalog')
      .then((response) => response.json())
      .then((payload) => {
        setCategories(payload.categories ?? []);
        setSets(payload.sets ?? []);
      });
  }, []);

  useEffect(() => {
    if (!itemId) return;
    void fetch(`/api/catalog/${itemId}`)
      .then((response) => response.json())
      .then((payload) => {
        const item = payload.data as CatalogItem | null;
        if (!item) return;
        setName(item.name);
        setShortDescription(item.shortDescription ?? '');
        setDescription(item.description ?? '');
        setIcon(item.icon);
        setCategoryId(item.categoryId ?? '');
        setVariableSetId(item.variableSetId ?? '');
        setTicketType(item.ticketType);
        setPriority(item.priority);
        setIsActive(item.isActive);
        setVariables(item.variables ?? []);
      });
  }, [itemId]);

  async function addCategory() {
    const label = newCategory.trim();
    if (!label) return;
    const response = await fetch('/api/catalog/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: label }),
    });
    const payload = await response.json();
    if (payload.data?.id) {
      setCategories((current) => [...current, payload.data]);
      setCategoryId(payload.data.id);
      setNewCategory('');
    }
  }

  async function save() {
    setIsSaving(true);
    setError('');
    const body = {
      name,
      shortDescription,
      description,
      icon,
      categoryId: categoryId || null,
      variableSetId: variableSetId || null,
      ticketType,
      priority,
      isActive,
      variables,
    };
    const response = await fetch(itemId ? `/api/catalog/${itemId}` : '/api/catalog', {
      method: itemId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data?.id) {
      setError(payload.error ?? 'Unable to save catalog item.');
      setIsSaving(false);
      return;
    }
    if (!itemId) {
      router.replace(`/catalog/${payload.data.id}`);
    }
    setIsSaving(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex min-h-[calc(100vh-3.5rem)] flex-col"
    >
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/catalog" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
              <ArrowLeft className="h-3.5 w-3.5" /> Catalog
            </Link>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Item name"
              className="mt-1 block w-full max-w-xl bg-transparent text-xl font-semibold text-white outline-none placeholder:text-zinc-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsActive((value) => !value)}>
              {isActive ? 'Published' : 'Draft'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/catalog')}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={isSaving || name.trim().length < 1}>
              {isSaving ? 'Saving...' : 'Save item'}
            </Button>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      </header>

      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label>Short description</Label>
            <Input value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fulfillment notes</Label>
            <Textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Item variables</p>
            <VariableBuilder variables={variables} onChange={setVariables} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Record producer</p>
              <div className="space-y-1.5">
                <Label>Creates</Label>
                <Select value={ticketType} onChange={(event) => setTicketType(event.target.value as (typeof TICKET_TYPES)[number])}>
                  {TICKET_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {ticketTypeMeta[type].label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <Select value={icon} onChange={(event) => setIcon(event.target.value)}>
                  {CATALOG_ICONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">None</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  <Input placeholder="New category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
                  <Button type="button" variant="outline" onClick={() => void addCategory()}>
                    Add
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Variable set</Label>
                <Select value={variableSetId} onChange={(event) => setVariableSetId(event.target.value)}>
                  <option value="">None</option>
                  {sets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                <Link href="/catalog/sets/new" className="text-xs text-blue-300 hover:text-blue-200">
                  New variable set
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </motion.div>
  );
}

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
import {
  DEFAULT_REQUEST_PIPELINE,
  REQUEST_TASK_TYPES,
  type CatalogFulfillmentStep,
  type TicketTaskType,
} from '@/lib/tickets/tasks-schema';
import { TICKET_TYPES } from '@/lib/tickets/process';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedType } from '@/lib/i18n/labels';

export function CatalogItemEditor({ itemId }: { itemId?: string }) {
  const router = useRouter();
  const { t } = useI18n();
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
  const [fulfillmentSteps, setFulfillmentSteps] = useState<CatalogFulfillmentStep[]>([]);
  const [fulfillmentSequential, setFulfillmentSequential] = useState(true);
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
        setFulfillmentSteps(item.fulfillmentSteps ?? []);
        setFulfillmentSequential(item.fulfillmentSequential !== false);
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
      fulfillmentSteps: fulfillmentSteps.map((step, index) => ({ ...step, sortOrder: index })),
      fulfillmentSequential,
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
              <ArrowLeft className="h-3.5 w-3.5" /> {t.nav.catalog}
            </Link>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.catalog.itemName}
              className="mt-1 block w-full max-w-xl bg-transparent text-xl font-semibold text-zinc-50 outline-none placeholder:text-zinc-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsActive((value) => !value)}>
              {isActive ? t.catalog.published : t.catalog.draft}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/catalog')}>
              {t.common.cancel}
            </Button>
            <Button type="button" onClick={() => void save()} disabled={isSaving || name.trim().length < 1}>
              {isSaving ? t.common.loading : t.catalog.saveItem}
            </Button>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      </header>

      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label>{t.tickets.shortDescription}</Label>
            <Input value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.catalog.fulfillmentNotes}</Label>
            <Textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.catalog.itemVariables}</p>
            <VariableBuilder variables={variables} onChange={setVariables} />
          </div>
          <div className="space-y-3 rounded-xl border border-zinc-800 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.catalog.fulfillmentSteps}</p>
                <p className="mt-1 text-xs text-zinc-500">{t.catalog.fulfillmentStepsHint}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFulfillmentSteps(DEFAULT_REQUEST_PIPELINE.map((step, index) => ({ ...step, sortOrder: index })))
                  }
                >
                  {t.catalog.loadDefaultPipeline}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFulfillmentSteps((current) => [
                      ...current,
                      { title: '', taskType: 'other', sortOrder: current.length },
                    ])
                  }
                >
                  {t.catalog.addFulfillmentStep}
                </Button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={fulfillmentSequential}
                onChange={(event) => setFulfillmentSequential(event.target.checked)}
              />
              {t.catalog.fulfillmentSequential}
            </label>
            {fulfillmentSteps.length === 0 ? (
              <p className="text-sm text-zinc-500">{t.tickets.tasks.empty}</p>
            ) : (
              <div className="space-y-2">
                {fulfillmentSteps.map((step, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg border border-zinc-800 p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]"
                  >
                    <Input
                      value={step.title}
                      placeholder={t.catalog.stepTitle}
                      onChange={(event) =>
                        setFulfillmentSteps((current) =>
                          current.map((row, i) => (i === index ? { ...row, title: event.target.value } : row)),
                        )
                      }
                    />
                    <Select
                      value={step.taskType}
                      onChange={(event) =>
                        setFulfillmentSteps((current) =>
                          current.map((row, i) =>
                            i === index ? { ...row, taskType: event.target.value as TicketTaskType } : row,
                          ),
                        )
                      }
                    >
                      {REQUEST_TASK_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {t.tickets.tasks.types[value]}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFulfillmentSteps((current) => current.filter((_, i) => i !== index))}
                    >
                      {t.common.cancel}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.catalog.recordProducer}</p>
              <div className="space-y-1.5">
                <Label>{t.catalog.creates}</Label>
                <Select value={ticketType} onChange={(event) => setTicketType(event.target.value as (typeof TICKET_TYPES)[number])}>
                  {TICKET_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {localizedType(t, type)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.tickets.priorityTitle}</Label>
                <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option value="low">{t.tickets.priority.low}</option>
                  <option value="medium">{t.tickets.priority.medium}</option>
                  <option value="high">{t.tickets.priority.high}</option>
                  <option value="critical">{t.tickets.priority.critical}</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.catalog.icon}</Label>
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

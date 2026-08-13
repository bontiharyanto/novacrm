'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VariableBuilder } from '@/components/catalog/variable-builder';
import type { CatalogVariable, CatalogVariableSet } from '@/lib/catalog/schema';

export function VariableSetEditor({ setId }: { setId?: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [variables, setVariables] = useState<CatalogVariable[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!setId) return;
    void fetch(`/api/catalog/sets/${setId}`)
      .then((response) => response.json())
      .then((payload) => {
        const set = payload.data as CatalogVariableSet | null;
        if (!set) return;
        setName(set.name);
        setDescription(set.description ?? '');
        setVariables(set.variables ?? []);
      });
  }, [setId]);

  async function save() {
    setIsSaving(true);
    setError('');
    const response = await fetch(setId ? `/api/catalog/sets/${setId}` : '/api/catalog/sets', {
      method: setId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, variables }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data?.id) {
      setError(payload.error ?? 'Unable to save variable set.');
      setIsSaving(false);
      return;
    }
    if (!setId) {
      router.replace(`/catalog/sets/${payload.data.id}`);
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
              placeholder="Variable set name"
              className="mt-1 block w-full max-w-xl bg-transparent text-xl font-semibold text-white outline-none placeholder:text-zinc-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push('/catalog')}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={isSaving || name.trim().length < 1}>
              {isSaving ? 'Saving...' : 'Save set'}
            </Button>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      </header>

      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <VariableBuilder variables={variables} onChange={setVariables} />
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea rows={6} value={description} onChange={(event) => setDescription(event.target.value)} />
          <p className="text-xs text-zinc-500">Reusable fields attached to catalog items, like location or cost center.</p>
        </div>
      </div>
    </motion.div>
  );
}

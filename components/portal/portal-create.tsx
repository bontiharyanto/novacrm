'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TypeBadge } from '@/components/tickets/type-badge';
import { ticketTypeMeta, type TicketType } from '@/lib/tickets/process';
import { cn } from '@/lib/utils';

const PORTAL_TYPES = ['incident', 'request'] as const;

export function PortalCreate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const [type, setType] = useState<TicketType>(typeParam === 'request' ? 'request' : 'incident');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const meta = ticketTypeMeta[type];
  const canSubmit = title.trim().length >= 3 && !isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError('');

    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || title.trim(),
        type,
        status: 'open',
        priority: type === 'incident' ? 'high' : 'medium',
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data?.id) {
      setError(payload.error ?? 'Unable to submit ticket.');
      setIsSubmitting(false);
      return;
    }

    router.push(`/portal/${payload.data.id}`);
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mx-auto max-w-3xl space-y-6 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/portal" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> My tickets
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-50">New {meta.label.toLowerCase()}</h1>
            <TypeBadge type={type} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">{meta.description}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => router.push('/portal')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? 'Submitting...' : type === 'incident' ? 'Report incident' : 'Submit request'}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {PORTAL_TYPES.map((item) => {
          const option = ticketTypeMeta[item];
          const selected = type === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setType(item)}
              className={cn(
                'rounded-xl border px-4 py-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5',
                selected ? 'border-blue-500/40 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
              )}
            >
              <p className="font-mono text-[11px] text-zinc-500">{option.prefix}</p>
              <p className="mt-1 text-sm font-medium text-zinc-50">{option.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{option.description}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Short description</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={type === 'incident' ? 'Laptop bluescreen after update' : 'Need access to VPN'}
            required
            autoFocus
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Details</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What should we know?"
            rows={8}
          />
        </div>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </motion.form>
  );
}

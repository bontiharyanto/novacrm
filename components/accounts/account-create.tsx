'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { createAccount } from '@/lib/accounts/actions';

export function AccountCreate() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    const result = await createAccount({ name: name.trim(), code, type: 'customer' });
    if (result.error || !result.data?.id) {
      setError(result.error ?? 'Unable to create account.');
      setIsSubmitting(false);
      return;
    }
    router.push(`/accounts/${result.data.id}`);
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
        <div>
          <Link href="/accounts" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Accounts
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-zinc-50">New customer account</h1>
          <p className="mt-1 text-sm text-zinc-500">Creates an isolated ticket queue, asset register, and CMDB.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="PT Example" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="EXM"
              maxLength={12}
              className="font-mono"
            />
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <Button type="submit" disabled={name.trim().length < 2 || isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create account'}
          </Button>
        </div>
      </div>

      <aside className="border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-2 p-4 text-sm text-zinc-400">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Isolation</p>
            <p>Staff must be added as members before they can work this customer. Portal users use role portal.</p>
          </CardContent>
        </Card>
      </aside>
    </motion.form>
  );
}

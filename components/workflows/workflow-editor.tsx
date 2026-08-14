'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { workflowNodeTypes } from '@/components/workflows/workflow-nodes';
import { emptyDefinition } from '@/lib/workflows/graph';
import { WORKFLOW_ACTIONS, WORKFLOW_EVENTS, type WorkflowDefinition } from '@/lib/workflows/schema';
import { getWorkflowTemplate } from '@/lib/workflows/templates';
import { DEFAULT_ASSET_TYPES, type AssetTypeOption } from '@/lib/assets/types';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';

type AgentOption = { id: string; fullName: string };

const STATUSES = ['open', 'in_progress', 'waiting', 'hold', 'resolved', 'closed'];

function toFlow(definition: WorkflowDefinition) {
  return {
    nodes: definition.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })) as Node[],
    edges: definition.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.sourceHandle === 'yes' ? 'Yes' : edge.sourceHandle === 'no' ? 'No' : undefined,
      style: { stroke: edge.sourceHandle === 'no' ? '#71717a' : '#3b82f6' },
    })) as Edge[],
  };
}

export function WorkflowEditor({ ruleId, template }: { ruleId?: string; template?: string }) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner ruleId={ruleId} template={template} />
    </ReactFlowProvider>
  );
}

function WorkflowEditorInner({ ruleId, template }: { ruleId?: string; template?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const seed = template ? getWorkflowTemplate(template).definition : emptyDefinition();
  const [name, setName] = useState(template ? getWorkflowTemplate(template).name : 'New flow');
  const [isActive, setIsActive] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlow(seed).nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlow(seed).edges);
  const [selectedId, setSelectedId] = useState<string | null>('trigger');
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeOption[]>(DEFAULT_ASSET_TYPES);
  const [runs, setRuns] = useState<Array<{ id: string; status: string; event: string; createdAt: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const selected = nodes.find((node) => node.id === selectedId);

  useEffect(() => {
    void fetch('/api/agents')
      .then((response) => response.json())
      .then((payload) => setAgents(payload.data ?? []))
      .catch(() => setAgents([]));
    void fetch('/api/assets/types')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data?.length) setAssetTypes(payload.data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!ruleId) return;
    void fetch(`/api/workflows/${ruleId}`)
      .then((response) => response.json())
      .then((payload) => {
        const rule = payload.data;
        if (!rule) return;
        setName(rule.name);
        setIsActive(rule.isActive !== false);
        const next = toFlow(rule.definition ?? seed);
        setNodes(next.nodes);
        setEdges(next.edges);
        setRuns(rule.runs ?? []);
      });
  }, [ruleId, seed, setEdges, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            label: connection.sourceHandle === 'yes' ? 'Yes' : connection.sourceHandle === 'no' ? 'No' : undefined,
            style: { stroke: connection.sourceHandle === 'no' ? '#71717a' : '#3b82f6' },
          },
          current,
        ),
      ),
    [setEdges],
  );

  function addNode(type: 'action' | 'condition', action?: string) {
    const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
    setNodes((current) => {
      const origin = current.find((node) => node.id === selectedId) ?? current.find((node) => node.type === 'trigger');
      const next = [
        ...current,
        {
          id,
          type,
          position: { x: (origin?.position.x ?? 80) + 260, y: (origin?.position.y ?? 80) + current.length * 12 },
          data:
            type === 'condition'
              ? { condition: 'priority', matchValue: 'critical' }
              : {
                  action,
                  target: action === 'send_email' ? 'requester' : action === 'change_status' ? 'in_progress' : '',
                },
        },
      ];
      if (origin) {
        setEdges((edgesCurrent) =>
          edgesCurrent.concat({
            id: `e-${id}`,
            source: origin.id,
            target: id,
            style: { stroke: '#3b82f6' },
          }),
        );
      }
      return next;
    });
    setSelectedId(id);
  }

  const patchSelected = useCallback(
    (data: Record<string, string>) => {
      if (!selectedId) return;
      setNodes((current) =>
        current.map((node) => (node.id === selectedId ? { ...node, data: { ...node.data, ...data } } : node)),
      );
    },
    [selectedId, setNodes],
  );

  async function save() {
    setIsSaving(true);
    setError('');
    const definition: WorkflowDefinition = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: (node.type === 'condition' ? 'condition' : node.type === 'action' ? 'action' : 'trigger') as
          | 'trigger'
          | 'action'
          | 'condition',
        position: node.position,
        data: node.data as WorkflowDefinition['nodes'][number]['data'],
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
      })),
    };
    const body = { name, isActive, definition };
    const response = await fetch(ruleId ? `/api/workflows/${ruleId}` : '/api/workflows', {
      method: ruleId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data?.id) {
      const message = payload.error ?? t.common.saveFailed;
      setError(message);
      toastError(message);
      setIsSaving(false);
      return;
    }
    toastSuccess(t.common.saved);
    if (!ruleId) {
      router.replace(`/workflows/${payload.data.id}`);
    }
    setIsSaving(false);
  }

  const inspector = useMemo(() => {
    if (!selected) return null;
    if (selected.type === 'trigger') {
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>When</Label>
            <Select
              value={String(selected.data.event ?? 'ticket.create')}
              onChange={(event) => patchSelected({ event: event.target.value })}
            >
              {WORKFLOW_EVENTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Only if priority</Label>
            <Select
              value={String(selected.data.matchPriority ?? '')}
              onChange={(event) => patchSelected({ matchPriority: event.target.value })}
            >
              <option value="">Any</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Only if type</Label>
            <Select
              value={String(selected.data.matchType ?? '')}
              onChange={(event) => patchSelected({ matchType: event.target.value })}
            >
              <option value="">Any</option>
              <option value="incident">Incident</option>
              <option value="problem">Problem</option>
              <option value="change">Change</option>
              <option value="request">Request</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Only if source</Label>
            <Select
              value={String(selected.data.matchCategory ?? '')}
              onChange={(event) => patchSelected({ matchCategory: event.target.value })}
            >
              <option value="">Any</option>
              <option value="monitoring">Monitoring</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="email">Email</option>
              <option value="generic">Generic</option>
            </Select>
          </div>
        </div>
      );
    }
    if (selected.type === 'condition') {
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Field</Label>
            <Select
              value={String(selected.data.condition ?? 'priority')}
              onChange={(event) => patchSelected({ condition: event.target.value })}
            >
              <option value="priority">Priority</option>
              <option value="type">Type</option>
              <option value="status">Status</option>
              <option value="category">Source</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Equals</Label>
            <Select
              value={String(selected.data.matchValue ?? 'critical')}
              onChange={(event) => patchSelected({ matchValue: event.target.value })}
            >
              <option value="critical">critical</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
              <option value="incident">incident</option>
              <option value="open">open</option>
              <option value="in_progress">in progress</option>
              <option value="monitoring">monitoring</option>
              <option value="whatsapp">whatsapp</option>
              <option value="telegram">telegram</option>
              <option value="email">email</option>
            </Select>
          </div>
          <p className="text-[11px] text-zinc-500">Connect Yes / No handles to different actions.</p>
        </div>
      );
    }
    const action = String(selected.data.action ?? 'send_email');
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Action</Label>
          <Select value={action} onChange={(event) => patchSelected({ action: event.target.value })}>
            {WORKFLOW_ACTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        {action === 'send_email' ? (
          <div className="space-y-1.5">
            <Label>Send to</Label>
            <Select value={String(selected.data.target ?? 'requester')} onChange={(event) => patchSelected({ target: event.target.value })}>
              <option value="requester">Requester</option>
              <option value="assignee">Assignee</option>
            </Select>
          </div>
        ) : null}
        {action === 'assign' ? (
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select value={String(selected.data.target ?? '')} onChange={(event) => patchSelected({ target: event.target.value })}>
              <option value="">First available agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        {action === 'change_status' ? (
          <div className="space-y-1.5">
            <Label>New status</Label>
            <Select value={String(selected.data.target ?? 'in_progress')} onChange={(event) => patchSelected({ target: event.target.value })}>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        {action === 'create_asset' ? (
          <div className="space-y-1.5">
            <Label>Asset type</Label>
            <Select value={String(selected.data.target ?? 'laptop')} onChange={(event) => patchSelected({ target: event.target.value })}>
              {assetTypes.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
    );
  }, [agents, assetTypes, patchSelected, selected]);

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
            <Link href="/workflows" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
              <ArrowLeft className="h-3.5 w-3.5" /> Automation
            </Link>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full max-w-md bg-transparent text-xl font-semibold text-zinc-50 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsActive((value) => !value)}>
              {isActive ? 'Active' : 'Inactive'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push('/workflows')}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={isSaving || name.trim().length < 1}>
              {isSaving ? 'Saving...' : 'Save flow'}
            </Button>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      </header>

      <div className="grid flex-1 lg:grid-cols-[200px_minmax(0,1fr)_300px]">
        <aside className="space-y-2 border-r border-zinc-800 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Logic</p>
          <button
            type="button"
            onClick={() => addNode('condition')}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
          >
            <p className="text-sm text-zinc-50">Condition</p>
            <p className="text-[11px] text-zinc-500">If / else branch</p>
          </button>
          <p className="pt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Add action</p>
          {WORKFLOW_ACTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => addNode('action', item.id)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
            >
              <p className="text-sm text-zinc-50">{item.label}</p>
              <p className="text-[11px] text-zinc-500">{item.hint}</p>
            </button>
          ))}
        </aside>

        <div className="min-h-[560px] bg-zinc-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            nodeTypes={workflowNodeTypes}
            fitView
            colorMode="dark"
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background color="#27272a" gap={18} />
            <Controls />
            <MiniMap pannable zoomable style={{ background: '#09090b' }} nodeColor="#3b82f6" maskColor="rgba(9,9,11,0.7)" />
          </ReactFlow>
        </div>

        <aside className="space-y-4 border-l border-zinc-800 p-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Inspector</p>
              {inspector ?? <p className="text-sm text-zinc-500">Select a node.</p>}
            </CardContent>
          </Card>
          {runs.length > 0 ? (
            <Card>
              <CardContent className="space-y-2 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Recent runs</p>
                {runs.map((run) => (
                  <div key={run.id} className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{run.event.replace('ticket.', '')}</span>
                    <span className={run.status === 'failed' ? 'text-rose-400' : 'text-emerald-400'}>{run.status}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </motion.div>
  );
}

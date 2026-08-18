'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { WORKFLOW_ACTIONS, WORKFLOW_EVENTS } from '@/lib/workflows/schema';

export type TriggerNodeData = {
  event?: string;
  matchPriority?: string;
  matchType?: string;
  matchCategory?: string;
  label?: string;
};

export type ActionNodeData = {
  action?: string;
  target?: string;
  label?: string;
};

export type ConditionNodeData = {
  condition?: string;
  matchValue?: string;
  label?: string;
};

function eventLabel(event?: string) {
  return WORKFLOW_EVENTS.find((item) => item.id === event)?.label ?? 'Trigger';
}

function actionLabel(action?: string) {
  return WORKFLOW_ACTIONS.find((item) => item.id === action)?.label ?? 'Action';
}

export function TriggerNode({ data, selected }: NodeProps<Node<TriggerNodeData>>) {
  return (
    <div
      className={`w-[200px] rounded-xl border bg-zinc-900 px-3 py-2.5 shadow-none ${
        selected ? 'border-blue-500/60' : 'border-zinc-700'
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Trigger</p>
      <p className="mt-1 text-sm font-medium text-zinc-50">{eventLabel(data.event)}</p>
      {data.matchPriority ? <p className="text-[11px] text-zinc-500">Priority {data.matchPriority}</p> : null}
      {data.matchCategory ? <p className="text-[11px] text-zinc-500">{data.matchCategory}</p> : null}
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-zinc-600 !bg-blue-500" />
    </div>
  );
}

export function ActionNode({ data, selected }: NodeProps<Node<ActionNodeData>>) {
  return (
    <div
      className={`w-[200px] rounded-xl border bg-zinc-900 px-3 py-2.5 ${
        selected ? 'border-blue-500/60' : 'border-zinc-700'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-zinc-600 !bg-blue-500" />
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Action</p>
      <p className="mt-1 text-sm font-medium text-zinc-50">{actionLabel(data.action)}</p>
      {data.action === 'assign' ? (
        <p className="truncate text-[11px] text-zinc-500">
          {data.label || (data.target?.startsWith('group:') ? 'Group' : data.target ? 'Person' : 'First available')}
        </p>
      ) : data.target ? (
        <p className="truncate font-mono text-[11px] text-zinc-500">{data.target}</p>
      ) : null}
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-zinc-600 !bg-zinc-500" />
    </div>
  );
}

export function ConditionNode({ data, selected }: NodeProps<Node<ConditionNodeData>>) {
  const field = data.condition ?? 'priority';
  const value = data.matchValue ?? 'critical';
  return (
    <div
      className={`w-[220px] rounded-xl border bg-zinc-900 px-3 py-2.5 ${
        selected ? 'border-blue-500/60' : 'border-zinc-700'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-zinc-600 !bg-blue-500" />
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Condition</p>
      <p className="mt-1 text-sm font-medium text-zinc-50">
        {field} = {value}
      </p>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        <span>Yes</span>
        <span>No</span>
      </div>
      <Handle
        type="source"
        id="yes"
        position={Position.Right}
        style={{ top: '42%' }}
        className="!h-2.5 !w-2.5 !border-zinc-600 !bg-emerald-500"
      />
      <Handle
        type="source"
        id="no"
        position={Position.Right}
        style={{ top: '78%' }}
        className="!h-2.5 !w-2.5 !border-zinc-600 !bg-zinc-500"
      />
    </div>
  );
}

export const workflowNodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
};

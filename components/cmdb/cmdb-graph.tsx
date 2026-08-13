'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  MarkerType,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CmdbItem } from '@/lib/cmdb/schema';
import { cmdbNodeStyle, layoutCmdbNodes } from '@/lib/cmdb/layout';
import { formatIpSegment } from '@/lib/cmdb/schema';

function nodeLabel(item: CmdbItem) {
  const role = item.attributes?.role;
  const meta = role ? `${item.type} · ${role}` : item.type;
  const first = item.segments?.[0];
  const extra = (item.segments?.length ?? 0) > 1 ? ` +${(item.segments?.length ?? 1) - 1}` : '';
  const addr = first ? `${formatIpSegment(first)}${extra}` : item.attributes?.ip;
  return addr ? `${item.name}\n${meta}\n${addr}` : `${item.name}\n${meta}`;
}

export function CmdbGraph({ items }: { items: CmdbItem[] }) {
  const router = useRouter();

  const { nodes, edges } = useMemo(() => {
    const positions = layoutCmdbNodes(items);
    const ids = new Set(items.map((item) => item.id));

    const nextNodes: Node[] = items.map((item) => {
      const style = cmdbNodeStyle(item.type);
      return {
        id: item.id,
        position: positions.get(item.id) ?? { x: 0, y: 0 },
        data: { label: nodeLabel(item) },
        style: {
          background: style.background,
          border: `1px solid ${style.border}`,
          color: '#fafafa',
          fontSize: 11,
          borderRadius: 10,
          padding: 8,
          width: 200,
          minHeight: 64,
          whiteSpace: 'pre-line' as const,
        },
      };
    });

    const nextEdges: Edge[] = items.flatMap((item) =>
      (item.relations ?? [])
        .filter((relation) => ids.has(relation.targetId))
        .map((relation, index) => ({
          id: `${item.id}-${relation.targetId}-${index}`,
          source: item.id,
          target: relation.targetId,
          label: relation.type.replace('_', ' '),
          style: { stroke: '#3b82f6' },
          labelStyle: { fill: '#a1a1aa', fontSize: 10 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
        })),
    );

    return { nodes: nextNodes, edges: nextEdges };
  }, [items]);

  return (
    <div className="h-[calc(100vh-14rem)] min-h-[520px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => router.push(`/cmdb/${node.id}`)}
      >
        <Background color="#27272a" gap={18} />
        <Controls />
        <MiniMap
          pannable
          zoomable
          style={{ background: '#09090b' }}
          maskColor="rgba(9,9,11,0.7)"
          nodeColor="#3b82f6"
        />
      </ReactFlow>
    </div>
  );
}

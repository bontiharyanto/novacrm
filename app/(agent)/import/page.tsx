import { ImportWorkbench } from '@/components/import/import-workbench';

export default function ImportPage({ searchParams }: { searchParams: { kind?: string } }) {
  return <ImportWorkbench initialKind={searchParams.kind} />;
}

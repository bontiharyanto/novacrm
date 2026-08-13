import { RecordProducer } from '@/components/catalog/record-producer';

export default function PortalCatalogItemPage({ params }: { params: { id: string } }) {
  return <RecordProducer itemId={params.id} />;
}

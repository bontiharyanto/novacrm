import { CatalogItemEditor } from '@/components/catalog/catalog-item-editor';

export default function CatalogItemPage({ params }: { params: { id: string } }) {
  return <CatalogItemEditor itemId={params.id} />;
}

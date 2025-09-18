import { LoadingShipAnimation } from '@/components/LoadingShipAnimation';

export default function Loading() {
  // サーバーがページを準備している間、このコンポーネントが自動的に表示されます。
  return <LoadingShipAnimation isLoading={true} />;
}
import { Suspense } from "react";

import { HistoryPageView } from "@/features/infestation/history-page-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManagerHistoryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <HistoryPageView />
    </Suspense>
  );
}

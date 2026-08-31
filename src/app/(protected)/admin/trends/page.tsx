import { Suspense } from "react";

import { TrendsPageView } from "@/features/infestation/trends-page-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTrendsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <TrendsPageView />
    </Suspense>
  );
}

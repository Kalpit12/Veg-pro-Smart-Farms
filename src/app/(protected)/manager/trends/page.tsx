import { Suspense } from "react";

import { TrendsPageView } from "@/features/infestation/trends-page-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManagerTrendsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <TrendsPageView audience="manager" />
    </Suspense>
  );
}

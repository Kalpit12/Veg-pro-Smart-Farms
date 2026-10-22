import { Suspense } from "react";

import { LoginForm } from "@/features/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-24 h-64 w-full max-w-md rounded-2xl" />}>
      <LoginForm />
    </Suspense>
  );
}

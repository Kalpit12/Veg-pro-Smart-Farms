"use client";

import { WorkerOfflineBootstrap } from "@/features/field/worker-offline-bootstrap";

export function WorkerLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WorkerOfflineBootstrap />
      {children}
    </>
  );
}

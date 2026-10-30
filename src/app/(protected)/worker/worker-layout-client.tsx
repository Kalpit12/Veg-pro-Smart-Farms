"use client";

import { PwaRegister } from "@/components/pwa-register";
import { WorkerOfflineBootstrap } from "@/features/field/worker-offline-bootstrap";

export function WorkerLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaRegister />
      <WorkerOfflineBootstrap />
      {children}
    </>
  );
}

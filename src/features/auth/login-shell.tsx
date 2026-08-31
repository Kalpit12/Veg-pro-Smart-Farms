"use client";

import Image from "next/image";
import { Loader2, Sprout } from "lucide-react";

export function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Image
        src="/login-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <LoginOverlay />
      <LoginContent>{children}</LoginContent>
    </div>
  );
}

function LoginOverlay() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/88 via-[#1b3b25]/82 to-[#0f2216]/94" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_42%)]" />
    </>
  );
}

function LoginContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-3 text-center text-primary-foreground">
          <LoginLogo />
          <LoginTitles />
        </header>
        {children}
      </div>
    </div>
  );
}

function LoginLogo() {
  return (
    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
      <Sprout className="size-7" />
    </div>
  );
}

function LoginTitles() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-[0.22em] uppercase text-white/75">
        VegPro Smart Farm
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        Grow smarter. Operate better.
      </h1>
      <p className="text-sm leading-6 text-white/80">
        Field operations, greenhouse tracking, and workforce intelligence for vegetable farms.
      </p>
    </div>
  );
}

export function LoginLoadingCard() {
  return (
    <LoginShell>
      <div className="glass-card flex justify-center rounded-2xl p-10">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    </LoginShell>
  );
}

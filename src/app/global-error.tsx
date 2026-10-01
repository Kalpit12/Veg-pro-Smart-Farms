"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">VegPro could not load</h1>
        <p>Retry on this phone. Queued field reports stay stored locally.</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            height: 44,
            padding: "0 16px",
            borderRadius: 12,
            background: "#2f6f4e",
            color: "white",
            border: 0,
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}

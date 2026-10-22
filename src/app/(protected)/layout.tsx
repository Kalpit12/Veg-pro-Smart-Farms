import { redirectIfInactiveUser } from "@/lib/auth/ensure-active-user";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfInactiveUser();
  return <>{children}</>;
}

import { ProductionDataBootstrap } from "@/components/production-data-bootstrap";
import { redirectIfInactiveUser } from "@/lib/auth/ensure-active-user";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfInactiveUser();
  return (
    <>
      <ProductionDataBootstrap />
      {children}
    </>
  );
}

import { getSessionFromCookies } from "@/lib/auth/session";
import type { Role } from "@/types/db";

export type ServerSession = {
  id: string;
  email: string;
  role: Role;
};

export async function requireServerSession(): Promise<ServerSession> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new Error("Not signed in.");
  }
  return { id: session.sub, email: session.email, role: session.role };
}

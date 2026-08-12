import { useAuth } from "../contexts/AuthContext.tsx";
import { isAdminEmail } from "../config/admin.ts";

/** Admin if DB role is ADMIN/SUPER_ADMIN or Google email is on the allowlist. */
export function useIsAdmin(): boolean {
  const { user, role } = useAuth();
  return role === "ADMIN" || role === "SUPER_ADMIN" || isAdminEmail(user?.email);
}

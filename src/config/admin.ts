/** Admin Google accounts — must match ADMIN_EMAILS in .env on the server */
export const ADMIN_EMAILS = [
  "antoniobellanova1812@gmail.com",
  "belllanovaantonio1@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

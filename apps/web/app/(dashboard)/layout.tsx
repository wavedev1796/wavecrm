import type { UserRole } from "@wave/shared";
import { logout } from "@/features/auth/actions";
import { AppShell } from "@/components/layout/app-shell";
import { authenticatedApi } from "@/lib/authenticated-api";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const response = await authenticatedApi("/auth/me");
  const user = response.ok ? ((await response.json()) as CurrentUser) : null;
  return (
    <AppShell user={user} logoutAction={logout}>
      {children}
    </AppShell>
  );
}

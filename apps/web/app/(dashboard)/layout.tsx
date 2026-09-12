import { AppShell } from "@/components/app-shell";
import { authenticatedApi } from "@/lib/authenticated-api";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VENDEDOR";
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const response = await authenticatedApi("/auth/me");
  const user = response.ok ? ((await response.json()) as CurrentUser) : null;
  return <AppShell user={user}>{children}</AppShell>;
}

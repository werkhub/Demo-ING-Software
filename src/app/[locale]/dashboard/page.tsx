import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return <DashboardView />;
}

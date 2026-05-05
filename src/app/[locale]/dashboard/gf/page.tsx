import { GfDashboardView } from "@/components/dashboard/gf/GfDashboardView";

export const metadata = {
  title: "Geschäftsführer-Dashboard",
};

export const dynamic = "force-dynamic";

export default async function GfDashboardPage() {
  return <GfDashboardView />;
}

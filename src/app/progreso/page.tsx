import { MasteryDashboard } from "@/components/mastery-dashboard";

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const params = await searchParams;
  return <MasteryDashboard initialModuleId={params.module} />;
}

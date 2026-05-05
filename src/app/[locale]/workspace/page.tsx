import { Container } from "@/components/container";
import { getCurrentWorkspace } from "@/lib/session";
import { parseDisciplines } from "@/lib/workspace/disciplines";
import { RoleForm } from "./role-form";
import { DisciplinesForm } from "./disciplines-form";
import { UsersManagement } from "./users-management";
import { BusinessForm } from "./business-form";

export const dynamic = "force-dynamic";

export default async function Workspace() {
  const workspace = await getCurrentWorkspace();

  return (
    <Container>
      <UsersManagement />

      <section className="border-t border-[color:var(--color-border)] pt-12 pb-12">
        <RoleForm current={workspace.workspaceRole} />
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-12 pb-12">
        <div className="max-w-3xl">
          <DisciplinesForm
            current={{
              disciplines: parseDisciplines(workspace.disciplinesJson),
              subprofile: workspace.disciplineSubprofile,
              clientFocus: workspace.clientFocus,
              companySize: workspace.companySize,
            }}
          />
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-12 pb-16">
        <div className="max-w-2xl">
          <BusinessForm
            defaults={{
              iban: workspace.iban,
              bic: workspace.bic,
              bankName: workspace.bankName,
              taxId: workspace.taxId,
              vatId: workspace.vatId,
              address: workspace.address,
              email: workspace.email,
              phone: workspace.phone,
            }}
          />
        </div>
      </section>
    </Container>
  );
}

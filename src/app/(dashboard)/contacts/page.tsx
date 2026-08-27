import { auth } from "@/auth";
import { getResourcesData } from "@/lib/resources-data";
import { ResourcesPageClient } from "@/components/resources-page-client";
import { Bi } from "@/components/bi";

export default async function ContactsPage() {
  const session = await auth();
  const user = session!.user;
  const { isAdmin, rows, unitOptions, employeeOptions } = await getResourcesData(user.id, user.role);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold">
        <Bi zh="联系方式" en="Contacts" />
      </h1>
      <p className="text-sm text-neutral-500">
        <Bi zh="遇到问题该找谁，联系方式都在这里。" en="Who to contact when something goes wrong." />
      </p>

      <ResourcesPageClient
        rows={rows}
        units={unitOptions}
        employees={employeeOptions}
        isAdmin={isAdmin}
        types={["contact"]}
        addLabel={{ zh: "添加联系方式", en: "Add contact" }}
      />
    </div>
  );
}

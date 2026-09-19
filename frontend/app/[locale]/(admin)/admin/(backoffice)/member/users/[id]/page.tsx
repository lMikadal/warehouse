import { routing } from "@/i18n/routing";

import { MemberUserForm } from "../../_shared/member-user-form";

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default async function MemberUserEditPage({ params }: PageProps) {
  const { id } = await params;
  const editId = Number(id);
  return <MemberUserForm editId={editId} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

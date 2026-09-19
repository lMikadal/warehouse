import { CrudTabbedFormPageSkeleton } from "@/components/molecules/crud-tabbed-form-page-skeleton";

export default function MemberUserEditLoading() {
  return (
    <CrudTabbedFormPageSkeleton
      showPageHeader={false}
      leftCardCount={4}
      showEditProfileHeader
      rightSidebarCards={3}
      showFixedFooter
    />
  );
}

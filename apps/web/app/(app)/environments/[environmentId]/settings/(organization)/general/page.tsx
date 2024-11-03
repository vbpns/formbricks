import { OrganizationSettingsNavbar } from "@/app/(app)/environments/[environmentId]/settings/(organization)/components/OrganizationSettingsNavbar";
import { AIToggle } from "@/app/(app)/environments/[environmentId]/settings/(organization)/general/components/AIToggle";
import { OrganizationActions } from "@/app/(app)/environments/[environmentId]/settings/(organization)/general/components/EditMemberships/OrganizationActions";
import { getIsOrganizationAIReady } from "@/app/lib/utils";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getIsMultiOrgEnabled, getRoleManagementPermission } from "@formbricks/ee/lib/service";
import { authOptions } from "@formbricks/lib/authOptions";
import { INVITE_DISABLED, IS_FORMBRICKS_CLOUD } from "@formbricks/lib/constants";
import {
  getMembershipByUserIdOrganizationId,
  getMembershipsByUserId,
} from "@formbricks/lib/membership/service";
import { getAccessFlags } from "@formbricks/lib/membership/utils";
import { getOrganizationByEnvironmentId } from "@formbricks/lib/organization/service";
import { PageContentWrapper } from "@formbricks/ui/components/PageContentWrapper";
import { PageHeader } from "@formbricks/ui/components/PageHeader";
import { SettingsId } from "@formbricks/ui/components/SettingsId";
import { SettingsCard } from "../../components/SettingsCard";
import { DeleteOrganization } from "./components/DeleteOrganization";
import { EditMemberships } from "./components/EditMemberships";
import { EditOrganizationNameForm } from "./components/EditOrganizationNameForm";

const MembersLoading = () => (
  <div className="px-2">
    {Array.from(Array(2)).map((_, index) => (
      <div key={index} className="mt-4">
        <div className={`h-8 w-80 animate-pulse rounded-full bg-slate-200`} />
      </div>
    ))}
  </div>
);

const Page = async ({ params }: { params: { environmentId: string } }) => {
  const t = await getTranslations();
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error(t("common.session_not_found"));
  }
  const organization = await getOrganizationByEnvironmentId(params.environmentId);

  if (!organization) {
    throw new Error(t("common.organization_not_found"));
  }
  const canDoRoleManagement = await getRoleManagementPermission(organization);

  const currentUserMembership = await getMembershipByUserIdOrganizationId(session?.user.id, organization.id);
  const { isOwner, isAdmin } = getAccessFlags(currentUserMembership?.role);
  const userMemberships = await getMembershipsByUserId(session.user.id);
  const isMultiOrgEnabled = await getIsMultiOrgEnabled();

  const isDeleteDisabled = !isOwner || !isMultiOrgEnabled;
  const currentUserRole = currentUserMembership?.role;

  const isLeaveOrganizationDisabled = userMemberships.length <= 1;
  const isUserAdminOrOwner = isAdmin || isOwner;

  const isOrganizationAIReady = await getIsOrganizationAIReady(organization.billing.plan);

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("environments.settings.general.organization_settings")}>
        <OrganizationSettingsNavbar
          environmentId={params.environmentId}
          isFormbricksCloud={IS_FORMBRICKS_CLOUD}
          membershipRole={currentUserMembership?.role}
          activeId="general"
        />
      </PageHeader>
      <SettingsCard
        title={t("environments.settings.general.manage_members")}
        description={t("environments.settings.general.manage_members_description")}>
        {currentUserRole && (
          <OrganizationActions
            organization={organization}
            isAdminOrOwner={isUserAdminOrOwner}
            role={currentUserRole}
            isLeaveOrganizationDisabled={isLeaveOrganizationDisabled}
            isInviteDisabled={INVITE_DISABLED}
            canDoRoleManagement={canDoRoleManagement}
            isFormbricksCloud={IS_FORMBRICKS_CLOUD}
            environmentId={params.environmentId}
            isMultiOrgEnabled={isMultiOrgEnabled}
          />
        )}

        {currentUserMembership && (
          <Suspense fallback={<MembersLoading />}>
            <EditMemberships
              organization={organization}
              currentUserId={session.user?.id}
              allMemberships={userMemberships}
              currentUserMembership={currentUserMembership}
            />
          </Suspense>
        )}
      </SettingsCard>
      <SettingsCard
        title={t("environments.settings.general.organization_name")}
        description={t("environments.settings.general.organization_name_description")}>
        <EditOrganizationNameForm
          organization={organization}
          environmentId={params.environmentId}
          membershipRole={currentUserMembership?.role}
        />
      </SettingsCard>
      {isOrganizationAIReady && (
        <SettingsCard
          title={t("environments.settings.general.formbricks_ai")}
          description={t("environments.settings.general.formbricks_ai_description")}>
          <AIToggle
            environmentId={params.environmentId}
            organization={organization}
            isAdminOrOwner={isUserAdminOrOwner}
          />
        </SettingsCard>
      )}
      {isMultiOrgEnabled && (
        <SettingsCard
          title={t("environments.settings.general.delete_organization")}
          description={t("environments.settings.general.delete_organization_description")}>
          <DeleteOrganization
            organization={organization}
            isDeleteDisabled={isDeleteDisabled}
            isUserOwner={currentUserRole === "owner"}
            isMultiOrgEnabled={isMultiOrgEnabled}
          />
        </SettingsCard>
      )}

      <SettingsId title={t("common.organization")} id={organization.id}></SettingsId>
    </PageContentWrapper>
  );
};

export default Page;
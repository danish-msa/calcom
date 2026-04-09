import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { SubteamsSettingsView } from "@calcom/web/modules/settings/subteams/components/SubteamsSettingsView";
import {
  getSessionUserId,
  loadSubteamsPageData,
} from "@calcom/web/modules/settings/subteams/lib/subteamServer";
import { _generateMetadata, getTranslate } from "app/_utils";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

const Page = async ({ params }: { params: Promise<{ id: string }> }): Promise<JSX.Element> => {
  const t = await getTranslate();
  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (!Number.isFinite(teamId)) {
    redirect("/settings/my-teams");
  }

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/auth/login?callbackUrl=/settings/my-teams");
  }

  const data = await loadSubteamsPageData(teamId, userId);
  if (!data) {
    throw new Error("Team not found");
  }

  return (
    <SettingsHeader title={t("subteams_title")} description={t("subteams_description")} borderInShellHeader>
      <SubteamsSettingsView
        parentTeamId={teamId}
        settingsBasePath="/settings/my-teams"
        subteams={data.subteams}
        canManage={data.canManage}
      />
    </SettingsHeader>
  );
};

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("subteams_title"),
    (t) => t("subteams_description"),
    undefined,
    undefined,
    `/settings/my-teams/${(await params).id}/subteams`
  );

export default Page;

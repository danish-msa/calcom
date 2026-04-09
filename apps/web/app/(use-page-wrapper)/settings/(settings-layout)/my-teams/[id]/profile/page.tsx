import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import LegacyPage from "@calcom/web/modules/ee/teams/views/team-profile-view";
import { _generateMetadata, getTranslate } from "app/_utils";
import type { Metadata } from "next";

const Page = async (): Promise<JSX.Element> => {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("profile")}
      description={t("profile_team_description")}
      borderInShellHeader={true}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_team_description"),
    undefined,
    undefined,
    `/settings/my-teams/${(await params).id}/profile`
  );

export default Page;

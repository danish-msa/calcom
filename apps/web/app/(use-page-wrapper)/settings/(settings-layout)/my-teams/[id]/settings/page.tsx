import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import TeamSettingsView from "@calcom/web/modules/ee/teams/views/team-settings-view";
import { _generateMetadata, getTranslate } from "app/_utils";
import type { Metadata } from "next";

const Page = async (): Promise<React.JSX.Element> => {
  const t = await getTranslate();
  return (
    <SettingsHeader
      title={t("settings")}
      description={t("team_settings_description")}
      borderInShellHeader={false}>
      <TeamSettingsView />
    </SettingsHeader>
  );
};

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("settings"),
    (t) => t("team_settings_description"),
    undefined,
    undefined,
    `/settings/my-teams/${(await params).id}/settings`
  );

export default Page;

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import type { Metadata } from "next";
import LegacyPage from "~/ee/teams/views/team-appearance-view";

const Page = async (): Promise<React.JSX.Element> => {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("booking_appearance")}
      description={t("appearance_team_description")}
      borderInShellHeader={false}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("booking_appearance"),
    (t) => t("appearance_team_description"),
    undefined,
    undefined,
    `/settings/my-teams/${(await params).id}/appearance`
  );

export default Page;

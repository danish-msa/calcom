import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui/components/button";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ServerTeamsListing } from "../../../(main-nav)/teams/server-page";
import { MyTeamsCTA } from "./CTA";

const Page = async ({ searchParams: _searchParams }: ServerPageProps): Promise<React.JSX.Element> => {
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const searchParams = await _searchParams;

  if (!session) {
    redirect("/auth/login?callbackUrl=/settings/my-teams");
  }

  const { Main, showHeader } = await ServerTeamsListing({ searchParams, session });

  let title: string | undefined;
  let description: string | undefined;
  let CTA: React.ReactNode = null;
  if (showHeader) {
    title = t("teams");
    description = t("create_manage_teams_collaborative");
    CTA = (
      <div className="flex items-center gap-2">
        <Button asChild color="secondary">
          <Link href="/event-types">{t("schedule_meeting")}</Link>
        </Button>
        <MyTeamsCTA />
      </div>
    );
  }

  return (
    <SettingsHeader title={title} description={description} CTA={CTA} borderInShellHeader>
      {Main}
    </SettingsHeader>
  );
};

export const generateMetadata = async (): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative"),
    undefined,
    undefined,
    "/settings/my-teams"
  );

export default Page;

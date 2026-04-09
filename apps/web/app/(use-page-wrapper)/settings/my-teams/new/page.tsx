import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreateNewTeamView, LayoutWrapper } from "~/settings/teams/new/create-new-team-view";

const ServerPage = async (): Promise<React.JSX.Element> => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userEmail = session.user.email || "";

  return (
    <LayoutWrapper>
      <CreateNewTeamView userEmail={userEmail} />
    </LayoutWrapper>
  );
};

export const generateMetadata = async (): Promise<Awaited<ReturnType<typeof _generateMetadata>>> =>
  await _generateMetadata(
    (t) => t("create_new_team"),
    (t) => t("create_new_team_description"),
    undefined,
    undefined,
    "/settings/my-teams/new"
  );

export default ServerPage;

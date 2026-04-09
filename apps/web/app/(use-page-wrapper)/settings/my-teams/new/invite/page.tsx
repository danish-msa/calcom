import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeamInviteView } from "~/settings/teams/new/invite/team-invite-view";

const ServerPage = async (): Promise<JSX.Element> => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userEmail = session.user.email || "";

  return <TeamInviteView userEmail={userEmail} />;
};

export const generateMetadata = async (): Promise<Metadata> => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("invite")}`,
    () => "",
    true,
    undefined,
    "/settings/my-teams/new/invite"
  );
};

export default ServerPage;

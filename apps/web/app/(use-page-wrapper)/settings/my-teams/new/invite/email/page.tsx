import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeamInviteEmailView } from "~/settings/teams/new/invite/email/team-invite-email-view";

const ServerPage = async (): Promise<JSX.Element> => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userEmail = session.user.email || "";

  return <TeamInviteEmailView userEmail={userEmail} />;
};

export const generateMetadata = async (): Promise<Metadata> => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("invite")}`,
    () => "",
    true,
    undefined,
    "/settings/my-teams/new/invite/email"
  );
};

export default ServerPage;

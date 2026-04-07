import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@calcom/ui/components/button";
import { Badge } from "@calcom/ui/components/badge";

import { changeTeamMemberRole, createOrRotateTeamInviteLink, removeTeamMember } from "./actions";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("team_members"),
    (t) => t("members_team_description"),
    undefined,
    undefined,
    `/settings/my-teams/${(await params).id}/members`
  );

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const t = await getTranslate();
  const { id } = await params;
  const teamId = parseInt(id, 10);

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) return redirect("/auth/login");

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
    select: { role: true, accepted: true },
  });
  if (!membership?.accepted) return redirect("/settings/teams");

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true },
  });
  if (!team) throw new Error("Team not found");

  const isAdminOrOwner = membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER;

  const members = await prisma.membership.findMany({
    where: { teamId, accepted: true },
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true, username: true } },
    },
    orderBy: [{ role: "desc" }, { userId: "asc" }],
  });

  const inviteToken = await prisma.verificationToken.findFirst({
    where: { teamId, identifier: `invite-link-for-teamId-${teamId}`, expires: { gt: new Date() } },
    select: { token: true, expires: true },
  });

  const inviteLink = inviteToken
    ? `${process.env.NEXT_PUBLIC_WEBAPP_URL ?? ""}/teams?token=${inviteToken.token}&autoAccept=true`
    : null;

  return (
    <SettingsHeader
      title={t("team_members")}
      description={`${t("members_team_description")} (${team.name})`}
    >
      <div className="space-y-6">
        <div className="border-subtle rounded-xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-emphasis text-sm font-medium">{t("invite_link")}</div>
              {inviteLink ? (
                <div className="text-default break-all text-sm">{inviteLink}</div>
              ) : (
                <div className="text-subtle text-sm">{t("add")}: {t("invite_link")}</div>
              )}
              {inviteToken?.expires ? (
                <div className="text-subtle mt-1 text-xs">
                  Expires: {inviteToken.expires.toISOString()}
                </div>
              ) : null}
            </div>
            {isAdminOrOwner ? (
              <form action={createOrRotateTeamInviteLink}>
                <input type="hidden" name="teamId" value={teamId} />
                <Button type="submit" color="secondary">
                  {inviteLink ? t("update") : t("add")}
                </Button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="border-subtle rounded-xl border">
          <div className="border-subtle flex items-center justify-between border-b px-4 py-3">
            <div className="text-emphasis text-sm font-medium">{t("team_members")}</div>
            <Badge variant="gray">{members.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="text-default w-full text-sm">
              <thead className="text-subtle">
                <tr className="border-subtle border-b">
                  <th className="px-4 py-3 text-left">{t("name")}</th>
                  <th className="px-4 py-3 text-left">{t("email")}</th>
                  <th className="px-4 py-3 text-left">{t("role")}</th>
                  <th className="px-4 py-3 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const displayName = m.user.name || m.user.username || m.user.email;
                  const isSelf = m.user.id === session.user.id;
                  return (
                    <tr key={m.user.id} className="border-subtle border-b last:border-b-0">
                      <td className="px-4 py-3">{displayName}</td>
                      <td className="px-4 py-3">{m.user.email}</td>
                      <td className="px-4 py-3">
                        {isAdminOrOwner ? (
                          <form action={changeTeamMemberRole} className="flex items-center gap-2">
                            <input type="hidden" name="teamId" value={teamId} />
                            <input type="hidden" name="memberUserId" value={m.user.id} />
                            <select
                              name="role"
                              defaultValue={m.role}
                              disabled={isSelf}
                              className="border-subtle bg-default rounded-md border px-2 py-1 text-sm"
                            >
                              <option value={MembershipRole.MEMBER}>MEMBER</option>
                              <option value={MembershipRole.ADMIN}>ADMIN</option>
                              <option value={MembershipRole.OWNER}>OWNER</option>
                            </select>
                            <Button type="submit" color="minimal" disabled={isSelf}>
                              {t("update")}
                            </Button>
                          </form>
                        ) : (
                          <Badge variant="gray">{m.role}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdminOrOwner && !isSelf ? (
                          <form action={removeTeamMember}>
                            <input type="hidden" name="teamId" value={teamId} />
                            <input type="hidden" name="memberUserId" value={m.user.id} />
                            <Button type="submit" color="destructive" size="sm">
                              {t("remove")}
                            </Button>
                          </form>
                        ) : (
                          <span className="text-subtle text-xs">{isSelf ? "You" : ""}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SettingsHeader>
  );
};

export default Page;


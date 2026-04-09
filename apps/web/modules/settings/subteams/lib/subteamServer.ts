import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import type { SubteamListItem } from "./types";

export async function getSessionUserId(): Promise<number | null> {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const raw = session?.user?.id;
  if (raw === undefined || raw === null) return null;
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export async function loadSubteamsPageData(teamId: number, userId: number) {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      members: {
        some: {
          userId,
          accepted: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      isOrganization: true,
      members: {
        where: { userId },
        select: {
          role: true,
          accepted: true,
        },
      },
      children: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!team) return null;

  const membership = team.members[0];
  const canManage =
    membership?.accepted &&
    (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER);

  const subteams: SubteamListItem[] = team.children.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    createdAt: c.createdAt,
  }));

  return {
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      parentId: team.parentId,
      isOrganization: team.isOrganization,
    },
    membershipRole: membership?.role ?? null,
    canManage,
    subteams,
  };
}

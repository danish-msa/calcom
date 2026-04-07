"use server";

import { randomBytes } from "node:crypto";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";

function assertAuthedUserId(userId: number | undefined | null): asserts userId is number {
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }
}

async function assertTeamAdminOrOwner(teamId: number) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  assertAuthedUserId(session?.user?.id);

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
    select: { role: true, accepted: true },
  });

  if (!membership?.accepted) throw new Error("UNAUTHORIZED");
  if (membership.role !== MembershipRole.ADMIN && membership.role !== MembershipRole.OWNER) {
    throw new Error("FORBIDDEN");
  }

  return { userId: session.user.id };
}

export async function createOrRotateTeamInviteLink(formData: FormData) {
  const teamId = Number(formData.get("teamId"));
  if (!Number.isFinite(teamId)) throw new Error("BAD_REQUEST");

  await assertTeamAdminOrOwner(teamId);

  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
  const identifier = `invite-link-for-teamId-${teamId}`;

  const existing = await prisma.verificationToken.findFirst({
    where: { teamId, identifier },
    select: { id: true },
  });

  if (existing) {
    await prisma.verificationToken.update({
      where: { id: existing.id },
      data: { token, expires, updatedAt: new Date() },
    });
  } else {
    await prisma.verificationToken.create({
      data: { token, expires, identifier, teamId },
    });
  }

  revalidatePath(`/settings/my-teams/${teamId}/members`);
}

export async function removeTeamMember(formData: FormData) {
  const teamId = Number(formData.get("teamId"));
  const memberUserId = Number(formData.get("memberUserId"));
  if (!Number.isFinite(teamId) || !Number.isFinite(memberUserId)) throw new Error("BAD_REQUEST");

  const { userId } = await assertTeamAdminOrOwner(teamId);
  if (userId === memberUserId) throw new Error("BAD_REQUEST");

  await prisma.membership.delete({
    where: { userId_teamId: { userId: memberUserId, teamId } },
  });

  revalidatePath(`/settings/my-teams/${teamId}/members`);
}

export async function changeTeamMemberRole(formData: FormData) {
  const teamId = Number(formData.get("teamId"));
  const memberUserId = Number(formData.get("memberUserId"));
  const roleRaw = String(formData.get("role") || "");
  if (!Number.isFinite(teamId) || !Number.isFinite(memberUserId)) throw new Error("BAD_REQUEST");

  await assertTeamAdminOrOwner(teamId);

  const role = roleRaw.toUpperCase() as MembershipRole;
  if (![MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER].includes(role)) {
    throw new Error("BAD_REQUEST");
  }

  await prisma.membership.update({
    where: { userId_teamId: { userId: memberUserId, teamId } },
    data: { role },
  });

  revalidatePath(`/settings/my-teams/${teamId}/members`);
}


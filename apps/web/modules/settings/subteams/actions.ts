"use server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

function numericSessionUserId(session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>): number {
  const raw = session.user.id;
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error("UNAUTHORIZED");
  }
  return n;
}

async function assertTeamAdminOrOwner(teamId: number): Promise<{ userId: number }> {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const userId = numericSessionUserId(session);

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true, accepted: true },
  });

  if (!membership?.accepted) throw new Error("UNAUTHORIZED");
  if (membership.role !== MembershipRole.ADMIN && membership.role !== MembershipRole.OWNER) {
    throw new Error("FORBIDDEN");
  }

  return { userId };
}

export async function createSubteam(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parentTeamId = Number(formData.get("parentTeamId"));
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();

  if (!Number.isFinite(parentTeamId) || parentTeamId < 1) {
    return { ok: false, error: "BAD_REQUEST" };
  }
  if (!name) {
    return { ok: false, error: "name_required" };
  }

  let userId: number;
  try {
    ({ userId } = await assertTeamAdminOrOwner(parentTeamId));
  } catch (e) {
    const code = e instanceof Error ? e.message : "FORBIDDEN";
    return { ok: false, error: code };
  }

  const slug = slugify(slugRaw || name);
  if (!slug) {
    return { ok: false, error: "invalid_slug" };
  }

  const parent = await prisma.team.findUnique({
    where: { id: parentTeamId },
    select: { id: true },
  });
  if (!parent) {
    return { ok: false, error: "NOT_FOUND" };
  }

  const duplicate = await prisma.team.findFirst({
    where: { parentId: parentTeamId, slug },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, error: "team_url_taken" };
  }

  await prisma.team.create({
    data: {
      name,
      slug,
      parentId: parentTeamId,
      isOrganization: false,
      members: {
        create: {
          userId,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
    },
    select: { id: true },
  });

  revalidatePath(`/settings/my-teams/${parentTeamId}/subteams`);
  revalidatePath(`/settings/teams/${parentTeamId}/subteams`);
  revalidatePath("/settings/my-teams");
  revalidatePath("/settings/teams");

  return { ok: true };
}

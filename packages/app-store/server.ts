import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { enrichUserWithDelegationConferencingCredentialsWithoutOrgId } from "@calcom/app-store/delegationCredential";
import { defaultVideoAppCategories } from "@calcom/app-store/utils";
import { buildNonDelegationCredentials } from "@calcom/lib/delegationCredential";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { AppCategories } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { TFunction } from "i18next";
import getEnabledAppsFromCredentials from "./_utils/getEnabledAppsFromCredentials";
import { defaultLocations } from "./locations";

type LocationOption = {
  label: string;
  value: string;
  disabled?: boolean;
  icon?: string;
  slug?: string;
  credentialId?: number;
  supportsCustomLabel?: boolean;
  teamName?: string | null;
};

function addOption(apps: Record<string, LocationOption[]>, category: string, option: LocationOption): void {
  const alreadyExists = apps[category]?.some((o) => o.value === option.value) ?? false;
  if (alreadyExists) return;

  if (apps[category]) {
    apps[category] = [...apps[category], option];
  } else {
    apps[category] = [option];
  }
}

function getGroupByCategory(app: { categories: string[]; category?: string | null }): string {
  if (app.categories.length >= 2) {
    const secondaryCategory = app.categories.find(
      (c) => !defaultVideoAppCategories.includes(c as (typeof defaultVideoAppCategories)[number])
    );
    return secondaryCategory || AppCategories.conferencing;
  }

  if (app.categories.length > 0) {
    return app.categories[0] || AppCategories.conferencing;
  }

  return app.category || AppCategories.conferencing;
}

function appendGlobalConferencingOptions(apps: Record<string, LocationOption[]>): void {
  for (const [, meta] of Object.entries(appStoreMetadata)) {
    if (!meta.isGlobal) continue;
    if (!meta.appData?.location) continue;
    const isConferencing = meta.categories?.some((c) =>
      defaultVideoAppCategories.includes(c as (typeof defaultVideoAppCategories)[number])
    );
    if (!isConferencing) continue;

    addOption(apps, AppCategories.conferencing, {
      label: meta.appData.location.label,
      value: meta.appData.location.type,
      icon: meta.logo,
      slug: meta.slug,
    });
  }
}

export async function getLocationGroupedOptions(
  userOrTeamId: { userId: number } | { teamId: number },
  t: TFunction
): Promise<{ label: string; options: LocationOption[] }[]> {
  const apps: Record<string, LocationOption[]> = {};

  // don't default to {}, when you do TS no longer determines the right types.
  let idToSearchObject: Prisma.CredentialWhereInput;
  let user = null;
  if ("teamId" in userOrTeamId) {
    const teamId = userOrTeamId.teamId;
    // See if the team event belongs to an org
    const org = await prisma.team.findFirst({
      where: {
        children: {
          some: {
            id: teamId,
          },
        },
      },
    });

    if (org) {
      idToSearchObject = {
        teamId: {
          in: [teamId, org.id],
        },
      };
    } else {
      idToSearchObject = { teamId };
    }
  } else {
    idToSearchObject = { userId: userOrTeamId.userId };
    user = await prisma.user.findUnique({
      where: {
        id: userOrTeamId.userId,
      },
    });
  }

  const nonDelegationCredentials = await prisma.credential.findMany({
    where: {
      ...idToSearchObject,
      app: {
        categories: {
          hasSome: defaultVideoAppCategories,
        },
      },
    },
    select: {
      ...credentialForCalendarServiceSelect,
      team: {
        select: {
          name: true,
        },
      },
    },
  });

  let credentials: unknown;
  if (user) {
    // We only add delegationCredentials if the request for location options is for a user because DelegationCredential Credential is applicable to Users only.
    const { credentials: allCredentials } = await enrichUserWithDelegationConferencingCredentialsWithoutOrgId(
      {
        user: {
          ...user,
          credentials: nonDelegationCredentials,
        },
      }
    );
    credentials = allCredentials;
  } else {
    // TODO: We can avoid calling buildNonDelegationCredentials here by moving the above prisma query to the repository and doing it there
    credentials = buildNonDelegationCredentials(nonDelegationCredentials);
  }

  const integrations = await getEnabledAppsFromCredentials(credentials as never, {
    filterOnCredentials: true,
  });

  integrations.forEach((app) => {
    // All apps that are labeled as a locationOption are video apps.
    if (app.locationOption) {
      // All apps that are labeled as a locationOption are video apps. Extract the secondary category if available
      const groupByCategory = getGroupByCategory(app);

      for (const { teamName } of app.credentials.map((credential) => ({
        teamName: credential.team?.name,
      }))) {
        let labelSuffix = "";
        if (teamName) {
          labelSuffix = ` (${teamName})`;
        }

        const credentialMeta: { credentialId?: number; teamName?: string | null } = {};
        if (app.credential) {
          credentialMeta.credentialId = app.credential.id;
          credentialMeta.teamName = app.credential.team?.name ?? null;
        }
        addOption(apps, groupByCategory, {
          ...app.locationOption,
          label: `${app.locationOption.label}${labelSuffix}`,
          icon: app.logo,
          slug: app.slug,
          ...credentialMeta,
        });
      }
    }
  });

  appendGlobalConferencingOptions(apps);

  defaultLocations.forEach((l) => {
    const category = l.category;
    if (apps[category]) {
      apps[category] = [
        ...apps[category],
        {
          label: l.label,
          value: l.type,
          icon: l.iconUrl,
          supportsCustomLabel: l.supportsCustomLabel,
        },
      ];
    } else {
      apps[category] = [
        {
          label: l.label,
          value: l.type,
          icon: l.iconUrl,
          supportsCustomLabel: l.supportsCustomLabel,
        },
      ];
    }
  });
  const locations = [];

  // Translating labels and pushing into array
  for (const category in apps) {
    const tmp = {
      label: t(category),
      options: apps[category].map((l) => ({
        ...l,
        label: t(l.label),
      })),
    };

    locations.push(tmp);
  }

  return locations;
}

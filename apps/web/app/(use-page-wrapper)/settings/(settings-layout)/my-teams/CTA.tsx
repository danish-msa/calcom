"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import posthog from "posthog-js";

export const MyTeamsCTA = (): JSX.Element => {
  const { t } = useLocale();
  return (
    <Button
      data-testid="new-team-btn"
      variant="fab"
      StartIcon="plus"
      size="sm"
      type="button"
      onClick={() => {
        posthog.capture("add_team_button_clicked");
      }}
      href={`${WEBAPP_URL}/settings/my-teams/new?returnTo=${WEBAPP_URL}/settings/my-teams`}>
      {t("new")}
    </Button>
  );
};

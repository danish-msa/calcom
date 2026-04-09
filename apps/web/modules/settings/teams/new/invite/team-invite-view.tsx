"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { useFlags } from "@calcom/web/modules/feature-flags/hooks/useFlags";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import React, { useEffect } from "react";
import { InviteOptions } from "~/onboarding/components/InviteOptions";
import { OnboardingCard } from "~/onboarding/components/OnboardingCard";
import { OnboardingLayout } from "~/onboarding/components/OnboardingLayout";
import { OnboardingInviteBrowserView } from "~/onboarding/components/onboarding-invite-browser-view";
import { useCreateTeam } from "~/onboarding/hooks/useCreateTeam";
import { useOnboardingStore } from "~/onboarding/store/onboarding-store";
import { CSVUploadModal } from "./csv-upload-modal";

type TeamInviteViewProps = {
  userEmail: string;
};

export const TeamInviteView = ({ userEmail }: TeamInviteViewProps): JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const flags = useFlags();

  const isMyTeamsFlow = pathname?.startsWith("/settings/my-teams/new") ?? false;
  let redirectBasePath = "/settings/teams/new";
  let afterFlowPath = "/teams";
  if (isMyTeamsFlow) {
    redirectBasePath = "/settings/my-teams/new";
    afterFlowPath = "/settings/my-teams";
  }

  const store = useOnboardingStore();
  const { setTeamInvites, teamDetails, setTeamId, teamId, resetOnboardingPreservingPlan } = store;
  const { isSubmitting } = useCreateTeam({
    redirectBasePath,
    isOnboarding: false,
  });
  const [isCSVModalOpen, setIsCSVModalOpen] = React.useState(false);

  // Read teamId from query params and store it (from payment callback)
  useEffect(() => {
    const teamIdParam = searchParams?.get("teamId");
    if (teamIdParam) {
      const parsedTeamId = parseInt(teamIdParam, 10);
      if (!Number.isNaN(parsedTeamId)) {
        setTeamId(parsedTeamId);
      }
    }
  }, [searchParams, setTeamId]);

  const googleWorkspaceEnabled = flags["google-workspace-directory"];

  const handleGoogleWorkspaceConnect = (): void => {
    // TODO: Implement Google Workspace connection
    console.log("Connect Google Workspace");
  };

  const handleInviteViaEmail = (): void => {
    router.push(`${redirectBasePath}/invite/email?teamId=${teamId}`);
  };

  const handleUploadCSV = (): void => {
    setIsCSVModalOpen(true);
  };

  const handleCopyInviteLink = (): void => {
    // Disabled for now as per requirements
    console.log("Copy invite link - disabled");
  };

  const handleSkip = async (): Promise<void> => {
    posthog.capture("settings_team_invite_skip_clicked");
    setTeamInvites([]);
    resetOnboardingPreservingPlan();
    router.push(afterFlowPath);
  };

  const handleBack = (): void => {
    posthog.capture("settings_team_invite_back_clicked");
    router.push(redirectBasePath);
  };

  let onConnectGoogleWorkspace: undefined | (() => void);
  if (googleWorkspaceEnabled) {
    onConnectGoogleWorkspace = handleGoogleWorkspaceConnect;
  }

  return (
    <>
      <OnboardingLayout userEmail={userEmail} currentStep={2} totalSteps={3}>
        {/* Left column - Main content */}
        <div className="flex w-full flex-col gap-4">
          <OnboardingCard
            title={t("invite")}
            subtitle={t("onboarding_invite_subtitle")}
            footer={
              <div className="flex w-full items-center justify-between gap-4">
                <Button
                  color="minimal"
                  className="rounded-[10px]"
                  onClick={handleBack}
                  disabled={isSubmitting}>
                  {t("back")}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    color="minimal"
                    className="rounded-[10px]"
                    onClick={handleSkip}
                    disabled={isSubmitting}>
                    {t("onboarding_skip_for_now")}
                  </Button>
                </div>
              </div>
            }>
            <InviteOptions
              onInviteViaEmail={handleInviteViaEmail}
              onUploadCSV={handleUploadCSV}
              onCopyInviteLink={handleCopyInviteLink}
              onConnectGoogleWorkspace={onConnectGoogleWorkspace}
              isSubmitting={isSubmitting}
            />
          </OnboardingCard>
        </div>

        {/* Right column - Browser view */}
        <OnboardingInviteBrowserView teamName={teamDetails.name} />
      </OnboardingLayout>

      {/* CSV Upload Modal */}
      <CSVUploadModal isOpen={isCSVModalOpen} onClose={() => setIsCSVModalOpen(false)} />
    </>
  );
};

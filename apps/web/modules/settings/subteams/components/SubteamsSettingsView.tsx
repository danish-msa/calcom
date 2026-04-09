"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog, DialogTrigger } from "@calcom/ui/components/dialog";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createSubteam } from "../actions";
import type { SubteamListItem } from "../lib/types";

type CreateSubteamFormValues = {
  name: string;
  slug: string;
};

type Props = {
  parentTeamId: number;
  settingsBasePath: "/settings/my-teams" | "/settings/teams";
  subteams: SubteamListItem[];
  canManage: boolean;
};

export function SubteamsSettingsView({ parentTeamId, settingsBasePath, subteams, canManage }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [creating, setCreating] = useState(false);
  const form = useForm<CreateSubteamFormValues>({
    defaultValues: { name: "", slug: "" },
  });

  const deleteMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      showToast(t("subteam_deleted"), "success");
      await utils.viewer.teams.list.invalidate();
      revalidateTeamsList();
      router.refresh();
    },
    onError(err) {
      showToast(err.message, "error");
    },
  });

  return (
    <div className="stack-y-6">
      <p className="text-subtle text-sm">{t("subteams_description")}</p>

      {canManage && (
        <Form
          form={form}
          className="border-subtle rounded-lg border p-4"
          handleSubmit={async (values) => {
            const fd = new FormData();
            fd.set("parentTeamId", String(parentTeamId));
            fd.set("name", values.name);
            fd.set("slug", values.slug);
            setCreating(true);
            const result = await createSubteam(fd);
            setCreating(false);
            if (!result.ok) {
              if (result.error === "team_url_taken") {
                showToast(t("team_url_taken"), "error");
              } else if (result.error === "name_required") {
                showToast(t("subteam_name_required"), "error");
              } else if (result.error === "invalid_slug") {
                showToast(t("invalid_slug"), "error");
              } else {
                showToast(t("something_went_wrong"), "error");
              }
              return;
            }
            showToast(t("subteam_created"), "success");
            form.reset();
            await utils.viewer.teams.list.invalidate();
            revalidateTeamsList();
            router.refresh();
          }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              {...form.register("name", { required: true })}
              label={t("name")}
              placeholder={t("subteam_name_placeholder")}
            />
            <TextField
              {...form.register("slug")}
              label={t("team_url")}
              addOnLeading={`${settingsBasePath}/…/`}
              placeholder={t("url")}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" color="primary" loading={creating}>
              {t("create_subteam")}
            </Button>
          </div>
        </Form>
      )}

      <ul className="bg-default divide-subtle border-subtle divide-y overflow-hidden rounded-md border">
        {subteams.length === 0 ? (
          <li className="text-subtle px-4 py-8 text-center text-sm">{t("no_subteams_yet")}</li>
        ) : (
          subteams.map((st) => (
            <li key={st.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-emphasis truncate text-sm font-medium">{st.name}</p>
                {st.slug ? <p className="text-muted truncate text-xs">{st.slug}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button href={`${settingsBasePath}/${st.id}/profile`} color="secondary" size="sm">
                  {t("open")}
                </Button>
                {canManage && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button color="destructive" size="sm">
                        {t("delete")}
                      </Button>
                    </DialogTrigger>
                    <ConfirmationDialogContent
                      variety="danger"
                      title={t("delete_subteam_title")}
                      confirmBtnText={t("delete")}
                      cancelBtnText={t("cancel")}
                      isPending={deleteMutation.isPending}
                      onConfirm={() => deleteMutation.mutate({ teamId: st.id })}>
                      {t("delete_subteam_confirmation")}
                    </ConfirmationDialogContent>
                  </Dialog>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

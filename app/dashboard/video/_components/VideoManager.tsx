"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CaretDown,
  CaretUp,
  PencilSimple,
  Trash,
  VideoCamera,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { usePreview } from "@/app/contexts/PreviewContext";
import { videoSchema } from "@/lib/validation";
import { useVideoAggregate, useVideoMutations } from "../_lib/hooks";
import type {
  VideoAggregate,
  VideoGroupViewModel,
  VideoViewModel,
} from "../_lib/queries";

type Mutations = ReturnType<typeof useVideoMutations>;
type Editor =
  | { kind: "group"; group?: VideoGroupViewModel }
  | { kind: "video"; group: VideoGroupViewModel; video?: VideoViewModel };
type DeleteTarget =
  | { kind: "group"; group: VideoGroupViewModel }
  | { kind: "video"; group: VideoGroupViewModel; video: VideoViewModel };

const groupFormSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100),
});
const editorSchema = z.object({
  title: videoSchema.shape.title,
  link: videoSchema.shape.link,
});
type GroupValues = z.infer<typeof groupFormSchema>;
type VideoValues = z.infer<typeof editorSchema>;

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const changed = [...items];
  const [item] = changed.splice(index, 1);
  changed.splice(next, 0, item);
  return changed;
}

function same(left: { id: number }[], right: { id: number }[]) {
  return left.map(({ id }) => id).join() === right.map(({ id }) => id).join();
}

function MoveButtons({
  label,
  index,
  total,
  onMove,
  disabled,
}: {
  label: string;
  index: number;
  total: number;
  onMove(direction: -1 | 1): void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Move ${label} up`}
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
      >
        <CaretUp aria-hidden="true" className="size-5" weight="bold" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Move ${label} down`}
        disabled={disabled || index === total - 1}
        onClick={() => onMove(1)}
      >
        <CaretDown aria-hidden="true" className="size-5" weight="bold" />
      </Button>
    </div>
  );
}

function GroupForm({
  editor,
  mutations,
  onDone,
}: {
  editor: Extract<Editor, { kind: "group" }>;
  mutations: Mutations;
  onDone(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<GroupValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: editor.group?.name ?? "" },
  });
  const submit = async (value: GroupValues) => {
    setError("");
    const result = editor.group
      ? await mutations.updateGroup.mutateAsync({
          id: editor.group.id,
          name: value.name,
          enabled: editor.group.enabled,
        })
      : await mutations.createGroup.mutateAsync(value);
    if (!result.ok) {
      applyActionResult(result, form, ["name"]);
      setError(result.formError ?? "Could not save video group");
      return;
    }
    onDone();
  };
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(submit)} noValidate>
      <Field invalid={Boolean(form.formState.errors.name)}>
        <FieldLabel>Group name</FieldLabel>
        <Input {...form.register("name", { onChange: () => setError("") })} />
        {form.formState.errors.name && (
          <FieldError assertive>
            {form.formState.errors.name.message}
          </FieldError>
        )}
      </Field>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save group</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        {editor.group ? "Update" : "Add"} group
      </Button>
    </form>
  );
}

function VideoForm({
  editor,
  mutations,
  onDone,
}: {
  editor: Extract<Editor, { kind: "video" }>;
  mutations: Mutations;
  onDone(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<VideoValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      title: editor.video?.title ?? "",
      link: editor.video?.link ?? "",
    },
  });
  const submit = async (value: VideoValues) => {
    setError("");
    const result = editor.video
      ? await mutations.updateVideo.mutateAsync({
          id: editor.video.id,
          groupId: editor.group.id,
          title: value.title,
          link: value.link,
          enabled: editor.video.enabled,
        })
      : await mutations.createVideo.mutateAsync({
          groupId: editor.group.id,
          title: value.title,
          link: value.link,
          enabled: true,
        });
    if (!result.ok) {
      applyActionResult(result, form, ["title", "link"]);
      setError(result.formError ?? "Could not save video");
      return;
    }
    onDone();
  };
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(submit)} noValidate>
      <Field invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>Video title</FieldLabel>
        <Input {...form.register("title", { onChange: () => setError("") })} />
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.link)}>
        <FieldLabel>Video URL</FieldLabel>
        <Input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          {...form.register("link", { onChange: () => setError("") })}
        />
        {form.formState.errors.link && (
          <FieldError assertive>
            {form.formState.errors.link.message}
          </FieldError>
        )}
      </Field>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save video</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        {editor.video ? "Update" : "Add"} video
      </Button>
    </form>
  );
}

export default function VideoManager({
  groups,
  loading,
  enabled,
  mutations,
}: {
  groups: VideoGroupViewModel[];
  loading: boolean;
  enabled: boolean;
  mutations: Mutations;
}) {
  const { triggerReload } = usePreview();
  const [draft, setDraft] = useState(groups);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => setDraft(groups), [groups]);

  const saveGroupOrder = async () => {
    const result = await mutations.reorderGroups.mutateAsync({
      orderedIds: draft.map(({ id }) => id),
    });
    if (!result.ok) {
      setDraft(groups);
      setError(result.formError ?? "Could not save group order");
      return;
    }
    setNotice("Video group order saved");
    triggerReload();
  };
  const saveVideoOrder = async (group: VideoGroupViewModel) => {
    const current = draft.find(({ id }) => id === group.id) ?? group;
    const result = await mutations.reorderVideos.mutateAsync({
      groupId: group.id,
      orderedIds: current.videos.map(({ id }) => id),
    });
    if (!result.ok) {
      setDraft(groups);
      setError(result.formError ?? "Could not save video order");
      return;
    }
    setNotice(`${group.name} video order saved`);
    triggerReload();
  };
  const toggleGroup = async (group: VideoGroupViewModel) => {
    const result = await mutations.updateGroup.mutateAsync({
      id: group.id,
      name: group.name,
      enabled: !group.enabled,
    });
    if (!result.ok) {
      setError(result.formError ?? "Could not update group");
      return;
    }
    setDraft((current) =>
      current.map((item) =>
        item.id === group.id ? { ...item, enabled: result.data.enabled } : item,
      ),
    );
    triggerReload();
  };
  const toggleVideo = async (
    group: VideoGroupViewModel,
    video: VideoViewModel,
  ) => {
    const result = await mutations.updateVideo.mutateAsync({
      id: video.id,
      groupId: group.id,
      title: video.title,
      link: video.link,
      enabled: !video.enabled,
    });
    if (!result.ok) {
      setError(result.formError ?? "Could not update video");
      return;
    }
    setDraft((current) =>
      current.map((item) =>
        item.id === group.id
          ? {
              ...item,
              videos: item.videos.map((entry) =>
                entry.id === video.id
                  ? { ...entry, enabled: result.data.enabled }
                  : entry,
              ),
            }
          : item,
      ),
    );
    triggerReload();
  };
  const remove = async () => {
    if (!deleting) return;
    const result =
      deleting.kind === "group"
        ? await mutations.deleteGroup.mutateAsync({ id: deleting.group.id })
        : await mutations.deleteVideo.mutateAsync({ id: deleting.video.id });
    if (!result.ok) {
      setError(result.formError ?? "Could not delete content");
      return;
    }
    setDeleting(null);
    triggerReload();
  };

  if (loading) return <p aria-live="polite">Loading videos</p>;

  return (
    <section className="space-y-5" data-testid="video-manager">
      <p className="sr-only" aria-live="polite">
        {notice}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        {!same(draft, groups) && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(groups)}
            >
              Cancel group order
            </Button>
            <Button type="button" onClick={() => void saveGroupOrder()}>
              Save group order
            </Button>
          </>
        )}
        <Button
          type="button"
          disabled={!enabled}
          onClick={() => setEditor({ kind: "group" })}
        >
          Add video group
        </Button>
      </div>
      {draft.length ? (
        draft.map((group, groupIndex) => {
          const original =
            groups.find(({ id }) => id === group.id)?.videos ?? [];
          return (
            <section
              key={group.id}
              className="space-y-3 rounded-3xl border bg-white p-4 shadow-sm sm:p-6"
              aria-labelledby={`video-group-${group.id}`}
            >
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <MoveButtons
                    label={group.name}
                    index={groupIndex}
                    total={draft.length}
                    disabled={!enabled}
                    onMove={(direction) =>
                      setDraft((current) =>
                        move(current, groupIndex, direction),
                      )
                    }
                  />
                  <div className="min-w-0">
                    <h3
                      id={`video-group-${group.id}`}
                      className="truncate text-lg font-semibold"
                    >
                      {group.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {group.videos.length}{" "}
                      {group.videos.length === 1 ? "video" : "videos"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit group ${group.name}`}
                    disabled={!enabled}
                    onClick={() => setEditor({ kind: "group", group })}
                  >
                    <PencilSimple aria-hidden="true" className="size-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete group ${group.name}`}
                    disabled={!enabled}
                    onClick={() => setDeleting({ kind: "group", group })}
                  >
                    <Trash aria-hidden="true" className="size-5" />
                  </Button>
                  <Switch
                    checked={group.enabled}
                    disabled={!enabled}
                    aria-label={`${group.enabled ? "Hide" : "Show"} group ${group.name}`}
                    onCheckedChange={() => void toggleGroup(group)}
                  />
                </div>
              </header>
              {group.videos.length ? (
                <div className="space-y-3">
                  {group.videos.map((video, index) => (
                    <article
                      key={video.id}
                      className="flex max-h-36 items-center gap-3 overflow-hidden rounded-3xl border bg-white p-4 shadow-sm"
                    >
                      <MoveButtons
                        label={video.title}
                        index={index}
                        total={group.videos.length}
                        disabled={!enabled}
                        onMove={(direction) =>
                          setDraft((current) =>
                            current.map((item) =>
                              item.id === group.id
                                ? {
                                    ...item,
                                    videos: move(item.videos, index, direction),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
                        <VideoCamera
                          aria-hidden="true"
                          className="size-6 text-muted-foreground"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-semibold text-primary">
                          {video.title}
                        </h4>
                        <p className="truncate text-sm text-muted-foreground">
                          {video.link}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${video.title}`}
                          disabled={!enabled}
                          onClick={() =>
                            setEditor({ kind: "video", group, video })
                          }
                        >
                          <PencilSimple aria-hidden="true" className="size-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${video.title}`}
                          disabled={!enabled}
                          onClick={() =>
                            setDeleting({ kind: "video", group, video })
                          }
                        >
                          <Trash aria-hidden="true" className="size-5" />
                        </Button>
                        <Switch
                          checked={video.enabled}
                          disabled={!enabled}
                          aria-label={`${video.enabled ? "Hide" : "Show"} ${video.title}`}
                          onCheckedChange={() => void toggleVideo(group, video)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
                  No videos in this group yet
                </p>
              )}
              {!same(group.videos, original) && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraft(groups)}
                  >
                    Cancel video order
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void saveVideoOrder(group)}
                  >
                    Save video order
                  </Button>
                </div>
              )}
              <div className="flex justify-end border-t pt-4">
                <Button
                  type="button"
                  disabled={!enabled}
                  onClick={() => setEditor({ kind: "video", group })}
                >
                  Add video to {group.name}
                </Button>
              </div>
            </section>
          );
        })
      ) : (
        <p className="rounded-3xl border border-dashed bg-white p-8 text-center text-muted-foreground">
          No video groups yet
        </p>
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not manage videos</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor?.kind === "group"
                ? `${editor.group ? "Edit" : "Add"} video group`
                : `${editor?.video ? "Edit" : "Add"} video`}
            </DialogTitle>
            <DialogDescription>
              Changes appear on the public profile after a successful save.
            </DialogDescription>
          </DialogHeader>
          {editor?.kind === "group" ? (
            <GroupForm
              editor={editor}
              mutations={mutations}
              onDone={() => {
                setEditor(null);
                triggerReload();
              }}
            />
          ) : editor?.kind === "video" ? (
            <VideoForm
              editor={editor}
              mutations={mutations}
              onDone={() => {
                setEditor(null);
                triggerReload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleting?.kind === "group" ? "video group" : "video"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.kind === "group"
                ? `This permanently removes ${deleting.group.name} and every video inside it.`
                : `This permanently removes ${deleting?.video.title}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function VideoClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
  enabled,
}: {
  scopeId: string;
  targetHint?: string;
  data: VideoAggregate;
  updatedAt: number;
  enabled: boolean;
}) {
  const query = useVideoAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useVideoMutations({ scopeId, targetHint });
  return (
    <VideoManager
      groups={query.data?.groups ?? data.groups}
      loading={query.isLoading}
      enabled={enabled}
      mutations={mutations}
    />
  );
}

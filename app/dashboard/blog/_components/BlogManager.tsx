"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CaretDown,
  CaretUp,
  ImageSquare,
  PencilSimple,
  Trash,
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
import { Textarea } from "@/app/components/ui/textarea";
import BlogImage from "@/app/components/Image/BlogImage";
import { usePreview } from "@/app/contexts/PreviewContext";
import type { ActionResult } from "@/lib/forms/action-result";
import { useBlogAggregate, useBlogMutations } from "../_lib/hooks";
import type {
  BlogAggregate,
  BlogGroupViewModel,
  BlogViewModel,
} from "../_lib/queries";
import {
  blogImagePath,
  removeBlogImages,
  retryBlogImageCleanup,
  uploadBlogImage,
} from "../_lib/uploads";

type Mutations = ReturnType<typeof useBlogMutations>;
type Editor =
  | { kind: "group"; group?: BlogGroupViewModel }
  | { kind: "blog"; group: BlogGroupViewModel; blog?: BlogViewModel };
type DeleteTarget =
  | { kind: "group"; group: BlogGroupViewModel }
  | { kind: "blog"; group: BlogGroupViewModel; blog: BlogViewModel };
const groupFormSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100),
});
const optionalFile = z.custom<File>(
  (value) =>
    value === undefined ||
    (typeof File !== "undefined" && value instanceof File),
  "Choose a valid image",
);
const blogFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  slug: z
    .string()
    .trim()
    .max(100)
    .regex(
      /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
      "Use letters, numbers, and hyphens",
    )
    .or(z.literal("")),
  content: z.string().trim().min(1, "Content is required").max(50_000),
  metaTitle: z.string().trim().max(160),
  metaDescription: z.string().trim().max(320),
  imageFile: optionalFile.optional(),
});
type GroupValues = z.infer<typeof groupFormSchema>;
type BlogValues = z.infer<typeof blogFormSchema>;

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
      setError(result.formError ?? "Could not save blog group");
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

function BlogForm({
  editor,
  userId,
  mutations,
  onDone,
}: {
  editor: Extract<Editor, { kind: "blog" }>;
  userId: string;
  mutations: Mutations;
  onDone(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<BlogValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: editor.blog?.title ?? "",
      slug: editor.blog?.slug ?? "",
      content: editor.blog?.content ?? "",
      metaTitle: editor.blog?.metaTitle ?? "",
      metaDescription: editor.blog?.metaDescription ?? "",
    },
  });
  const submit = async (value: BlogValues) => {
    setError("");
    const uploaded: string[] = [];
    try {
      let imageUrl = editor.blog?.imageUrl ?? "";
      if (value.imageFile) {
        const uploadedImage = await uploadBlogImage(userId, value.imageFile);
        if (!uploadedImage.ok) throw uploadedImage;
        uploaded.push(uploadedImage.data.objectPath);
        imageUrl = uploadedImage.data.publicUrl;
      }
      const result: ActionResult<unknown> = editor.blog
        ? await mutations.updateBlog.mutateAsync({
            id: editor.blog.id,
            title: value.title,
            slug: value.slug,
            content: value.content,
            metaTitle: value.metaTitle,
            metaDescription: value.metaDescription,
            imageUrl,
            enabled: editor.blog.enabled,
          })
        : await mutations.createBlog.mutateAsync({
            groupId: editor.group.id,
            title: value.title,
            slug: value.slug,
            content: value.content,
            metaTitle: value.metaTitle,
            metaDescription: value.metaDescription,
            imageUrl,
            enabled: true,
          });
      if (!result.ok) {
        await removeBlogImages(uploaded);
        applyActionResult(result, form, [
          "title",
          "slug",
          "content",
          "metaTitle",
          "metaDescription",
        ]);
        setError(result.formError ?? "Could not save blog");
        return;
      }
      if (editor.blog && value.imageFile) {
        const stale = blogImagePath(editor.blog.imageUrl, userId);
        if (stale) await removeBlogImages([stale]);
      }
      onDone();
    } catch (failure) {
      await removeBlogImages(uploaded);
      const result = failure as ActionResult<unknown>;
      setError(
        !result.ok && result.formError
          ? result.formError
          : "Blog image could not be uploaded",
      );
    }
  };
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(submit)} noValidate>
      <Field invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>Blog title</FieldLabel>
        <Input {...form.register("title", { onChange: () => setError("") })} />
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.slug)}>
        <FieldLabel>URL slug (optional)</FieldLabel>
        <Input placeholder="my-blog-post" {...form.register("slug")} />
        {form.formState.errors.slug && (
          <FieldError assertive>
            {form.formState.errors.slug.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.content)}>
        <FieldLabel>Content</FieldLabel>
        <Textarea className="min-h-40" {...form.register("content")} />
        {form.formState.errors.content && (
          <FieldError assertive>
            {form.formState.errors.content.message}
          </FieldError>
        )}
      </Field>
      <Field>
        <FieldLabel>Search title (optional)</FieldLabel>
        <Input {...form.register("metaTitle")} />
      </Field>
      <Field>
        <FieldLabel>Search description (optional)</FieldLabel>
        <Textarea {...form.register("metaDescription")} />
      </Field>
      <Field invalid={Boolean(form.formState.errors.imageFile)}>
        <FieldLabel>
          {editor.blog
            ? "Replace cover image (optional)"
            : "Cover image (optional)"}
        </FieldLabel>
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) =>
            form.setValue("imageFile", event.target.files?.[0], {
              shouldValidate: true,
            })
          }
        />
        {form.formState.errors.imageFile && (
          <FieldError assertive>
            {form.formState.errors.imageFile.message as string}
          </FieldError>
        )}
      </Field>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save blog</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        {editor.blog ? "Update" : "Save"} blog
      </Button>
    </form>
  );
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

export default function BlogManager({
  groups,
  loading,
  enabled,
  userId,
  mutations,
}: {
  groups: BlogGroupViewModel[];
  loading: boolean;
  enabled: boolean;
  userId: string;
  mutations: Mutations;
}) {
  const { triggerReload } = usePreview();
  const [draft, setDraft] = useState(groups);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => setDraft(groups), [groups]);
  useEffect(() => {
    void retryBlogImageCleanup(userId);
  }, [userId]);
  const saveGroupOrder = async () => {
    const result = await mutations.reorderGroups.mutateAsync({
      orderedIds: draft.map(({ id }) => id),
    });
    if (!result.ok) {
      setDraft(groups);
      setError(result.formError ?? "Could not save group order");
      return;
    }
    setNotice("Blog group order saved");
    triggerReload();
  };
  const saveBlogOrder = async (group: BlogGroupViewModel) => {
    const current = draft.find(({ id }) => id === group.id) ?? group;
    const result = await mutations.reorderBlogs.mutateAsync({
      groupId: group.id,
      orderedIds: current.blogs.map(({ id }) => id),
    });
    if (!result.ok) {
      setDraft(groups);
      setError(result.formError ?? "Could not save blog order");
      return;
    }
    setNotice(`${group.name} blog order saved`);
    triggerReload();
  };
  const toggleGroup = async (group: BlogGroupViewModel) => {
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
  const toggleBlog = async (group: BlogGroupViewModel, blog: BlogViewModel) => {
    const result = await mutations.updateBlog.mutateAsync({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      metaTitle: blog.metaTitle,
      metaDescription: blog.metaDescription,
      imageUrl: blog.imageUrl,
      enabled: !blog.enabled,
    });
    if (!result.ok) {
      setError(result.formError ?? "Could not update blog");
      return;
    }
    setDraft((current) =>
      current.map((item) =>
        item.id === group.id
          ? {
              ...item,
              blogs: item.blogs.map((entry) =>
                entry.id === blog.id
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
        : await mutations.deleteBlog.mutateAsync({ id: deleting.blog.id });
    if (!result.ok) {
      setError(result.formError ?? "Could not delete content");
      return;
    }
    if (deleting.kind === "blog") {
      const path = blogImagePath(deleting.blog.imageUrl, userId);
      if (path) await removeBlogImages([path]);
    }
    setDeleting(null);
    triggerReload();
  };
  if (loading) return <p aria-live="polite">Loading blogs</p>;
  return (
    <section className="space-y-5" data-testid="blog-manager">
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
          Add blog group
        </Button>
      </div>
      {draft.length ? (
        draft.map((group, groupIndex) => {
          const original =
            groups.find(({ id }) => id === group.id)?.blogs ?? [];
          return (
            <section
              key={group.id}
              className="space-y-3 rounded-3xl border bg-white p-4 shadow-sm sm:p-6"
              aria-labelledby={`blog-group-${group.id}`}
            >
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <MoveButtons
                    label={group.name}
                    index={groupIndex}
                    total={draft.length}
                    disabled={!enabled}
                    onMove={(direction) => {
                      setDraft((current) =>
                        move(current, groupIndex, direction),
                      );
                      setNotice(`${group.name} moved`);
                    }}
                  />
                  <div>
                    <h3
                      id={`blog-group-${group.id}`}
                      className="truncate text-lg font-semibold"
                    >
                      {group.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {group.blogs.length}{" "}
                      {group.blogs.length === 1 ? "post" : "posts"}
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
              {group.blogs.length ? (
                <div className="space-y-3">
                  {group.blogs.map((blog, index) => (
                    <article
                      key={blog.id}
                      className="overflow-hidden rounded-3xl border bg-white shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <MoveButtons
                            label={blog.title}
                            index={index}
                            total={group.blogs.length}
                            disabled={!enabled}
                            onMove={(direction) =>
                              setDraft((current) =>
                                current.map((item) =>
                                  item.id === group.id
                                    ? {
                                        ...item,
                                        blogs: move(
                                          item.blogs,
                                          index,
                                          direction,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                          <div className="min-w-0">
                            <h4 className="truncate font-semibold text-primary">
                              {blog.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              /{blog.slug}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${blog.title}`}
                            disabled={!enabled}
                            onClick={() =>
                              setEditor({ kind: "blog", group, blog })
                            }
                          >
                            <PencilSimple
                              aria-hidden="true"
                              className="size-5"
                            />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${blog.title}`}
                            disabled={!enabled}
                            onClick={() =>
                              setDeleting({ kind: "blog", group, blog })
                            }
                          >
                            <Trash aria-hidden="true" className="size-5" />
                          </Button>
                          <Switch
                            checked={blog.enabled}
                            disabled={!enabled}
                            aria-label={`${blog.enabled ? "Hide" : "Show"} ${blog.title}`}
                            onCheckedChange={() => void toggleBlog(group, blog)}
                          />
                        </div>
                      </div>
                      <div className="grid max-h-64 gap-4 overflow-hidden p-4 sm:grid-cols-[10rem_1fr]">
                        {blog.imageUrl ? (
                          <BlogImage
                            src={blog.imageUrl}
                            alt=""
                            className="aspect-video max-h-36 w-full rounded-xl bg-muted object-cover"
                          />
                        ) : (
                          <div className="flex aspect-video max-h-36 items-center justify-center rounded-xl bg-muted">
                            <ImageSquare
                              aria-hidden="true"
                              className="size-7 text-muted-foreground"
                            />
                          </div>
                        )}
                        <p className="line-clamp-5 text-sm text-muted-foreground">
                          {blog.content}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
                  No blogs in this group yet
                </p>
              )}
              {!same(group.blogs, original) && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraft(groups)}
                  >
                    Cancel blog order
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void saveBlogOrder(group)}
                  >
                    Save blog order
                  </Button>
                </div>
              )}
              <div className="flex justify-end border-t pt-4">
                <Button
                  type="button"
                  disabled={!enabled}
                  onClick={() => setEditor({ kind: "blog", group })}
                >
                  Add blog to {group.name}
                </Button>
              </div>
            </section>
          );
        })
      ) : (
        <p className="rounded-3xl border border-dashed bg-white p-8 text-center text-muted-foreground">
          No blog groups yet
        </p>
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not manage blogs</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor?.kind === "group"
                ? `${editor.group ? "Edit" : "Add"} blog group`
                : `${editor?.blog ? "Edit" : "Add"} blog`}
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
          ) : editor?.kind === "blog" ? (
            <BlogForm
              editor={editor}
              userId={userId}
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
              Delete {deleting?.kind === "group" ? "blog group" : "blog"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.kind === "group"
                ? `This permanently removes ${deleting.group.name} and every blog inside it.`
                : `This permanently removes ${deleting?.blog.title}.`}
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

export function BlogClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
  enabled,
}: {
  scopeId: string;
  targetHint?: string;
  data: BlogAggregate;
  updatedAt: number;
  enabled: boolean;
}) {
  const query = useBlogAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useBlogMutations({ scopeId, targetHint });
  return (
    <BlogManager
      groups={query.data?.groups ?? data.groups}
      loading={query.isLoading}
      enabled={enabled}
      userId={scopeId}
      mutations={mutations}
    />
  );
}

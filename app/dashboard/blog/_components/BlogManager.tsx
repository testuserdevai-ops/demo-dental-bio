"use client";

import { ImageSquare, PencilSimple, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
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
import { Switch } from "@/app/components/ui/switch";
import BlogImage from "@/app/components/Image/BlogImage";
import { usePreview } from "@/app/contexts/PreviewContext";
import type { BlogGroupViewModel, BlogViewModel } from "../_lib/queries";
import {
  blogImagePath,
  removeBlogImages,
  retryBlogImageCleanup,
} from "../_lib/uploads";
import { BlogForm } from "./BlogForm";
import { GroupForm } from "./GroupForm";
import { MoveButtons } from "./MoveButtons";
import {
  move,
  same,
  type BlogDeleteTarget,
  type BlogEditor,
  type BlogMutations,
} from "./blog-manager-shared";

export { BlogClient } from "./BlogClient";

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
  mutations: BlogMutations;
}) {
  const { triggerReload } = usePreview();
  const [draft, setDraft] = useState(groups);
  const [editor, setEditor] = useState<BlogEditor | null>(null);
  const [deleting, setDeleting] = useState<BlogDeleteTarget | null>(null);
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

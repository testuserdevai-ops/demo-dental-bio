"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowSquareOut,
  DotsSixVertical,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { usePreview } from "@/app/contexts/PreviewContext";
import { applyActionResult } from "@/app/components/forms/action-result";
import { useLinkAggregate, useLinkMutations } from "../_lib/hooks";
import type {
  LinkAggregate,
  LinkGroupViewModel,
  LinkViewModel,
} from "../_lib/queries";
import {
  createLinkGroupInputSchema,
  createLinkInputSchema,
  type CreateLinkGroupInput,
  type CreateLinkInput,
} from "../_lib/schemas";

type Mutations = ReturnType<typeof useLinkMutations>;

const GROUP_ITEM_TYPE = "link-group";
const LINK_ITEM_TYPE = "link-item";

function ErrorAlert({ title, message }: { title: string; message: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function GroupForm({
  group,
  mutations,
  afterSuccess,
  onCancel,
}: {
  group?: LinkGroupViewModel;
  mutations: Mutations;
  afterSuccess(): void;
  onCancel?(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<CreateLinkGroupInput>({
    resolver: zodResolver(createLinkGroupInputSchema),
    defaultValues: { heading: group?.heading ?? "" },
  });
  const mutation = group ? mutations.updateGroup : mutations.createGroup;
  const submit = async (values: CreateLinkGroupInput) => {
    setError("");
    const result = group
      ? await mutations.updateGroup.mutateAsync({
          linkGroupId: group.id,
          ...values,
        })
      : await mutations.createGroup.mutateAsync(values);
    if (!result.ok) {
      applyActionResult(result, form, ["heading"]);
      setError(result.formError ?? "Unable to save link group");
      return;
    }
    form.reset();
    afterSuccess();
  };
  return (
    <form onSubmit={form.handleSubmit(submit)} className="flex-col-gap">
      <Field invalid={Boolean(form.formState.errors.heading)}>
        <FieldLabel>{group ? "Group heading" : "New group heading"}</FieldLabel>
        <Input
          {...form.register("heading", { onChange: () => setError("") })}
        />
        {form.formState.errors.heading && (
          <FieldError assertive>
            {form.formState.errors.heading.message}
          </FieldError>
        )}
      </Field>
      <ErrorAlert title="Could not save group" message={error} />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isPending={mutation.isPending}>
          {group ? "Update group" : "Add group"}
        </Button>
      </div>
    </form>
  );
}

function LinkForm({
  groupId,
  link,
  mutations,
  afterSuccess,
  onCancel,
}: {
  groupId: string;
  link?: LinkViewModel;
  mutations: Mutations;
  afterSuccess(): void;
  onCancel?(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<Omit<CreateLinkInput, "linkGroupId">>({
    resolver: zodResolver(createLinkInputSchema.omit({ linkGroupId: true })),
    defaultValues: {
      title: link?.title ?? "",
      url: link?.url ?? "https://",
      isActive: link?.isActive ?? true,
    },
  });
  const mutation = link ? mutations.updateLink : mutations.createLink;
  const submit = async (values: Omit<CreateLinkInput, "linkGroupId">) => {
    setError("");
    const result = link
      ? await mutations.updateLink.mutateAsync({
          linkGroupId: groupId,
          linkId: link.id,
          ...values,
        })
      : await mutations.createLink.mutateAsync({
          linkGroupId: groupId,
          ...values,
        });
    if (!result.ok) {
      applyActionResult(result, form, ["title", "url"]);
      setError(result.formError ?? "Unable to save link");
      return;
    }
    form.reset({ title: "", url: "https://", isActive: true });
    afterSuccess();
  };
  return (
    <form onSubmit={form.handleSubmit(submit)} className="flex-col-gap">
      <Field invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>{link ? "Link title" : "New link title"}</FieldLabel>
        <Input {...form.register("title", { onChange: () => setError("") })} />
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.url)}>
        <FieldLabel>URL</FieldLabel>
        <Input
          type="text"
          inputMode="url"
          {...form.register("url", { onChange: () => setError("") })}
        />
        {form.formState.errors.url && (
          <FieldError assertive>{form.formState.errors.url.message}</FieldError>
        )}
      </Field>
      <ErrorAlert title="Could not save link" message={error} />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isPending={mutation.isPending}>
          {link ? "Update link" : "Add link"}
        </Button>
      </div>
    </form>
  );
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length)
    return items;
  const updated = [...items];
  const [moved] = updated.splice(from, 1);
  updated.splice(to, 0, moved);
  return updated;
}

function LinkRow({
  groupId,
  link,
  index,
  mutations,
  onMove,
  afterSuccess,
}: {
  groupId: string;
  link: LinkViewModel;
  index: number;
  mutations: Mutations;
  onMove(from: number, to: number): void;
  afterSuccess(): void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [, drag] = useDrag({ type: LINK_ITEM_TYPE, item: { index } });
  const [, drop] = useDrop({
    accept: LINK_ITEM_TYPE,
    hover: (dragged: { index: number }) => {
      if (dragged.index !== index) {
        onMove(dragged.index, index);
        dragged.index = index;
      }
    },
  });
  const toggle = async () => {
    setError("");
    const result = await mutations.updateLink.mutateAsync({
      linkGroupId: groupId,
      linkId: link.id,
      title: link.title,
      url: link.url,
      isActive: !link.isActive,
    });
    if (!result.ok) setError(result.formError ?? "Unable to update link");
    else afterSuccess();
  };
  return (
    <article
      ref={(node) => {
        drag(node);
        drop(node);
      }}
      className="rounded-2xl border bg-background p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="mt-1 cursor-move rounded-md p-1 text-muted-foreground hover:bg-primary-5 hover:text-primary"
        >
          <DotsSixVertical className="size-5" weight="bold" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="break-words font-semibold text-primary">
                {link.title}
              </h4>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {link.url}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${link.title}`}
                className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ArrowSquareOut aria-hidden="true" className="size-5" />
              </a>
              <Switch
                checked={link.isActive}
                onCheckedChange={() => void toggle()}
                aria-label={`${link.isActive ? "Hide" : "Show"} ${link.title}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${link.title}`}
                onClick={() => setEditing(true)}
              >
                <PencilSimple aria-hidden="true" className="size-5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${link.title}`}
                  >
                    <Trash aria-hidden="true" className="size-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete link?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes {link.title}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async (event) => {
                        event.preventDefault();
                        const result = await mutations.deleteLink.mutateAsync({
                          linkGroupId: groupId,
                          linkId: link.id,
                        });
                        if (!result.ok) {
                          setError(result.formError ?? "Unable to delete link");
                          return;
                        }
                        afterSuccess();
                      }}
                    >
                      Delete link
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {link.isActive
              ? "Visible on your profile"
              : "Hidden from your profile"}
          </p>
        </div>
      </div>
      {editing && (
        <div className="mt-4 border-t pt-4">
          <LinkForm
            groupId={groupId}
            link={link}
            mutations={mutations}
            afterSuccess={() => {
              setEditing(false);
              afterSuccess();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
      <ErrorAlert title="Could not update link" message={error} />
    </article>
  );
}

function GroupCard({
  group,
  mutations,
  dragRef,
  afterSuccess,
}: {
  group: LinkGroupViewModel;
  mutations: Mutations;
  dragRef(node: HTMLDivElement | null): void;
  afterSuccess(): void;
}) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(group.links);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => setDraft(group.links), [group.links]);
  const move = (from: number, to: number) => {
    setDraft((current) => moveItem(current, from, to));
    setOrdering(true);
  };
  const saveOrder = async () => {
    setError("");
    const result = await mutations.reorderLinks.mutateAsync({
      linkGroupId: group.id,
      orderedIds: draft.map((item) => item.id),
    });
    if (!result.ok) {
      setDraft(group.links);
      setError(result.formError ?? "Unable to save link order");
      return;
    }
    setOrdering(false);
    setAnnouncement("Link order saved");
    afterSuccess();
  };
  return (
    <section
      className="flex-col-gap rounded-3xl border bg-muted/60 p-4 sm:p-6"
      aria-labelledby={`group-${group.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            ref={dragRef}
            data-testid="group-drag-handle"
            aria-hidden="true"
            className="cursor-move rounded-md p-1 text-muted-foreground hover:bg-background hover:text-primary"
          >
            <DotsSixVertical className="size-5" weight="bold" />
          </div>
          <h3
            id={`group-${group.id}`}
            className="truncate text-lg font-semibold"
          >
            {group.heading}
          </h3>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit group ${group.heading}`}
            onClick={() => setEditing(true)}
          >
            <PencilSimple aria-hidden="true" className="size-5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete group ${group.heading}`}
              >
                <Trash aria-hidden="true" className="size-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete link group?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes {group.heading} and its links.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async (event) => {
                    event.preventDefault();
                    const result = await mutations.deleteGroup.mutateAsync({
                      linkGroupId: group.id,
                    });
                    if (!result.ok) {
                      setError(
                        result.formError ?? "Unable to delete link group",
                      );
                      return;
                    }
                    afterSuccess();
                  }}
                >
                  Delete group
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {editing && (
        <GroupForm
          group={group}
          mutations={mutations}
          afterSuccess={() => {
            setEditing(false);
            afterSuccess();
          }}
          onCancel={() => setEditing(false)}
        />
      )}
      {draft.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-background p-5 text-sm text-muted-foreground">
          No links in this group yet.
        </p>
      ) : (
        <div className="flex-col-gap">
          {draft.map((link, index) => (
            <LinkRow
              key={link.id}
              groupId={group.id}
              link={link}
              index={index}
              mutations={mutations}
              onMove={move}
              afterSuccess={afterSuccess}
            />
          ))}
        </div>
      )}
      {ordering && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft(group.links);
              setOrdering(false);
              setAnnouncement("Link order cancelled");
            }}
          >
            Cancel link order
          </Button>
          <Button
            type="button"
            onClick={() => void saveOrder()}
            isPending={mutations.reorderLinks.isPending}
          >
            Save link order
          </Button>
        </div>
      )}
      <ErrorAlert title="Could not manage group" message={error} />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {adding ? (
        <LinkForm
          groupId={group.id}
          mutations={mutations}
          afterSuccess={() => {
            setAdding(false);
            afterSuccess();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div className="flex justify-end border-t pt-4">
          <Button type="button" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Add link to {group.heading}
          </Button>
        </div>
      )}
    </section>
  );
}

function DraggableGroupCard({
  group,
  index,
  mutations,
  onMove,
  afterSuccess,
}: {
  group: LinkGroupViewModel;
  index: number;
  mutations: Mutations;
  onMove(from: number, to: number): void;
  afterSuccess(): void;
}) {
  const [, drag] = useDrag({ type: GROUP_ITEM_TYPE, item: { index } });
  const [, drop] = useDrop({
    accept: GROUP_ITEM_TYPE,
    hover: (dragged: { index: number }) => {
      if (dragged.index !== index) {
        onMove(dragged.index, index);
        dragged.index = index;
      }
    },
  });
  return (
    <div data-testid="link-group-card" ref={drop}>
      <GroupCard
        group={group}
        mutations={mutations}
        dragRef={(node) => drag(node)}
        afterSuccess={afterSuccess}
      />
    </div>
  );
}

export default function LinksPageClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
}: {
  scopeId: string;
  targetHint: string | undefined;
  data: LinkAggregate;
  updatedAt: number;
}) {
  const query = useLinkAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useLinkMutations({ scopeId, targetHint });
  const { triggerReload } = usePreview();
  const groups = query.data?.groups ?? data.groups;
  const [draft, setDraft] = useState(groups);
  const [addingGroup, setAddingGroup] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => setDraft(groups), [groups]);
  const afterSuccess = () => triggerReload();
  const move = (from: number, to: number) => {
    setDraft((current) => moveItem(current, from, to));
    setOrdering(true);
  };
  const saveGroups = async () => {
    setError("");
    const result = await mutations.reorderGroups.mutateAsync({
      orderedIds: draft.map((group) => group.id),
    });
    if (!result.ok) {
      setDraft(groups);
      setError(result.formError ?? "Unable to save group order");
      return;
    }
    setOrdering(false);
    setAnnouncement("Link group order saved");
    afterSuccess();
  };
  return (
    <div className="flex-col-gap" data-testid="links-manager">
      {addingGroup ? (
        <GroupForm
          mutations={mutations}
          afterSuccess={() => {
            setAddingGroup(false);
            afterSuccess();
          }}
          onCancel={() => setAddingGroup(false)}
        />
      ) : (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setAddingGroup(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Add New Group
          </Button>
        </div>
      )}
      {draft.length === 0 ? (
        <p>No link groups yet.</p>
      ) : (
        <DndProvider backend={HTML5Backend}>
          <div className="flex-col-gap">
            {draft.map((group, index) => (
              <DraggableGroupCard
                key={group.id}
                group={group}
                index={index}
                mutations={mutations}
                onMove={move}
                afterSuccess={afterSuccess}
              />
            ))}
          </div>
        </DndProvider>
      )}
      {ordering && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft(groups);
              setOrdering(false);
              setAnnouncement("Link group order cancelled");
            }}
          >
            Cancel group order
          </Button>
          <Button
            type="button"
            onClick={() => void saveGroups()}
            isPending={mutations.reorderGroups.isPending}
          >
            Save group order
          </Button>
        </div>
      )}
      <ErrorAlert title="Could not save order" message={error} />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

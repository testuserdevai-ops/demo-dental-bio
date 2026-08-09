"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
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

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const updated = [...items];
  const [moved] = updated.splice(index, 1);
  updated.splice(next, 0, moved);
  return updated;
}

function LinkRow({
  groupId,
  link,
  index,
  count,
  mutations,
  move,
  afterSuccess,
}: {
  groupId: string;
  link: LinkViewModel;
  index: number;
  count: number;
  mutations: Mutations;
  move(direction: -1 | 1): void;
  afterSuccess(): void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
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
    <div className="rounded-xl border p-3" id={`link-${link.id}`} tabIndex={-1}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{link.title}</p>
          <p className="break-all text-sm text-muted-foreground">{link.url}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="outline" onClick={() => void toggle()}>
            {link.isActive ? "Disable" : "Enable"} {link.title}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            Edit {link.title}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={index === 0}
            onClick={() => move(-1)}
          >
            Move {link.title} up
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={index === count - 1}
            onClick={() => move(1)}
          >
            Move {link.title} down
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost">
                Delete {link.title}
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
      {editing && (
        <div className="mt-3">
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
    </div>
  );
}

function GroupCard({
  group,
  mutations,
  afterSuccess,
}: {
  group: LinkGroupViewModel;
  mutations: Mutations;
  afterSuccess(): void;
}) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(group.links);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const focusedId = useRef<string | null>(null);
  useEffect(() => setDraft(group.links), [group.links]);
  useEffect(() => {
    if (focusedId.current)
      document.getElementById(`link-${focusedId.current}`)?.focus();
  }, [draft]);
  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= draft.length) return;
    focusedId.current = draft[index].id;
    setDraft(moveItem(draft, index, direction));
    setOrdering(true);
    setAnnouncement(`${draft[index].title} moved to position ${next + 1}`);
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
      className="flex-col-gap rounded-2xl border p-4"
      aria-labelledby={`group-${group.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id={`group-${group.id}`}
          className="text-lg font-semibold"
          tabIndex={-1}
        >
          {group.heading}
        </h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            Edit group {group.heading}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost">
                Delete group {group.heading}
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
        <p>No links in this group yet.</p>
      ) : (
        draft.map((link, index) => (
          <LinkRow
            key={link.id}
            groupId={group.id}
            link={link}
            index={index}
            count={draft.length}
            mutations={mutations}
            move={(direction) => move(index, direction)}
            afterSuccess={afterSuccess}
          />
        ))
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
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <ErrorAlert title="Could not manage group" message={error} />
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
        <div className="flex justify-end">
          <Button type="button" onClick={() => setAdding(true)}>
            Add link to {group.heading}
          </Button>
        </div>
      )}
    </section>
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
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  const focusedId = useRef<string | null>(null);
  useEffect(() => setDraft(groups), [groups]);
  useEffect(() => {
    if (focusedId.current)
      document.getElementById(`group-${focusedId.current}`)?.focus();
  }, [draft]);
  const afterSuccess = () => triggerReload();
  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= draft.length) return;
    focusedId.current = draft[index].id;
    setDraft(moveItem(draft, index, direction));
    setOrdering(true);
    setAnnouncement(`${draft[index].heading} moved to position ${next + 1}`);
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
            Add New Group
          </Button>
        </div>
      )}
      {draft.length === 0 ? (
        <p>No link groups yet.</p>
      ) : (
        draft.map((group, index) => (
          <div
            key={group.id}
            className="flex-col-gap"
            id={`group-shell-${group.id}`}
          >
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                Move {group.heading} up
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={index === draft.length - 1}
                onClick={() => move(index, 1)}
              >
                Move {group.heading} down
              </Button>
            </div>
            <GroupCard
              group={group}
              mutations={mutations}
              afterSuccess={afterSuccess}
            />
          </div>
        ))
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
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <ErrorAlert title="Could not save order" message={error} />
    </div>
  );
}

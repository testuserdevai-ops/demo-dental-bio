"use client";

import {
  CaretDown,
  CaretUp,
  DotsSixVertical,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useState, type SetStateAction } from "react";
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
import { Button } from "@/app/components/ui/button";
import type { LinkGroupViewModel } from "../_lib/queries";
import { linkImagePath, removeLinkImages } from "../_lib/uploads";
import { ErrorAlert } from "./ErrorAlert";
import { GroupForm } from "./GroupForm";
import { LinkForm } from "./LinkForm";
import { LinkRow } from "./LinkRow";
import { moveItem, type LinkMutations } from "./links-manager-shared";

export function GroupCard({
  group,
  mutations,
  dragRef,
  index,
  total,
  onMove,
  afterSuccess,
  userId,
}: {
  group: LinkGroupViewModel;
  mutations: LinkMutations;
  dragRef(node: HTMLDivElement | null): void;
  index: number;
  total: number;
  onMove(from: number, to: number): void;
  afterSuccess(): void;
  userId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editingLinkIds, setEditingLinkIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [adding, setAdding] = useState(false);
  const [draftState, setDraftState] = useState(() => ({
    source: group.links,
    value: group.links,
  }));
  const draft =
    draftState.source === group.links ? draftState.value : group.links;
  const setDraft = (next: SetStateAction<typeof group.links>) => {
    setDraftState((current) => {
      const currentDraft =
        current.source === group.links ? current.value : group.links;
      return {
        source: group.links,
        value: typeof next === "function" ? next(currentDraft) : next,
      };
    });
  };
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
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
      className="flex-col-gap rounded-3xl border bg-white p-4 shadow-sm sm:p-6"
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
            aria-label={`Move group ${group.heading} up`}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <CaretUp aria-hidden="true" className="size-5" weight="bold" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move group ${group.heading} down`}
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <CaretDown aria-hidden="true" className="size-5" weight="bold" />
          </Button>
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
                    await removeLinkImages(
                      group.links.flatMap((link) => {
                        const path = link.imageUrl
                          ? linkImagePath(link.imageUrl, userId)
                          : null;
                        return path ? [path] : [];
                      }),
                    );
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
        <div
          className={
            editingLinkIds.size > 0
              ? "flex-col-gap pr-1"
              : "flex-col-gap max-h-[32rem] overflow-y-auto pr-1"
          }
          data-link-list-editing={editingLinkIds.size > 0 ? "true" : "false"}
        >
          {draft.map((link, index) => (
            <LinkRow
              key={link.id}
              groupId={group.id}
              link={link}
              index={index}
              total={draft.length}
              mutations={mutations}
              onMove={move}
              afterSuccess={afterSuccess}
              userId={userId}
              onEditingChange={(isEditing) => {
                setEditingLinkIds((current) => {
                  const next = new Set(current);
                  if (isEditing) next.add(link.id);
                  else next.delete(link.id);
                  return next;
                });
              }}
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
          userId={userId}
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

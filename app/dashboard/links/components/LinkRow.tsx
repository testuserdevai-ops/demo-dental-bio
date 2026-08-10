"use client";

import {
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  DotsSixVertical,
  Eye,
  EyeSlash,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
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
import type { LinkViewModel } from "../_lib/queries";
import { ErrorAlert } from "./ErrorAlert";
import { LinkForm } from "./LinkForm";
import { LINK_ITEM_TYPE, type LinkMutations } from "./links-manager-shared";

export function LinkRow({
  groupId,
  link,
  index,
  total,
  mutations,
  onMove,
  afterSuccess,
}: {
  groupId: string;
  link: LinkViewModel;
  index: number;
  total: number;
  mutations: LinkMutations;
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
      className="max-h-[18rem] overflow-y-auto rounded-3xl border bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="mt-1 hidden cursor-move rounded-md p-1 text-muted-foreground hover:bg-primary-5 hover:text-primary sm:block"
        >
          <DotsSixVertical className="size-5" weight="bold" />
        </div>
        <div className="flex shrink-0 flex-col">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Move ${link.title} up`}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <CaretUp aria-hidden="true" className="size-4" weight="bold" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Move ${link.title} down`}
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <CaretDown aria-hidden="true" className="size-4" weight="bold" />
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 w-full sm:w-auto">
              <h4 className="line-clamp-2 break-words font-semibold text-primary">
                {link.title}
              </h4>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {link.url}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:shrink-0">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${link.title}`}
                className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ArrowSquareOut aria-hidden="true" className="size-5" />
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={link.isActive}
                onClick={() => void toggle()}
                aria-label={`${link.isActive ? "Hide" : "Show"} ${link.title}`}
                title={link.isActive ? "Hide from profile" : "Show on profile"}
              >
                {link.isActive ? (
                  <Eye aria-hidden="true" className="size-5 text-primary" />
                ) : (
                  <EyeSlash
                    aria-hidden="true"
                    className="size-5 text-muted-foreground"
                  />
                )}
              </Button>
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

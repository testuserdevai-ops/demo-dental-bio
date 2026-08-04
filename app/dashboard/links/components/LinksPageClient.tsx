"use client";

import { Plus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Button } from "@/app/components/ui/button";
import { usePreview } from "@/app/contexts/PreviewContext";
import { useLinkAggregate, useLinkMutations } from "../_lib/hooks";
import type { LinkAggregate } from "../_lib/queries";
import { DraggableGroupCard } from "./DraggableGroupCard";
import { ErrorAlert } from "./ErrorAlert";
import { GroupForm } from "./GroupForm";
import { moveItem } from "./links-manager-shared";

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

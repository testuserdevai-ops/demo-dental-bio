"use client";
import React from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import LinkGroup from "./LinkGroup";

export default function ManageLinkGroups({
  dentistryId,
  linkGroups,
  setLinkGroups,
  isLoading,
}: {
  dentistryId: string;
  linkGroups: any[];
  setLinkGroups: React.Dispatch<React.SetStateAction<any[]>>;
  isLoading: boolean;
}) {
  return (
    <DndProvider backend={HTML5Backend}>
      {/* <h2 className="text-lg font-semibold mb-3">Manage Link Groups</h2> */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        linkGroups.map((group, index) => (
          <LinkGroup
            key={group.link_group_id}
            group={group}
            index={index}
            setGroups={setLinkGroups}
            groups={linkGroups}
          />
        ))
      )}
    </DndProvider>
  );
}

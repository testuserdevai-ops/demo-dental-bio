"use client";
import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import AddLinkForm from "./AddLinkForm";
import LinkItem from "./LinkItem";
import { Trash, PencilSimple, ArrowUp, ArrowDown } from "@phosphor-icons/react";
import ConfirmDeletePopup from "./ConfirmDeletePopup";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Fetch links for the link group
async function fetchLinks(linkGroupId: string) {
  const supabase = createClient();

  const { data: linksData, error } = await supabase
    .from("dentistry_links")
    .select(
      `
      link_id,
      links:link_id (
        link_id,
        title,
        link,
        is_active,
        rank,
        click_counter
      )
    `
    )
    .eq("link_group_id", linkGroupId);

  if (error) {
    console.error("Error fetching links:", error);
    return [];
  }

  if (!linksData || linksData.length === 0) {
    return [];
  }

  // Flatten the data structure and assign default rank if null
  const links = linksData.map((entry: any, index: number) => ({
    link_id: entry.link_id,
    title: entry.links.title,
    link: entry.links.link,
    is_active: entry.links.is_active,
    rank: entry.links.rank !== null ? entry.links.rank : index + 1,
    click_counter: entry.links.click_counter || 0
  }));

  // Sort the links by rank
  links.sort((a: any, b: any) => a.rank - b.rank);

  return links;
}

// Update link order in the database
async function updateLinkOrder(links: any[]) {
  const supabase = createClient();
  for (let i = 0; i < links.length; i++) {
    const newRank = i + 1;
    await supabase
      .from("links")
      .update({ rank: newRank })
      .eq("link_id", links[i].link_id);
  }
}

// Compare two arrays to check if their order is different
const areArraysEqual = (arr1: any[], arr2: any[]) =>
  JSON.stringify(arr1.map((t) => t.link_id)) ===
  JSON.stringify(arr2.map((t) => t.link_id));

// Update group ranks in the database after reordering
const updateGroupRanksInDB = async (groups: any[]) => {
  const supabase = createClient();
  for (let i = 0; i < groups.length; i++) {
    await supabase
      .from("link_groups")
      .update({ rank: i + 1 })
      .eq("link_group_id", groups[i].link_group_id);
  }
};

// Move a group up or down
const moveGroup = async (
  index: number,
  direction: "up" | "down",
  groups: any[],
  setGroups: any
) => {
  const newGroups = [...groups];
  if (direction === "up" && index > 0) {
    [newGroups[index], newGroups[index - 1]] = [
      newGroups[index - 1],
      newGroups[index],
    ];
  } else if (direction === "down" && index < newGroups.length - 1) {
    [newGroups[index], newGroups[index + 1]] = [
      newGroups[index + 1],
      newGroups[index],
    ];
  }
  setGroups(newGroups);
  await updateGroupRanksInDB(newGroups); // Update the group ranks in the database after the change
  const event = new Event("iframeRefresh");
  window.dispatchEvent(event);
};

export default function LinkGroup({ group, index, setGroups, groups }: any) {
  const [links, setLinks] = useState<any[]>([]);
  const [initialLinks, setInitialLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newHeading, setNewHeading] = useState(group.heading);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [hasRearranged, setHasRearranged] = useState(false);

  // Load links for the group
  const loadLinks = async () => {
    setIsLoading(true);
    const fetchedLinks = await fetchLinks(group.link_group_id);
    setLinks(fetchedLinks);
    setInitialLinks(fetchedLinks); // Store the initial order
    setIsLoading(false);
  };

  useEffect(() => {
    loadLinks();
  }, [group.link_group_id]);

  // Move link in the list
  const moveLink = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updatedLinks = [...links];
      const [movedLink] = updatedLinks.splice(fromIndex, 1);
      updatedLinks.splice(toIndex, 0, movedLink);
      setLinks(updatedLinks);

      // Check if the new order is different from the initial order
      if (!areArraysEqual(updatedLinks, initialLinks)) {
        setHasRearranged(true);
      } else {
        setHasRearranged(false);
      }
    },
    [links, initialLinks]
  );

  // Handle saving the new order of links
  const handleSaveOrder = async () => {
    await updateLinkOrder(links);
    loadLinks();
    setHasRearranged(false);
  };

  // Handle group title edit
  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("link_groups")
      .update({ heading: newHeading })
      .eq("link_group_id", group.link_group_id);

    if (updateError) {
      console.error("Error updating group heading:", updateError);
    } else {
      setIsEditing(false);
      const event = new Event("iframeRefresh");
      window.dispatchEvent(event);
    }
  };

  // Show confirmation popup for deletion
  const handleDeleteGroup = async () => {
    setShowDeletePopup(true);
  };

  const confirmDeleteGroup = async () => {
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("link_groups")
      .delete()
      .eq("link_group_id", group.link_group_id);

    if (deleteError) {
      console.error("Error deleting group:", deleteError);
    } else {
      setGroups(
        groups.filter((g: any) => g.link_group_id !== group.link_group_id)
      );
    }

    setShowDeletePopup(false);
    const event = new Event("iframeRefresh");
    window.dispatchEvent(event);
  };

  const cancelDelete = () => {
    setShowDeletePopup(false);
  };

  return (
    <div className="link-group pb-10 mt-10 border-b border-neutral-300">
      {isEditing ? (
        <form onSubmit={handleEditGroup} className="mb-3">
          <input
            type="text"
            value={newHeading}
            onChange={(e) => setNewHeading(e.target.value)}
            className="w-full p-2 rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal"
            placeholder="Group Heading"
          />
          <div className="flex gap-2 pt-2 w-full justify-end">
            <button
              className="bg-primary-1 hover:bg-[#302A83] transition-all text-white py-1.5 rounded-[26px] text-md px-3 font-semibold flex items-center gap-2"
              type="submit"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-neutral-500 hover:bg-opacity-80 transition-all text-white py-1.5 rounded-[26px] text-md px-3 font-semibold flex items-center gap-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="member-card-heading">
            <div className="flex items-center justify-between gap-1">
              {/* Move Group Icons */}
              <div className="flex">
                <div className="p-1 rounded-md hover:bg-black hover:bg-opacity-5 transition-all">
                  <ArrowUp
                    className="cursor-pointer w-4 h-4"
                    onClick={() => moveGroup(index, "up", groups, setGroups)}
                  />
                </div>
                <div className="p-1 rounded-md hover:bg-black hover:bg-opacity-5 transition-all">
                  <ArrowDown
                    className="cursor-pointer w-4 h-4"
                    onClick={() => moveGroup(index, "down", groups, setGroups)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 member-heading">
                {/* Heading Text */}
                <p className="mb-0">{group.heading}</p>
                {/* Edit Icon */}
                <PencilSimple
                  onClick={() => setIsEditing(true)}
                  className="cursor-pointer"
                />
              </div>
              {/* Trash Icon */}
              <Trash onClick={handleDeleteGroup} className="cursor-pointer" />
            </div>
          </div>
        </>
      )}

      {/* Links List */}
      <DndProvider backend={HTML5Backend}>
        <ul className="pl-0 w-full mb-2">
          {isLoading ? (
            <div>Loading...</div>
          ) : links.length > 0 ? (
            links.map((link, index) => (
              <LinkItem
                key={link.link_id}
                index={index}
                link={link}
                moveLink={moveLink}
                setLinks={setLinks}
                links={links}
                linkGroupId={group.link_group_id}
              />
            ))
          ) : (
            <div className="text-center">No links added yet</div>
          )}
        </ul>
      </DndProvider>
      {/* Save Order Button */}
      {hasRearranged && (
        <div className="w-full flex justify-end mt-4 mb-4">
          <button
            className={`bg-primary-1 hover:bg-[#302A83] transition-all text-white p-2 rounded-[26px] py-2 text-lg px-3 font-semibold flex items-center gap-2`}
            onClick={handleSaveOrder}
          >
            Save link order
          </button>
        </div>
      )}
      <AddLinkForm linkGroupId={group.link_group_id} onLinkAdded={loadLinks} />

      {/* Render the delete confirmation popup */}
      {showDeletePopup && (
        <ConfirmDeletePopup
          onConfirm={confirmDeleteGroup}
          onCancel={cancelDelete}
          groupTitle={group.heading}
          links={links}
        />
      )}
    </div>
  );
}

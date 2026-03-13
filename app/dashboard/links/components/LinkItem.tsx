"use client";
import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Trash,
  PencilSimple,
  ArrowSquareOut,
  CaretUp,
  CaretDown,
  ChartBar,
} from "@phosphor-icons/react";
import { useDrag, useDrop } from "react-dnd";
import Link from "next/link";
import Switcher from '@/app/components/Switcher'

const ItemType = {
  LINK: "link",
};

export default function LinkItem({
  link,
  index,
  moveLink,
  setLinks,
  links,
  linkGroupId,
}: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(link.title);
  const [newLinkUrl, setNewLinkUrl] = useState(link.link);
  const [isActive, setIsActive] = useState(link.is_active);

  const ref = React.useRef<HTMLLIElement>(null);

  const [, drag] = useDrag({
    type: ItemType.LINK,
    item: { index },
  });

  const [, drop] = useDrop({
    accept: ItemType.LINK,
    hover: (draggedItem: any) => {
      if (draggedItem.index !== index) {
        moveLink(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  drag(drop(ref));

  // Handle toggling the is_active field
  const handleToggleActive = async () => {
    const supabase = createClient();

    const { error } = await supabase
      .from("links")
      .update({ is_active: !isActive })
      .eq("link_id", link.link_id);

    if (error) {
      console.error("Error updating is_active field:", error);
    } else {
      setIsActive(!isActive);
      const event = new Event("iframeRefresh");
      window.dispatchEvent(event);
    }
  };

  // Handle deleting a link
  const handleDeleteLink = async () => {
    const supabase = createClient();

    // First, delete the link from the `dentistry_links` table
    const { error: dentistryLinksError } = await supabase
      .from("dentistry_links")
      .delete()
      .eq("link_id", link.link_id);

    if (dentistryLinksError) {
      console.error(
        "Error deleting from dentistry_links:",
        dentistryLinksError
      );
      return;
    }

    // Then, delete the actual link from the `links` table
    const { error: linksError } = await supabase
      .from("links")
      .delete()
      .eq("link_id", link.link_id);

    if (linksError) {
      console.error("Error deleting from links:", linksError);
      return;
    }

    // Remove the deleted link from the local state
    const updatedLinks = links.filter((l: any) => l.link_id !== link.link_id);

    // Update ranks of remaining links
    const reRankedLinks = updatedLinks.map((l: any, idx: number) => ({
      ...l,
      rank: idx + 1,
    }));

    setLinks(reRankedLinks);

    // Update ranks in the database
    for (let i = 0; i < reRankedLinks.length; i++) {
      const { error: rankError } = await supabase
        .from("links")
        .update({ rank: reRankedLinks[i].rank })
        .eq("link_id", reRankedLinks[i].link_id);
      if (rankError) {
        console.error("Error updating rank:", rankError);
      }
    }

    const event = new Event("iframeRefresh");
    window.dispatchEvent(event);
  };

  // Handle editing a link
  const handleEditLink = async () => {
    const supabase = createClient();

    const { error } = await supabase
      .from("links")
      .update({ title: newTitle, link: newLinkUrl })
      .eq("link_id", link.link_id);

    if (error) {
      console.error("Error updating link:", error);
    } else {
      setIsEditing(false);
      const updatedLinks = links.map((l: any) =>
        l.link_id === link.link_id
          ? { ...l, title: newTitle, link: newLinkUrl }
          : l
      );
      setLinks(updatedLinks);
      const event = new Event("iframeRefresh");
      window.dispatchEvent(event);
    }
  };

  return (
    <li
      ref={ref}
      className="flex justify-between items-center mb-2 bg-transparent w-full"
    >
      {isEditing ? (
        <div className="flex flex-col max-w-100 w-full">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full p-2 rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal mb-2"
            placeholder="Link Title"
          />
          <input
            type="text"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            className="w-full p-2 rounded-[26px] py-2 text-base px-3 placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal"
            placeholder="Link URL"
          />
          <div className="flex gap-2 pt-2 w-full justify-end">
            <button
              onClick={handleEditLink}
              className="bg-primary-1 hover:bg-deep-purple transition-all text-white py-1.5 rounded-[26px] text-md px-3 font-semibold flex items-center gap-2"
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
        </div>
      ) : (
        <div className="w-full px-6 py-3 bg-white shadow rounded-[26px] overflow-hidden flex items-center gap-4">
          <div className="w-full flex items-center gap-4">
            {/* Drag Handle */}
            <div className="cursor-move">
              <CaretUp className="-mb-0.5" weight="bold" />
              <CaretDown className="-mt-0.5" weight="bold" />
            </div>
            <div className="w-full flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 member-heading">
                    <p className="mb-0">{link.title}</p>
                    {/* Edit Icon */}
                    <PencilSimple
                      onClick={() => setIsEditing(true)}
                      className="cursor-pointer"
                    />
                  </div>
                  {/* Link */}
                  <p className="links-wrapper mb-0">{link.link}</p>
                </div>
                {/* Link and Switch */}
                <div className="flex gap-1 items-center">
                  <Link
                    href={link.link}
                    target="_blank"
                    className="w-8 h-8 p-0.5 hover:bg-neutral-100 hover:text-neutral-700 text-neutral-900 flex items-center justify-center rounded-md transition-all"
                  >
                    <ArrowSquareOut size={20} />
                  </Link>
                  <Switcher isChecked={isActive} onToggle={handleToggleActive} />
                </div>
              </div>

              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <ChartBar size={20} />
                  <p className="text-sm text-neutral-500">
                    {link.click_counter || 0} click{(link.click_counter || 0) > 1 && 's'}
                  </p>
                </div>
                <button
                  onClick={handleDeleteLink}
                  className="w-8 h-8 p-0.5 hover:bg-red-100 hover:text-red-700 flex items-center justify-center rounded-md transition-all"
                >
                  <Trash size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

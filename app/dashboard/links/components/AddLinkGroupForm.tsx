"use client";
import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { usePreview } from "@/app/contexts/PreviewContext";
import { groupNameSchema } from "@/lib/validation";
import { showErrorToast } from "@/utils/Toast";

export default function AddLinkGroupForm({
  dentistryId,
  onGroupAdded,
}: {
  dentistryId: string;
  onGroupAdded: (newGroup: any) => void;
}) {
  const [heading, setHeading] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { triggerReload } = usePreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = groupNameSchema.safeParse({ name: heading });
    if (!validation.success) {
      showErrorToast(validation.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { data: newGroup, error } = await supabase
      .from("link_groups")
      .insert([{ heading, dentistry_id: dentistryId }])
      .select("link_group_id, heading, rank")
      .single();

    if (error) {
      console.error("Error adding link group:", error);
      setIsLoading(false);
      return;
    }

    setHeading(""); // Reset the input after adding the group
    setIsLoading(false);
    setShowForm(false); // Hide the form after successful submission

    // Call the callback to update parent state
    onGroupAdded(newGroup);
    triggerReload();
  };

  return (
    <div className="w-full">
      {/* Button to toggle the form */}
      {!showForm && (
        <div className="add-btn">
          <button onClick={() => setShowForm(true)}>Add New Group</button>
        </div>
      )}

      {/* Form to add a new link group */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-full"
        >
          <input
            type="text"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            className="w-full p-2 rounded-[26px] py-2 text-lg px-3 placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal mb-2"
            placeholder="Group Title"
            required
          />
          <div className="flex gap-2 pt-2 w-full justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary-1 hover:bg-[#302A83] transition-all text-white py-1.5 rounded-[26px] text-md px-3 font-semibold flex items-center gap-2"
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-neutral-500 hover:bg-opacity-80 transition-all text-white py-1.5 rounded-[26px] text-md px-3 font-semibold flex items-center gap-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

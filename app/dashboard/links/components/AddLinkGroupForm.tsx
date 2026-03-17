"use client";
import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { usePreview } from "@/app/contexts/PreviewContext";
import { groupNameSchema, zodFieldErrors } from "@/lib/validation";

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { triggerReload } = usePreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = groupNameSchema.safeParse({ name: heading });
    if (!validation.success) {
      setErrors(zodFieldErrors(validation.error));
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
            onChange={(e) => { setHeading(e.target.value); errors.name && setErrors((prev) => ({ ...prev, name: "" })); }}
            className={`w-full p-2 rounded-[26px] py-2 text-lg px-3 placeholder:text-neutral-500 text-neutral-800 placeholder:font-normal ${errors.name ? 'ring-1 ring-red-500 mb-1' : 'mb-2'}`}
            placeholder="Group Title"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1 mb-2 pl-4">{errors.name}</p>}
          <div className="flex gap-2 pt-2 w-full justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary-1 hover:bg-deep-purple transition-all text-white py-1.5 rounded-[26px] text-md px-3 font-semibold flex items-center gap-2"
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

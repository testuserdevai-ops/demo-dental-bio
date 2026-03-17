"use client";
import React, { useState } from "react";
import LabeledInput from "../../components/LabeledInput";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { apiClient } from '@/services/apiClient';
import { groupNameSchema, zodFieldErrors } from "@/lib/validation";

export default function AddNewGroupForm({
  onAdd,
  targetUserId,
  enabled = false,
}: {
  onAdd: (group: BlogGroupType) => void,
  targetUserId: string | null;
  enabled?: boolean;
}) {
  const [heading, setHeading] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false); // State to toggle form visibility
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = groupNameSchema.safeParse({ name: heading });
    if (!validation.success) {
      setErrors(zodFieldErrors(validation.error));
      return;
    }

    setIsLoading(true);

    const formData = { name: heading, targetUserId };

    try {
      const result = await apiClient.post('/api/blog-groups', formData);
      onAdd(result);
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
    }

    setHeading(""); // Reset the input after adding the group
    setIsLoading(false);
    setShowForm(false); // Hide the form after successful submission
  };

  return (
    <div className="w-full">
      {/* Button to toggle the form */}
      {!showForm && (
        <>
          <FullRoundedButton className="w-full mb-4 py-3 text-xl" onClick={() => setShowForm(true)} disabled={!enabled}>Add New Group</FullRoundedButton>
        </>
      )}

      {/* Form to add a new link group */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex-col-gap max-w-100 w-full"
        >
          <LabeledInput
            label="Group Title"
            name="name"
            type="text"
            value={heading}
            onChange={(e) => { setHeading(e.target.value); errors.name && setErrors((prev) => ({ ...prev, name: "" })); }}
            error={errors.name}
          />
          <div className="flex gap-2 pt-2 mb-4 w-full justify-end">
            <FullRoundedButton
              type="submit"
              isLoading={isLoading}
            >
              Save
            </FullRoundedButton>
            <FullRoundedButton
              type="button"
              onClick={() => setShowForm(false)}
              buttonType="ghost"
            >
              Cancel
            </FullRoundedButton>
          </div>
        </form>
      )}
    </div>
  );
}

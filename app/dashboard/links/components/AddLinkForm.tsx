"use client";
import React, { useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import LabeledInput from "@/app/dashboard/components/LabeledInput";

import { LinkSimple, TextT } from "@phosphor-icons/react";
import { usePreview } from "@/app/contexts/PreviewContext";
import { isValidUrlRegex } from "@/lib/validation";
import { normalizeUrl } from "@/utils/functions/functions";
import { showErrorToast } from "@/utils/Toast";

export default function AddLinkForm({
  linkGroupId,
  onLinkAdded,
}: {
  linkGroupId: string;
  onLinkAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false); // Toggle form visibility
  const formRef = useRef<HTMLFormElement>(null);

  const { triggerReload } = usePreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalUrl = normalizeUrl(linkUrl);

    console.log(finalUrl);
    console.log(isValidUrlRegex(finalUrl))

    if (!isValidUrlRegex(finalUrl)) {
      showErrorToast("This doesn’t seem like a real link.")
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    // Insert into links table
    const { data: newLink, error: linkError } = await supabase
      .from("links")
      .insert([{ title, link: finalUrl }])
      .select("link_id")
      .single();

    if (linkError) {
      console.error("Error adding link:", linkError);
      setIsLoading(false);
      return;
    }

    // Link the new link to the group
    const { error: linkGroupError } = await supabase
      .from("dentistry_links")
      .insert([{ link_group_id: linkGroupId, link_id: newLink.link_id }]);

    if (linkGroupError) {
      console.error("Error linking link to group:", linkGroupError);
      setIsLoading(false);
      return;
    }

    setTitle("");
    setLinkUrl("");
    setIsLoading(false);
    setShowForm(false); // Hide the form after successful submission

    // Callback to inform parent that a link was added
    onLinkAdded();
    triggerReload();
  };

  return (
    <div className="w-full flex flex-col items-end">
      {/* Button to toggle the form */}
      {!showForm && (
        <FullRoundedButton
          onClick={() => setShowForm(true)}
        >
          Add New Link
        </FullRoundedButton>
      )}

      {/* Form to add a new link */}
      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-col-gap w-full mt-4"
        >
          <LabeledInput
            label="Title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter link title"
            required
          >
            <TextT size={20} className="text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
          </LabeledInput>
          <LabeledInput
            label="URL"
            name="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Enter URL"
            required
          >
            <LinkSimple size={20} className="text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
          </LabeledInput>
          <div className="flex gap-2 w-full justify-end">
            <FullRoundedButton
              // onClick={handleUrl}
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
            >
              {isLoading ? "Saving..." : "Save"}
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

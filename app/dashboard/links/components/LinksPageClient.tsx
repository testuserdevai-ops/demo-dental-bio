"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import AddLinkGroupForm from "./AddLinkGroupForm";
import ManageLinkGroups from "./ManageLinkGroups";

// Fetch link groups for the Dentistry
async function fetchLinkGroups(dentistryId: string) {
  const supabase = createClient();
  const { data: linkGroups, error } = await supabase
    .from("link_groups")
    .select("link_group_id, heading, rank")
    .eq("dentistry_id", dentistryId)
    .order("rank");

  if (error) {
    console.error(error);
    return [];
  }

  return linkGroups;
}

export default function LinksPageClient({
  dentistryId,
}: {
  dentistryId: string;
}) {
  const [linkGroups, setLinkGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch link groups on load
  const loadLinkGroups = async () => {
    setIsLoading(true);
    const fetchedLinkGroups = await fetchLinkGroups(dentistryId);
    setLinkGroups(fetchedLinkGroups);
    setIsLoading(false);
  };

  useEffect(() => {
    loadLinkGroups();
  }, [dentistryId]);

  // Handle new group added
  const handleGroupAdded = (newGroup: any) => {
    setLinkGroups((prevGroups) => [...prevGroups, newGroup]);
  };

  return (
    <div>
      <AddLinkGroupForm
        dentistryId={dentistryId}
        onGroupAdded={handleGroupAdded}
      />
      <ManageLinkGroups
        dentistryId={dentistryId}
        linkGroups={linkGroups}
        setLinkGroups={setLinkGroups}
        isLoading={isLoading}
      />
    </div>
  );
}

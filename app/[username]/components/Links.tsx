"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useNavbar } from "@/app/contexts/NavbarContext";

export default function Links({ dentistryId }: { dentistryId: string }) {
  const [linkGroups, setLinkGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { setNavItemState } = useNavbar();

  // Function to handle link clicks and track them
  const handleLinkClick = (linkId: string, linkUrl: string) => {
    // Track click in background
    fetch('/api/links/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId }),
    }).catch((error) => console.error('Error tracking link click:', error));

    // Open link immediately
    window.open(linkUrl, '_blank', 'noopener,noreferrer');
  };


  // Fetch the link groups and associated links from Supabase
  useEffect(() => {
    async function fetchLinks() {
      const supabase = createClient();

      // Fetch the link groups and join the related links
      const { data: linkGroupsData, error } = await supabase
        .from("link_groups")
        .select(`
          link_group_id, 
          heading, 
          rank, 
          dentistry_links ( 
            links ( link_id, title, link, is_active, rank, click_counter ) 
          )
        `)
        .eq("dentistry_id", dentistryId)
        .order("rank");

      if (error) {
        console.error("Error fetching link groups:", error);
        setLoading(false);
        return;
      }

      linkGroupsData.forEach((group: any) => {
        if (group.dentistry_links.filter((dentistryLink: any) => dentistryLink.links.is_active !== false).length > 0) {
          setNavItemState("Links", true);
        }
      });

      setLinkGroups(linkGroupsData);
      setLoading(false);
    }

    fetchLinks();
  }, [dentistryId]);

  // Show loading message while fetching data
  if (loading) {
    return <h2 className="section-heading-meditation">Loading links...</h2>;
  }

  // If no link groups are available, show a placeholder message
  if (linkGroups.length === 0) {
    return <></>;
  }

  // Render link groups and links
  return (
    <section id="links">
      {linkGroups.map((group) => (
        <div key={group.link_group_id}>
          {(group.dentistry_links.filter((dentistryLink: any) => dentistryLink.links.is_active !== false).length > 0) &&
            <div>
              <h1 className="text-center section-heading-meditation text-[23px] md:text-[26px] font-semibold">
                {group.heading || "Untitled Group"}
              </h1>

              {/* If no links in this group, show a message */}
              {group.dentistry_links.length === 0 ? (
                <p className="text-center">No links in this group</p>
              ) : (
                group.dentistry_links
                  // Filter links based on is_active being true or null
                  .filter(
                    (dentistryLink: any) => dentistryLink.links.is_active !== false
                  )
                  // Sort links by rank, with nulls at the end
                  .sort((a: any, b: any) => {
                    const rankA = a.links.rank;
                    const rankB = b.links.rank;

                    // Handle null ranks by pushing them to the end
                    if (rankA === null && rankB === null) return 0;
                    if (rankA === null) return 1;
                    if (rankB === null) return -1;

                    // Compare non-null ranks
                    return rankA - rankB;
                  })
                  .map((dentistryLink: any, linkIndex: number) => (
                    <div key={linkIndex} className="col-12">
                      <div className="toplinks-main">
                        <a
                          href={dentistryLink.links.link || "#"}
                          className="text-center toplinks-wrapper toplinks-without-image"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.preventDefault(); // prevent immediate navigation
                            handleLinkClick(dentistryLink.links.link_id, dentistryLink.links.link);
                          }}
                        >
                          <span>{dentistryLink.links.title || "Untitled Link"}</span>
                        </a>

                      </div>
                    </div>
                  ))
              )}
            </div>}
        </div>
      ))}
    </section>
  );
}

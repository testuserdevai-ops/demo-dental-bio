"use client";

export default function Links({
  serverLinkGroups,
}: {
  serverLinkGroups: any[];
}) {
  const handleLinkClick = (linkId: string, linkUrl: string) => {
    fetch("/api/links/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId }),
    }).catch((error) => console.error("Error tracking link click:", error));

    window.open(linkUrl, "_blank", "noopener,noreferrer");
  };

  if (serverLinkGroups.length === 0) {
    return <></>;
  }

  return (
    <section id="links">
      <div className="flex flex-col gap-7">
        {serverLinkGroups.map((group) => (
          <div key={group.link_group_id}>
            {group.dentistry_links.filter(
              (dentistryLink: any) => dentistryLink.links.is_active !== false,
            ).length > 0 && (
              <>
                <h1 className="text-center text-[23px] md:text-[26px] mb-7 font-semibold">
                  {group.heading || "Untitled Group"}
                </h1>

                {/* If no links in this group, show a message */}
                {group.dentistry_links.length === 0 ? (
                  <p className="text-center">No links in this group</p>
                ) : (
                  <div className="flex-col-gap">
                    {group.dentistry_links
                      // Filter links based on is_active being true or null
                      .filter(
                        (dentistryLink: any) =>
                          dentistryLink.links.is_active !== false,
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
                                handleLinkClick(
                                  dentistryLink.links.link_id,
                                  dentistryLink.links.link,
                                );
                              }}
                            >
                              <span>
                                {dentistryLink.links.title || "Untitled Link"}
                              </span>
                            </a>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

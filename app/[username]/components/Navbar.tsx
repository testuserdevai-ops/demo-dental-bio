import React from "react";
import {
  TrackedButton,
  TrackedLink,
} from "@/app/components/analytics/TrackedAction";

type NavbarProps = {
  toggleShopOpen: () => void;
  isFreePlan: boolean;
  navState: NavBarStatusType;
  shopBehavior?: "toggle" | "navigate";
};

export default function Navbar({
  toggleShopOpen,
  isFreePlan,
  navState,
  shopBehavior = "toggle",
}: NavbarProps) {
  const handleScroll = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    target: string,
  ) => {
    e.preventDefault(); // Prevent default anchor behavior

    const targetElement = document.querySelector(target);
    const offset = 120; // Adjust this value for your navbar height or desired gap
    const elementPosition =
      targetElement!.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth", // Enables smooth scrolling
    });
  };

  return (
    <>
      {Object.entries(navState).some(
        ([key, value]) => (isFreePlan || key !== "Location") && value === true,
      ) && (
        <section className="flex justify-center">
          <nav className="navbar justify-center navbar-expand p-0">
            <div className="navbar-wrapper">
              <ul className="navbar-nav custom-navbar-links justify-around">
                {navState.Links && (
                  <li className="nav-item">
                    <TrackedLink
                      analytics={{
                        action: {
                          type: "navigation_click",
                          destination: "links",
                        },
                        section: "navigation",
                      }}
                      className="nav-link active"
                      aria-current="page"
                      href="#links"
                      onClick={(e) => handleScroll(e, "#links")}
                    >
                      Links
                    </TrackedLink>
                  </li>
                )}
                {navState.Blog && (
                  <li className="nav-item">
                    <TrackedLink
                      analytics={{
                        action: {
                          type: "navigation_click",
                          destination: "blog",
                        },
                        section: "navigation",
                      }}
                      className="nav-link"
                      href="#blog"
                      onClick={(e) => handleScroll(e, "#blog")}
                    >
                      Blog
                    </TrackedLink>
                  </li>
                )}
                {navState.Gallery && (
                  <li className="nav-item">
                    <TrackedLink
                      analytics={{
                        action: {
                          type: "navigation_click",
                          destination: "gallery",
                        },
                        section: "navigation",
                      }}
                      className="nav-link"
                      href="#gallery"
                      onClick={(e) => handleScroll(e, "#gallery")}
                    >
                      Gallery
                    </TrackedLink>
                  </li>
                )}
                {navState.Videos && (
                  <li className="nav-item">
                    <TrackedLink
                      analytics={{
                        action: {
                          type: "navigation_click",
                          destination: "video",
                        },
                        section: "navigation",
                      }}
                      className="nav-link"
                      href="#video"
                      onClick={(e) => handleScroll(e, "#video")}
                    >
                      Videos
                    </TrackedLink>
                  </li>
                )}
                {navState.Reviews && (
                  <li className="nav-item">
                    <TrackedLink
                      analytics={{
                        action: {
                          type: "navigation_click",
                          destination: "review",
                        },
                        section: "navigation",
                      }}
                      className="nav-link"
                      href="#review"
                      onClick={(e) => handleScroll(e, "#review")}
                    >
                      Reviews
                    </TrackedLink>
                  </li>
                )}
                {navState.Location && isFreePlan && (
                  <li className="nav-item">
                    <TrackedLink
                      analytics={{
                        action: {
                          type: "navigation_click",
                          destination: "location",
                        },
                        section: "navigation",
                      }}
                      className="nav-link"
                      href="#location"
                      onClick={(e) => handleScroll(e, "#location")}
                    >
                      Location
                    </TrackedLink>
                  </li>
                )}
                {navState.Shop && (
                  <li className="nav-item">
                    {shopBehavior === "navigate" ? (
                      <TrackedLink
                        analytics={{
                          action: {
                            type: "navigation_click",
                            destination: "shop",
                          },
                          section: "navigation",
                        }}
                        className="nav-link"
                        href="#shop"
                        onClick={(event) => handleScroll(event, "#shop")}
                      >
                        Shop
                      </TrackedLink>
                    ) : (
                      <TrackedButton
                        analytics={{
                          action: {
                            type: "navigation_click",
                            destination: "shop",
                          },
                          section: "navigation",
                        }}
                        className="nav-link cursor-pointer"
                        onClick={toggleShopOpen}
                      >
                        Shop
                      </TrackedButton>
                    )}
                  </li>
                )}
              </ul>
            </div>
          </nav>
        </section>
      )}
    </>
  );
}

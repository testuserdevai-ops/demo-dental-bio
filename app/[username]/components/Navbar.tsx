import React from "react";

type NavbarProps = {
  toggleShopOpen: () => void;
  isFreePlan: boolean;
  navState: NavBarStatusType;
};

export default function Navbar({
  toggleShopOpen,
  isFreePlan,
  navState,
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
                    <a
                      className="nav-link active"
                      aria-current="page"
                      href="#links"
                      onClick={(e) => handleScroll(e, "#links")}
                    >
                      Links
                    </a>
                  </li>
                )}
                {navState.Blog && (
                  <li className="nav-item">
                    <a
                      className="nav-link"
                      href="#blog"
                      onClick={(e) => handleScroll(e, "#blog")}
                    >
                      Blog
                    </a>
                  </li>
                )}
                {navState.Gallery && (
                  <li className="nav-item">
                    <a
                      className="nav-link"
                      href="#gallery"
                      onClick={(e) => handleScroll(e, "#gallery")}
                    >
                      Gallery
                    </a>
                  </li>
                )}
                {navState.Videos && (
                  <li className="nav-item">
                    <a
                      className="nav-link"
                      href="#video"
                      onClick={(e) => handleScroll(e, "#video")}
                    >
                      Videos
                    </a>
                  </li>
                )}
                {navState.Reviews && (
                  <li className="nav-item">
                    <a
                      className="nav-link"
                      href="#review"
                      onClick={(e) => handleScroll(e, "#review")}
                    >
                      Reviews
                    </a>
                  </li>
                )}
                {navState.Location && isFreePlan && (
                  <li className="nav-item">
                    <a
                      className="nav-link"
                      href="#location"
                      onClick={(e) => handleScroll(e, "#location")}
                    >
                      Location
                    </a>
                  </li>
                )}
                {navState.Shop && (
                  <li className="nav-item">
                    <button
                      className="nav-link cursor-pointer"
                      onClick={toggleShopOpen}
                    >
                      Shop
                    </button>
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

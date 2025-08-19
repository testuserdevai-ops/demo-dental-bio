import React from "react";
import Link from "next/link";

export default function ToggleNavigation({ activePage }: { activePage: "treatments" | "services" }) {
  return (
    <div id="toggle-navigation">
      <Link href="/dashboard/treatments">
        <button className={activePage === "treatments" ? "active" : ""}>Treatments</button>
      </Link>
      <Link href="/dashboard/services">
        <button className={activePage === "services" ? "active" : ""}>Services</button>
      </Link>
    </div>
  );
}

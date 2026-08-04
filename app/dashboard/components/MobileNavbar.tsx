"use client";
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import SidebarItems from "./SidebarItems";
import type { DashboardShellViewModel } from "@/lib/dashboard/types";

const MobileNavbar = ({ shell }: { shell: DashboardShellViewModel }) => {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");

  const [isOpen, setIsOpen] = useState(false);
  const proAvailable =
    shell.subscriptionStatus === "PRO" ||
    shell.subscriptionStatus === "PREMIUM PRO";
  const premiumProAvailable = shell.subscriptionStatus === "PREMIUM PRO";

  // Function to toggle the sidebar visibility
  const handleToggle = () => setIsOpen(!isOpen);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      <nav className="ng-white xxl:hidden">
        <div className="container mx-auto p-0">
          <button
            className="xxl:hidden absolute right-0 -top-4 p-4"
            onClick={handleToggle}
          >
            <ListIcon size={32} className="text-gray-700" />
          </button>

          {/* Offcanvas Sidebar */}
          <div
            className={`fixed top-0 left-0 h-full w-full max-w-[400px] bg-white shadow-lg transform ${
              isOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-300 ease-in-out z-50`}
          >
            <div className="xxl:hidden w-full flex justify-end items-center p-3">
              <button
                type="button"
                className="text-gray-700"
                onClick={handleClose}
                aria-label="Close"
              >
                <XIcon size={28} />
              </button>
            </div>

            <div className="w-full flex flex-col overflow-y-auto px-4 py-5">
              <SidebarItems
                setIsOpen={handleClose}
                proAvailable={proAvailable}
                premiumProAvailable={premiumProAvailable}
                targetUserId={targetUserId as string}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleClose}
        ></div>
      )}
    </>
  );
};

export default MobileNavbar;

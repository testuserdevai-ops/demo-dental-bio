"use client";
import React, { useLayoutEffect, useRef } from "react";
import {
  HouseIcon,
  MapPinIcon,
  HeartIcon,
  LinkSimpleIcon,
  NewspaperIcon,
  ImageIcon,
  CheckSquareIcon,
  VideoIcon,
  ShoppingCartSimpleIcon,
  SealCheckIcon,
  LinkBreakIcon,
  GearIcon,
  Globe as GlobeIcon,
  CreditCard as CreditCardIcon,
  ChartLineUpIcon,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import SidebarItem from "./SidebarItem";

interface SidebarItemsProps {
  setIsOpen: (isOpen: boolean) => void;
  proAvailable: boolean;
  premiumProAvailable: boolean;
  targetUserId: string;
}

const SidebarItems = ({
  setIsOpen,
  proAvailable = false,
  premiumProAvailable = false,
  targetUserId,
}: SidebarItemsProps) => {
  const generateUrl = (url: string) =>
    targetUserId ? `${url}?userId=${targetUserId}` : url;

  const sidebarItems = [
    {
      label: "Bio",
      link: generateUrl("/dashboard"),
      enabled: true,
      Icon: HouseIcon,
    },
    {
      label: "Locations",
      link: generateUrl("/dashboard/location"),
      enabled: true,
      Icon: MapPinIcon,
    },
    {
      label: "Treatments / Services",
      link: generateUrl("/dashboard/treatments"),
      enabled: true,
      Icon: HeartIcon,
    },
    {
      label: "Links",
      link: generateUrl("/dashboard/links"),
      enabled: true,
      Icon: LinkSimpleIcon,
    },
    {
      label: "Analytics",
      link: generateUrl("/dashboard/analytics"),
      enabled: true,
      Icon: ChartLineUpIcon,
    },
    {
      label: "Blogs",
      link: generateUrl("/dashboard/blog"),
      enabled: proAvailable,
      Icon: NewspaperIcon,
    },
    {
      label: "Gallery",
      link: generateUrl("/dashboard/gallery"),
      enabled: proAvailable,
      Icon: ImageIcon,
    },
    {
      label: "Reviews",
      link: generateUrl("/dashboard/review"),
      enabled: proAvailable,
      Icon: CheckSquareIcon,
    },
    {
      label: "Videos",
      link: generateUrl("/dashboard/video"),
      enabled: proAvailable,
      Icon: VideoIcon,
    },
    {
      label: "Shop",
      link: generateUrl("/dashboard/shop"),
      enabled: proAvailable,
      Icon: ShoppingCartSimpleIcon,
    },
    {
      label: "Verification",
      link: generateUrl("/dashboard/verification"),
      enabled: proAvailable,
      Icon: SealCheckIcon,
    },
    {
      label: "Get One Month Free",
      link: generateUrl("/dashboard/referral"),
      enabled: proAvailable,
      Icon: LinkBreakIcon,
    },
    {
      label: "Custom Domain",
      link: generateUrl("/dashboard/domain"),
      enabled: premiumProAvailable,
      Icon: GlobeIcon,
    },
    {
      label: "Subscription",
      link: generateUrl("/dashboard/subscription"),
      enabled: true,
      Icon: CreditCardIcon,
    },
    {
      label: "Settings",
      link: generateUrl("/dashboard/settings"),
      enabled: true,
      Icon: GearIcon,
    },
  ];

  const pathname = usePathname();
  const scrollPositionRef = useRef<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const position = scrollPositionRef.current;
    if (!position) return;

    const animationFrame = requestAnimationFrame(() => {
      window.scrollTo(position.x, position.y);
      scrollPositionRef.current = null;
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [pathname]);

  const handleClose = () => {
    scrollPositionRef.current = { x: window.scrollX, y: window.scrollY };
    setIsOpen(false);
  };

  return (
    <div>
      {sidebarItems.map((item, index) => (
        <SidebarItem
          key={index}
          label={item.label}
          link={item.link}
          isActive={pathname === item.link.split("?")[0]}
          enabled={item.enabled}
          Icon={item.Icon}
          onClick={handleClose}
        />
      ))}
    </div>
  );
};

export default SidebarItems;

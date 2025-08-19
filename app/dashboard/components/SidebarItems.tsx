'use client'
import React from 'react'
import { HouseIcon, MapPinIcon, HeartIcon, LinkSimpleIcon, NewspaperIcon, ImageIcon, CheckSquareIcon, VideoIcon, ShoppingCartSimpleIcon, SealCheckIcon, LinkBreakIcon, GearIcon } from '@phosphor-icons/react'
import { usePathname } from "next/navigation";
import SidebarItem from './SidebarItem';

interface SidebarItemsProps {
  setIsOpen: (isOpen: boolean) => void,
  proAvailable: boolean,
  premiumProAvailable: boolean,
  targetUserId: string,
}

const SidebarItems = ({ setIsOpen, proAvailable = false, premiumProAvailable = false, targetUserId }: SidebarItemsProps) => {
  const generateUrl = (url: string) => targetUserId ? `${url}?userId=${targetUserId}` : url;

  const sidebarItems = [
    { label: "Bio", link: generateUrl('/dashboard'), enabled: true, Icon: HouseIcon, },
    { label: "Locations", link: generateUrl("/dashboard/location"), enabled: true, Icon: MapPinIcon, },
    { label: "Treatments / Services", link: generateUrl("/dashboard/treatments"), enabled: true, Icon: HeartIcon, },
    { label: "Links", link: generateUrl("/dashboard/links"), enabled: true, Icon: LinkSimpleIcon, },
    { label: "Blogs", link: generateUrl("/dashboard/blog"), enabled: proAvailable, Icon: NewspaperIcon, },
    { label: "Gallery", link: generateUrl("/dashboard/gallery"), enabled: proAvailable, Icon: ImageIcon, },
    { label: "Reviews", link: generateUrl("/dashboard/review"), enabled: proAvailable, Icon: CheckSquareIcon, },
    { label: "Videos", link: generateUrl("/dashboard/video"), enabled: proAvailable, Icon: VideoIcon, },
    { label: "Shop", link: generateUrl("/dashboard/shop"), enabled: proAvailable, Icon: ShoppingCartSimpleIcon, },
    { label: "Verification", link: generateUrl("/dashboard/verification"), enabled: proAvailable, Icon: SealCheckIcon, },
    { label: "Get One Month Free", link: generateUrl("/dashboard/referral"), enabled: true, Icon: LinkBreakIcon, },
    { label: "Settings", link: generateUrl("/dashboard/settings"), enabled: true, Icon: GearIcon, },
  ];

  const pathname = usePathname();
  const handleClose = () => {
    setIsOpen(false);
  }

  return (
    <div>
      {sidebarItems.map((item, index) => (
        <SidebarItem
          key={index}
          label={item.label}
          link={item.link}
          isActive={pathname === item.link.split('?')[0]}
          enabled={item.enabled}
          Icon={item.Icon}
          onClick={handleClose}
        />
      ))}
    </div>
  )
}

export default SidebarItems;
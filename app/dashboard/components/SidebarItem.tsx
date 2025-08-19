import React from 'react'
import Link from 'next/link'
import { LockSimpleIcon } from '@phosphor-icons/react'

interface SidebarItemProps {
  label: string;
  link: string;
  isActive: boolean;
  enabled?: boolean;
  Icon: React.ElementType;
  onClick: () => void;
}

const SidebarItem = ({
  label,
  link,
  isActive,
  enabled,
  Icon,
  onClick,
}: SidebarItemProps) => {
  return (
    <Link
      href={link}
      className={`flex rounded-full justify-start items-center gap-3 no-underline py-2 px-3 mb-2 ${isActive ? "bg-[#E8EDF2] text-black" : enabled ? "text-neutral-900" : "text-gray-500"}`}
      onClick={onClick}
    >
      <Icon
        size={24}
        weight={`${isActive ? (link.split('?')[0] === "/dashboard/links" ? "bold" : "fill") : "regular"}`}
      />
      <div className="flex-grow">
        {label}
      </div>

      {!enabled &&
        <LockSimpleIcon size={20} />}
    </Link>
  )
}

export default SidebarItem
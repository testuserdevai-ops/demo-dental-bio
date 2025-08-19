'use client'
import BlogImage from "@/app/components/Image/BlogImage";
import { formatCurrency } from "@/utils/functions/formatCurrency";
import { ArrowSquareOutIcon, PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import React, { useEffect, useReducer } from "react"
import BaseCard from "@/app/components/Card/BaseCard"

type ProductCardProps = ProductType & {
  onUpdate: (product: ProductType, image: null) => void;
  onEditItem: (id: string) => void;
  onDelete: (id: string) => void;
  proAvailable: boolean;
}

const InvidualProductCard: React.FC<ProductCardProps> = ({
  onUpdate,
  onEditItem,
  onDelete,
  proAvailable,
  ...productProps
}: ProductCardProps) => {
  const [isActive, toggleIsActive] = useReducer((prevState) => !prevState, productProps.enabled!);

  useEffect(() => {
    if (productProps.enabled !== isActive) {
      const product = {
        id: productProps.id, enabled: isActive
      }
      onUpdate(product, null);
    }
  }, [isActive]);

  const handleDelete = () => {
    onDelete(productProps.id!);
  }

  return (
    <BaseCard
      movable
      handleType="caret"
      disabled={!proAvailable}
      showDelete
      onConfirmDelete={handleDelete}
      deleteConfirmTitle="Delete product?"
      deleteConfirmDescription="Are you sure you want to delete the product?"
      deleteOkText="Delete"
      showEnable
      isEnabled={isActive}
      onToggleEnabled={toggleIsActive}
      rightExtras={(
        <>
          <button className="enabled:hover:text-primary-1" disabled={!proAvailable}>
            <PencilSimpleIcon
              size={18}
              onClick={proAvailable ? () => onEditItem(productProps.id!) : undefined}
            />
          </button>
          <Link
            href={productProps.link!}
            target="_blank"
            className="hover:bg-neutral-100 hover:text-primary-1 text-neutral-900 flex items-center justify-center rounded-md transition-all"
          >
            <ArrowSquareOutIcon size={20} />
          </Link>
        </>
      )}
    >
      <div className="w-full flex items-center">
        <BlogImage src={productProps.image_url!} alt={productProps.name!} className="w-24 h-24 rounded-md" />
        <div className="text-[14px] ml-4">
          <div className="font-medium truncate">{productProps.platform}</div>
          <div className="text-primary-1 font-bold truncate">{productProps.name}</div>
          <div className="text-gray-500 font-medium truncate">{formatCurrency(productProps.currency!)}{productProps.price}</div>
        </div>
      </div>
    </BaseCard>
  )
}

export default InvidualProductCard;
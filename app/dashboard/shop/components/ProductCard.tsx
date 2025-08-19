'use client'
import ConfirmMessage from "@/app/components/Modal/ConfirmMessage";
import { CaretDown, CaretUp, PencilSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import React, { useEffect, useReducer, useState } from "react"
import Switcher from "@/app/components/Switcher"

type ProductCardProps = ProductType & {
  onUpdate: (product: ProductType, image: null) => void;
  onEditItem: (id: string) => void;
  onDelete: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  onUpdate,
  onEditItem,
  onDelete,
  ...productProps
}: ProductCardProps) => {
  const [isOpenConfirmMessage, setIsOpenConfirmMessage] = useState<boolean>(false);
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
    <>
      <div className="w-full px-6 py-3 shadow-lg rounded-[26px] flex items-center overflow-hidden gap-4 mb-4">
        {/* Caret Buttons */}
        <div className="cursor-pointer">
          <div><CaretUp /></div>
          <div><CaretDown /></div>
        </div>

        {/* Title and Content */}
        <div className="flex-grow text-[14px] overflow-hidden">
          {/* Title Row */}
          <div className="flex flex-1 items-center truncate gap-2">
            <div className="text-primary-1 font-bold truncate">{productProps.name}</div>
            <PencilSimple
              size={18}
              className="cursor-pointer flex-shrink-0 hover:text-primary-1"
              onClick={() => onEditItem(productProps.id!)}
            />
          </div>
        </div>

        {/* Trash Button */}
        <div className="flex items-center gap-2">
          <div onClick={() => setIsOpenConfirmMessage(true)}>
            <Trash size={20} className="cursor-pointer hover:text-red-700" />
          </div>
          <Switcher isChecked={isActive} onToggle={toggleIsActive} />
        </div>
      </div>

      <ConfirmMessage
        title="Delete product?"
        description="Are you sure you want to delete the product?"
        okText="Delete"
        isOpen={isOpenConfirmMessage}
        onClose={() => setIsOpenConfirmMessage(false)}
        onOk={handleDelete}
      />
    </>
  )
}

export default ProductCard;
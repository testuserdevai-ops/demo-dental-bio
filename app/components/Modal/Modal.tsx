// components/AddProductModal.tsx

import React, { useEffect, useState } from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";

type ModalProps = ProductType & {
  isOpen: boolean;
  isLoading?: boolean;
  title?: string;
  okText?: string;
  cancelText?: string;
  children?: React.ReactNode;
  onClose: () => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const AddIndividualProductModal: React.FC<ModalProps> = ({
  isOpen,
  isLoading = false,
  title,
  okText,
  cancelText,
  children,
  onClose,
  handleSubmit,
  ...props
}) => {
  const [outsideClicked, setOutsideClicked] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      // Get the scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // Prevent scrolling and adjust padding
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      // Restore styles
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen])

  const handleMouseDown = () => {
    setOutsideClicked(true);
  }

  const handleMouseUp = () => {
    if (outsideClicked) {
      onClose();
    }
    setOutsideClicked(false);
  }

  const handleInnerMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    setOutsideClicked(false);
  }

  const handleInnerMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    setOutsideClicked(false);
  }

  return (
    <>
      {isOpen &&
        <div
          className={`modal-overlay overflow-auto fixed bg-overlay cursor-pointer z-10 left-0 top-0 right-0 bottom-0 flex justify-center items-center ${isOpen ? "animate-fade-in-short" : "animate-fade-out-short"}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          <div
            className="w-[600px] overflow-hidden cursor-auto flex flex-col rounded-[26px] cursor- bg-surface p-10"
            onMouseDown={handleInnerMouseDown}
            onMouseUp={handleInnerMouseUp}
          >
            <h4 className="mb-3">{title}</h4>
            <form onSubmit={handleSubmit}>
              <div className="max-h-[70vh] overflow-y-auto">
                {children}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <FullRoundedButton isLoading={isLoading} type="submit">
                  {okText || "Ok"}
                </FullRoundedButton>
                <FullRoundedButton type="button" buttonType="danger" onClick={onClose}>
                  {cancelText || "Close"}
                </FullRoundedButton>
              </div>
            </form>
          </div>
        </div>}
    </>
  );
};

export default AddIndividualProductModal;

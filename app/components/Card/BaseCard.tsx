"use client";

import React, { useRef, useState } from "react";
import Switcher from "@/app/components/Switcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import {
  CaretDownIcon,
  CaretUpIcon,
  DotsSixVerticalIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";

export type BaseCardProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;

  // Layout
  withMargin?: boolean; // controls mb-4
  elevation?: "none" | "normal" | "lg"; // box-shadow level

  // Movable handle
  movable?: boolean;
  handleType?: "caret" | "dots";
  handleClassName?: string;

  // Right action area extras before default actions
  rightExtras?: React.ReactNode;

  // Enable switch
  showEnable?: boolean;
  isEnabled?: boolean;
  onToggleEnabled?: () => void;

  // Delete action with confirmation modal
  showDelete?: boolean;
  onConfirmDelete?: () => void | Promise<void>;
  deleteConfirmTitle?: string;
  deleteConfirmDescription?: string;
  deleteOkText?: string;

  buttonDirection?: "vertical" | "horizontal";
};

const getElevationClass = (elevation: BaseCardProps["elevation"]) => {
  switch (elevation) {
    case "none":
      return "shadow-none";
    case "normal":
      return "shadow";
    case "lg":
    default:
      return "shadow-lg";
  }
};

const baseWrapperCore =
  "w-full px-6 py-3 rounded-[26px] flex items-center overflow-hidden gap-4";

const BaseCard: React.FC<BaseCardProps> = ({
  children,
  className = "",
  disabled = false,
  withMargin = true,
  elevation = "lg",
  movable = false,
  handleType = "caret",
  handleClassName = "",
  rightExtras,
  showEnable = false,
  isEnabled = false,
  onToggleEnabled,
  showDelete = false,
  buttonDirection = "vertical",
  onConfirmDelete,
  deleteConfirmTitle = "Delete item?",
  deleteConfirmDescription = "Are you sure you want to delete this item?",
  deleteOkText = "Delete",
}: BaseCardProps) => {
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);

  const handleConfirmDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await onConfirmDelete?.();
      setIsDeleteConfirmationOpen(false);
    } catch {
      // The owning card retains its target and can surface its existing error.
    } finally {
      setIsDeleting(false);
    }
  };

  const renderHandle = () => {
    if (!movable) return null;
    if (handleType === "dots") {
      return (
        <div className={`cursor-move text-gray-400 ${handleClassName}`}>
          <DotsSixVerticalIcon size={22} />
        </div>
      );
    }
    return (
      <div className={`cursor-move ${handleClassName}`}>
        <div>
          <CaretUpIcon />
        </div>
        <div>
          <CaretDownIcon />
        </div>
      </div>
    );
  };

  const rightHasAnything = !!rightExtras || showDelete || showEnable;
  const marginClass = withMargin ? "mb-4" : "";
  const elevationClass = getElevationClass(elevation);

  return (
    <>
      <div
        className={`${baseWrapperCore} ${elevationClass} ${marginClass} ${className}`.trim()}
      >
        {renderHandle()}

        <div className="flex-grow overflow-hidden">{children}</div>

        {rightHasAnything && (
          <div
            className={`flex items-end gap-2 ${buttonDirection === "vertical" ? "flex-col" : "flex-row"}`}
          >
            <div
              className={`flex items-center gap-2 ${buttonDirection === "horizontal" ? "order-2" : "order-1"}`}
            >
              {rightExtras}
              {showEnable && (
                <Switcher
                  isChecked={!!isEnabled}
                  onToggle={onToggleEnabled!}
                  disabled={disabled}
                />
              )}
            </div>
            {showDelete && (
              <button
                ref={deleteTriggerRef}
                type="button"
                aria-label={deleteOkText}
                onClick={() => setIsDeleteConfirmationOpen(true)}
                className={`enabled:hover:text-red-700 ${buttonDirection === "horizontal" ? "order-1" : "order-2"}`}
                disabled={disabled}
              >
                <TrashIcon size={20} />
              </button>
            )}
          </div>
        )}
      </div>

      {showDelete && (
        <AlertDialog
          open={isDeleteConfirmationOpen}
          onOpenChange={(open) => {
            if (!isDeleting) {
              setIsDeleteConfirmationOpen(open);
              if (!open) {
                setTimeout(() => deleteTriggerRef.current?.focus(), 0);
              }
            }
          }}
        >
          <AlertDialogContent
            onCloseAutoFocus={(event) => {
              event.preventDefault();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{deleteConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteConfirmDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel autoFocus disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                aria-busy={isDeleting || undefined}
                onClick={(event) => {
                  event.preventDefault();
                  void handleConfirmDelete();
                }}
              >
                {isDeleting ? "Deleting…" : deleteOkText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default BaseCard;

// components/ConfirmMessage.tsx

import React, { useEffect, useId, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import FullRoundedButton from "../Button/FullRoundedButton";

interface ModalProps {
  isOpen: boolean;
  /** Optional title displayed at the top of the dialog */
  title?: string;
  /** Short description text. If children are provided, children take precedence */
  description?: string;
  okText?: string;
  cancelText?: string;
  /** Visual intent of the primary action. Backwards compatible with existing usage */
  type?: "primary" | "danger";
  onOk: () => void | Promise<void>;
  /** Called when the dialog should close (via cancel, backdrop, or close button) */
  onClose: () => void;
  /** Disable closing when clicking on the backdrop */
  disableBackdropClose?: boolean;
  /** Enable closing when pressing the Escape key (default true) */
  closeOnEsc?: boolean;
  /** Disable/Loading states for primary/secondary actions */
  okDisabled?: boolean;
  okLoading?: boolean;
  cancelDisabled?: boolean;
  /** Hide the cancel button entirely */
  hideCancelButton?: boolean;
  /** Optional className for the dialog container */
  className?: string;
  /** Custom body content; if provided, replaces description rendering */
  children?: React.ReactNode;
  /** Custom footer; if provided, replaces default footer actions */
  footer?: React.ReactNode;
  /** Show a top-right close button (default true) */
  showCloseButton?: boolean;
  /** Control which element to auto-focus on open */
  autoFocus?: "ok" | "cancel" | "none";
  /** Optional testing id attribute */
  testId?: string;
}

const ConfirmMessage = forwardRef<HTMLDivElement, ModalProps>(({
  isOpen,
  title,
  description,
  okText = "Yes",
  cancelText = "Cancel",
  type = "primary",
  onOk,
  onClose,
  disableBackdropClose = false,
  closeOnEsc = true,
  okDisabled = false,
  okLoading = false,
  cancelDisabled = false,
  hideCancelButton = false,
  className,
  children,
  footer,
  showCloseButton = true,
  autoFocus = "none",
  testId,
}, ref) => {
  const titleId = useId();
  const descriptionId = useId();

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = okLoading || internalLoading;

  useImperativeHandle(ref, () => dialogRef.current!);

  const handleBackdropMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (disableBackdropClose || isLoading) return;
    // Only close if clicking the backdrop itself
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleOkClick = useCallback(async () => {
    if (okDisabled || isLoading) return;
    try {
      setInternalLoading(true);
      await onOk();
      onClose();
    } catch (error) {
      // Keep dialog open on failure; consumers can show error UI in children/description
    } finally {
      setInternalLoading(false);
    }
  }, [okDisabled, isLoading, onOk, onClose]);

  const focusFirstElement = useCallback(() => {
    if (!dialogRef.current) return;

    const dialogEl = dialogRef.current;

    let focusTarget: HTMLElement | null = null;

    if (autoFocus !== "none" && footerRef.current) {
      const footerButtons = Array.from(
        footerRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
      );
      if (footerButtons.length > 0) {
        if (autoFocus === "cancel") {
          focusTarget = footerButtons[0] ?? null;
        } else if (autoFocus === "ok") {
          focusTarget = footerButtons[footerButtons.length - 1] ?? null;
        }
      }
    }

    if (!focusTarget) {
      // fallback: first focusable element in dialog
      const focusable = dialogEl.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusTarget = focusable ?? dialogEl;
    }

    // store previous focus and focus target
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    focusTarget.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;
      const dialogEl = dialogRef.current;

      if (event.key === "Escape" && closeOnEsc && !isLoading) {
        event.stopPropagation();
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Enter") {
        // Enter activates the primary action unless disabled/loading
        if (!okDisabled && !isLoading) {
          event.preventDefault();
          // Fire and forget; internal handler manages loading
          void handleOkClick();
        }
        return;
      }

      if (event.key === "Tab") {
        // Very small focus trap to keep focus within the dialog
        const focusableElements = Array.from(
          dialogEl.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && el.offsetParent !== null);

        if (focusableElements.length === 0) {
          event.preventDefault();
          dialogEl.focus();
          return;
        }

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (active === first || !dialogEl.contains(active)) {
            last.focus();
            event.preventDefault();
          }
        } else {
          if (active === last) {
            first.focus();
            event.preventDefault();
          }
        }
      }
    };

    // Slight delay to ensure elements are mounted before focusing
    const focusTimer = setTimeout(focusFirstElement, 0);

    document.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, { capture: true } as any);
      // restore prior focus
      previouslyFocusedElementRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen, closeOnEsc, onClose, okDisabled, focusFirstElement, isLoading, handleOkClick]);

  return (
    <>
      {isOpen && (
        <div
          ref={overlayRef}
          data-testid={testId}
          className={`modal-overlay !m-0 fixed inset-0 z-50 flex items-center justify-center bg-overlay ${isOpen ? "animate-fade-in-short" : "animate-fade-out-short"
            }`}
          onMouseDown={handleBackdropMouseDown}
          aria-hidden={!isOpen}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={(children || description) ? descriptionId : undefined}
            className={`cursor-auto w-[92%] max-w-md rounded-2xl bg-white p-5 shadow-xl ${className ?? ""}`}
            onMouseDown={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            {(showCloseButton || title) && (
              <div className="mb-3 flex items-start justify-between gap-4">
                {title ? (
                  <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                    {title}
                  </h2>
                ) : (
                  <span />
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-label="Close dialog"
                    aria-disabled={isLoading || undefined}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {(description) && (
              <div id={descriptionId} className="mb-5 text-[15px] leading-6 text-gray-700 whitespace-pre-line">
                {description}
              </div>
            )}

            {children}

            {footer ? (
              <div className="mt-2 flex justify-end gap-2">{footer}</div>
            ) : (
              <div ref={footerRef} className="mt-2 flex justify-end gap-2">
                {!hideCancelButton && (
                  <FullRoundedButton
                    buttonType="ghost"
                    onClick={onClose}
                    disabled={cancelDisabled || isLoading}
                  >
                    {cancelText}
                  </FullRoundedButton>
                )}
                <FullRoundedButton
                  buttonType={type === "danger" ? "danger" : "primary"}
                  type="button"
                  onClick={handleOkClick}
                  disabled={okDisabled || isLoading}
                  aria-busy={isLoading || undefined}
                  isLoading={isLoading}
                >
                  {okText}
                </FullRoundedButton>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

export default ConfirmMessage;

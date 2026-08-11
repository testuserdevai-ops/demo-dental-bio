import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";
import { Spinner as SpinnerIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button-variants";
import { DisabledButtonChild } from "./disabled-button-child";

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isPending?: boolean;
}

function getSafeDisabledButtonProps(props: ButtonProps) {
  return Object.fromEntries(
    Object.entries(props).filter(
      ([name]) =>
        name === "id" ||
        name === "style" ||
        name === "title" ||
        name.startsWith("aria-") ||
        name.startsWith("data-"),
    ),
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isPending = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const buttonClassName = cn(buttonVariants({ variant, size }), className);
    const isDisabled = disabled || isPending;

    if (asChild && isDisabled) {
      return (
        <DisabledButtonChild
          child={
            React.Children.only(children) as React.ReactElement<{
              className?: string;
              children?: React.ReactNode;
            }>
          }
          className={buttonClassName}
          isPending={isPending}
          props={getSafeDisabledButtonProps(props)}
          ref={ref as React.ForwardedRef<HTMLSpanElement>}
        />
      );
    }

    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={buttonClassName}
        ref={ref}
        disabled={asChild ? undefined : isDisabled}
        aria-busy={isPending || undefined}
        {...props}
      >
        {isPending && (
          <SpinnerIcon
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        )}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

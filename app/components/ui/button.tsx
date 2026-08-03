import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Spinner as SpinnerIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-bold transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground enabled:hover:bg-deep-purple",
        secondary:
          "bg-secondary text-secondary-foreground enabled:hover:bg-primary-5",
        outline:
          "border border-primary bg-transparent text-foreground enabled:hover:bg-primary-5",
        ghost: "bg-transparent text-foreground enabled:hover:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground enabled:hover:bg-red-800",
        link: "h-auto rounded-none p-0 text-primary underline-offset-4 enabled:hover:underline",
      },
      size: {
        sm: "h-9 px-3",
        default: "h-10 px-5 py-2.5",
        lg: "h-12 px-6 text-base",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isPending?: boolean;
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
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={asChild ? undefined : disabled || isPending}
        aria-disabled={asChild && (disabled || isPending) ? true : undefined}
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

import { cva } from "class-variance-authority";

export const buttonVariants = cva(
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

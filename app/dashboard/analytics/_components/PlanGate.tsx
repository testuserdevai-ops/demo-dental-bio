import Link from "next/link";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

export function PlanGate({
  title,
  description,
  targetUserId,
}: {
  title: string;
  description: string;
  targetUserId?: string;
}) {
  const href = targetUserId
    ? `/dashboard/subscription?userId=${targetUserId}`
    : "/dashboard/subscription";
  return (
    <section className="rounded-3xl border border-primary/30 bg-primary-5 p-6 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-card text-primary shadow-sm">
        <LockSimpleIcon aria-hidden="true" size={24} />
      </span>
      <h2 className="mt-4 text-xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Link
        href={href}
        className={cn(buttonVariants(), "mt-5 min-h-11 no-underline")}
      >
        Explore Pro analytics
      </Link>
    </section>
  );
}

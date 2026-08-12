import Link from "next/link";
import { analyticsActionClassName } from "./action-style";

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
        <span aria-hidden="true" className="text-xs font-bold">
          PRO
        </span>
      </span>
      <h2 className="mt-4 text-xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Link href={href} className={`${analyticsActionClassName} mt-5`}>
        Explore Pro analytics
      </Link>
    </section>
  );
}

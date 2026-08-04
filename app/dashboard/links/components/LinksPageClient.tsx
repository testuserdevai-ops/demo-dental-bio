"use client";
import { useLinkAggregate } from "../_lib/hooks";
import type { LinkAggregate } from "../_lib/queries";
export default function LinksPageClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
}: {
  scopeId: string;
  targetHint: string | undefined;
  data: LinkAggregate;
  updatedAt: number;
}) {
  const query = useLinkAggregate({ scopeId, targetHint, data, updatedAt });
  const aggregate = query.data ?? data;
  return (
    <div>
      {aggregate.groups.map((group) => (
        <section key={group.id}>
          <h3>{group.heading}</h3>
          {group.links.map((link) => (
            <a key={link.id} href={link.url}>
              {link.title}
            </a>
          ))}
        </section>
      ))}
    </div>
  );
}

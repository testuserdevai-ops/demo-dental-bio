import type { TrackableAction } from "@/lib/analytics/contract";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

type DentistryContact = {
  booking_link: string | null;
  booking_link_enabled: boolean | null;
  contact_email: string | null;
  phone: string | null;
};

type LinkGroup = {
  link_group_id: string;
  heading: string | null;
  rank: number;
  dentistry_links: {
    links: {
      link_id: string;
      title: string | null;
      link: string | null;
      is_active: boolean;
      rank: number;
      image_url: string | null;
      image_alt: string | null;
    };
  }[];
};

export type SpecialistResourceKind =
  "assessment" | "emergency" | "insurance" | "referral" | "faq";

export type SpecialistResource = {
  id: string;
  groupId: string;
  title: string;
  href: string;
  imageUrl: string | null;
  imageAlt: string | null;
  kind: SpecialistResourceKind;
  position: number;
};

export type SpecialistAction = {
  kind: "assessment" | "consultation" | "phone" | "email";
  label: string;
  href: string;
  external: boolean;
  analytics: TrackableAction | readonly TrackableAction[];
};

function normalizeHttpUrl(value: string | null): string | null {
  const input = value?.trim();
  if (!input) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(input) ? input : `https://${input}`,
    );
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function classifyResource(value: string): SpecialistResourceKind | null {
  if (/emergency|urgent|aftercare/i.test(value)) return "emergency";
  if (/insurance|fees|payment/i.test(value)) return "insurance";
  if (/referral/i.test(value)) return "referral";
  if (/frequently asked|\bfaq\b|questions/i.test(value)) return "faq";
  if (/assessment|consultation/i.test(value)) return "assessment";
  return null;
}

export function selectSpecialistResources(
  linkGroups: readonly LinkGroup[],
): SpecialistResource[] {
  const visible = linkGroups
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .flatMap((group) =>
      group.dentistry_links
        .slice()
        .sort((a, b) => a.links.rank - b.links.rank)
        .flatMap(({ links }) => {
          const href = links.is_active ? normalizeHttpUrl(links.link) : null;
          const title = links.title?.trim();
          const kind =
            classifyResource(title ?? "") ??
            classifyResource(group.heading ?? "");
          return href && title && kind
            ? [{ group, links, href, title, kind }]
            : [];
        }),
    );

  return visible.map(({ group, links, href, title, kind }, index) => ({
    id: links.link_id,
    groupId: group.link_group_id,
    title,
    href,
    imageUrl: links.image_url,
    imageAlt: links.image_alt,
    kind,
    position: index + 1,
  }));
}

function createAssessmentAction(
  resource: SpecialistResource | undefined,
): SpecialistAction | null {
  return resource
    ? {
        kind: "assessment",
        label: "Start your assessment",
        href: resource.href,
        external: true,
        analytics: [
          {
            section: "links",
            position: resource.position,
            action: {
              type: "link_click",
              linkId: resource.id,
              groupId: resource.groupId,
            },
          },
          {
            section: "profile",
            action: { type: "cta_click", ctaType: "enquiry" },
          },
        ],
      }
    : null;
}

function createConsultationAction(
  dentistry: DentistryContact,
): SpecialistAction | null {
  const href = dentistry.booking_link_enabled
    ? normalizeHttpUrl(dentistry.booking_link)
    : null;
  return href
    ? {
        kind: "consultation",
        label: "Book a specialist consultation",
        href,
        external: true,
        analytics: [
          { section: "profile", action: { type: "booking_click" } },
          {
            section: "profile",
            action: { type: "cta_click", ctaType: "booking" },
          },
        ],
      }
    : null;
}

function normalizePhone(value: string | null): string | null {
  const input = value?.trim();
  if (!input) return null;
  const prefix = input.startsWith("+") ? "+" : "";
  const digits = input.replace(/\D/g, "");
  return digits.length >= 7 ? `${prefix}${digits}` : null;
}

function normalizeEmail(value: string | null): string | null {
  const input = value?.trim();
  return input && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? input : null;
}

export function selectSpecialistActions(
  answers: ProfileTemplateAnswers["specialist-assessment"],
  dentistry: DentistryContact,
  resources: readonly SpecialistResource[],
): { primary: SpecialistAction | null; secondary: SpecialistAction | null } {
  const assessment = createAssessmentAction(
    resources.find(({ kind }) => kind === "assessment"),
  );
  const consultation = createConsultationAction(dentistry);
  const preferred = answers.primaryPath ?? "assessment";
  const primary =
    (preferred === "consultation" ? consultation : assessment) ??
    consultation ??
    assessment;
  const secondary = [assessment, consultation].find(
    (action) => action && action.kind !== primary?.kind,
  );

  return { primary, secondary: secondary ?? null };
}

export function selectSpecialistContactActions(
  dentistry: DentistryContact,
): SpecialistAction[] {
  const phone = normalizePhone(dentistry.phone);
  const email = normalizeEmail(dentistry.contact_email);
  const actions: SpecialistAction[] = [];

  if (phone) {
    actions.push({
      kind: "phone",
      label: "Call the specialist team",
      href: `tel:${phone}`,
      external: false,
      analytics: {
        section: "profile",
        action: { type: "phone_click" },
      },
    });
  }
  if (email) {
    actions.push({
      kind: "email",
      label: "Email the specialist team",
      href: `mailto:${email}`,
      external: false,
      analytics: {
        section: "profile",
        action: { type: "email_click" },
      },
    });
  }

  return actions;
}

export function getSpecialistReferralMessage(
  answers: ProfileTemplateAnswers["specialist-assessment"],
): { title: string; detail: string } {
  return answers.referralRequired
    ? {
        title: "A referral is needed",
        detail:
          "Ask your dentist or doctor to include recent notes and imaging. The specialist team can help if you are unsure what to send.",
      }
    : {
        title: "You can contact the specialist directly",
        detail:
          "No referral is required to start. Share any recent notes or imaging if you have them.",
      };
}

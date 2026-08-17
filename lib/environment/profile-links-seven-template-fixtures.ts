export type ExpectedProfileLink = {
  id: string;
  title: string;
  position: number;
};

type ProfileLinkShowcase = {
  name: string;
  email: string;
  route: string;
  moduleId: string;
  prefix: string;
  expected: readonly ExpectedProfileLink[];
  sentinelIds: readonly string[];
};

function fixtureLinks(prefix: string, positionOffset: number) {
  return [1, 2, 3, 4, 6].map((index, position) => ({
    id: `${prefix}-0000-4000-8000-00000000009${index}`,
    title: `Owner resource ${index}`,
    position: positionOffset + position + 1,
  }));
}

function showcase(
  value: Omit<ProfileLinkShowcase, "expected" | "sentinelIds"> & {
    existing: readonly Omit<ExpectedProfileLink, "position">[];
  },
): ProfileLinkShowcase {
  const existing = value.existing.map((link, index) => ({
    ...link,
    position: index + 1,
  }));
  return {
    ...value,
    expected: [...existing, ...fixtureLinks(value.prefix, existing.length)],
    sentinelIds: [5, 7].map(
      (index) => `${value.prefix}-0000-4000-8000-00000000009${index}`,
    ),
  };
}

export const PROFILE_LINK_SHOWCASES = [
  showcase({
    name: "Direct Booking",
    email: "template-direct-booking@dentalbio.local",
    route: "/template-direct-booking",
    moduleId: "direct-booking",
    prefix: "db010000",
    existing: [],
  }),
  showcase({
    name: "Location Router",
    email: "template-location-router@dentalbio.local",
    route: "/template-location-router",
    moduleId: "location-provider-router",
    prefix: "10ca7100",
    existing: [],
  }),
  showcase({
    name: "Services Catalogue",
    email: "template-services-catalogue@dentalbio.local",
    route: "/template-services-catalogue",
    moduleId: "services-catalogue",
    prefix: "5e010000",
    existing: [
      {
        id: "5e010000-0000-4000-8000-000000000021",
        title: "Finance and payment guide",
      },
      {
        id: "5e010000-0000-4000-8000-000000000022",
        title: "Meet the clinical team",
      },
      {
        id: "5e010000-0000-4000-8000-000000000023",
        title: "Frequently asked questions",
      },
    ],
  }),
  showcase({
    name: "Trust-First",
    email: "template-trust-first@dentalbio.local",
    route: "/template-trust-first",
    moduleId: "trust-first-family-practice",
    prefix: "7f570000",
    existing: [
      {
        id: "7f570000-0000-4000-8000-000000000021",
        title: "What to expect at your first visit",
      },
      {
        id: "7f570000-0000-4000-8000-000000000022",
        title: "Payment and insurance guide",
      },
    ],
  }),
  showcase({
    name: "Specialist",
    email: "template-specialist-assessment@dentalbio.local",
    route: "/template-specialist-assessment",
    moduleId: "specialist-assessment",
    prefix: "5a5e5500",
    existing: [
      {
        id: "5a5e5500-0000-4000-8000-000000000311",
        title: "Online specialist assessment",
      },
      {
        id: "5a5e5500-0000-4000-8000-000000000312",
        title: "Dentist referral guide",
      },
      {
        id: "5a5e5500-0000-4000-8000-000000000313",
        title: "Urgent and aftercare advice",
      },
      {
        id: "5a5e5500-0000-4000-8000-000000000314",
        title: "Insurance and fee information",
      },
      {
        id: "5a5e5500-0000-4000-8000-000000000315",
        title: "Frequently asked questions",
      },
    ],
  }),
  showcase({
    name: "Clinic Commerce",
    email: "template-clinic-commerce@dentalbio.local",
    route: "/template-clinic-commerce",
    moduleId: "clinic-commerce",
    prefix: "c11c0000",
    existing: [
      {
        id: "c11c0000-0000-4000-8000-000000000021",
        title: "Join the monthly care notes",
      },
    ],
  }),
  showcase({
    name: "Expert Educator",
    email: "template-expert-educator@dentalbio.local",
    route: "/template-expert-educator",
    moduleId: "expert-educator",
    prefix: "ed0ca700",
    existing: [
      {
        id: "ed0ca700-0000-4000-8000-000000000021",
        title: "Why teeth crack — and what happens next",
      },
      {
        id: "ed0ca700-0000-4000-8000-000000000022",
        title: "A plain-language guide to gum health",
      },
      {
        id: "ed0ca700-0000-4000-8000-000000000031",
        title: "Restorative decision-making masterclass",
      },
      {
        id: "ed0ca700-0000-4000-8000-000000000032",
        title: "Live webinar: communicating treatment risk",
      },
    ],
  }),
] as const satisfies readonly ProfileLinkShowcase[];

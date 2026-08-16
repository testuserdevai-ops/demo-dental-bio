import { describe, expect, it, mock } from "bun:test";

const from = mock((table: string) => ({
  select: () => ({
    eq: () =>
      table === "dentistry_treatments"
        ? {
            order: () =>
              Promise.resolve({
                data: [
                  {
                    treatment_id: "00000000-0000-4000-8000-000000000002",
                    rank: 2,
                    treatments: {
                      title: "Whitening",
                      description: "Brighten your smile",
                      isService: false,
                    },
                  },
                  {
                    treatment_id: "00000000-0000-4000-8000-000000000003",
                    rank: null,
                    treatments: {
                      title: "Consultation",
                      description: "Talk to us",
                      isService: true,
                    },
                  },
                  { treatment_id: null, rank: 1, treatments: null },
                ],
                error: null,
              }),
          }
        : {
            single: () =>
              Promise.resolve({
                data: {
                  treatment_section_title: "Smile care",
                  service_section_title: "Patient support",
                },
                error: null,
              }),
          },
  }),
}));

mock.module("server-only", () => ({}));

const { getTreatmentAggregate } = await import("./queries");

describe("getTreatmentAggregate", () => {
  it("reads the resolved dentistry, safely maps joined rows, and separates sorted kinds", async () => {
    const aggregate = await getTreatmentAggregate(
      {
        effectiveUserId: "00000000-0000-4000-8000-000000000001",
        dentistryId: "00000000-0000-4000-8000-000000000004",
        username: "owner",
        canManageSubscription: true,
      },
      { from } as never,
    );

    expect(from).toHaveBeenCalledWith("dentistry_treatments");
    expect(from).toHaveBeenCalledWith("dentistries");
    expect(aggregate).toEqual({
      sectionTitles: {
        treatmentSectionTitle: "Smile care",
        serviceSectionTitle: "Patient support",
      },
      treatments: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          title: "Whitening",
          description: "Brighten your smile",
          kind: "treatment",
          rank: 2,
        },
      ],
      services: [
        {
          id: "00000000-0000-4000-8000-000000000003",
          title: "Consultation",
          description: "Talk to us",
          kind: "service",
          rank: 2,
        },
      ],
    });
  });
});

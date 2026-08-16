import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
const resolveDashboardIdentity = mock(async () => ({
  scope: {
    effectiveUserId: "00000000-0000-4000-8000-000000000001",
    dentistryId: "00000000-0000-4000-8000-000000000002",
    username: "owner",
    canManageSubscription: true,
  },
}));
const rpc = mock(async () => ({
  data: [
    {
      treatment_id: "00000000-0000-4000-8000-000000000003",
      title: "Check-up",
      description: "Routine",
      isService: false,
    },
  ],
  error: null,
}));
const invalidatePublicProfileCache = mock(() => undefined);
const invalidatePublicProfileIdentityCache = mock(() => undefined);
mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/public-profile/cache-invalidation", () => ({
  invalidatePublicProfileCache,
  invalidatePublicProfileIdentityCache,
}));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc }),
}));

const {
  createTreatment,
  deleteTreatment,
  reorderTreatments,
  saveTreatmentServiceSectionTitles,
  updateTreatment,
} = await import("./actions");

describe("treatment Actions", () => {
  it("reauthorizes then makes one atomic create RPC using scope dentistry", async () => {
    const result = await createTreatment(
      "00000000-0000-4000-8000-000000000009",
      {
        title: "Check-up",
        description: "Routine",
        kind: "treatment",
      },
    );
    expect(resolveDashboardIdentity).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000009",
    );
    expect(rpc).toHaveBeenCalledWith("create_dentistry_treatment", {
      p_dentistry_id: "00000000-0000-4000-8000-000000000002",
      p_title: "Check-up",
      p_description: "Routine",
      p_is_service: false,
    });
    expect(result).toEqual({
      ok: true,
      data: {
        id: "00000000-0000-4000-8000-000000000003",
        title: "Check-up",
        description: "Routine",
        kind: "treatment",
        rank: 0,
      },
    });
    expect(invalidatePublicProfileCache).toHaveBeenLastCalledWith({
      profileId: "00000000-0000-4000-8000-000000000001",
      feature: "treatments",
      entities: [
        {
          kind: "treatment",
          id: "00000000-0000-4000-8000-000000000003",
        },
      ],
    });
  });

  it("uses an undefined hint for the owner path", async () => {
    resolveDashboardIdentity.mockClear();
    await createTreatment(undefined, {
      title: "Check-up",
      description: "Routine",
      kind: "treatment",
    });
    expect(resolveDashboardIdentity).toHaveBeenCalledWith(undefined);
  });

  it("saves both owner-defined section titles through one authorized RPC", async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          treatment_section_title: "Smile treatments",
          service_section_title: "Patient services",
        },
      ],
      error: null,
    } as never);
    const result = await saveTreatmentServiceSectionTitles(undefined, {
      treatmentSectionTitle: "  Smile treatments ",
      serviceSectionTitle: "Patient services",
    });

    expect(rpc).toHaveBeenLastCalledWith(
      "save_treatment_service_section_titles",
      {
        p_dentistry_id: "00000000-0000-4000-8000-000000000002",
        p_treatment_section_title: "Smile treatments",
        p_service_section_title: "Patient services",
      },
    );
    expect(result).toEqual({
      ok: true,
      data: {
        treatmentSectionTitle: "Smile treatments",
        serviceSectionTitle: "Patient services",
      },
    });
    expect(invalidatePublicProfileCache).toHaveBeenLastCalledWith({
      profileId: "00000000-0000-4000-8000-000000000001",
      feature: "treatments",
    });
    expect(invalidatePublicProfileIdentityCache).toHaveBeenLastCalledWith([
      "owner",
    ]);
  });

  it("rejects invalid section-title input before authorization", async () => {
    resolveDashboardIdentity.mockClear();
    rpc.mockClear();
    const result = await saveTreatmentServiceSectionTitles("forged", {
      treatmentSectionTitle: "Treatments\nToday",
      serviceSectionTitle: "Services",
    });
    expect(result.ok).toBe(false);
    expect(resolveDashboardIdentity).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps update, delete, and reorder to one typed RPC each", async () => {
    rpc.mockClear();
    await updateTreatment("00000000-0000-4000-8000-000000000001", {
      treatmentId: "00000000-0000-4000-8000-000000000003",
      title: "Updated",
      description: "Routine",
      kind: "treatment",
    });
    expect(rpc).toHaveBeenLastCalledWith(
      "update_dentistry_treatment",
      expect.objectContaining({
        p_treatment_id: "00000000-0000-4000-8000-000000000003",
      }),
    );
    await deleteTreatment("00000000-0000-4000-8000-000000000001", {
      treatmentId: "00000000-0000-4000-8000-000000000003",
    });
    expect(rpc).toHaveBeenLastCalledWith(
      "delete_dentistry_treatment",
      expect.any(Object),
    );
    await reorderTreatments("00000000-0000-4000-8000-000000000001", {
      orderedIds: ["00000000-0000-4000-8000-000000000003"],
    });
    expect(rpc).toHaveBeenLastCalledWith(
      "reorder_dentistry_treatments",
      expect.objectContaining({
        p_treatment_ids: ["00000000-0000-4000-8000-000000000003"],
      }),
    );
  });

  it("returns a sanitized authorization failure and never calls the RPC", async () => {
    resolveDashboardIdentity.mockRejectedValueOnce(new Error("FORBIDDEN"));
    rpc.mockClear();
    const result = await deleteTreatment("forged-target", {
      treatmentId: "00000000-0000-4000-8000-000000000003",
    });
    expect(result).toEqual({
      ok: false,
      code: "AUTHORIZATION_ERROR",
      formError: "Unable to delete treatment",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects forged targets for every mutation before an RPC", async () => {
    const id = "00000000-0000-4000-8000-000000000003";
    resolveDashboardIdentity.mockImplementation(() =>
      Promise.reject(new Error("FORBIDDEN")),
    );
    rpc.mockClear();
    const results = await Promise.all([
      createTreatment(id, {
        title: "Check-up",
        description: "Routine",
        kind: "treatment",
      }),
      updateTreatment(id, {
        treatmentId: id,
        title: "Check-up",
        description: "Routine",
        kind: "treatment",
      }),
      deleteTreatment(id, { treatmentId: id }),
      reorderTreatments(id, { orderedIds: [id] }),
    ]);
    expect(
      results.every(
        (result) => !result.ok && result.code === "AUTHORIZATION_ERROR",
      ),
    ).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sanitizes every RPC failure and missing create/update rows", async () => {
    const id = "00000000-0000-4000-8000-000000000003";
    resolveDashboardIdentity.mockReset();
    resolveDashboardIdentity.mockResolvedValue({
      scope: {
        effectiveUserId: "00000000-0000-4000-8000-000000000001",
        dentistryId: "00000000-0000-4000-8000-000000000002",
        username: "owner",
        canManageSubscription: true,
      },
    });
    const failure = { data: null, error: { message: "database internals" } };
    rpc.mockResolvedValueOnce(failure as never);
    expect(
      await createTreatment(id, {
        title: "Check-up",
        description: "Routine",
        kind: "treatment",
      }),
    ).toEqual({
      ok: false,
      code: "CREATE_FAILED",
      formError: "Unable to create treatment",
    });
    rpc.mockResolvedValueOnce({ data: [], error: null } as never);
    expect(
      await updateTreatment(id, {
        treatmentId: id,
        title: "Check-up",
        description: "Routine",
        kind: "treatment",
      }),
    ).toEqual({
      ok: false,
      code: "UPDATE_FAILED",
      formError: "Unable to update treatment",
    });
    rpc.mockResolvedValueOnce(failure as never);
    expect(await deleteTreatment(id, { treatmentId: id })).toEqual({
      ok: false,
      code: "DELETE_FAILED",
      formError: "Unable to delete treatment",
    });
    rpc.mockResolvedValueOnce(failure as never);
    expect(await reorderTreatments(id, { orderedIds: [id] })).toEqual({
      ok: false,
      code: "REORDER_FAILED",
      formError: "Unable to reorder treatments",
    });
  });

  it("rejects invalid input before resolving identity or accessing the database", async () => {
    resolveDashboardIdentity.mockClear();
    rpc.mockClear();
    const result = await createTreatment("hint", {
      title: "",
      description: "",
      kind: "treatment",
    });
    expect(result.ok).toBe(false);
    expect(resolveDashboardIdentity).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});

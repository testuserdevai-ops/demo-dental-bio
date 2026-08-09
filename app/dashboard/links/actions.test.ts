import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
const scope = {
  effectiveUserId: "00000000-0000-4000-8000-000000000701",
  dentistryId: "00000000-0000-4000-8000-000000000711",
  username: "owner",
  canManageSubscription: true,
};
const resolveDashboardIdentity = mock(async () => ({ scope }));
const rpc = mock(async (): Promise<{ data: any; error: any }> => ({
  data: [
    {
      link_group_id: "00000000-0000-4000-8000-000000000721",
      heading: "Resources",
      rank: 1,
    },
  ],
  error: null,
}));
mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc }),
}));

const actions = await import("./actions");

describe("link Actions", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockReset();
    resolveDashboardIdentity.mockResolvedValue({ scope });
    rpc.mockReset();
    rpc.mockResolvedValue({
      data: [
        {
          link_group_id: "00000000-0000-4000-8000-000000000721",
          heading: "Resources",
          rank: 1,
        },
      ],
      error: null,
    });
  });

  it("reauthorizes an optional target and maps an atomic group create", async () => {
    const result = await actions.createLinkGroup(undefined, {
      heading: "Resources",
    });
    expect(resolveDashboardIdentity).toHaveBeenCalledWith(undefined);
    expect(rpc).toHaveBeenCalledWith("create_link_group", {
      p_dentistry_id: scope.dentistryId,
      p_heading: "Resources",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        id: "00000000-0000-4000-8000-000000000721",
        heading: "Resources",
        rank: 1,
        links: [],
      },
    });
  });

  it("maps link update/delete/reorder to the scoped RPC arguments", async () => {
    const groupId = "00000000-0000-4000-8000-000000000721";
    const linkId = "00000000-0000-4000-8000-000000000722";
    rpc.mockResolvedValueOnce({
      data: [
        {
          link_id: linkId,
          title: "Website",
          link: "https://example.test",
          is_active: false,
          rank: 1,
        },
      ],
      error: null,
    });
    await actions.updateLink(undefined, {
      linkGroupId: groupId,
      linkId,
      title: "Website",
      url: "example.test",
      isActive: false,
    });
    expect(rpc).toHaveBeenLastCalledWith("update_dentistry_link", {
      p_dentistry_id: scope.dentistryId,
      p_group_id: groupId,
      p_link_id: linkId,
      p_title: "Website",
      p_url: "https://example.test",
      p_is_active: false,
    });
    rpc.mockResolvedValue({ data: null, error: null });
    await actions.deleteLink(undefined, { linkGroupId: groupId, linkId });
    await actions.reorderLinks(undefined, {
      linkGroupId: groupId,
      orderedIds: [linkId],
    });
    expect(rpc).toHaveBeenLastCalledWith("reorder_dentistry_links", {
      p_dentistry_id: scope.dentistryId,
      p_group_id: groupId,
      p_link_ids: [linkId],
    });
  });

  it("fails closed for every forged target before an RPC", async () => {
    resolveDashboardIdentity.mockRejectedValue(new Error("FORBIDDEN"));
    const id = "00000000-0000-4000-8000-000000000721";
    const results = await Promise.all([
      actions.createLinkGroup(id, { heading: "Resources" }),
      actions.updateLinkGroup(id, { linkGroupId: id, heading: "Resources" }),
      actions.deleteLinkGroup(id, { linkGroupId: id }),
      actions.reorderLinkGroups(id, { orderedIds: [id] }),
      actions.createLink(id, {
        linkGroupId: id,
        title: "Website",
        url: "https://example.test",
        isActive: true,
      }),
      actions.updateLink(id, {
        linkGroupId: id,
        linkId: id,
        title: "Website",
        url: "https://example.test",
        isActive: true,
      }),
      actions.deleteLink(id, { linkGroupId: id, linkId: id }),
      actions.reorderLinks(id, { linkGroupId: id, orderedIds: [id] }),
    ]);
    expect(results.every((result) => !result.ok)).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });
});

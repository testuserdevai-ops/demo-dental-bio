import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import {
  normalizeDomain,
  isApexDomain,
  VERCEL_A_RECORD_IP,
  VERCEL_CNAME_TARGET,
} from "@/lib/customDomain";
import {
  addDomainToProject,
  removeDomainFromProject,
  getVercelDomainConfig,
  getProjectDomain,
  verifyProjectDomain,
} from "@/lib/vercel";

const PREMIUM_PRO = "PREMIUM PRO";

type DnsRecord = {
  type: "A" | "CNAME";
  name: string;
  value: string;
};

// Recommended DNS record the user must create for their domain.
function recommendedRecords(domain: string): DnsRecord[] {
  if (isApexDomain(domain)) {
    return [{ type: "A", name: "@", value: VERCEL_A_RECORD_IP }];
  }
  const sub = domain.split(".")[0];
  return [{ type: "CNAME", name: sub, value: VERCEL_CNAME_TARGET }];
}

function ensurePremiumPro(user: any) {
  return user?.subscription_status === PREMIUM_PRO || user?.role === "admin";
}

/**
 * GET — return the user's current custom domain and its live verification status.
 */
export const GET = withAuth(async (_request, { supabase, user }) => {
  const { data: record } = await supabase
    .from("users")
    .select("domain, domain_verified")
    .eq("id", user.id)
    .single();

  const domain = record?.domain as string | null;
  if (!domain) {
    return apiResponse.success({ domain: null, verified: false });
  }

  let misconfigured = true;
  let verified = false;
  let verification: any[] = [];

  try {
    const [config, projectDomain] = await Promise.all([
      getVercelDomainConfig(domain),
      getProjectDomain(domain),
    ]);
    misconfigured = config?.misconfigured ?? true;
    verification = projectDomain?.verification ?? [];
    verified = !misconfigured && (projectDomain?.verified ?? false);
  } catch (e) {
    // Network / config error talking to Vercel — report as not yet verified.
    misconfigured = true;
  }

  // Persist the verified flag when it flips so the rest of the app can rely on it.
  if (verified !== Boolean(record?.domain_verified)) {
    await supabase
      .from("users")
      .update({ domain_verified: verified })
      .eq("id", user.id);
  }

  return apiResponse.success({
    domain,
    verified,
    misconfigured,
    verification,
    records: recommendedRecords(domain),
  });
});

/**
 * POST — claim a custom domain: validate, ensure uniqueness, register with Vercel, persist.
 */
export const POST = withAuth(async (request, { supabase, user }) => {
  if (!ensurePremiumPro(user)) {
    return apiResponse.error(
      "Custom domains are available on the Premium Pro plan.",
      403,
    );
  }

  const body = await request.json().catch(() => ({}));
  const domain = normalizeDomain(body?.domain ?? "");
  if (!domain) {
    return apiResponse.badRequest(
      "Please enter a valid domain, e.g. example.com",
    );
  }

  // One domain per user, globally unique.
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("domain", domain)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) {
    return apiResponse.error(
      "That domain is already connected to another account.",
      409,
    );
  }

  // Register with Vercel. Re-adding a domain already on this project succeeds
  // (no error), so any returned error is a genuine conflict or bad request.
  const vercelResult = await addDomainToProject(domain);
  if (vercelResult?.error) {
    const message =
      vercelResult.error.code === "forbidden"
        ? "This domain is already in use by another Vercel account and must be removed there first."
        : vercelResult.error.message;
    return apiResponse.error(message, 409);
  }

  const { error } = await supabase
    .from("users")
    .update({ domain, domain_verified: false })
    .eq("id", user.id);

  if (error) {
    // Roll back the Vercel registration so we don't leak orphaned domains.
    await removeDomainFromProject(domain).catch(() => {});
    return apiResponse.error("Failed to save domain.", 500);
  }

  return apiResponse.success({
    domain,
    verified: false,
    records: recommendedRecords(domain),
    verification: vercelResult?.verification ?? [],
  });
});

/**
 * DELETE — disconnect the user's custom domain.
 */
export const DELETE = withAuth(async (_request, { supabase, user }) => {
  const { data: record } = await supabase
    .from("users")
    .select("domain")
    .eq("id", user.id)
    .single();

  const domain = record?.domain as string | null;
  if (domain) {
    await removeDomainFromProject(domain).catch(() => {});
  }

  const { error } = await supabase
    .from("users")
    .update({
      domain: null,
      domain_verified: false,
      domain_verification_code: null,
    })
    .eq("id", user.id);

  if (error) {
    return apiResponse.error("Failed to remove domain.", 500);
  }

  return apiResponse.success({ domain: null });
});

// PUT — explicit "re-check" that also triggers Vercel's TXT verification challenge.
export const PUT = withAuth(async (_request, { supabase, user }) => {
  const { data: record } = await supabase
    .from("users")
    .select("domain")
    .eq("id", user.id)
    .single();

  const domain = record?.domain as string | null;
  if (!domain) return apiResponse.badRequest("No domain to verify.");

  try {
    await verifyProjectDomain(domain);
  } catch {
    // best-effort; the GET status call will reflect the latest state
  }
  return apiResponse.success({ domain });
});

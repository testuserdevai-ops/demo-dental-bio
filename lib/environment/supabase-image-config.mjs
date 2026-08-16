const PRODUCTION_SUPABASE_URL = "https://cxqkuqtwrtgvoorxidvn.supabase.co";

export function getSupabaseImageRemotePattern(environment = process.env) {
  const configuredUrl =
    environment.NEXT_PUBLIC_SUPABASE_URL?.trim() || PRODUCTION_SUPABASE_URL;
  const url = new URL(configuredUrl);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must use the http or https protocol.",
    );
  }

  return {
    protocol: url.protocol.slice(0, -1),
    hostname: url.hostname,
    port: url.port,
    pathname: "/storage/v1/**",
  };
}

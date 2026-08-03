import { getDomainConfigByHostname } from "@/utils/domainConfig";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

type RegistrationUrlOptions = {
  currentOrigin: string;
  currentHostname: string;
  selectedDomain: string;
  username: string;
  referral?: string | null;
};

export function buildRegistrationUrl({
  currentOrigin,
  currentHostname,
  selectedDomain,
  username,
  referral,
}: RegistrationUrlOptions): string {
  const selectedDomainConfig = getDomainConfigByHostname(selectedDomain);
  const baseUrl = LOCAL_HOSTNAMES.has(currentHostname)
    ? currentOrigin
    : selectedDomainConfig.baseUrl || `https://${selectedDomain}`;

  const url = new URL("/register/", baseUrl);
  url.searchParams.set("username", username);
  url.searchParams.set("domain", selectedDomain);

  if (referral) {
    url.searchParams.set("referral", referral);
  }

  return url.toString();
}

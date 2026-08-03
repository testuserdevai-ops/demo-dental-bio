export type ShareAction = "attempt" | "copy_success" | "channel_launch";

export type ShareChannel =
  "copy" | "linkedin" | "facebook" | "whatsapp" | "messenger" | "email";

type GtagWindow = Window & {
  gtag?: (
    command: "event",
    eventName: string,
    parameters: Record<string, string>,
  ) => void;
};

export function buildPublicProfileUrl(
  baseUrl: string,
  username: string,
): string {
  const origin = new URL(baseUrl);
  origin.pathname = "/";
  origin.search = "";
  origin.hash = "";

  return new URL(encodeURIComponent(username), origin).toString();
}

export function buildMessengerSendUrl(
  profileUrl: string,
  appId: string | undefined,
): string | null {
  if (!appId?.trim()) return null;

  const url = new URL("https://www.facebook.com/dialog/send");
  url.searchParams.set("app_id", appId.trim());
  url.searchParams.set("link", profileUrl);
  url.searchParams.set("redirect_uri", profileUrl);
  return url.toString();
}

export function buildShareUrls(profileUrl: string, brandName: string) {
  const linkedIn = new URL("https://www.linkedin.com/sharing/share-offsite/");
  linkedIn.searchParams.set("url", profileUrl);

  const facebook = new URL("https://www.facebook.com/sharer/sharer.php");
  facebook.searchParams.set("u", profileUrl);

  const whatsapp = new URL("https://api.whatsapp.com/send");
  whatsapp.searchParams.set("text", profileUrl);

  const email = new URL("mailto:");
  email.searchParams.set("subject", `Check out this ${brandName}`);
  email.searchParams.set("body", `Visit ${profileUrl}`);

  return {
    linkedIn: linkedIn.toString(),
    facebook: facebook.toString(),
    whatsapp: whatsapp.toString(),
    email: email.toString(),
  };
}

export function trackProfileShare(
  action: ShareAction,
  channel: ShareChannel,
): void {
  if (typeof window === "undefined") return;

  (window as GtagWindow).gtag?.("event", "profile_share", {
    share_action: action,
    share_channel: channel,
  });
}

import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  buildMessengerSendUrl,
  buildPublicProfileUrl,
  buildShareUrls,
  trackProfileShare,
} from "./share";

type TestWindow = Window & {
  gtag?: (
    command: "event",
    eventName: string,
    parameters: Record<string, string>,
  ) => void;
};

const testWindow = window as TestWindow;
const originalGtag = testWindow.gtag;

afterEach(() => {
  testWindow.gtag = originalGtag;
});

describe("public profile sharing utilities", () => {
  test("builds the canonical brand URL and encodes the username as one path segment", () => {
    expect(
      buildPublicProfileUrl("https://dental.bio/ignored", "Dr Jane/Smith"),
    ).toBe("https://dental.bio/Dr%20Jane%2FSmith");
  });

  test("places the canonical URL in each supported share URL", () => {
    const profileUrl = "https://dental.bio/dr-jane";
    const urls = buildShareUrls(profileUrl, "Dentalbio");

    expect(new URL(urls.linkedIn).searchParams.get("url")).toBe(profileUrl);
    expect(new URL(urls.facebook).searchParams.get("u")).toBe(profileUrl);
    expect(new URL(urls.whatsapp).searchParams.get("text")).toBe(profileUrl);
    expect(new URL(urls.email).searchParams.get("body")).toBe(
      `Visit ${profileUrl}`,
    );
  });

  test("builds a Messenger Send Dialog URL only when an app ID is available", () => {
    expect(
      buildMessengerSendUrl("https://dental.bio/dr-jane", undefined),
    ).toBeNull();

    const messengerUrl = new URL(
      buildMessengerSendUrl("https://dental.bio/dr-jane", "12345")!,
    );
    expect(messengerUrl.origin + messengerUrl.pathname).toBe(
      "https://www.facebook.com/dialog/send",
    );
    expect(messengerUrl.searchParams.get("app_id")).toBe("12345");
    expect(messengerUrl.searchParams.get("link")).toBe(
      "https://dental.bio/dr-jane",
    );
  });

  test("tracks only the share action and channel", () => {
    const gtag = mock(() => undefined);
    testWindow.gtag = gtag;

    trackProfileShare("copy_success", "copy");

    expect(gtag).toHaveBeenCalledWith("event", "profile_share", {
      share_action: "copy_success",
      share_channel: "copy",
    });
  });
});

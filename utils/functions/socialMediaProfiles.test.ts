// @ts-nocheck -- Bun provides the test runtime; application typechecking does not load Bun globals.
import { describe, expect, test } from "bun:test";
import {
  getSafeSocialProfileUrl,
  parseSocialMediaProfile,
  socialPlatforms,
} from "./socialMediaProfiles";

const accepted = [
  ["twitter", "dental_bio", "https://x.com/dental_bio"],
  ["twitter", "@DentalBio", "https://x.com/DentalBio"],
  ["twitter", "HTTPS://TWITTER.COM/DentalBio/?utm_source=test#bio", "https://x.com/DentalBio"],
  ["twitter", "https://www.x.com/dentalbio?lang=en", "https://x.com/dentalbio"],

  ["instagram", "dental.bio", "https://www.instagram.com/dental.bio"],
  ["instagram", "@Dental_Bio", "https://www.instagram.com/Dental_Bio"],
  ["instagram", "HTTPS://INSTAGRAM.COM/Dental.Bio/?hl=en#profile", "https://www.instagram.com/Dental.Bio"],
  ["instagram", "https://www.instagram.com/dentalbio/", "https://www.instagram.com/dentalbio"],

  ["facebook", "dental.bio", "https://www.facebook.com/dental.bio"],
  ["facebook", "@DentalBio", "https://www.facebook.com/DentalBio"],
  ["facebook", "HTTPS://FACEBOOK.COM/Dental-Bio/?ref=bookmarks#about", "https://www.facebook.com/Dental-Bio"],
  ["facebook", "https://m.facebook.com/profile.php?id=123456789&ref=share", "https://www.facebook.com/profile.php?id=123456789"],
  ["facebook", "https://facebook.com/pages/Dental-Bio/123456789/?ref=page", "https://www.facebook.com/pages/Dental-Bio/123456789"],
  ["facebook", "https://facebook.com/people/Dental-Bio/123456789/?ref=profile", "https://www.facebook.com/people/Dental-Bio/123456789"],

  ["tiktok", "dental.bio", "https://www.tiktok.com/@dental.bio"],
  ["tiktok", "@Dental_Bio", "https://www.tiktok.com/@Dental_Bio"],
  ["tiktok", "HTTPS://TIKTOK.COM/@Dental.Bio/?lang=en#profile", "https://www.tiktok.com/@Dental.Bio"],
  ["tiktok", "https://m.tiktok.com/@dentalbio/", "https://www.tiktok.com/@dentalbio"],
] as const;

describe("social profile accepted formats", () => {
  test.each(accepted)("normalizes %s input %s", (platform, input, expected) => {
    const result = parseSocialMediaProfile(input, platform);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.url).toBe(expected);
  });

  test.each(socialPlatforms)("preserves an empty optional %s field", (platform) => {
    expect(parseSocialMediaProfile("", platform)).toEqual({
      valid: true,
      url: "",
      blank: true,
      message: "Optional field left blank.",
    });
  });
});

const rejected = [
  ["twitter", "   "],
  ["twitter", "http://x.com/dentalbio"],
  ["twitter", "javascript:alert(1)"],
  ["twitter", "https://x.com.evil.example/dentalbio"],
  ["twitter", "https://x.com/dentalbio/status/123"],
  ["twitter", "https://x.com/home"],
  ["twitter", "twitter.com/dentalbio"],
  ["twitter", "name with spaces"],
  ["twitter", "sixteen_characters"],

  ["instagram", "   "],
  ["instagram", "ftp://instagram.com/dentalbio"],
  ["instagram", "https://instagram.com.evil.example/dentalbio"],
  ["instagram", "https://instagram.com/p/ABC123"],
  ["instagram", "https://instagram.com/dentalbio/extra"],
  ["instagram", "instagram.com/dentalbio"],
  ["instagram", "bad-name"],

  ["facebook", "   "],
  ["facebook", "http://facebook.com/dentalbio"],
  ["facebook", "data:text/html,hello"],
  ["facebook", "https://facebook.com.evil.example/dentalbio"],
  ["facebook", "https://facebook.com/groups/dentists"],
  ["facebook", "https://facebook.com/profile.php?id=not-a-number"],
  ["facebook", "https://facebook.com/pages/Dental-Bio/not-a-number"],
  ["facebook", "https://facebook.com/people/Dental-Bio/not-a-number"],
  ["facebook", "facebook.com/dentalbio"],
  ["facebook", "tiny"],

  ["tiktok", "   "],
  ["tiktok", "http://tiktok.com/@dentalbio"],
  ["tiktok", "javascript:alert(1)"],
  ["tiktok", "https://tiktok.com.evil.example/@dentalbio"],
  ["tiktok", "https://tiktok.com/dentalbio"],
  ["tiktok", "https://tiktok.com/@dentalbio/video/123"],
  ["tiktok", "tiktok.com/@dentalbio"],
  ["tiktok", "bad name"],
] as const;

describe("social profile rejected formats", () => {
  test.each(rejected)("rejects %s input %s", (platform, input) => {
    const result = parseSocialMediaProfile(input, platform);
    expect(result.valid).toBe(false);
    expect(getSafeSocialProfileUrl(input, platform)).toBeNull();
    if (!result.valid) expect(result.message.toLowerCase()).toContain(platform === "twitter" ? "x" : platform);
  });
});

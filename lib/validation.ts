import { z, ZodError } from "zod";

/**
 * Converts a ZodError into a flat Record<string, string> mapping field names to their first error message.
 */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString();
    if (key && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * Validates a URL string against a common URL pattern.
 * Moved from utils/functions/functions.ts for centralization.
 */
export function isValidUrlRegex(url: string): boolean {
  const pattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
  return pattern.test(url);
}

export const registerUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(20, { message: "Username must be 20 characters or less" })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message: "Username can only contain letters, numbers, underscores, or hyphens",
    }),
})

export const registerSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: "Title is required" })
      .max(20, { message: "Title too long" })
      .optional()
      .default(""),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: "Invalid email address" }),

    firstName: z
      .string()
      .trim()
      .min(1, { message: "First name is required" })
      .max(50, { message: "First name too long" })
      .regex(/^[\p{L}\p{M}\s'-]+$/u, { message: "Invalid characters in first name" }),

    lastName: z
      .string()
      .trim()
      .min(1, { message: "Last name is required" })
      .max(50, { message: "Last name too long" })
      .regex(/^[\p{L}\p{M}\s'-]+$/u, { message: "Invalid characters in last name" }),

    position: z
      .string()
      .trim()
      .min(1, { message: "Position is required" })
      .max(100, { message: "Position too long" })
      .optional()
      .default(""),

    country: z
      .string()
      .trim()
      .min(2, { message: "Country name too short" })
      .max(100, { message: "Country name too long" }),

    offerCode: z
      .string()
      .trim()
      .max(50, { message: "Offer code too long" })
      .optional()
      .default(""),

    password: z
      .string()
      .min(8, { message: "Must be at least 8 characters" })
      .max(100, { message: "Password too long" })
      .regex(/[A-Z]/, { message: "Must contain at least one uppercase letter" })
      .regex(/[a-z]/, { message: "Must contain at least one lowercase letter" })
      .regex(/[0-9]/, { message: "Must contain at least one number" })
      .regex(/[^A-Za-z0-9]/, { message: "Must contain at least one special character" }),

    confirmPassword: z
      .string()
      .min(8, { message: "Confirm password is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Login form schema
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(1, { message: "Password is required" }),
});

// Settings form schema
export const settingsSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, { message: "First name is required" })
    .max(50, { message: "First name too long" })
    .regex(/^[\p{L}\p{M}\s'-]+$/u, { message: "Invalid characters in first name" }),
  middle_name: z
    .string()
    .trim()
    .max(50, { message: "Middle name too long" })
    .regex(/^[\p{L}\p{M}\s'-]*$/u, { message: "Invalid characters in middle name" })
    .optional()
    .default(""),
  last_name: z
    .string()
    .trim()
    .min(1, { message: "Last name is required" })
    .max(50, { message: "Last name too long" })
    .regex(/^[\p{L}\p{M}\s'-]+$/u, { message: "Invalid characters in last name" }),
});

// Profile editor schema
export const profileSchema = z.object({
  about_title: z
    .string()
    .trim()
    .min(1, { message: "Profile title is required" })
    .max(100, { message: "Profile title too long" }),
  about_text: z
    .string()
    .trim()
    .max(500, { message: "Bio must be 500 characters or less" })
    .optional()
    .default(""),
  gdc_no: z
    .string()
    .trim()
    .max(20, { message: "Registration number too long" })
    .optional()
    .default(""),
  qualification: z
    .string()
    .trim()
    .max(100, { message: "Qualification too long" })
    .optional()
    .default(""),
  phone: z
    .string()
    .trim()
    .max(20, { message: "Phone number too long" })
    .regex(/^[+\d\s()-]*$/, { message: "Invalid phone number format" })
    .optional()
    .default(""),
  contact_email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .or(z.literal(""))
    .optional()
    .default(""),
  booking_link: z
    .string()
    .trim()
    .refine((val) => val === "" || isValidUrlRegex(val), { message: "Invalid booking link URL" })
    .optional()
    .default(""),
  website: z
    .string()
    .trim()
    .refine((val) => val === "" || isValidUrlRegex(val), { message: "Invalid website URL" })
    .optional()
    .default(""),
});

// Treatment/Service form schema
export const treatmentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(100, { message: "Title too long" }),
  description: z
    .string()
    .trim()
    .min(1, { message: "Description is required" })
    .max(200, { message: "Description too long" }),
});

// Add link form schema
export const addLinkSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(100, { message: "Title too long" }),
  url: z
    .string()
    .trim()
    .min(1, { message: "URL is required" }),
});

// Review form schema
export const reviewSchema = z.object({
  reviewer_name: z
    .string()
    .trim()
    .min(1, { message: "Reviewer name is required" })
    .max(100, { message: "Reviewer name too long" }),
  content: z
    .string()
    .trim()
    .min(1, { message: "Review content is required" })
    .max(500, { message: "Review content must be 500 characters or less" }),
  stars: z
    .number()
    .min(1, { message: "Rating must be at least 1 star" })
    .max(5, { message: "Rating must be at most 5 stars" }),
  platform: z
    .string()
    .trim()
    .min(1, { message: "Platform is required" })
    .max(50, { message: "Platform name too long" }),
});

// Gallery form schema
export const gallerySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(100, { message: "Title too long" }),
  before_image_label: z
    .string()
    .trim()
    .max(50, { message: "Label too long" })
    .optional()
    .default(""),
  after_image_label: z
    .string()
    .trim()
    .max(50, { message: "Label too long" })
    .optional()
    .default(""),
});

// Product form schema
export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Product name is required" })
    .max(100, { message: "Product name too long" }),
  price: z
    .string()
    .trim()
    .min(1, { message: "Price is required" })
    .regex(/^\d+(\.\d{1,2})?$/, { message: "Invalid price format" }),
  link: z
    .string()
    .trim()
    .min(1, { message: "Product link is required" })
    .refine((val) => isValidUrlRegex(val), { message: "Invalid product URL" }),
  platform: z
    .string()
    .trim()
    .min(1, { message: "Platform is required" })
    .max(50, { message: "Platform name too long" }),
});

// Email invite schema
export const inviteEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email address" }),
});

// Location title schema
export const locationTitleSchema = z.object({
  location_title: z
    .string()
    .trim()
    .min(1, { message: "Location title is required" })
    .max(100, { message: "Location title too long" }),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email address" }),
});

function isValidVideoUrl(input: string): boolean {
  let url;
  try {
    url = new URL(input);
  } catch {
    return false;
  }

  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  const pathname = url.pathname;

  if (hostname === "youtube.com") {
    if (pathname === "/watch" && url.searchParams.has("v")) return true;
    if (pathname.startsWith("/embed/")) return true;
    if (pathname.startsWith("/shorts/")) return true;
    if (pathname.startsWith("/live/")) return true;
  }
  if (hostname === "youtu.be") return pathname.length > 1;

  if (hostname === "vimeo.com") return /^\/\d+/.test(pathname);
  if (hostname === "player.vimeo.com") return pathname.startsWith("/video/");

  if (hostname === "dailymotion.com")
    return pathname.startsWith("/video/") || pathname.startsWith("/embed/video/");
  if (hostname === "dai.ly") return pathname.length > 1;

  if (hostname === "facebook.com") return pathname.includes("/videos/");

  if (hostname === "twitch.tv")
    return pathname.startsWith("/videos/") || /\/[^/]+\/clip\//.test(pathname);
  if (hostname === "player.twitch.tv" || hostname === "clips.twitch.tv") return true;

  if (hostname === "twitter.com" || hostname === "x.com") return pathname.length > 1;

  const videoExtensions = [
    ".mp4", ".webm", ".ogg", ".mkv", ".mov",
    ".avi", ".flv", ".wmv", ".3gp", ".m4v",
    ".m3u8", ".mpd",
  ];
  if (videoExtensions.some((ext) => pathname.toLowerCase().endsWith(ext))) return true;

  return false;
}

// Video form schema
export const videoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(100, { message: "Title too long" }),
  link: z
    .string()
    .trim()
    .min(1, { message: "Video link is required" })
    .refine(isValidVideoUrl, {
      message:
        "Please enter a valid video URL (YouTube, Vimeo, Dailymotion, Facebook, Twitter, Twitch, or a direct video file link)",
    }),
});

// Blog form schema
export const blogSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(200, { message: "Title too long" }),
  slug: z
    .string()
    .trim()
    .min(1, { message: "URL is required" }),
});

// Location form schema
export const locationSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(1, { message: "Business name is required" })
    .max(200, { message: "Business name too long" }),
  address: z
    .string()
    .trim()
    .min(1, { message: "Address is required" }),
  city: z
    .string()
    .trim()
    .min(1, { message: "City is required" }),
});

// Group name schema (blog groups, link groups)
export const groupNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Group title is required" })
    .max(100, { message: "Group title too long" }),
});

export const passwordRules = [
  {
    id: "minLength",
    label: "At least 8 characters",
    validate: (pw: string) => pw.length >= 8,
  },
  {
    id: "hasUpper",
    label: "Contains an uppercase letter",
    validate: (pw: string) => /[A-Z]/.test(pw),
  },
  {
    id: "hasLower",
    label: "Contains a lowercase letter",
    validate: (pw: string) => /[a-z]/.test(pw),
  },
  {
    id: "hasNumber",
    label: "Contains a number",
    validate: (pw: string) => /[0-9]/.test(pw),
  },
  {
    id: "hasSpecial",
    label: "Contains a special character",
    validate: (pw: string) => /[^A-Za-z0-9]/.test(pw),
  },
];

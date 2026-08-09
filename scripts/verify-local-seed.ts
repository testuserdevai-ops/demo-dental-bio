import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";

type LocalSupabaseStatus = {
  ANON_KEY?: string;
  API_URL?: string;
};

type SeedAccount = {
  email: string;
  password: string;
  username: string;
  role: "admin" | "user";
  subscriptionStatus: "PRO" | null;
};

const accounts: SeedAccount[] = [
  {
    email: "pro@dentalbio.local",
    password: "DentalBioPro123!",
    username: "pro-user",
    role: "user",
    subscriptionStatus: "PRO",
  },
  {
    email: "admin@dentalbio.local",
    password: "DentalBioAdmin123!",
    username: "admin-user",
    role: "admin",
    subscriptionStatus: null,
  },
];

const repositoryRoot = resolve(import.meta.dir, "..");

const proFixture = {
  dentistryId: "11111111-1111-4111-8111-111111111120",
  treatmentIds: [
    "11111111-1111-4111-8111-111111111130",
    "11111111-1111-4111-8111-111111111131",
    "11111111-1111-4111-8111-111111111132",
  ],
  videoGroupId: 1_111_101,
  productGroupId: 1_111_102,
  videoIds: [1_111_201, 1_111_202],
  productIds: [1_111_301, 1_111_302],
  galleryId: 1_111_401,
  generalGalleryIds: [1_111_501, 1_111_502],
  reviewIds: [1_111_601, 1_111_602],
  externalReviewPageId: 1_111_701,
  linkGroupId: "11111111-1111-4111-8111-111111111180",
  linkIds: [
    "11111111-1111-4111-8111-111111111181",
    "11111111-1111-4111-8111-111111111182",
  ],
} as const;

type LocalClient = ReturnType<typeof createLocalClient>;

function createLocalClient(apiUrl: string, anonKey: string) {
  return createClient(apiUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function assertSeed(
  condition: unknown,
  section: string,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new Error(`Pro seed ${section} verification failed: ${detail}`);
  }
}

function assertQuery(
  error: { message: string } | null,
  section: string,
): asserts error is null {
  assertSeed(!error, section, error?.message ?? "query failed");
}

function firstRelated<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function verifyProContent(supabase: LocalClient, userId: string) {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("first_name, last_name, title, position, country")
    .eq("id", userId)
    .single();
  assertQuery(userError, "bio");
  assertSeed(user?.first_name === "Amelia", "bio", "first name is missing");
  assertSeed(user.last_name === "Hart", "bio", "last name is missing");
  assertSeed(user.title === "Dr", "bio", "title is missing");
  assertSeed(
    user.position === "Cosmetic Dentist",
    "bio",
    "position is missing",
  );
  assertSeed(user.country === "United Kingdom", "bio", "country is missing");

  const { data: dentistry, error: dentistryError } = await supabase
    .from("dentistries")
    .select(
      "dentistry_id, about_title, about_text, phone, contact_email, website, booking_link, booking_link_enabled, socials(twitter_link, instagram_link, facebook_link, tiktok_link, other_link)",
    )
    .eq("user_id", userId)
    .single();
  assertQuery(dentistryError, "bio");
  assertSeed(
    dentistry?.dentistry_id === proFixture.dentistryId,
    "bio",
    "fixed dentistry is missing",
  );
  assertSeed(
    dentistry.about_title === "Creating confident, healthy smiles",
    "bio",
    "about title is missing",
  );
  assertSeed(
    typeof dentistry.about_text === "string" &&
      dentistry.about_text.length > 80,
    "bio",
    "biography is not populated",
  );
  assertSeed(
    dentistry.contact_email === "hello@example.com" &&
      dentistry.phone === "+442000000000" &&
      dentistry.website === "https://example.com/dentalbio-demo" &&
      dentistry.booking_link === "https://example.com/dentalbio-demo/book" &&
      dentistry.booking_link_enabled === true,
    "bio",
    "contact or booking details are incomplete",
  );

  const social = firstRelated(dentistry.socials);
  assertSeed(
    social?.twitter_link === "https://x.com/dentalbio_demo" &&
      social.instagram_link === "https://www.instagram.com/dentalbio.demo/" &&
      social.facebook_link === "https://www.facebook.com/dentalbio-demo/" &&
      social.tiktok_link === "https://www.tiktok.com/@dentalbio.demo" &&
      social.other_link === "https://example.com/dentalbio-demo",
    "social",
    "all five social destinations must be populated",
  );

  const { data: treatmentRows, error: treatmentsError } = await supabase
    .from("dentistry_treatments")
    .select("treatment_id, rank, treatments(title, description, isService)")
    .eq("dentistry_id", proFixture.dentistryId)
    .in("treatment_id", [...proFixture.treatmentIds])
    .order("rank");
  assertQuery(treatmentsError, "treatments");
  assertSeed(
    treatmentRows?.length === 3 &&
      treatmentRows.map(({ rank }) => rank).join(",") === "1,2,3",
    "treatments",
    "three ranked dentistry treatments are required",
  );
  const treatments = treatmentRows.map(({ treatments }) =>
    firstRelated(treatments),
  );
  assertSeed(
    treatments.every(
      (treatment) => treatment && (treatment.description?.length ?? 0) > 20,
    ) &&
      treatments.filter((treatment) => treatment?.isService === false)
        .length === 2 &&
      treatments.filter((treatment) => treatment?.isService === true).length ===
        1,
    "treatments",
    "two treatments and one service must be connected",
  );

  const { data: videoGroup, error: videosError } = await supabase
    .from("groups")
    .select(
      "id, name, enabled, type, datas:videos(id, title, link, rank, enabled)",
    )
    .eq("id", proFixture.videoGroupId)
    .eq("user_id", userId)
    .single();
  assertQuery(videosError, "videos");
  const videos = videoGroup?.datas ?? [];
  assertSeed(
    videoGroup?.name === "Patient guides" &&
      videoGroup.type === "videos" &&
      videoGroup.enabled === true &&
      videos.length === 2 &&
      videos.every(
        (video) =>
          proFixture.videoIds.includes(video.id) &&
          video.enabled === true &&
          video.link?.startsWith("https://www.youtube.com/watch?v="),
      ) &&
      videos
        .map(({ rank }) => rank)
        .sort()
        .join(",") === "1,2",
    "videos",
    "the ranked video group and its two videos are incomplete",
  );

  const { data: galleries, error: galleriesError } = await supabase
    .from("galleries")
    .select(
      "id, title, before_image_url, after_image_url, before_image_label, after_image_label, rank, enabled",
    )
    .eq("id", proFixture.galleryId)
    .eq("user_id", userId);
  assertQuery(galleriesError, "gallery");
  const gallery = galleries?.[0];
  assertSeed(
    gallery?.enabled === true &&
      gallery.rank === 1 &&
      gallery.before_image_url === "/previews/hero-image-1.webp" &&
      gallery.after_image_url === "/previews/hero-image-2.webp" &&
      gallery.before_image_label === "Before treatment" &&
      gallery.after_image_label === "After treatment",
    "gallery",
    "the before-and-after gallery is incomplete",
  );

  const { data: generalGalleries, error: generalGalleriesError } =
    await supabase
      .from("general_galleries")
      .select("id, image_url, rank, enabled")
      .eq("user_id", userId)
      .in("id", [...proFixture.generalGalleryIds])
      .order("rank");
  assertQuery(generalGalleriesError, "gallery");
  assertSeed(
    generalGalleries?.length === 2 &&
      generalGalleries.every(
        (item) =>
          item.enabled === true &&
          typeof item.image_url === "string" &&
          item.image_url.startsWith("/previews/"),
      ) &&
      generalGalleries.map(({ rank }) => rank).join(",") === "1,2",
    "gallery",
    "two ranked general gallery images are required",
  );

  const { data: productGroup, error: productsError } = await supabase
    .from("groups")
    .select(
      "id, name, enabled, type, datas:products(id, name, link, platform, image_url, price, currency, rank, enabled, user_id)",
    )
    .eq("id", proFixture.productGroupId)
    .eq("user_id", userId)
    .single();
  assertQuery(productsError, "shop");
  const products = productGroup?.datas ?? [];
  assertSeed(
    productGroup?.name === "Smile care essentials" &&
      productGroup.type === "products" &&
      productGroup.enabled === true &&
      products.length === 2 &&
      products.every(
        (product) =>
          proFixture.productIds.includes(product.id) &&
          product.user_id === userId &&
          product.enabled === true &&
          product.platform === "Demo shop" &&
          product.currency === "GBP" &&
          product.link?.startsWith(
            "https://example.com/dentalbio-demo/shop/",
          ) &&
          product.image_url?.startsWith("/previews/"),
      ) &&
      products
        .map(({ rank }) => rank)
        .sort()
        .join(",") === "1,2",
    "shop",
    "the ranked product group and its two products are incomplete",
  );

  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select(
      "id, reviewer_name, content, stars, image_url, platform, rank, enabled",
    )
    .eq("user_id", userId)
    .in("id", [...proFixture.reviewIds])
    .order("rank");
  assertQuery(reviewsError, "reviews");
  assertSeed(
    reviews?.length === 2 &&
      reviews.every(
        (review) =>
          review.enabled === true &&
          review.stars === 5 &&
          (review.content?.length ?? 0) > 30 &&
          review.image_url?.startsWith("/"),
      ) &&
      reviews.map(({ rank }) => rank).join(",") === "1,2",
    "reviews",
    "two ranked five-star reviews are required",
  );
  const { data: reviewPage, error: reviewPageError } = await supabase
    .from("external_review_pages")
    .select("id, link")
    .eq("id", proFixture.externalReviewPageId)
    .eq("user_id", userId)
    .single();
  assertQuery(reviewPageError, "reviews");
  assertSeed(
    reviewPage?.link === "https://example.com/dentalbio-demo/reviews",
    "reviews",
    "the external reviews destination is missing",
  );

  const { data: linkGroup, error: linksError } = await supabase
    .from("link_groups")
    .select(
      "link_group_id, heading, rank, dentistry_links(links(link_id, title, link, is_active, rank))",
    )
    .eq("link_group_id", proFixture.linkGroupId)
    .eq("dentistry_id", proFixture.dentistryId)
    .single();
  assertQuery(linksError, "links");
  const links = (linkGroup?.dentistry_links ?? [])
    .map(({ links }) => firstRelated(links))
    .filter((link) => link !== null)
    .sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0));
  assertSeed(
    linkGroup?.heading === "Helpful resources" &&
      linkGroup.rank === 1 &&
      links.length === 2 &&
      links.every(
        (link) =>
          proFixture.linkIds.includes(link.link_id) &&
          link.is_active === true &&
          link.link?.startsWith("https://example.com/dentalbio-demo/"),
      ) &&
      links.map(({ rank }) => rank).join(",") === "1,2",
    "links",
    "the ranked link group and its two active links are incomplete",
  );

  console.log("Verified populated local Pro profile: all requested sections");
}

function getLocalSupabaseStatus(): Required<LocalSupabaseStatus> {
  const status = Bun.spawnSync(
    ["bunx", "supabase", "status", "--output", "json"],
    {
      cwd: repositoryRoot,
      stderr: "pipe",
      stdout: "pipe",
    },
  );

  if (!status.success) {
    throw new Error(
      `Local Supabase is unavailable: ${status.stderr.toString().trim()}`,
    );
  }

  const localStatus = JSON.parse(
    status.stdout.toString(),
  ) as LocalSupabaseStatus;

  if (!localStatus.API_URL || !localStatus.ANON_KEY) {
    throw new Error(
      "Local Supabase status did not return API_URL and ANON_KEY.",
    );
  }

  const apiUrl = new URL(localStatus.API_URL);
  const localHostnames = new Set(["127.0.0.1", "::1", "localhost"]);

  if (
    apiUrl.protocol !== "http:" ||
    !localHostnames.has(apiUrl.hostname) ||
    apiUrl.port !== "54321"
  ) {
    throw new Error(
      `Refusing to verify a non-local Supabase API (${apiUrl.origin}).`,
    );
  }

  return {
    ANON_KEY: localStatus.ANON_KEY,
    API_URL: localStatus.API_URL,
  };
}

async function verifyAccount(
  apiUrl: string,
  anonKey: string,
  account: SeedAccount,
) {
  const supabase = createLocalClient(apiUrl, anonKey);

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

  if (authError || !authData.user) {
    throw new Error(
      `Password authentication failed for ${account.email}: ${authError?.message ?? "no user returned"}`,
    );
  }

  if (authData.user.email !== account.email) {
    throw new Error(`Authenticated the wrong user for ${account.email}.`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, username, role, subscription_status")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `Public profile lookup failed for ${account.email}: ${profileError?.message ?? "no profile returned"}`,
    );
  }

  const actual = {
    id: profile.id,
    role: profile.role,
    subscriptionStatus: profile.subscription_status,
    username: profile.username,
  };
  const expected = {
    id: authData.user.id,
    role: account.role,
    subscriptionStatus: account.subscriptionStatus,
    username: account.username,
  };

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Public profile mismatch for ${account.email}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }

  if (account.email === "pro@dentalbio.local") {
    await verifyProContent(supabase, authData.user.id);
  }

  console.log(`Verified local seed account: ${account.email}`);
}

async function main() {
  const status = getLocalSupabaseStatus();

  for (const account of accounts) {
    await verifyAccount(status.API_URL, status.ANON_KEY, account);
  }

  console.log("Local Supabase seed verification passed.");
}

await main();

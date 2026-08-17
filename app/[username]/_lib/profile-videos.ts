type VideoCandidate = {
  id?: unknown;
  title?: unknown;
  link?: unknown;
  rank?: unknown;
  enabled?: unknown;
};

type VideoGroupCandidate = {
  id?: unknown;
  name?: unknown;
  rank?: unknown;
  enabled?: unknown;
  datas?: unknown;
};

export type ProfileVideoPresentation =
  | {
      kind: "iframe";
      provider: "youtube" | "vimeo" | "dailymotion";
      src: string;
    }
  | {
      kind: "iframe";
      provider: "twitch";
      src: string;
      parentPolicy: "current-host";
    }
  | { kind: "native-video"; src: string };

export type ProfileVideo = {
  id: string;
  title: string;
  link: string;
  rank: number | undefined;
  enabled: true;
  position: number;
  presentation: ProfileVideoPresentation;
};

export type ProfileVideoGroup = {
  id: string;
  name: string;
  rank: number | undefined;
  enabled: true;
  datas: ProfileVideo[];
};

const NATIVE_VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm",
  ".ogg",
  ".mkv",
  ".mov",
  ".avi",
  ".flv",
  ".wmv",
  ".3gp",
  ".m4v",
  ".m3u8",
  ".mpd",
]);
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);
const DAILYMOTION_HOSTS = new Set([
  "dailymotion.com",
  "www.dailymotion.com",
  "dai.ly",
]);
const TWITCH_PAGE_HOSTS = new Set(["twitch.tv", "www.twitch.tv"]);
const TWITCH_PLAYER_HOST = "player.twitch.tv";
const TWITCH_CLIPS_HOST = "clips.twitch.tv";
const TWITCH_SEMANTIC_PARAMETERS = new Set([
  "video",
  "channel",
  "collection",
  "clip",
]);

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

function cleanBoundedText(value: unknown, maximum: number): string | null {
  const text = cleanText(value);
  return text && text.length <= maximum ? text : null;
}

function normalizePositiveInteger(value: unknown): number | null {
  const source =
    typeof value === "string" && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  return typeof source === "number" &&
    Number.isSafeInteger(source) &&
    source > 0
    ? source
    : null;
}

function normalizeRank(value: unknown): number | undefined {
  const source =
    typeof value === "string" && /^-?\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  return typeof source === "number" && Number.isSafeInteger(source)
    ? source
    : undefined;
}

function canonicalHttpsUrl(value: unknown): URL | null {
  const input = cleanText(value);
  if (!input || input.length > 2048) return null;

  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}

function pathSegment(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const value = pathname.slice(prefix.length).split("/")[0] ?? "";
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}

function twitchSemanticEntries(url: URL): [string, string][] {
  return [...url.searchParams.entries()].filter(([name]) =>
    TWITCH_SEMANTIC_PARAMETERS.has(name),
  );
}

function singleTwitchSemanticEntry(
  url: URL,
  allowedNames: readonly string[],
): [string, string] | null {
  const entries = twitchSemanticEntries(url);
  if (entries.length !== 1 || !allowedNames.includes(entries[0]![0])) {
    return null;
  }
  return entries[0]!;
}

function createTwitchPresentation(url: URL): ProfileVideoPresentation | null {
  const host = url.hostname.toLowerCase();
  if (url.port) return null;

  let embedSrc: string | null = null;
  if (
    TWITCH_PAGE_HOSTS.has(host) &&
    !url.hash &&
    twitchSemanticEntries(url).length === 0
  ) {
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      segments.length === 2 &&
      segments[0] === "videos" &&
      /^[1-9]\d*$/.test(segments[1] ?? "")
    ) {
      embedSrc = `https://${TWITCH_PLAYER_HOST}/?video=v${segments[1]}`;
    } else if (
      segments.length === 3 &&
      /^[A-Za-z0-9_]{1,25}$/.test(segments[0] ?? "") &&
      segments[1] === "clip" &&
      /^[A-Za-z0-9_-]+$/.test(segments[2] ?? "")
    ) {
      embedSrc = `https://${TWITCH_CLIPS_HOST}/embed?clip=${segments[2]}`;
    }
  } else if (host === TWITCH_PLAYER_HOST && url.pathname === "/" && !url.hash) {
    const semantic = singleTwitchSemanticEntry(url, [
      "video",
      "channel",
      "collection",
    ]);
    if (semantic?.[0] === "video") {
      const match = /^v?([1-9]\d*)$/.exec(semantic[1]);
      if (match) {
        embedSrc = `https://${TWITCH_PLAYER_HOST}/?video=v${match[1]}`;
      }
    } else if (semantic?.[0] === "channel") {
      const channel = semantic[1];
      if (/^[A-Za-z0-9_]{1,25}$/.test(channel)) {
        embedSrc = `https://${TWITCH_PLAYER_HOST}/?channel=${channel}`;
      }
    } else if (semantic?.[0] === "collection") {
      const collection = semantic[1];
      if (/^[A-Za-z0-9_-]+$/.test(collection)) {
        embedSrc = `https://${TWITCH_PLAYER_HOST}/?collection=${collection}`;
      }
    }
  } else if (host === TWITCH_CLIPS_HOST && !url.hash) {
    if (url.pathname === "/embed") {
      const semantic = singleTwitchSemanticEntry(url, ["clip"]);
      const clip = semantic?.[1] ?? "";
      if (/^[A-Za-z0-9_-]+$/.test(clip)) {
        embedSrc = `https://${TWITCH_CLIPS_HOST}/embed?clip=${clip}`;
      }
    } else if (twitchSemanticEntries(url).length === 0) {
      const clip = pathSegment(url.pathname, "/");
      if (clip && url.pathname === `/${clip}`) {
        embedSrc = `https://${TWITCH_CLIPS_HOST}/embed?clip=${clip}`;
      }
    }
  }

  return embedSrc
    ? {
        kind: "iframe",
        provider: "twitch",
        src: embedSrc,
        parentPolicy: "current-host",
      }
    : null;
}

function createVideoPresentation(
  value: unknown,
): ProfileVideoPresentation | null {
  const url = canonicalHttpsUrl(value);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    const id = host.endsWith("youtu.be")
      ? pathSegment(url.pathname, "/")
      : url.pathname === "/watch"
        ? url.searchParams.get("v")
        : (pathSegment(url.pathname, "/embed/") ??
          pathSegment(url.pathname, "/shorts/") ??
          pathSegment(url.pathname, "/live/"));
    return id && /^[A-Za-z0-9_-]+$/.test(id)
      ? {
          kind: "iframe",
          provider: "youtube",
          src: `https://www.youtube.com/embed/${id}`,
        }
      : null;
  }

  if (VIMEO_HOSTS.has(host)) {
    const id =
      host === "player.vimeo.com"
        ? pathSegment(url.pathname, "/video/")
        : pathSegment(url.pathname, "/");
    return id && /^\d+$/.test(id)
      ? {
          kind: "iframe",
          provider: "vimeo",
          src: `https://player.vimeo.com/video/${id}`,
        }
      : null;
  }

  if (DAILYMOTION_HOSTS.has(host)) {
    const id =
      host === "dai.ly"
        ? pathSegment(url.pathname, "/")
        : (pathSegment(url.pathname, "/video/") ??
          pathSegment(url.pathname, "/embed/video/"));
    return id && /^[A-Za-z0-9]+$/.test(id)
      ? {
          kind: "iframe",
          provider: "dailymotion",
          src: `https://www.dailymotion.com/embed/video/${id}`,
        }
      : null;
  }

  if (
    TWITCH_PAGE_HOSTS.has(host) ||
    host === TWITCH_PLAYER_HOST ||
    host === TWITCH_CLIPS_HOST
  ) {
    return createTwitchPresentation(url);
  }

  const lowerPath = url.pathname.toLowerCase();
  return [...NATIVE_VIDEO_EXTENSIONS].some((extension) =>
    lowerPath.endsWith(extension),
  )
    ? { kind: "native-video", src: url.toString() }
    : null;
}

function compareRankAndId(
  left: { rank: number | undefined; id: number },
  right: { rank: number | undefined; id: number },
) {
  return (
    (left.rank ?? Number.MAX_SAFE_INTEGER) -
      (right.rank ?? Number.MAX_SAFE_INTEGER) || left.id - right.id
  );
}

/**
 * Converts untrusted loader output to the only video shape public renderers
 * may consume. IDs and ranks are normalized before deterministic ordering.
 */
export function selectProfileVideos(input: unknown): ProfileVideoGroup[] {
  if (!Array.isArray(input)) return [];

  const seenGroups = new Set<number>();
  const seenVideos = new Set<number>();
  const groups = input.flatMap((candidate) => {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      return [];
    }
    const group = candidate as VideoGroupCandidate;
    const id = normalizePositiveInteger(group.id);
    const name = cleanBoundedText(group.name, 100);
    if (
      !id ||
      seenGroups.has(id) ||
      group.enabled !== true ||
      !name ||
      !Array.isArray(group.datas)
    ) {
      return [];
    }
    seenGroups.add(id);

    const videos = group.datas.flatMap((videoCandidate) => {
      if (
        !videoCandidate ||
        typeof videoCandidate !== "object" ||
        Array.isArray(videoCandidate)
      ) {
        return [];
      }
      const video = videoCandidate as VideoCandidate;
      const videoId = normalizePositiveInteger(video.id);
      const title = cleanBoundedText(video.title, 100);
      const presentation = createVideoPresentation(video.link);
      if (
        !videoId ||
        seenVideos.has(videoId) ||
        video.enabled !== true ||
        !title ||
        !presentation
      ) {
        return [];
      }
      seenVideos.add(videoId);
      return [
        {
          id: videoId,
          title,
          link: presentation.src,
          rank: normalizeRank(video.rank),
          enabled: true as const,
          presentation,
        },
      ];
    });

    const orderedVideos = videos
      .slice()
      .sort(compareRankAndId)
      .map((video, index) => ({
        id: String(video.id),
        title: video.title,
        link: video.link,
        rank: video.rank,
        enabled: video.enabled,
        position: index + 1,
        presentation: video.presentation,
      }));
    if (!orderedVideos.length) return [];

    return [
      {
        id,
        name,
        rank: normalizeRank(group.rank),
        enabled: true as const,
        datas: orderedVideos,
      },
    ];
  });

  return groups
    .slice()
    .sort(compareRankAndId)
    .map((group) => ({
      id: String(group.id),
      name: group.name,
      rank: group.rank,
      enabled: group.enabled,
      datas: group.datas,
    }));
}

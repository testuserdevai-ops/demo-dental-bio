export const normalizeVideoUrl = (url: string) => {
  try {
    const videoUrl = new URL(url);
    const host = videoUrl.host;

    // Check for already valid embed URLs
    if (
      (host.includes("youtube.com") && url.includes("/embed/")) ||
      (host.includes("vimeo.com") && url.includes("/video/")) ||
      (host.includes("dailymotion.com") && url.includes("/embed/video/")) ||
      (host.includes("facebook.com") && url.includes("/video/embed")) ||
      (host.includes("twitch.tv") && (url.includes("player.twitch.tv") || url.includes("clips.twitch.tv")))
    ) {
      return url; // Return the valid embed URL as-is
    }

    // Handle YouTube URLs
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const videoId = host.includes("youtu.be")
        ? videoUrl.pathname.slice(1) // youtu.be/M1HinlfYA04
        : videoUrl.searchParams.get("v"); // youtube.com/watch?v=M1HinlfYA04
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    // Handle Vimeo URLs
    if (host.includes("vimeo.com")) {
      const videoId = videoUrl.pathname.split("/").pop(); // vimeo.com/12345678
      return `https://player.vimeo.com/video/${videoId}`;
    }

    // Handle Dailymotion URLs
    if (host.includes("dailymotion.com") || host.includes("dai.ly")) {
      const videoId = host.includes("dai.ly")
        ? videoUrl.pathname.slice(1) // dai.ly/VIDEO_ID
        : videoUrl.pathname.split("/").pop(); // dailymotion.com/video/VIDEO_ID
      return `https://www.dailymotion.com/embed/video/${videoId}`;
    }

    // Handle Facebook Video URLs
    if (host.includes("facebook.com")) {
      const videoId = videoUrl.searchParams.get("v"); // facebook.com/video.php?v=VIDEO_ID
      if (videoId) return `https://www.facebook.com/video/embed?video_id=${videoId}`;
    }

    // Handle Twitch Video URLs
    if (host.includes("twitch.tv")) {
      if (url.includes("/videos/")) {
        const videoId = videoUrl.pathname.split("/").pop(); // twitch.tv/videos/VIDEO_ID
        return `https://player.twitch.tv/?video=${videoId}`;
      } else if (url.includes("/clip/")) {
        const clipId = videoUrl.pathname.split("/").pop(); // twitch.tv/clip/CLIP_ID
        return `https://clips.twitch.tv/embed?clip=${clipId}`;
      }
    }

    // Handle Twitter Video URLs
    if (host.includes("twitter.com") || host.includes("x.com")) {
      return `${url}?embed=true`; // Embed support for Twitter videos
    }

    // Handle Direct Video File URLs
    if (url.match(/\.(mp4|webm|ogg|mkv|mov|avi|flv|wmv|3gp|m4v)$/i)) {
      return url; // Direct video file URL is valid as-is
    }

    // Unsupported URL
    throw new Error("Unsupported video URL format.");
  } catch (error: any) {
    console.error("Error normalizing video URL:", error?.message!);
    return null; // Return null for unsupported or invalid URLs
  }
}

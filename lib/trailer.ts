// Trailer links the admin pastes (spec: YouTube or VK Video) turned into a
// player address and, where the service offers one, a preview image.

export type Trailer = {
  provider: "youtube" | "vk";
  embedUrl: string;
  thumbnailUrl: string | null;
};

const YOUTUBE_ID = /^[\w-]{11}$/;

function youtube(id: string | null | undefined): Trailer | null {
  if (!id || !YOUTUBE_ID.test(id)) return null;
  return {
    provider: "youtube",
    // The no-cookie host sets no tracking cookies until the video plays.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

function vk(owner: string, video: string, hash: string | null): Trailer | null {
  if (!/^-?\d+$/.test(owner) || !/^\d+$/.test(video)) return null;
  const embed = new URL("https://vkvideo.ru/video_ext.php");
  embed.searchParams.set("oid", owner);
  embed.searchParams.set("id", video);
  // VK's own embed code carries a hash; some videos play only with it.
  if (hash) embed.searchParams.set("hash", hash);
  embed.searchParams.set("autoplay", "1");
  return { provider: "vk", embedUrl: embed.toString(), thumbnailUrl: null };
}

/** The player for a trailer link, or null if it is not YouTube or VK Video. */
export function parseTrailer(link: string): Trailer | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");

  if (host === "youtu.be") return youtube(url.pathname.slice(1));
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") return youtube(url.searchParams.get("v"));
    return youtube(
      url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1],
    );
  }

  if (host === "vkvideo.ru" || host === "vk.com" || host === "vk.ru") {
    if (url.pathname === "/video_ext.php") {
      const owner = url.searchParams.get("oid");
      const video = url.searchParams.get("id");
      return owner && video
        ? vk(owner, video, url.searchParams.get("hash"))
        : null;
    }
    const match = url.pathname.match(/^\/(?:video|clip)(-?\d+)_(\d+)/);
    return match ? vk(match[1]!, match[2]!, null) : null;
  }

  return null;
}

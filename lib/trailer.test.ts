import { describe, expect, it } from "vitest";
import { parseTrailer } from "./trailer";

const bunny = {
  provider: "youtube",
  embedUrl:
    "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0",
  thumbnailUrl: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
};

describe("parseTrailer", () => {
  it.each([
    "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    "https://youtube.com/watch?v=aqz-KE-bpKQ&t=42s",
    "https://m.youtube.com/watch?v=aqz-KE-bpKQ",
    "https://youtu.be/aqz-KE-bpKQ",
    "https://www.youtube.com/shorts/aqz-KE-bpKQ",
    "https://www.youtube.com/embed/aqz-KE-bpKQ",
  ])("reads YouTube links: %s", (link) => {
    expect(parseTrailer(link)).toEqual(bunny);
  });

  it("reads VK Video links, keeping the hash of an embed link", () => {
    expect(parseTrailer("https://vkvideo.ru/video-123456_789")).toEqual({
      provider: "vk",
      embedUrl:
        "https://vkvideo.ru/video_ext.php?oid=-123456&id=789&autoplay=1",
      thumbnailUrl: null,
    });
    expect(
      parseTrailer(
        "https://vk.com/video_ext.php?oid=-123456&id=789&hash=abc123",
      ),
    ).toMatchObject({
      embedUrl:
        "https://vkvideo.ru/video_ext.php?oid=-123456&id=789&hash=abc123&autoplay=1",
    });
  });

  it.each([
    "not a link",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=too-short",
    "https://evil.example/watch?v=aqz-KE-bpKQ",
    "https://vkvideo.ru/video-abc_789",
  ])("refuses anything else: %s", (link) => {
    expect(parseTrailer(link)).toBeNull();
  });
});

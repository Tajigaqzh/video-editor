import { describe, it, expect } from "vitest";
import { getFileType, getFileName } from "@/hooks/useMediaFile";

describe("getFileType", () => {
  describe("视频文件", () => {
    it('should return "video" for mp4 files', () => {
      expect(getFileType("test.mp4")).toBe("video");
    });

    it('should return "video" for mov files', () => {
      expect(getFileType("test.mov")).toBe("video");
    });

    it('should return "video" for avi files', () => {
      expect(getFileType("test.avi")).toBe("video");
    });

    it('should return "video" for mkv files', () => {
      expect(getFileType("test.mkv")).toBe("video");
    });

    it('should return "video" for webm files', () => {
      expect(getFileType("test.webm")).toBe("video");
    });
  });

  describe("音频文件", () => {
    it('should return "audio" for mp3 files', () => {
      expect(getFileType("test.mp3")).toBe("audio");
    });

    it('should return "audio" for wav files', () => {
      expect(getFileType("test.wav")).toBe("audio");
    });

    it('should return "audio" for aac files', () => {
      expect(getFileType("test.aac")).toBe("audio");
    });

    it('should return "audio" for flac files', () => {
      expect(getFileType("test.flac")).toBe("audio");
    });

    it('should return "audio" for ogg files', () => {
      expect(getFileType("test.ogg")).toBe("audio");
    });
  });

  describe("图片文件", () => {
    it('should return "image" for jpg files', () => {
      expect(getFileType("test.jpg")).toBe("image");
    });

    it('should return "image" for jpeg files', () => {
      expect(getFileType("test.jpeg")).toBe("image");
    });

    it('should return "image" for png files', () => {
      expect(getFileType("test.png")).toBe("image");
    });

    it('should return "image" for gif files', () => {
      expect(getFileType("test.gif")).toBe("image");
    });

    it('should return "image" for webp files', () => {
      expect(getFileType("test.webp")).toBe("image");
    });

    it('should return "image" for bmp files', () => {
      expect(getFileType("test.bmp")).toBe("image");
    });
  });

  describe("未知文件", () => {
    it('should return "unknown" for txt files', () => {
      expect(getFileType("test.txt")).toBe("unknown");
    });

    it('should return "unknown" for pdf files', () => {
      expect(getFileType("test.pdf")).toBe("unknown");
    });

    it('should return "unknown" for doc files', () => {
      expect(getFileType("test.doc")).toBe("unknown");
    });
  });

  describe("大写扩展名", () => {
    it("should handle uppercase video extensions", () => {
      expect(getFileType("test.MP4")).toBe("video");
      expect(getFileType("test.MOV")).toBe("video");
    });

    it("should handle uppercase audio extensions", () => {
      expect(getFileType("test.MP3")).toBe("audio");
      expect(getFileType("test.WAV")).toBe("audio");
    });

    it("should handle uppercase image extensions", () => {
      expect(getFileType("test.JPG")).toBe("image");
      expect(getFileType("test.PNG")).toBe("image");
    });

    it("should handle mixed case extensions", () => {
      expect(getFileType("test.Mp4")).toBe("video");
      expect(getFileType("test.JpEg")).toBe("image");
    });
  });

  describe("无扩展名", () => {
    it('should return "unknown" for files without extension', () => {
      expect(getFileType("test")).toBe("unknown");
    });

    it('should return "unknown" for empty string', () => {
      expect(getFileType("")).toBe("unknown");
    });

    it('should return "unknown" for files with only dot', () => {
      expect(getFileType(".")).toBe("unknown");
    });
  });
});

describe("getFileName", () => {
  describe("提取文件名", () => {
    it("should extract filename from Unix path", () => {
      expect(getFileName("/path/to/file.mp4")).toBe("file.mp4");
    });

    it("should extract filename from Windows path", () => {
      expect(getFileName("C:\\Users\\test\\video.mov")).toBe("video.mov");
    });

    it("should extract filename from nested path", () => {
      expect(getFileName("/very/deep/nested/path/to/file.mp4")).toBe("file.mp4");
    });
  });

  describe("不同路径格式", () => {
    it("should handle filename without path", () => {
      expect(getFileName("file.mp4")).toBe("file.mp4");
    });

    it("should handle mixed path separators", () => {
      expect(getFileName("/path/to\\file.mp4")).toBe("file.mp4");
    });

    it("should handle path ending with separator", () => {
      expect(getFileName("/path/to/")).toBe("Unknown");
    });
  });

  describe("边界情况", () => {
    it("should handle empty string", () => {
      expect(getFileName("")).toBe("Unknown");
    });

    it("should handle single character filename", () => {
      expect(getFileName("a")).toBe("a");
    });

    it("should handle filename with multiple dots", () => {
      expect(getFileName("/path/to/file.name.with.dots.mp4")).toBe("file.name.with.dots.mp4");
    });

    it("should handle filename with spaces", () => {
      expect(getFileName("/path/to/my video file.mp4")).toBe("my video file.mp4");
    });

    it("should handle filename with special characters", () => {
      expect(getFileName("/path/to/file-name_123.mp4")).toBe("file-name_123.mp4");
    });
  });
});

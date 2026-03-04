import type { MediaFile, MediaFolder, MediaItem } from "@/utils/media/mediaOperations";

/**
 * Generate a test MediaFile with default or custom properties
 */
export function createTestMediaFile(overrides?: Partial<MediaFile>): MediaFile {
  const id = overrides?.id || crypto.randomUUID();
  const name = overrides?.name || "test-video.mp4";
  const type = overrides?.type || "video";

  return {
    id,
    name,
    path: overrides?.path || `/path/to/${name}`,
    url: overrides?.url || `asset://localhost/path/to/${name}`,
    type,
    ...overrides,
  };
}

/**
 * Generate a test MediaFolder with default or custom properties
 */
export function createTestMediaFolder(overrides?: Partial<MediaFolder>): MediaFolder {
  const id = overrides?.id || crypto.randomUUID();
  const name = overrides?.name || "Test Folder";

  return {
    id,
    name,
    type: "folder",
    children: overrides?.children || [],
    ...overrides,
  };
}

/**
 * Generate multiple test media files
 */
export function createTestMediaFiles(
  count: number,
  baseOverrides?: Partial<MediaFile>,
): MediaFile[] {
  return Array.from({ length: count }, (_, index) =>
    createTestMediaFile({
      ...baseOverrides,
      name: baseOverrides?.name || `test-file-${index + 1}.mp4`,
    }),
  );
}

/**
 * Generate a nested folder structure for testing
 */
export function createNestedFolderStructure(): MediaItem[] {
  const childFile = createTestMediaFile({ name: "nested-video.mp4" });
  const childFolder = createTestMediaFolder({
    name: "Child Folder",
    children: [childFile],
  });
  const parentFolder = createTestMediaFolder({
    name: "Parent Folder",
    children: [childFolder],
  });

  return [parentFolder];
}

import type { MediaFile, MediaFolder, MediaItem } from "@/utils/media/mediaOperations";

/**
 * Mock video file
 */
export const mockVideoFile: MediaFile = {
  id: "video-1",
  name: "sample-video.mp4",
  path: "/path/to/sample-video.mp4",
  url: "asset://localhost/path/to/sample-video.mp4",
  type: "video",
};

/**
 * Mock audio file
 */
export const mockAudioFile: MediaFile = {
  id: "audio-1",
  name: "sample-audio.mp3",
  path: "/path/to/sample-audio.mp3",
  url: "asset://localhost/path/to/sample-audio.mp3",
  type: "audio",
};

/**
 * Mock image file
 */
export const mockImageFile: MediaFile = {
  id: "image-1",
  name: "sample-image.jpg",
  path: "/path/to/sample-image.jpg",
  url: "asset://localhost/path/to/sample-image.jpg",
  type: "image",
};

/**
 * Mock empty folder
 */
export const mockEmptyFolder: MediaFolder = {
  id: "folder-1",
  name: "Empty Folder",
  type: "folder",
  children: [],
};

/**
 * Mock folder with files
 */
export const mockFolderWithFiles: MediaFolder = {
  id: "folder-2",
  name: "Media Folder",
  type: "folder",
  children: [
    {
      id: "video-2",
      name: "folder-video.mp4",
      path: "/path/to/folder-video.mp4",
      url: "asset://localhost/path/to/folder-video.mp4",
      type: "video",
    },
    {
      id: "audio-2",
      name: "folder-audio.mp3",
      path: "/path/to/folder-audio.mp3",
      url: "asset://localhost/path/to/folder-audio.mp3",
      type: "audio",
    },
  ],
};

/**
 * Mock nested folder structure
 */
export const mockNestedFolders: MediaFolder = {
  id: "folder-parent",
  name: "Parent Folder",
  type: "folder",
  children: [
    {
      id: "folder-child",
      name: "Child Folder",
      type: "folder",
      children: [
        {
          id: "video-nested",
          name: "nested-video.mp4",
          path: "/path/to/nested-video.mp4",
          url: "asset://localhost/path/to/nested-video.mp4",
          type: "video",
        },
      ],
    },
  ],
};

/**
 * Mock media items collection (mixed files and folders)
 */
export const mockMediaItems: MediaItem[] = [
  mockVideoFile,
  mockAudioFile,
  mockImageFile,
  mockEmptyFolder,
  mockFolderWithFiles,
];

/**
 * Mock Tauri dialog response - single file
 */
export const mockTauriSingleFileResponse = "/path/to/selected-file.mp4";

/**
 * Mock Tauri dialog response - multiple files
 */
export const mockTauriMultipleFilesResponse = [
  "/path/to/file1.mp4",
  "/path/to/file2.mp3",
  "/path/to/file3.jpg",
];

/**
 * Mock Tauri dialog response - cancelled
 */
export const mockTauriCancelledResponse = null;

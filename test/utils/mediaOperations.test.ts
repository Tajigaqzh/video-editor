import { describe, it, expect } from "vitest";
import {
  type MediaFile,
  type MediaFolder,
  type MediaItem,
  findFolder,
  addItemsToFolder,
  removeItemFromFolder,
} from "@/utils/media/mediaOperations";

describe("mediaOperations", () => {
  describe("findFolder", () => {
    it("should find folder in root", () => {
      const folder: MediaFolder = {
        id: "folder-1",
        name: "Test Folder",
        type: "folder",
        children: [],
      };
      const items: MediaItem[] = [folder];

      const result = findFolder(items, "folder-1");
      expect(result).toEqual(folder);
    });

    it("should find nested folder", () => {
      const nestedFolder: MediaFolder = {
        id: "nested-1",
        name: "Nested Folder",
        type: "folder",
        children: [],
      };
      const parentFolder: MediaFolder = {
        id: "parent-1",
        name: "Parent Folder",
        type: "folder",
        children: [nestedFolder],
      };
      const items: MediaItem[] = [parentFolder];

      const result = findFolder(items, "nested-1");
      expect(result).toEqual(nestedFolder);
    });

    it("should return null for non-existent folder", () => {
      const items: MediaItem[] = [];
      const result = findFolder(items, "non-existent");
      expect(result).toBeNull();
    });

    it("should find deeply nested folder", () => {
      const deepFolder: MediaFolder = {
        id: "deep-1",
        name: "Deep Folder",
        type: "folder",
        children: [],
      };
      const level2: MediaFolder = {
        id: "level2-1",
        name: "Level 2",
        type: "folder",
        children: [deepFolder],
      };
      const level1: MediaFolder = {
        id: "level1-1",
        name: "Level 1",
        type: "folder",
        children: [level2],
      };
      const items: MediaItem[] = [level1];

      const result = findFolder(items, "deep-1");
      expect(result).toEqual(deepFolder);
    });
  });

  describe("addItemsToFolder", () => {
    it("should add items to root", () => {
      const items: MediaItem[] = [];
      const newItem: MediaFile = {
        id: "1",
        name: "test.mp4",
        path: "/test.mp4",
        url: "asset://test.mp4",
        type: "video",
      };

      const result = addItemsToFolder(items, null, [newItem]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(newItem);
    });

    it("should add items to subfolder", () => {
      const folder: MediaFolder = {
        id: "folder-1",
        name: "Folder",
        type: "folder",
        children: [],
      };
      const items: MediaItem[] = [folder];
      const newItem: MediaFile = {
        id: "1",
        name: "test.mp4",
        path: "/test.mp4",
        url: "asset://test.mp4",
        type: "video",
      };

      const result = addItemsToFolder(items, "folder-1", [newItem]);
      const updatedFolder = result[0] as MediaFolder;

      expect(updatedFolder.children).toHaveLength(1);
      expect(updatedFolder.children[0]).toEqual(newItem);
    });

    it("should add items to nested folder", () => {
      const nestedFolder: MediaFolder = {
        id: "nested-1",
        name: "Nested",
        type: "folder",
        children: [],
      };
      const parentFolder: MediaFolder = {
        id: "parent-1",
        name: "Parent",
        type: "folder",
        children: [nestedFolder],
      };
      const items: MediaItem[] = [parentFolder];
      const newItem: MediaFile = {
        id: "1",
        name: "test.mp4",
        path: "/test.mp4",
        url: "asset://test.mp4",
        type: "video",
      };

      const result = addItemsToFolder(items, "nested-1", [newItem]);
      const updatedParent = result[0] as MediaFolder;
      const updatedNested = updatedParent.children[0] as MediaFolder;

      expect(updatedNested.children).toHaveLength(1);
      expect(updatedNested.children[0]).toEqual(newItem);
    });

    it("should add multiple items", () => {
      const items: MediaItem[] = [];
      const newItems: MediaFile[] = [
        {
          id: "1",
          name: "test1.mp4",
          path: "/test1.mp4",
          url: "asset://test1.mp4",
          type: "video",
        },
        {
          id: "2",
          name: "test2.mp4",
          path: "/test2.mp4",
          url: "asset://test2.mp4",
          type: "video",
        },
      ];

      const result = addItemsToFolder(items, null, newItems);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(newItems[0]);
      expect(result[1]).toEqual(newItems[1]);
    });
  });

  describe("removeItemFromFolder", () => {
    it("should remove item from root", () => {
      const item: MediaFile = {
        id: "1",
        name: "test.mp4",
        path: "/test.mp4",
        url: "asset://test.mp4",
        type: "video",
      };
      const items: MediaItem[] = [item];

      const result = removeItemFromFolder(items, "1");
      expect(result).toHaveLength(0);
    });

    it("should remove item from subfolder", () => {
      const childItem: MediaFile = {
        id: "child-1",
        name: "test.mp4",
        path: "/test.mp4",
        url: "asset://test.mp4",
        type: "video",
      };
      const folder: MediaFolder = {
        id: "folder-1",
        name: "Folder",
        type: "folder",
        children: [childItem],
      };
      const items: MediaItem[] = [folder];

      const result = removeItemFromFolder(items, "child-1");
      const updatedFolder = result[0] as MediaFolder;

      expect(updatedFolder.children).toHaveLength(0);
    });

    it("should recursively remove item", () => {
      const deepItem: MediaFile = {
        id: "deep-1",
        name: "test.mp4",
        path: "/test.mp4",
        url: "asset://test.mp4",
        type: "video",
      };
      const nestedFolder: MediaFolder = {
        id: "nested-1",
        name: "Nested",
        type: "folder",
        children: [deepItem],
      };
      const parentFolder: MediaFolder = {
        id: "parent-1",
        name: "Parent",
        type: "folder",
        children: [nestedFolder],
      };
      const items: MediaItem[] = [parentFolder];

      const result = removeItemFromFolder(items, "deep-1");
      const updatedParent = result[0] as MediaFolder;
      const updatedNested = updatedParent.children[0] as MediaFolder;

      expect(updatedNested.children).toHaveLength(0);
    });

    it("should not remove non-existent item", () => {
      const item: MediaFile = {
        id: "1",
        name: "test.mp4",
        path: "/test.mp4",
        url: "asset://test.mp4",
        type: "video",
      };
      const items: MediaItem[] = [item];

      const result = removeItemFromFolder(items, "non-existent");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(item);
    });
  });
});

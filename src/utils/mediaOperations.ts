// Media data operation utilities

export interface MediaFile {
  id: string;
  name: string;
  path: string;
  url: string;
  type: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  type: "folder";
  children: (MediaFile | MediaFolder)[];
}

export type MediaItem = MediaFile | MediaFolder;

/**
 * Find a folder by ID in the media items tree
 */
export const findFolder = (items: MediaItem[], folderId: string): MediaFolder | null => {
  for (const item of items) {
    if (item.id === folderId && item.type === "folder") {
      return item as MediaFolder;
    }
    if (item.type === "folder") {
      const found = findFolder((item as MediaFolder).children, folderId);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Add items to a specific folder or root
 */
export const addItemsToFolder = (
  items: MediaItem[],
  folderId: string | null,
  newItems: MediaItem[]
): MediaItem[] => {
  if (!folderId) {
    return [...items, ...newItems];
  }

  return items.map((item) => {
    if (item.id === folderId && item.type === "folder") {
      return {
        ...item,
        children: [...(item as MediaFolder).children, ...newItems],
      } as MediaFolder;
    }
    if (item.type === "folder") {
      const updatedChildren = addItemsToFolder(
        (item as MediaFolder).children,
        folderId,
        newItems
      );
      return {
        ...item,
        children: updatedChildren,
      } as MediaFolder;
    }
    return item;
  });
};

/**
 * Remove an item from the media items tree
 */
export const removeItemFromFolder = (
  items: MediaItem[],
  itemId: string
): MediaItem[] => {
  return items
    .filter((item) => item.id !== itemId)
    .map((item) => {
      if (item.type === "folder") {
        return {
          ...item,
          children: removeItemFromFolder((item as MediaFolder).children, itemId),
        } as MediaFolder;
      }
      return item;
    });
};

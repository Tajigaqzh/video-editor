# Test Utilities

This directory contains reusable test utilities, data generators, and mock data for the video editor project.

## Files

### `testUtils.tsx`
Custom render function and re-exports from React Testing Library.

**Usage:**
```typescript
import { renderWithProviders, screen } from '@/test/utils/testUtils';

it('should render component', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### `testDataGenerators.ts`
Functions to generate test data for media files and folders.

**Functions:**
- `createTestMediaFile(overrides?)` - Create a single media file
- `createTestMediaFolder(overrides?)` - Create a folder
- `createTestMediaFiles(count, baseOverrides?)` - Create multiple files
- `createNestedFolderStructure()` - Create a nested folder structure

**Usage:**
```typescript
import { createTestMediaFile, createTestMediaFolder } from '@/test/utils/testDataGenerators';

it('should handle media files', () => {
  const file = createTestMediaFile({ name: 'my-video.mp4', type: 'video' });
  const folder = createTestMediaFolder({ name: 'My Folder', children: [file] });
  
  expect(folder.children).toHaveLength(1);
});
```

### `mockData.ts`
Pre-defined mock data for common test scenarios.

**Available Mocks:**
- `mockVideoFile` - Sample video file
- `mockAudioFile` - Sample audio file
- `mockImageFile` - Sample image file
- `mockEmptyFolder` - Empty folder
- `mockFolderWithFiles` - Folder containing files
- `mockNestedFolders` - Nested folder structure
- `mockMediaItems` - Collection of mixed items
- `mockTauriSingleFileResponse` - Tauri dialog single file response
- `mockTauriMultipleFilesResponse` - Tauri dialog multiple files response
- `mockTauriCancelledResponse` - Tauri dialog cancelled response

**Usage:**
```typescript
import { mockVideoFile, mockFolderWithFiles } from '@/test/utils/mockData';

it('should display video file', () => {
  const items = [mockVideoFile, mockFolderWithFiles];
  // Use in your tests
});
```

## Documentation

For detailed examples and guides, see:

- **[Unit Test Examples](./UNIT_TEST_EXAMPLE.md)** - Examples of testing pure functions and utilities
- **[Component Test Examples](./COMPONENT_TEST_EXAMPLE.md)** - Examples of testing React components
- **[Mock Usage Examples](./MOCK_USAGE_EXAMPLE.md)** - Examples of mocking functions, modules, and APIs
- **[Testing Guide](./TESTING_GUIDE.md)** - Comprehensive testing guide
- **[Best Practices](./BEST_PRACTICES.md)** - Testing best practices and patterns
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

## Best Practices

1. **Use data generators for dynamic tests** - When you need unique IDs or custom properties
2. **Use mock data for static tests** - When you need consistent, predictable data
3. **Use renderWithProviders** - For consistent component rendering across tests
4. **Keep test data minimal** - Only include properties needed for the test

## Examples

### Testing with Generated Data
```typescript
import { createTestMediaFiles } from '@/test/utils/testDataGenerators';

it('should handle multiple files', () => {
  const files = createTestMediaFiles(5, { type: 'video' });
  expect(files).toHaveLength(5);
  files.forEach(file => expect(file.type).toBe('video'));
});
```

### Testing with Mock Data
```typescript
import { mockMediaItems } from '@/test/utils/mockData';
import { addItemsToFolder } from '@/utils/media/mediaOperations';

it('should add items to folder', () => {
  const newFile = createTestMediaFile();
  const result = addItemsToFolder(mockMediaItems, null, [newFile]);
  expect(result).toHaveLength(mockMediaItems.length + 1);
});
```

### Testing Components
```typescript
import { renderWithProviders, screen } from '@/test/utils/testUtils';
import { mockVideoFile } from '@/test/utils/mockData';

it('should render media item', () => {
  renderWithProviders(<MediaItem item={mockVideoFile} />);
  expect(screen.getByText('sample-video.mp4')).toBeInTheDocument();
});
```


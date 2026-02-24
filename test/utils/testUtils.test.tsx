import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from './testUtils';
import { 
  createTestMediaFile, 
  createTestMediaFolder, 
  createTestMediaFiles,
  createNestedFolderStructure 
} from './testDataGenerators';
import { 
  mockVideoFile, 
  mockAudioFile, 
  mockFolderWithFiles,
  mockMediaItems 
} from './mockData';

describe('Test Utilities', () => {
  describe('renderWithProviders', () => {
    it('should render a simple component', () => {
      const TestComponent = () => <div>Test Content</div>;
      
      renderWithProviders(<TestComponent />);
      
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('createTestMediaFile', () => {
    it('should create a media file with default values', () => {
      const file = createTestMediaFile();
      
      expect(file).toHaveProperty('id');
      expect(file).toHaveProperty('name');
      expect(file).toHaveProperty('path');
      expect(file).toHaveProperty('url');
      expect(file).toHaveProperty('type');
      expect(file.type).toBe('video');
    });

    it('should create a media file with custom values', () => {
      const file = createTestMediaFile({
        name: 'custom-audio.mp3',
        type: 'audio',
      });
      
      expect(file.name).toBe('custom-audio.mp3');
      expect(file.type).toBe('audio');
    });
  });

  describe('createTestMediaFolder', () => {
    it('should create an empty folder', () => {
      const folder = createTestMediaFolder();
      
      expect(folder.type).toBe('folder');
      expect(folder.children).toEqual([]);
    });

    it('should create a folder with children', () => {
      const file = createTestMediaFile();
      const folder = createTestMediaFolder({
        name: 'My Folder',
        children: [file],
      });
      
      expect(folder.name).toBe('My Folder');
      expect(folder.children).toHaveLength(1);
      expect(folder.children[0]).toEqual(file);
    });
  });

  describe('createTestMediaFiles', () => {
    it('should create multiple files', () => {
      const files = createTestMediaFiles(3);
      
      expect(files).toHaveLength(3);
      expect(files[0].name).toBe('test-file-1.mp4');
      expect(files[1].name).toBe('test-file-2.mp4');
      expect(files[2].name).toBe('test-file-3.mp4');
    });

    it('should create files with custom base properties', () => {
      const files = createTestMediaFiles(2, { type: 'audio' });
      
      expect(files).toHaveLength(2);
      expect(files[0].type).toBe('audio');
      expect(files[1].type).toBe('audio');
    });
  });

  describe('createNestedFolderStructure', () => {
    it('should create a nested folder structure', () => {
      const structure = createNestedFolderStructure();
      
      expect(structure).toHaveLength(1);
      expect(structure[0].type).toBe('folder');
      
      const parentFolder = structure[0];
      if (parentFolder.type === 'folder') {
        const parentFolderTyped = parentFolder as import('@/utils/mediaOperations').MediaFolder;
        expect(parentFolderTyped.children).toHaveLength(1);
        
        const childFolder = parentFolderTyped.children[0];
        if (childFolder.type === 'folder') {
          const childFolderTyped = childFolder as import('@/utils/mediaOperations').MediaFolder;
          expect(childFolderTyped.children).toHaveLength(1);
        }
      }
    });
  });

  describe('Mock Data', () => {
    it('should provide mock video file', () => {
      expect(mockVideoFile.type).toBe('video');
      expect(mockVideoFile.name).toBe('sample-video.mp4');
    });

    it('should provide mock audio file', () => {
      expect(mockAudioFile.type).toBe('audio');
      expect(mockAudioFile.name).toBe('sample-audio.mp3');
    });

    it('should provide mock folder with files', () => {
      expect(mockFolderWithFiles.type).toBe('folder');
      expect(mockFolderWithFiles.children).toHaveLength(2);
    });

    it('should provide mock media items collection', () => {
      expect(mockMediaItems).toHaveLength(5);
      expect(mockMediaItems.some(item => item.type === 'video')).toBe(true);
      expect(mockMediaItems.some(item => item.type === 'folder')).toBe(true);
    });
  });
});

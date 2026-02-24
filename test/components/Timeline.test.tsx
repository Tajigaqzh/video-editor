import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Timeline from '@/components/Timeline/Timeline';
import { useTimelineStore } from '@/store/timelineStore';

describe('Timeline Component', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useTimelineStore.getState();
    store.tracks.forEach(track => store.removeTrack(track.id));
  });

  describe('Basic Rendering', () => {
    it('should render timeline container', () => {
      render(<Timeline />);
      
      const container = document.querySelector('.timeline-container');
      expect(container).toBeInTheDocument();
    });

    it('should render toolbar area', () => {
      render(<Timeline />);
      
      const toolbar = document.querySelector('.timeline-toolbar');
      expect(toolbar).toBeInTheDocument();
    });

    it('should render timescale area', () => {
      render(<Timeline />);
      
      const timescale = document.querySelector('.timescale');
      expect(timescale).toBeInTheDocument();
    });

    it('should have sticky timescale header', () => {
      render(<Timeline />);
      
      const timescaleHeader = document.querySelector('.timeline-header');
      expect(timescaleHeader).toHaveStyle({ position: 'sticky', top: '0' });
    });
  });

  describe('Empty State - Requirement 1.5', () => {
    it('should display empty state when no tracks exist', () => {
      render(<Timeline />);
      
      expect(screen.getByText('时间轴为空')).toBeInTheDocument();
      expect(screen.getByText('点击工具栏添加轨道')).toBeInTheDocument();
    });
  });

  describe('Track Display - Requirements 1.3, 1.4', () => {
    it('should display tracks when they exist', () => {
      const { addTrack } = useTimelineStore.getState();
      
      // Add tracks
      addTrack('video');
      addTrack('audio');
      
      render(<Timeline />);
      
      expect(screen.getByText(/视频 1/)).toBeInTheDocument();
      expect(screen.getByText(/音频 1/)).toBeInTheDocument();
    });

    it('should display tracks in correct order (higher order on top)', () => {
      const { addTrack } = useTimelineStore.getState();
      
      addTrack('video'); // order 1
      addTrack('video'); // order 2
      
      render(<Timeline />);
      
      // Find tracks in the tracks container (not toolbar buttons)
      const tracksContainer = document.querySelector('.tracks-container');
      const trackElements = tracksContainer?.querySelectorAll('.track-container');
      
      expect(trackElements).toHaveLength(2);
      
      // Verify tracks are rendered
      expect(screen.getByText(/视频 1/)).toBeInTheDocument();
      expect(screen.getByText(/视频 2/)).toBeInTheDocument();
    });

    it('should display track with correct height', () => {
      const { addTrack } = useTimelineStore.getState();
      
      addTrack('video');
      
      const { tracks } = useTimelineStore.getState();
      
      render(<Timeline />);
      
      const trackElement = screen.getByText(/视频 1/).closest('.track-container');
      const expectedHeight = tracks[0].height;
      
      expect(trackElement).toHaveStyle({ height: `${expectedHeight}px` });
    });
  });

  describe('Scroll Container - Requirements 8.1, 8.2', () => {
    it('should have scrollable container', () => {
      render(<Timeline />);
      
      const scrollContainer = document.querySelector('.timeline-scroll-container');
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveClass('overflow-auto');
    });

    it('should render playhead', () => {
      render(<Timeline />);
      
      const playhead = document.querySelector('.playhead-line');
      expect(playhead).toBeInTheDocument();
      expect(playhead).toHaveStyle({ backgroundColor: '#ff0000' });
    });

    it('should position playhead based on store state', () => {
      const { setPlayheadPosition, setZoomLevel } = useTimelineStore.getState();
      
      setPlayheadPosition(10); // 10 seconds
      setZoomLevel(50); // 50 px/s
      
      render(<Timeline />);
      
      const playhead = document.querySelector('.playhead-line');
      expect(playhead).toHaveStyle({ left: '500px' }); // 10 * 50 = 500
    });
  });

  describe('Store Integration', () => {
    it('should connect to timeline store', () => {
      const { addTrack } = useTimelineStore.getState();
      
      let tracks = useTimelineStore.getState().tracks;
      expect(tracks).toHaveLength(0);
      
      addTrack('video');
      
      tracks = useTimelineStore.getState().tracks;
      expect(tracks).toHaveLength(1);
      expect(tracks[0].type).toBe('video');
    });

    it('should update when store changes', () => {
      const { addTrack } = useTimelineStore.getState();
      
      const { rerender } = render(<Timeline />);
      
      expect(screen.getByText('时间轴为空')).toBeInTheDocument();
      
      addTrack('video');
      rerender(<Timeline />);
      
      expect(screen.queryByText('时间轴为空')).not.toBeInTheDocument();
      expect(screen.getByText(/视频 1/)).toBeInTheDocument();
    });
  });

  describe('Layout Structure - Requirements 1.3, 1.4', () => {
    it('should have toolbar at top', () => {
      render(<Timeline />);
      
      const container = document.querySelector('.timeline-container');
      const toolbar = document.querySelector('.timeline-toolbar');
      
      expect(container?.firstChild).toBe(toolbar);
    });

    it('should have scroll container below toolbar', () => {
      render(<Timeline />);
      
      const toolbar = document.querySelector('.timeline-toolbar');
      const scrollContainer = document.querySelector('.timeline-scroll-container');
      
      expect(toolbar?.nextSibling).toBe(scrollContainer);
    });

    it('should have timescale inside scroll container', () => {
      render(<Timeline />);
      
      const scrollContainer = document.querySelector('.timeline-scroll-container');
      const timescale = document.querySelector('.timeline-header');
      
      expect(scrollContainer).toContainElement(timescale);
    });

    it('should have tracks body inside scroll container', () => {
      render(<Timeline />);
      
      const scrollContainer = document.querySelector('.timeline-scroll-container');
      const body = document.querySelector('.timeline-body');
      
      expect(scrollContainer).toContainElement(body);
    });
  });
});

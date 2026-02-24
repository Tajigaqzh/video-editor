import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu from '@/components/ContextMenu';

describe('ContextMenu', () => {
  const mockOnAction = vi.fn();
  const mockOnClose = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('空白区域菜单渲染', () => {
    it('should render blank area menu with correct items', () => {
      render(
        <ContextMenu
          x={100}
          y={100}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('新建文件夹')).toBeInTheDocument();
      expect(screen.getByText('添加素材')).toBeInTheDocument();
    });

    it('should not render folder menu items when no itemId provided', () => {
      render(
        <ContextMenu
          x={100}
          y={100}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('重命名')).not.toBeInTheDocument();
      expect(screen.queryByText('删除')).not.toBeInTheDocument();
    });

    it('should render menu with proper styling', () => {
      const { container } = render(
        <ContextMenu
          x={100}
          y={100}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      const menu = container.firstChild as HTMLElement;
      expect(menu).toHaveClass('fixed', 'bg-gray-800', 'border', 'border-gray-700', 'rounded', 'shadow-lg', 'py-1', 'z-50');
    });
  });

  describe('文件夹菜单渲染', () => {
    it('should render folder menu with correct items', () => {
      render(
        <ContextMenu
          x={100}
          y={100}
          itemId="folder-1"
          itemName="Test Folder"
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('重命名')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
    });

    it('should not render blank area menu items when itemId provided', () => {
      render(
        <ContextMenu
          x={100}
          y={100}
          itemId="folder-1"
          itemName="Test Folder"
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('新建文件夹')).not.toBeInTheDocument();
      expect(screen.queryByText('添加素材')).not.toBeInTheDocument();
    });

    it('should render delete button with red color', () => {
      render(
        <ContextMenu
          x={100}
          y={100}
          itemId="folder-1"
          itemName="Test Folder"
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      const deleteButton = screen.getByText('删除').closest('button');
      expect(deleteButton).toHaveClass('text-red-400');
    });
  });

  describe('菜单项点击事件', () => {
    it('should call onAction with "newFolder" when new folder clicked', () => {
      render(
        <ContextMenu
          x={100}
          y={100}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('新建文件夹'));
      expect(mockOnAction).toHaveBeenCalledWith('newFolder');
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    it('should call onAction with "addFiles" when add files clicked', () => {
      render(
        <ContextMenu
          x={100}
          y={100}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('添加素材'));
      expect(mockOnAction).toHaveBeenCalledWith('addFiles');
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    it('should call onAction with "rename" when rename clicked', () => {
      render(
        <ContextMenu
          x={100}
          y={100}
          itemId="folder-1"
          itemName="Test Folder"
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('重命名'));
      expect(mockOnAction).toHaveBeenCalledWith('rename');
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    it('should call onAction with "delete" when delete clicked', () => {
      render(
        <ContextMenu
          x={100}
          y={100}
          itemId="folder-1"
          itemName="Test Folder"
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('删除'));
      expect(mockOnAction).toHaveBeenCalledWith('delete');
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('菜单位置定位', () => {
    it('should position menu at correct coordinates', () => {
      const { container } = render(
        <ContextMenu
          x={150}
          y={200}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      const menu = container.firstChild as HTMLElement;
      expect(menu.style.left).toBe('150px');
      expect(menu.style.top).toBe('200px');
    });

    it('should position menu at different coordinates', () => {
      const { container } = render(
        <ContextMenu
          x={300}
          y={450}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      const menu = container.firstChild as HTMLElement;
      expect(menu.style.left).toBe('300px');
      expect(menu.style.top).toBe('450px');
    });

    it('should position menu at zero coordinates', () => {
      const { container } = render(
        <ContextMenu
          x={0}
          y={0}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      const menu = container.firstChild as HTMLElement;
      expect(menu.style.left).toBe('0px');
      expect(menu.style.top).toBe('0px');
    });
  });

  describe('事件冒泡阻止', () => {
    it('should stop propagation on menu click', () => {
      const { container } = render(
        <ContextMenu
          x={100}
          y={100}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      const menu = container.firstChild as HTMLElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');
      
      menu.dispatchEvent(clickEvent);
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should stop propagation on context menu', () => {
      const { container } = render(
        <ContextMenu
          x={100}
          y={100}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      const menu = container.firstChild as HTMLElement;
      const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true });
      const stopPropagationSpy = vi.spyOn(contextMenuEvent, 'stopPropagation');
      
      menu.dispatchEvent(contextMenuEvent);
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should stop propagation on button click', () => {
      render(
        <ContextMenu
          x={100}
          y={100}
          onAction={mockOnAction}
          onClose={mockOnClose}
        />
      );

      const button = screen.getByText('新建文件夹').closest('button') as HTMLElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');
      
      button.dispatchEvent(clickEvent);
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });
});

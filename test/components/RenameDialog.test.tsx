import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RenameDialog from "@/components/RenameDialog";

describe("RenameDialog", () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // Reuse userEvent instance across tests for better performance
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("对话框渲染", () => {
    it("should render dialog with correct structure", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      expect(screen.getByText("重命名")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("请输入新名称")).toBeInTheDocument();
      expect(screen.getByText("确定")).toBeInTheDocument();
      expect(screen.getByText("取消")).toBeInTheDocument();
    });

    it("should render with overlay background", () => {
      const { container } = render(
        <RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />,
      );

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass("fixed", "inset-0", "bg-black/50");
    });

    it("should render dialog box with proper styling", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const dialogBox = screen.getByText("重命名").closest("div");
      expect(dialogBox).toHaveClass("bg-gray-800", "rounded-lg", "shadow-xl");
    });
  });

  describe("输入框显示旧名称", () => {
    it("should display old name in input field", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name") as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("Old Name");
    });

    it("should display different old name", () => {
      render(
        <RenameDialog oldName="Test Folder" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />,
      );

      const input = screen.getByDisplayValue("Test Folder") as HTMLInputElement;
      expect(input.value).toBe("Test Folder");
    });

    it("should display empty string if old name is empty", () => {
      render(<RenameDialog oldName="" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText("请输入新名称") as HTMLInputElement;
      expect(input.value).toBe("");
    });
  });

  describe("输入框自动聚焦", () => {
    it("should auto-focus input field on mount", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      expect(input).toHaveFocus();
    });

    it("should maintain focus on input field", () => {
      render(<RenameDialog oldName="Test" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Test");
      expect(document.activeElement).toBe(input);
    });
  });

  describe("输入框自动选中", () => {
    it("should select all text in input field on mount", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name") as HTMLInputElement;

      // Check if text is selected by verifying selection range
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe("Old Name".length);
    });

    it("should select all text for different names", () => {
      render(
        <RenameDialog
          oldName="Test Folder 123"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />,
      );

      const input = screen.getByDisplayValue("Test Folder 123") as HTMLInputElement;

      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe("Test Folder 123".length);
    });
  });

  describe("确定按钮功能", () => {
    it("should call onConfirm with new name when confirm button clicked", async () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      await user.clear(input);
      await user.type(input, "New Name");

      fireEvent.click(screen.getByText("确定"));
      expect(mockOnConfirm).toHaveBeenCalledWith("New Name");
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it("should trim whitespace from new name", async () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      await user.clear(input);
      await user.type(input, "  New Name  ");

      fireEvent.click(screen.getByText("确定"));
      expect(mockOnConfirm).toHaveBeenCalledWith("New Name");
    });

    it("should submit form when confirm button clicked", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const confirmButton = screen.getByText("确定");
      expect(confirmButton).toHaveAttribute("type", "submit");
    });
  });

  describe("取消按钮功能", () => {
    it("should call onCancel when cancel button clicked", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText("取消"));
      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("should not call onConfirm when cancel button clicked", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText("取消"));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("should have correct button type for cancel", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByText("取消");
      expect(cancelButton).toHaveAttribute("type", "button");
    });
  });

  describe("Enter 键确认", () => {
    it("should call onConfirm when Enter key pressed", async () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      await user.type(input, "{Enter}");

      expect(mockOnConfirm).toHaveBeenCalledWith("Old Name");
    });

    it("should call onConfirm with modified name when Enter pressed", async () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      await user.clear(input);
      await user.type(input, "Modified Name{Enter}");

      expect(mockOnConfirm).toHaveBeenCalledWith("Modified Name");
    });

    it("should submit form on Enter key", async () => {
      render(<RenameDialog oldName="Test" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Test");
      await user.type(input, "{Enter}");

      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  describe("Esc 键取消", () => {
    it("should call onCancel when Escape key pressed", async () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      await user.type(input, "{Escape}");

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("should not call onConfirm when Escape pressed", async () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      await user.type(input, "{Escape}");

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("should cancel even after typing new name", async () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      await user.clear(input);
      await user.type(input, "New Name{Escape}");

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe("点击背景关闭", () => {
    it("should call onCancel when overlay background clicked", () => {
      const { container } = render(
        <RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />,
      );

      const overlay = container.firstChild as HTMLElement;
      fireEvent.click(overlay);

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("should not call onCancel when dialog box clicked", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const dialogBox = screen.getByText("重命名").closest("div") as HTMLElement;
      fireEvent.click(dialogBox);

      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it("should stop propagation when dialog box clicked", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const dialogBox = screen.getByText("重命名").closest("div") as HTMLElement;
      const clickEvent = new MouseEvent("click", { bubbles: true });
      const stopPropagationSpy = vi.spyOn(clickEvent, "stopPropagation");

      dialogBox.dispatchEvent(clickEvent);
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe("空名称验证", () => {
    it("should not call onConfirm when name is empty", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(screen.getByText("确定"));

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("should not submit form when name is empty", async () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      await user.clear(input);
      await user.type(input, "{Enter}");

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("should allow typing in empty input", async () => {
      render(<RenameDialog oldName="" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText("请输入新名称") as HTMLInputElement;
      await user.type(input, "New Name");

      expect(input.value).toBe("New Name");
    });
  });

  describe("空格名称验证", () => {
    it("should not call onConfirm when name is only spaces", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.click(screen.getByText("确定"));

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("should not call onConfirm when name is only tabs", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      fireEvent.change(input, { target: { value: "\t\t\t" } });
      fireEvent.click(screen.getByText("确定"));

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("should not call onConfirm when name is mixed whitespace", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      fireEvent.change(input, { target: { value: " \t \n " } });
      fireEvent.click(screen.getByText("确定"));

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("should call onConfirm when name has content with spaces", () => {
      render(<RenameDialog oldName="Old Name" onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue("Old Name");
      fireEvent.change(input, { target: { value: "  Valid Name  " } });
      fireEvent.click(screen.getByText("确定"));

      expect(mockOnConfirm).toHaveBeenCalledWith("Valid Name");
    });
  });
});

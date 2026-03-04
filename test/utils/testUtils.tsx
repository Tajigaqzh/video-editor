import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";

/**
 * Custom render function that wraps components with necessary providers
 * Currently minimal, but can be extended with providers like Router, Theme, etc.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { ...options });
}

// Re-export everything from testing library
export * from "@testing-library/react";

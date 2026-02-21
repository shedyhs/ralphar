import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";

beforeEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("Dark mode toggle", () => {
  it("renders a dark mode toggle button", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: /switch to dark mode/i })
    ).toBeInTheDocument();
  });

  it("shows 'Dark' label when in light mode", () => {
    render(<Home />);
    const toggle = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(toggle).toHaveTextContent("Dark");
  });

  it("adds 'dark' class to document element when toggled", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const toggle = screen.getByRole("button", { name: /switch to dark mode/i });

    await user.click(toggle);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("shows 'Light' label after toggling to dark mode", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const toggle = screen.getByRole("button", { name: /switch to dark mode/i });

    await user.click(toggle);

    expect(toggle).toHaveTextContent("Light");
  });

  it("removes 'dark' class when toggled back to light mode", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const toggle = screen.getByRole("button", { name: /switch to dark mode/i });

    await user.click(toggle);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(toggle);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("updates aria-label when toggled", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const toggle = screen.getByRole("button", { name: /switch to dark mode/i });

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-label", "Switch to light mode");
  });

  it("initializes from existing dark class on document", () => {
    document.documentElement.classList.add("dark");
    render(<Home />);
    const toggle = screen.getByRole("button", { name: /switch to light mode/i });
    expect(toggle).toHaveTextContent("Light");
  });
});

describe("Todo list functionality (unchanged)", () => {
  it("renders the todo list heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /todo list/i })).toBeInTheDocument();
  });

  it("shows empty state message", () => {
    render(<Home />);
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it("adds a task", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByPlaceholderText(/add a task/i);

    await user.type(input, "Buy groceries");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("does not add empty tasks", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByPlaceholderText(/add a task/i);

    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
  });
});

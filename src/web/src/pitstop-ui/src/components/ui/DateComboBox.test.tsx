import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { DateField, DateRangeField } from "./DateField";
import { ComboBox } from "./ComboBox";

describe("DateField", () => {
  it("shows the given date in its segments", () => {
    render(<DateField value={new Date(2026, 0, 15)} onChange={vi.fn()} aria-label="Start" />);
    const group = screen.getByRole("group", { name: "Start" });
    expect(group).toHaveTextContent("1/15/2026");
  });

  it("emits a new Date when a segment is stepped", async () => {
    const onChange = vi.fn();
    render(<DateField value={new Date(2026, 0, 15)} onChange={onChange} aria-label="Start" />);
    const month = screen.getByRole("spinbutton", { name: /month/i });
    month.focus();
    await userEvent.keyboard("{ArrowUp}");
    const emitted = onChange.mock.lastCall![0].value as Date;
    expect(emitted.getMonth()).toBe(1);
    expect(emitted.getDate()).toBe(15);
  });

  it("selects a day from the calendar popover", async () => {
    const onChange = vi.fn();
    render(<DateField value={new Date(2026, 0, 15)} onChange={onChange} aria-label="Start" />);
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await userEvent.click(await screen.findByRole("button", { name: /January 20, 2026/ }));
    const emitted = onChange.mock.lastCall![0].value as Date;
    expect(emitted.getFullYear()).toBe(2026);
    expect(emitted.getMonth()).toBe(0);
    expect(emitted.getDate()).toBe(20);
  });

  it("shows hour and minute segments when showTime is set", () => {
    render(<DateField value={new Date(2026, 0, 15, 13, 45)} onChange={vi.fn()} showTime aria-label="When" />);
    expect(screen.getByRole("spinbutton", { name: /hour/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /minute/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "When" })).toHaveTextContent("1:45");
  });

  it("renders empty when there is no value and disables the picker when disabled", () => {
    render(<DateField value={null} onChange={vi.fn()} disabled aria-label="Empty" />);
    expect(screen.getByRole("button", { name: /calendar/i })).toBeDisabled();
  });

  it("links an external label through aria-labelledby", () => {
    render(
      <>
        <span id="when-label">When</span>
        <DateField value={null} onChange={vi.fn()} inputId="when" />
      </>,
    );
    expect(screen.getByRole("group", { name: "When" })).toBeInTheDocument();
  });
});

describe("DateRangeField", () => {
  it("shows the start and end dates", () => {
    render(
      <DateRangeField value={[new Date(2026, 0, 5), new Date(2026, 0, 9)]} onChange={vi.fn()} aria-label="Range" />,
    );
    const group = screen.getByRole("group", { name: "Range" });
    expect(group).toHaveTextContent("1/5/2026");
    expect(group).toHaveTextContent("1/9/2026");
  });

  it("emits both dates once a range is picked in the calendar", async () => {
    const onChange = vi.fn();
    const Harness = () => {
      const [range, setRange] = useState<Date[] | null>([new Date(2026, 0, 5), new Date(2026, 0, 9)]);
      return (
        <DateRangeField
          value={range}
          onChange={(next) => {
            onChange(next);
            setRange(next);
          }}
          aria-label="Range"
        />
      );
    };
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await userEvent.click(await screen.findByRole("button", { name: /January 12, 2026/ }));
    await userEvent.click(await screen.findByRole("button", { name: /January 14, 2026/ }));
    const emitted = onChange.mock.lastCall![0] as Date[];
    expect(emitted[0].getDate()).toBe(12);
    expect(emitted[1].getDate()).toBe(14);
  });

  it("treats a partial or missing range as empty", () => {
    render(<DateRangeField value={[new Date(2026, 0, 5)]} onChange={vi.fn()} aria-label="Partial" />);
    expect(screen.getByRole("group", { name: "Partial" })).not.toHaveTextContent("1/5/2026");
  });
});

interface Item {
  id: string;
  name: string;
}

const items: Item[] = [
  { id: "1", name: "Costco Gas" },
  { id: "2", name: "Shell" },
];

const Combo: React.FC<{
  onSelect?: (item: Item) => void;
  onSearch?: (term: string) => void;
  onInput?: (value: string) => void;
  list?: Item[];
  showTrigger?: boolean;
}> = ({ onSelect = vi.fn(), onSearch, onInput, list = items, showTrigger }) => {
  const [text, setText] = useState("");
  return (
    <ComboBox
      inputValue={text}
      onInputChange={(v) => {
        setText(v);
        onInput?.(v);
      }}
      items={list}
      getKey={(i) => i.id}
      getText={(i) => i.name}
      renderItem={(i) => <strong>{i.name}</strong>}
      onSelect={onSelect}
      onSearch={onSearch}
      placeholder="Search stations"
      showTrigger={showTrigger}
    />
  );
};

describe("ComboBox", () => {
  it("reports typed text and searches on every change", async () => {
    const onSearch = vi.fn();
    const onInput = vi.fn();
    render(<Combo onSearch={onSearch} onInput={onInput} />);
    await userEvent.type(screen.getByRole("combobox"), "sh");
    expect(onInput).toHaveBeenLastCalledWith("sh");
    expect(onSearch).toHaveBeenLastCalledWith("sh");
  });

  it("lists items, selects one and does not overwrite the typed text", async () => {
    const onSelect = vi.fn();
    const onInput = vi.fn();
    render(<Combo onSelect={onSelect} onInput={onInput} />);
    await userEvent.type(screen.getByRole("combobox"), "s");
    await userEvent.click(await screen.findByRole("option", { name: "Shell" }));
    expect(onSelect).toHaveBeenCalledWith(items[1]);
    expect(onInput).toHaveBeenLastCalledWith("s");
  });

  it("searches with the current text when the trigger button opens the list", async () => {
    const onSearch = vi.fn();
    render(<Combo onSearch={onSearch} showTrigger />);
    await userEvent.click(screen.getByRole("button", { name: "Show suggestions" }));
    expect(onSearch).toHaveBeenCalledWith("");
  });

  it("does not show a trigger button by default and shows no options for an empty list", async () => {
    render(<Combo list={[]} />);
    expect(screen.queryByRole("button", { name: "Show suggestions" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole("combobox"), "x");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});

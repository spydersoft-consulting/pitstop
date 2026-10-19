import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Column, DataTable } from "./DataTable";
import { selectOption } from "../../test-utils/selectOption";

interface Row {
  id: number;
  name: string;
  cost: number | null;
  place?: { name: string };
}

const rows: Row[] = [
  { id: 1, name: "Bravo", cost: 30, place: { name: "Shell" } },
  { id: 2, name: "alpha", cost: 5 },
  { id: 3, name: "Charlie", cost: null },
];

const bodyNames = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => within(r).getAllByRole("rowheader")[0]?.textContent ?? "");

const renderTable = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) =>
  render(
    <DataTable value={rows} aria-label="Things" {...props}>
      <Column field="name" header="Name" sortable />
      <Column field="cost" header="Cost" sortable body={(r: Row) => (r.cost === null ? "—" : `$${r.cost}`)} />
      <Column field="place.name" header="Place" />
    </DataTable>,
  );

describe("DataTable", () => {
  it("renders headers and cells, including body renderers and nested fields", () => {
    renderTable();
    expect(screen.getByRole("grid", { name: "Things" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Cost/ })).toBeInTheDocument();
    expect(screen.getByText("$30")).toBeInTheDocument();
    expect(screen.getByText("Shell")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("applies the default sort and reverses it when the header is clicked", async () => {
    renderTable({ sortField: "name", sortOrder: 1 });
    expect(bodyNames()).toEqual(["alpha", "Bravo", "Charlie"]);
    await userEvent.click(screen.getByRole("columnheader", { name: /Name/ }));
    expect(bodyNames()).toEqual(["Charlie", "Bravo", "alpha"]);
  });

  it("sorts numerically and puts empty values last when ascending", async () => {
    renderTable();
    await userEvent.click(screen.getByRole("columnheader", { name: /Cost/ }));
    expect(bodyNames()).toEqual(["alpha", "Bravo", "Charlie"]);
  });

  it("shows the empty message, or a loading message while loading", () => {
    const { rerender } = render(
      <DataTable value={[]} emptyMessage="Nothing here" aria-label="Empty">
        <Column field="name" header="Name" />
      </DataTable>,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    rerender(
      <DataTable value={[]} loading aria-label="Empty">
        <Column field="name" header="Name" />
      </DataTable>,
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("stripes alternate rows when requested", () => {
    renderTable({ stripedRows: true });
    const body = screen.getAllByRole("row").slice(1);
    expect(body[1].className).toContain("bg-surface-muted");
    expect(body[0].className).not.toContain("bg-surface-muted");
  });

  it("paginates and moves between pages", async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ id: i, name: `Row ${i}`, cost: i }));
    render(
      <DataTable value={many} paginator rows={2} aria-label="Many">
        <Column field="name" header="Name" />
      </DataTable>,
    );
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Last page" }));
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "First page" }));
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("changes the page size from the rows-per-page select", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: i, name: `Row ${i}`, cost: i }));
    render(
      <DataTable value={many} paginator rows={10} rowsPerPageOptions={[10, 20]} aria-label="Many">
        <Column field="name" header="Name" />
      </DataTable>,
    );
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    await selectOption(userEvent.setup(), screen.getByRole("button", { name: /10/ }), "20");
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });
});

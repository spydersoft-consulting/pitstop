import { Children, isValidElement, useMemo, useState } from "react";
import {
  Cell,
  Column as AriaColumn,
  Row,
  Table,
  TableBody,
  TableHeader,
  type SortDescriptor,
} from "react-aria-components";
import {
  faAnglesLeft,
  faAnglesRight,
  faChevronLeft,
  faChevronRight,
  faSort,
  faSortDown,
  faSortUp,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "./Button";
import { Select } from "./Select";

export interface ColumnProps<T> {
  field?: string;
  header?: React.ReactNode;
  body?: (row: T) => React.ReactNode;
  sortable?: boolean;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

// Configuration-only element: DataTable reads its props and renders the cells itself.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Column = <T,>(_props: ColumnProps<T>): null => null;

interface DataTableProps<T> {
  value: T[];
  paginator?: boolean;
  rows?: number;
  rowsPerPageOptions?: number[];
  sortField?: string;
  sortOrder?: 1 | -1;
  emptyMessage?: React.ReactNode;
  loading?: boolean;
  stripedRows?: boolean;
  "aria-label"?: string;
  children?: React.ReactNode;
}

const getField = (row: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, key) => (acc == null ? undefined : (acc as Record<string, unknown>)[key]), row);

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value) ?? "";
};

const compareValues = (a: unknown, b: unknown): number => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const na = typeof a === "number" ? a : Number(a);
  const nb = typeof b === "number" ? b : Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return toText(a).localeCompare(toText(b));
};

function renderCell<T>(column: ColumnProps<T>, row: T): React.ReactNode {
  if (column.body) return column.body(row);
  return column.field ? (getField(row, column.field) as React.ReactNode) : null;
}

const rowKey = (row: unknown, index: number): string | number => {
  const id = getField(row, "id");
  return typeof id === "string" || typeof id === "number" ? id : index;
};

const colId = (column: ColumnProps<unknown>, index: number) => column.field ?? `col-${index}`;

const SORT_ICONS = { ascending: faSortUp, descending: faSortDown } as const;

const SortIcon: React.FC<{ direction?: "ascending" | "descending" }> = ({ direction }) => (
  <FontAwesomeIcon
    icon={direction ? SORT_ICONS[direction] : faSort}
    className={direction ? "text-primary" : "text-content-muted"}
    aria-hidden
  />
);

export function DataTable<T>({
  value,
  paginator,
  rows = 20,
  rowsPerPageOptions,
  sortField,
  sortOrder = 1,
  emptyMessage = "No records found.",
  loading,
  stripedRows,
  "aria-label": ariaLabel = "Data table",
  children,
}: Readonly<DataTableProps<T>>) {
  const columns = Children.toArray(children)
    .filter(isValidElement)
    .map((el) => el.props as ColumnProps<T>);

  const [sort, setSort] = useState<SortDescriptor | undefined>(
    sortField ? { column: sortField, direction: sortOrder === -1 ? "descending" : "ascending" } : undefined,
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(rows);

  const sorted = useMemo(() => {
    if (!sort) return value;
    const sign = sort.direction === "descending" ? -1 : 1;
    return [...value].sort(
      (a, b) => sign * compareValues(getField(a, String(sort.column)), getField(b, String(sort.column))),
    );
  }, [value, sort]);

  const pageCount = paginator ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount - 1);
  const visible = paginator ? sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : sorted;

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <Table
          aria-label={ariaLabel}
          sortDescriptor={sort}
          onSortChange={setSort}
          className="w-full border-collapse text-left text-sm text-content"
        >
          <TableHeader>
            {columns.map((column, i) => (
              <AriaColumn
                key={colId(column as ColumnProps<unknown>, i)}
                id={colId(column as ColumnProps<unknown>, i)}
                isRowHeader={i === 0}
                allowsSorting={column.sortable}
                style={column.style}
                className="border-b border-border-strong bg-surface-muted px-3 py-2.5 font-semibold outline-none data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-primary"
              >
                {({ sortDirection }) => (
                  <span className="inline-flex items-center gap-2">
                    {column.header}
                    {column.sortable && <SortIcon direction={sortDirection} />}
                  </span>
                )}
              </AriaColumn>
            ))}
          </TableHeader>
          <TableBody
            renderEmptyState={() => (
              <div className="px-3 py-6 text-center text-content-muted">{loading ? "Loading…" : emptyMessage}</div>
            )}
          >
            {visible.map((row, rowIndex) => (
              <Row
                key={rowKey(row, rowIndex)}
                id={rowKey(row, rowIndex)}
                columns={columns}
                className={stripedRows && rowIndex % 2 === 1 ? "bg-surface-muted/60" : ""}
              >
                {columns.map((column, i) => (
                  <Cell
                    key={colId(column as ColumnProps<unknown>, i)}
                    style={column.bodyStyle}
                    className="border-b border-border px-3 py-2 outline-none"
                  >
                    {renderCell(column, row)}
                  </Cell>
                ))}
              </Row>
            ))}
          </TableBody>
        </Table>
      </div>
      {paginator && (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 px-3 py-3">
          <Button
            variant="text"
            severity="secondary"
            size="sm"
            aria-label="First page"
            icon={<FontAwesomeIcon icon={faAnglesLeft} />}
            disabled={currentPage === 0}
            onClick={() => setPage(0)}
          />
          <Button
            variant="text"
            severity="secondary"
            size="sm"
            aria-label="Previous page"
            icon={<FontAwesomeIcon icon={faChevronLeft} />}
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          />
          <span className="px-2 text-sm text-content-muted">
            Page {currentPage + 1} of {pageCount}
          </span>
          <Button
            variant="text"
            severity="secondary"
            size="sm"
            aria-label="Next page"
            icon={<FontAwesomeIcon icon={faChevronRight} />}
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          />
          <Button
            variant="text"
            severity="secondary"
            size="sm"
            aria-label="Last page"
            icon={<FontAwesomeIcon icon={faAnglesRight} />}
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(pageCount - 1)}
          />
          {rowsPerPageOptions && (
            <div className="w-24">
              <Select
                aria-label="Rows per page"
                value={pageSize}
                options={rowsPerPageOptions.map((n) => ({ label: String(n), value: n }))}
                onChange={(e) => {
                  setPageSize(e.value);
                  setPage(0);
                }}
              />
            </div>
          )}
        </nav>
      )}
    </div>
  );
}

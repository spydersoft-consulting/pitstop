import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker,
  DateRangePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Popover,
  RangeCalendar,
} from "react-aria-components";
import { CalendarDate, CalendarDateTime, getLocalTimeZone, type DateValue } from "@internationalized/date";
import { faCalendar, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const toDateValue = (date: Date, withTime: boolean): DateValue =>
  withTime
    ? new CalendarDateTime(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes())
    : new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());

const fromDateValue = (value: DateValue): Date => value.toDate(getLocalTimeZone());

const groupClasses = (invalid?: boolean) =>
  [
    "flex w-full items-center overflow-hidden rounded-md border bg-surface text-base text-content",
    "focus-within:outline-2 focus-within:outline-primary",
    invalid ? "border-danger" : "border-border-strong",
  ].join(" ");

const inputClasses = "flex min-w-0 flex-1 items-center gap-0.5 px-3 py-3 whitespace-nowrap";
const rangeInputClasses = "flex min-w-0 items-center gap-0.5 px-3 py-2.5 whitespace-nowrap";

const segmentClasses =
  "rounded px-0.5 tabular-nums outline-none data-focused:bg-primary data-focused:text-white data-placeholder:text-content-muted";

const triggerClasses =
  "flex shrink-0 cursor-pointer items-center justify-center self-stretch border-0 bg-primary px-4 text-white outline-none data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-white";

const navButton =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-content outline-none hover:bg-surface-muted data-focus-visible:outline-2 data-focus-visible:outline-primary";

const cellClasses =
  "flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-sm outline-none " +
  "data-hovered:bg-surface-muted data-selected:bg-primary data-selected:text-white " +
  "data-outside-month:text-content-muted data-disabled:cursor-not-allowed data-disabled:opacity-40 " +
  "data-unavailable:line-through data-focus-visible:outline-2 data-focus-visible:outline-primary";

const popoverClasses = "z-1200 rounded-lg border border-border bg-surface p-3 shadow-lg";

const CalendarChrome: React.FC = () => (
  <>
    <header className="mb-2 flex items-center justify-between">
      <AriaButton slot="previous" className={navButton} aria-label="Previous month">
        <FontAwesomeIcon icon={faChevronLeft} />
      </AriaButton>
      <Heading className="text-sm font-semibold" />
      <AriaButton slot="next" className={navButton} aria-label="Next month">
        <FontAwesomeIcon icon={faChevronRight} />
      </AriaButton>
    </header>
    <CalendarGrid>
      <CalendarGridHeader>
        {(day) => (
          <CalendarHeaderCell className="pb-1 text-xs font-medium text-content-muted">{day}</CalendarHeaderCell>
        )}
      </CalendarGridHeader>
      <CalendarGridBody>{(date) => <CalendarCell date={date} className={cellClasses} />}</CalendarGridBody>
    </CalendarGrid>
  </>
);

interface FieldLabelProps {
  inputId?: string;
  "aria-label"?: string;
}

interface DateFieldProps extends FieldLabelProps {
  value: Date | null | undefined;
  onChange: (event: { value: Date | null }) => void;
  showTime?: boolean;
  minDate?: Date;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

export const DateField: React.FC<DateFieldProps> = ({
  value,
  onChange,
  showTime = false,
  minDate,
  invalid,
  disabled,
  className,
  inputId,
  "aria-label": ariaLabel,
}) => (
  <DatePicker
    id={inputId}
    value={value ? toDateValue(value, showTime) : null}
    onChange={(next) => onChange({ value: next ? fromDateValue(next) : null })}
    granularity={showTime ? "minute" : "day"}
    hourCycle={12}
    minValue={minDate ? toDateValue(minDate, false) : undefined}
    isDisabled={disabled}
    isInvalid={invalid}
    aria-label={ariaLabel ?? (inputId ? undefined : "Date")}
    aria-labelledby={inputId && !ariaLabel ? `${inputId}-label` : undefined}
    className={["w-full", className].filter(Boolean).join(" ")}
  >
    <Group className={groupClasses(invalid)}>
      <DateInput className={inputClasses}>
        {(segment) => <DateSegment segment={segment} className={segmentClasses} />}
      </DateInput>
      <AriaButton className={triggerClasses}>
        <FontAwesomeIcon icon={faCalendar} />
      </AriaButton>
    </Group>
    <Popover className={popoverClasses}>
      <Dialog className="outline-none">
        <Calendar>
          <CalendarChrome />
        </Calendar>
      </Dialog>
    </Popover>
  </DatePicker>
);

interface DateRangeFieldProps extends FieldLabelProps {
  value: Date[] | null | undefined;
  onChange: (value: Date[] | null) => void;
  disabled?: boolean;
  className?: string;
}

export const DateRangeField: React.FC<DateRangeFieldProps> = ({
  value,
  onChange,
  disabled,
  className,
  inputId,
  "aria-label": ariaLabel,
}) => (
  <DateRangePicker
    id={inputId}
    value={value?.[0] && value[1] ? { start: toDateValue(value[0], false), end: toDateValue(value[1], false) } : null}
    onChange={(next) => onChange(next ? [fromDateValue(next.start), fromDateValue(next.end)] : null)}
    isDisabled={disabled}
    aria-label={ariaLabel ?? (inputId ? undefined : "Date range")}
    aria-labelledby={inputId && !ariaLabel ? `${inputId}-label` : undefined}
    className={["w-full", className].filter(Boolean).join(" ")}
  >
    <Group className={`${groupClasses()} grid grid-cols-[1fr_auto]`}>
      <DateInput slot="start" className={`${rangeInputClasses} border-b border-border`}>
        {(segment) => <DateSegment segment={segment} className={segmentClasses} />}
      </DateInput>
      <AriaButton className={`${triggerClasses} row-span-2 col-start-2 row-start-1`}>
        <FontAwesomeIcon icon={faCalendar} />
      </AriaButton>
      <DateInput slot="end" className={rangeInputClasses}>
        {(segment) => <DateSegment segment={segment} className={segmentClasses} />}
      </DateInput>
    </Group>
    <Popover className={popoverClasses}>
      <Dialog className="outline-none">
        <RangeCalendar>
          <CalendarChrome />
        </RangeCalendar>
      </Dialog>
    </Popover>
  </DateRangePicker>
);

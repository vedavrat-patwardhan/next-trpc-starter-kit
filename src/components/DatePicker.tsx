import React from 'react';
import { format, getMonth, getYear, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';

interface Field {
  value: Date | undefined;
  onChange: (date: Date) => void;
}

export default function DatePicker({
  field,
  allowFuture = true,
  allowPast = true,
}: {
  field: Field;
  allowFuture?: boolean;
  allowPast?: boolean;
}) {
  // Initialize local state based on field.value
  const [date, setDate] = React.useState(field.value || undefined);
  const [month, setMonth] = React.useState(
    field.value ? getMonth(field.value) + 1 : getMonth(new Date()) + 1
  );
  const [year, setYear] = React.useState(
    field.value ? getYear(field.value) : getYear(new Date())
  );

  // Sync local state with form state when field.value changes
  React.useEffect(() => {
    if (field.value) {
      setDate(field.value);
      setMonth(getMonth(field.value) + 1);
      setYear(getYear(field.value));
    } else {
      setDate(undefined);
    }
  }, [field.value]);

  // Generate month and year options
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2023, i, 1), 'MMMM'),
  }));

  const years = Array.from({ length: 101 }, (_, i) => {
    const yearValue = getYear(new Date()) - 50 + i;
    return {
      value: yearValue.toString(),
      label: yearValue.toString(),
    };
  });

  // Handlers for month and year changes
  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value);
    setMonth(newMonth);
    const newDate = date
      ? new Date(year, newMonth - 1, date.getDate())
      : new Date(year, newMonth - 1, 1);
    setDate(newDate);
    field.onChange(newDate); // Update form state
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    setYear(newYear);
    const newDate = date
      ? new Date(newYear, month - 1, date.getDate())
      : new Date(newYear, month - 1, 1);
    setDate(newDate);
    field.onChange(newDate); // Update form state
  };

  // Determine the displayed month for the calendar
  const displayedDate = React.useMemo(() => {
    return new Date(year, month - 1, 1);
  }, [month, year]);

  // Disable dates based on allowFuture and allowPast
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    if (!allowFuture && isAfter(date, today)) {
      return true;
    }
    if (!allowPast && isBefore(date, today)) {
      return true;
    }
    return false;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full h-10 justify-start text-left font-normal',
            !field.value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="p-4 border-b">
          <div className="flex space-x-2">
            <Select onValueChange={handleMonthChange} value={month.toString()}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleYearChange} value={year.toString()}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.value} value={y.value}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Calendar
          mode="single"
          selected={field.value}
          onSelect={(newDate) => {
            if (newDate) {
              setDate(newDate);
              setMonth(getMonth(newDate) + 1);
              setYear(getYear(newDate));
              field.onChange(newDate); // Update form state
            }
          }}
          initialFocus
          month={displayedDate}
          disabled={isDateDisabled}
        />
      </PopoverContent>
    </Popover>
  );
}

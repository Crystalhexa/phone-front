"use client"

import * as React from "react"
import { format, getMonth, getYear, setMonth, setYear } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  dateFormat?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  dateFormat = "PPP",
}: DatePickerProps) {
  const [internalDate, setInternalDate] = React.useState<Date>(value ?? new Date())

  React.useEffect(() => {
    if (value && value.getTime() !== internalDate.getTime()) {
      setInternalDate(value)
    }
  }, [value])

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const currentYear = getYear(new Date())
  const years = Array.from({ length: 201 }, (_, i) => currentYear - 100 + i)

  const handleMonthChange = (month: string) => {
    const newDate = setMonth(internalDate, months.indexOf(month))
    setInternalDate(newDate)
    onChange?.(newDate)
  }

  const handleYearChange = (year: string) => {
    const newDate = setYear(internalDate, parseInt(year))
    setInternalDate(newDate)
    onChange?.(newDate)
  }

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setInternalDate(selectedDate)
      onChange?.(selectedDate)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, dateFormat) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex justify-between gap-2 p-2">
          <Select
            onValueChange={handleMonthChange}
            value={months[getMonth(internalDate)]}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={handleYearChange}
            value={getYear(internalDate).toString()}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Calendar
          mode="single"
          selected={internalDate}
          onSelect={handleSelect}
          month={internalDate}
          onMonthChange={setInternalDate}
        />
      </PopoverContent>
    </Popover>
  )
}

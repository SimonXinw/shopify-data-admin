"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption = {
  label: string;
  value: string;
  description?: string;
};

const EMPTY_VALUE = "__custom_select_empty__";

export function CustomSelect({
  value,
  onChange,
  options,
  className,
  dropdownWidthClass,
}: {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  className?: string;
  dropdownWidthClass?: string;
}) {
  const normalizedValue = value === "" ? EMPTY_VALUE : value;

  return (
    <Select
      value={normalizedValue}
      onValueChange={(next) => {
        onChange(next === EMPTY_VALUE ? "" : next);
      }}
    >
      <SelectTrigger
        className={cn(
          "min-w-[7rem] border-input bg-card text-card-foreground hover:bg-muted/40",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={dropdownWidthClass}>
        {options.map((opt) => (
          <SelectItem key={opt.value || EMPTY_VALUE} value={opt.value === "" ? EMPTY_VALUE : opt.value}>
            <span className="truncate">
              {opt.label}
              {opt.description ? (
                <span className="ml-1.5 font-normal text-muted-foreground">{opt.description}</span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

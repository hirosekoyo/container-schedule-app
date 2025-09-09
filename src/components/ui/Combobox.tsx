"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ComboboxProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "選択...",
  searchPlaceholder = "検索または新規入力...",
  emptyPlaceholder = "見つかりません",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const selectedOption = options.find((option) => option.value.toLowerCase() === value?.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedOption ? selectedOption.label : value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandEmpty>
            {inputValue ? `"${inputValue}" を新規追加` : emptyPlaceholder}
          </CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={(currentValue) => {
                  onChange(currentValue === value ? "" : currentValue);
                  setOpen(false);
                  setInputValue("");
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                {option.label}
              </CommandItem>
            ))}
            {/* 新規入力項目 */}
            {inputValue && !options.some(opt => opt.value.toLowerCase() === inputValue.toLowerCase()) && (
              <CommandItem
                value={inputValue}
                onSelect={(currentValue) => {
                  onChange(currentValue);
                  setOpen(false);
                  setInputValue("");
                }}
              >
                <Check className="mr-2 h-4 w-4 opacity-0" />
                {`"${inputValue}" を新規追加`}
              </CommandItem>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
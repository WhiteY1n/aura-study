"use client";

import { motion } from "framer-motion";
import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption = "date" | "title";

interface SortDropdownProps {
  value: SortOption;
  onValueChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "title", label: "Title" },
];

export function SortDropdown({ value, onValueChange }: SortDropdownProps) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="min-w-[140px] w-[140px] bg-background border border-border h-10 select-none">
          <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="cursor-pointer"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </motion.div>
  );
}

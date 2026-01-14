"use client";

import { LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface LayoutToggleProps {
  layout: "grid" | "list";
  onLayoutChange: (layout: "grid" | "list") => void;
}

export function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={layout}
      onValueChange={(value) =>
        value && onLayoutChange(value as "grid" | "list")
      }
      className="bg-muted border border-border rounded-lg p-1"
    >
      <ToggleGroupItem
        value="grid"
        aria-label="Grid view"
        className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground rounded-md h-9 w-9"
      >
        <LayoutGrid className="h-5 w-5" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="list"
        aria-label="List view"
        className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground rounded-md h-9 w-9"
      >
        <List className="h-5 w-5" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

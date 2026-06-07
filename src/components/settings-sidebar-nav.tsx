"use client"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { JSX } from "react"

type SettingsSidebarNavProps = {
  items: {
    id: string
    title: string
    icon: JSX.Element
  }[]
  selectedId: string
  onSelect: (id: string) => void
  className?: string
}

export function SettingsSidebarNav({
  className,
  items,
  selectedId,
  onSelect,
}: SettingsSidebarNavProps) {
  return (
    <>
      {/* Mobile: select dropdown */}
      <div className="p-1 md:hidden">
        <Select
          value={selectedId}
          onValueChange={(v) => {
            if (v != null) onSelect(v)
          }}
        >
          <SelectTrigger className="h-12 sm:w-48">
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <div className="flex gap-x-4 px-2 py-1">
                  <span className="scale-125">{item.icon}</span>
                  <span className="text-md">{item.title}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: vertical nav */}
      <ScrollArea className="hidden w-full min-w-40 bg-background px-1 py-2 md:block">
        <nav
          className={cn(
            "flex space-x-2 py-1 lg:flex-col lg:space-y-1 lg:space-x-0",
            className,
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                selectedId === item.id
                  ? "bg-muted hover:bg-accent"
                  : "hover:bg-accent hover:underline",
                "justify-start",
              )}
            >
              <span className="me-2">{item.icon}</span>
              {item.title}
            </button>
          ))}
        </nav>
      </ScrollArea>
    </>
  )
}
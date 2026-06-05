import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates page numbers for pagination with ellipsis.
 * Shows at most 5 visible pages; adapts based on current page position.
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "...")[] {
  const maxVisible = 5
  const result: (number | "...")[] = []

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) result.push(i)
    return result
  }

  result.push(1)

  if (currentPage <= 3) {
    for (let i = 2; i <= 4; i++) result.push(i)
    result.push("...", totalPages)
  } else if (currentPage >= totalPages - 2) {
    result.push("...")
    for (let i = totalPages - 3; i <= totalPages; i++) result.push(i)
  } else {
    result.push("...")
    for (let i = currentPage - 1; i <= currentPage + 1; i++) result.push(i)
    result.push("...", totalPages)
  }

  return result
}

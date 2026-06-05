"use client"

import type React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { cn, getPageNumbers } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox"

type DataTablePaginationProps = {
  page: number
  setPage: (page: number) => void
  totalPages: number
  pageSize: number
  setPageSize: (size: number) => void
  className?: string
}

export function DataTablePagination({
  page,
  setPage,
  totalPages,
  pageSize,
  setPageSize,
  className,
}: DataTablePaginationProps) {
  const currentPage = page + 1
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const canPrev = page > 0
  const canNext = page < totalPages - 1

  const pageSizes = [10, 20, 30, 40, 50]

  return (
    <div
      className={cn(
        "flex items-center justify-between overflow-clip px-2",
        "@max-2xl/content:flex-col-reverse @max-2xl/content:gap-4",
        className,
      )}
      style={{ overflowClipMargin: 1 }}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex w-25 items-center justify-center text-sm font-medium @2xl/content:hidden">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2 @max-2xl/content:flex-row-reverse">
          <Combobox
            value={pageSize}
            onValueChange={(value) => setPageSize(value as number)}
            items={pageSizes}
            itemToStringValue={(size) => `${size}`}
            filter={null}
          >
            <ComboboxTrigger render={<Button variant="outline" className="h-8 w-17.5 justify-between" />}>
              {pageSize}
            </ComboboxTrigger>
            <ComboboxContent>
              <ComboboxList>
                {(size: number) => (
                  <ComboboxItem key={size} value={size}>
                    {size}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <p className="hidden text-sm font-medium sm:block">Rows per page</p>
        </div>
      </div>

      <div className="flex items-center sm:space-x-6 lg:space-x-8">
        <div className="flex w-25 items-center justify-center text-sm font-medium @max-3xl/content:hidden">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          {/* First page */}
          <Button
            variant="outline"
            className="size-8 p-0 @max-md/content:hidden"
            onClick={() => setPage(0)}
            disabled={!canPrev}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="size-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => setPage(page - 1)}
            disabled={!canPrev}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="size-4" />
          </Button>

          {/* Page number buttons */}
          {pageNumbers.map((pageNumber, index) => (
            <div key={`${pageNumber}-${index}`} className="flex items-center">
              {pageNumber === "..." ? (
                <span className="px-1 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  className="h-8 min-w-8 px-2"
                  onClick={() => setPage((pageNumber as number) - 1)}
                >
                  <span className="sr-only">Go to page {pageNumber}</span>
                  {pageNumber}
                </Button>
              )}
            </div>
          ))}

          {/* Next page */}
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => setPage(page + 1)}
            disabled={!canNext}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="size-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            className="size-8 p-0 @max-md/content:hidden"
            onClick={() => setPage(totalPages - 1)}
            disabled={!canNext}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
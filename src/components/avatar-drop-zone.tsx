"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X } from "@phosphor-icons/react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface AvatarDropZoneProps {
  /** Current avatar URL for edit mode (null for create) */
  currentAvatarUrl?: string | null
  /** User initials for the fallback */
  initials: string
  /** Called when user selects/drops an image file */
  onFileSelect: (file: File | null) => void
  /** Called when user clicks the delete button (edit mode only) */
  onDelete?: () => void
  /** Whether the component is in error state */
  error?: string | null
  /** Additional class name */
  className?: string
}

export function AvatarDropZone({
  currentAvatarUrl,
  initials,
  onFileSelect,
  onDelete,
  error,
  className,
}: AvatarDropZoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedFile = !!previewUrl

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        // No file selected — clear the preview
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }
        setPreviewUrl(null)
        onFileSelect(null)
        return
      }

      // Check file is an image
      if (!file.type.startsWith("image/")) {
        onFileSelect(null)
        return
      }

      // Revoke old URL if exists
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      onFileSelect(file)
    },
    [onFileSelect, previewUrl],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile],
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDelete = () => {
    // Clear preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    onFileSelect(null)
    onDelete?.()
  }

  // Determine what to show in the display area
  const hasDisplayAvatar = selectedFile || !!currentAvatarUrl

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex size-40 cursor-pointer items-center justify-center rounded-full border-2 border-dashed transition-colors",
          isDragOver
            ? "border-primary bg-primary/10"
            : error
              ? "border-destructive bg-destructive/5"
              : "border-muted-foreground/30 hover:border-muted-foreground/60",
        )}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/webp,image/png,image/jpeg,image/gif"
          className="hidden"
          onChange={handleInputChange}
        />

        {previewUrl ? (
          <Avatar className="size-40">
            <AvatarImage src={previewUrl} alt="Avatar preview" />
            <AvatarFallback className="text-5xl">{initials}</AvatarFallback>
          </Avatar>
        ) : currentAvatarUrl ? (
          <Avatar className="size-40">
            <AvatarImage src={currentAvatarUrl} alt="User avatar" />
            <AvatarFallback className="text-5xl">{initials}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Upload className="size-8" />
            <span className="text-xs">Upload</span>
          </div>
        )}

        {/* Delete button (circle with X) — edit mode only, show when avatar exists */}
        {onDelete && hasDisplayAvatar && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            className="absolute -right-1 -top-1 z-10 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/80"
            aria-label="Remove avatar"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Drag & drop or click to upload (460×460 webp)
      </p>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

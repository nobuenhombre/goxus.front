"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  createUser,
  updateUser,
  uploadAvatar,
  deleteAvatar,
  getAvatarUrl,
  type User,
} from "@/lib/users"
import { AvatarDropZone } from "@/components/avatar-drop-zone"

const createSchema = z
  .object({
    name: z.string().min(1, "Name is required."),
    email: z.string().email("Please enter a valid email."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })

const editSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Please enter a valid email."),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

type UsersActionDialogProps = {
  currentRow?: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSuccess,
}: UsersActionDialogProps) {
  const isEdit = !!currentRow
  const [submitting, setSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarVersion, setAvatarVersion] = useState(0)

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: currentRow?.name ?? "",
      email: currentRow?.email ?? "",
    },
  })

  const currentForm = isEdit ? editForm : createForm

  // Reset avatar state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setAvatarFile(null)
      setAvatarError(null)
      // Bump version to reload avatar URL
      const v = Date.now()
      setAvatarVersion(v)
    }
  }, [open])

  // Sync edit form fields when dialog opens with a user
  useEffect(() => {
    if (open && currentRow) {
      editForm.reset({ name: currentRow.name, email: currentRow.email })
    }
  }, [open, currentRow, editForm])

  async function onSubmitCreate(values: CreateForm) {
    setSubmitting(true)
    try {
      const user = await createUser({
        name: values.name,
        email: values.email,
        password: values.password,
      })

      // Upload avatar if selected
      if (avatarFile) {
        try {
          await uploadAvatar(user.id, avatarFile)
          toast.success("Avatar uploaded")
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Failed to upload avatar"
          setAvatarError(msg)
          toast.error(msg)
        }
      }

      toast.success("User created successfully")
      createForm.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create user"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function onSubmitEdit(values: EditForm) {
    if (!currentRow) return
    setSubmitting(true)
    try {
      await updateUser(currentRow.id, {
        name: values.name,
        email: values.email,
      })

      // Upload avatar if selected
      if (avatarFile) {
        try {
          await uploadAvatar(currentRow.id, avatarFile)
          toast.success("Avatar uploaded")
          setAvatarVersion(Date.now())
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Failed to upload avatar"
          setAvatarError(msg)
          toast.error(msg)
        }
      }

      toast.success("User updated successfully")
      editForm.reset(values)
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update user"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteAvatar() {
    if (!currentRow) return
    try {
      await deleteAvatar(currentRow.id)
      setAvatarVersion(Date.now())
      toast.success("Avatar removed")
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete avatar"
      toast.error(msg)
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      createForm.reset()
      editForm.reset({ name: "", email: "" })
      setAvatarFile(null)
      setAvatarError(null)
    }
    onOpenChange(open)
  }

  // Get current initials for the avatar fallback
  const initials = currentRow
    ? currentRow.name.charAt(0).toUpperCase()
    : (createForm.watch("name") || "?").charAt(0).toUpperCase()

  // Avatar URL for edit mode (bust cache with version)
  const editAvatarUrl = currentRow
    ? `${getAvatarUrl(currentRow.id)}&v=${avatarVersion}`
    : null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle>{isEdit ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the user here. Click save when you're done."
              : "Create a new user here. Click save when you're done."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto py-1 pe-3">
          {/* Avatar field — always first */}
          <div className="mb-6 flex justify-center">
            <AvatarDropZone
              currentAvatarUrl={isEdit ? editAvatarUrl : null}
              initials={initials}
              onFileSelect={(file) => {
                setAvatarFile(file)
                setAvatarError(null)
              }}
              onDelete={isEdit ? handleDeleteAvatar : undefined}
              error={avatarError}
            />
          </div>

          {isEdit ? (
            <Form {...editForm}>
              <form
                id="user-action-form"
                onSubmit={editForm.handleSubmit(onSubmitEdit)}
                className="space-y-4 px-0.5"
              >
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                      <FormLabel className="col-span-2 text-end">
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          className="col-span-4"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="col-span-4 col-start-3" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                      <FormLabel className="col-span-2 text-end">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="john.doe@example.com"
                          className="col-span-4"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="col-span-4 col-start-3" />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          ) : (
            <Form {...createForm}>
              <form
                id="user-action-form"
                onSubmit={createForm.handleSubmit(onSubmitCreate)}
                className="space-y-4 px-0.5"
              >
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                      <FormLabel className="col-span-2 text-end">
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          className="col-span-4"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="col-span-4 col-start-3" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                      <FormLabel className="col-span-2 text-end">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="john.doe@example.com"
                          className="col-span-4"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="col-span-4 col-start-3" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                      <FormLabel className="col-span-2 text-end">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Min. 6 characters"
                          className="col-span-4"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="col-span-4 col-start-3" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1">
                      <FormLabel className="col-span-2 text-end">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Re-enter password"
                          className="col-span-4"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="col-span-4 col-start-3" />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" form="user-action-form" disabled={submitting}>
            {submitting && <Spinner className="mr-2 size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
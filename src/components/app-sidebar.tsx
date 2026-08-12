"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Layout,
  Users,
  Shield,
  Gear,
  SignOut,
  CaretUpDown,
  Command,
} from "@phosphor-icons/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { logout, getUserId } from "@/lib/auth"
import { getAvatarUrl } from "@/lib/users"
import { useLocalStorageString } from "@/hooks/use-local-storage"
import { useEffect, useMemo, useState } from "react"

const otherItems = [
  { label: "Settings", href: "/settings", icon: Gear },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const userName = useLocalStorageString("goxus_user_name", "User")
  const userEmail = useLocalStorageString("goxus_user_email", "user@example.com")
  const savedUsersQuery = useLocalStorageString("goxus_users_query", "")

  // SSR-safe avatar URL: useState ensures React Compiler doesn't auto-memoize
  // the getUserId() call (which returns null during SSR).
  // useEffect reads localStorage after hydration and triggers a re-render.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  useEffect(() => {
    const uid = getUserId()
    if (uid) {
      setAvatarUrl(getAvatarUrl(uid))
    }
  }, [])

  const navItems = useMemo(
    () => [
      { label: "Dashboard", href: "/", icon: Layout },
      { label: "Users", href: savedUsersQuery ? `/users?${savedUsersQuery}` : "/users", icon: Users },
    ],
    [savedUsersQuery],
  )

  const handleLogout = async () => {
    await logout()
    router.replace("/login")
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                <Command className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Goxus</span>
                <span className="truncate text-xs">Admin Panel</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href.split("?")[0]
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive}>
                      <Icon className="text-blue-600 dark:text-blue-400" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href.split("?")[0]
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive}>
                      <Icon className="text-blue-600 dark:text-blue-400" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={(triggerProps) => <SidebarMenuButton {...triggerProps} aria-label="Open user menu" size="lg" />}>
                <Avatar className="size-12 rounded-lg">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                  <AvatarFallback className="rounded-lg">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userName}</span>
                  <span className="truncate text-xs">{userEmail}</span>
                </div>
                <CaretUpDown className="ms-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-(--radix-dropdown-menu-trigger-width)"
                align="end"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{userName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <SignOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

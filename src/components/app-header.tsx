"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Moon,
  Sun,
  Search,
  Settings,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { logout } from "@/lib/auth"
import { useLocalStorageString } from "@/hooks/use-local-storage"

const navLinks = [
  { label: "Overview", href: "/" },
  { label: "Users", href: "/users" },
  { label: "Roles", href: "/roles" },
  { label: "Settings", href: "/settings" },
]

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const userName = useLocalStorageString("goxus_user_name", "User")

  const handleLogout = async () => {
    await logout()
    router.replace("/login")
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="z-50 h-16 shadow-none">
      <div className="relative flex h-full items-center gap-3 p-4 sm:gap-4">
        <SidebarTrigger />

        <Separator orientation="vertical" className="h-6" />

        <nav className="hidden items-center space-x-4 lg:flex lg:space-x-4 xl:space-x-6 me-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button
          variant="outline"
          className="group relative h-8 w-full flex-1 justify-start rounded-md bg-muted/25 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent sm:w-40 sm:pe-12 md:flex-none lg:w-52 xl:w-64"
        >
          <Search className="absolute inset-s-1.5 top-1/2 size-4 -translate-y-1/2" />
          <span className="ms-4">Search</span>
          <kbd className="pointer-events-none absolute inset-e-[0.3rem] top-[0.3rem] hidden h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 select-none group-hover:bg-accent sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="size-9 scale-95 rounded-full"
        >
          <Sun className="size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
        >
          <Settings className="size-4" />
          <span className="sr-only">Settings</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="size-8">
              <AvatarFallback className="bg-muted">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

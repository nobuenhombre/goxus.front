import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { IconProvider } from "@/providers/icon-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"

const jetbrainsMono = localFont({
  src: "../fonts/JetBrainsMono.ttf",
  variable: "--font-jetbrains",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Goxus",
  description: "Goxus application",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={jetbrainsMono.variable}
      suppressHydrationWarning
    >
      <body>
        <IconProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="goxus_theme"
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </IconProvider>
      </body>
    </html>
  )
}
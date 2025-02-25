import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Campus Crawler AI - Find office hours for professors',
  description: 'Campus Crawler AI - Find office hours for professors',
  generator: 'Preston Wallace',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

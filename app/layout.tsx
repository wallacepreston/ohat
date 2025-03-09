import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { StatusProvider } from './context/StatusContext'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Campus Crawler AI',
  description: 'Find office hours for professors',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StatusProvider>
          <Toaster />
          {children}
        </StatusProvider>
      </body>
    </html>
  )
}

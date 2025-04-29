import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { StatusProvider } from './context/StatusContext'
import { LoadingProvider } from './context/LoadingContext'
import { Toaster } from '@/components/ui/toaster'
import LoadingOverlay from './components/LoadingOverlay'
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Office Hours Automation Tool (OHAT)',
  description: 'Find office hours for professors',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider>
          <StatusProvider>
            <LoadingProvider>
              {children}
              <Toaster />
              <LoadingOverlay />
            </LoadingProvider>
          </StatusProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}

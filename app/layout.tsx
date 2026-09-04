import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Lora } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin', 'vietnamese'], variable: '--font-geist' })
const lora = Lora({ subsets: ['latin', 'vietnamese'], variable: '--font-lora' })

export const metadata: Metadata = {
  title: 'TSA Focus — Luyện thi thông minh',
  description: 'Nền tảng học, luyện đề và ôn câu sai TSA với trợ lý Gemini có kiểm duyệt.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7f6' },
    { media: '(prefers-color-scheme: dark)', color: '#101716' },
  ],
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${geist.variable} ${lora.variable} bg-background`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

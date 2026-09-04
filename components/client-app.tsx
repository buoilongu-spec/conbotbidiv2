'use client'

import dynamic from 'next/dynamic'

const TsaApp = dynamic(
  () => import('@/components/tsa-app').then((module) => module.TsaApp),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
        <p className="text-sm text-muted-foreground">Đang mở không gian học tập…</p>
      </main>
    ),
  },
)

export function ClientApp() {
  return <TsaApp />
}

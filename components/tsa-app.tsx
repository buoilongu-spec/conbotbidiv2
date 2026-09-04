'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Bot, Brain, LayoutDashboard, Menu, Moon, PanelLeftClose, Sun, Target } from 'lucide-react'
import { AIWorkspace } from '@/components/ai-workspace'
import { DashboardView, LessonsView, MistakesView } from '@/components/learning-views'
import { QuizView } from '@/components/quiz-view'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ensureSeedData } from '@/lib/db'

const navigation = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'lessons', label: 'Bài học', icon: BookOpen },
  { id: 'quiz', label: 'Luyện đề', icon: Target },
  { id: 'mistakes', label: 'Câu sai', icon: Brain },
  { id: 'ai', label: 'Công cụ AI', icon: Bot },
]

export function TsaApp() {
  const [active, setActive] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [ready, setReady] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    ensureSeedData().finally(() => setReady(true))
    const stored = localStorage.getItem('tsa-theme')
    const useDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', useDark)
    document.documentElement.classList.toggle('light', !useDark)
    setDark(useDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.classList.toggle('light', !next)
    localStorage.setItem('tsa-theme', next ? 'dark' : 'light')
  }

  const current = navigation.find((item) => item.id === active)

  return (
    <TooltipProvider>
      <div className="min-h-dvh bg-background font-sans text-foreground">
        <aside className={cn('fixed inset-y-0 left-0 hidden flex-col border-r bg-sidebar transition-[width] duration-200 md:flex', collapsed ? 'w-20' : 'w-64')}>
          <div className="flex h-16 items-center gap-3 px-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary font-serif font-bold text-primary-foreground">T</div>
            {!collapsed && <div><p className="font-serif text-lg font-semibold leading-none">TSA Focus</p><p className="mt-1 text-xs text-muted-foreground">Học đúng trọng tâm</p></div>}
          </div>
          <Separator />
          <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Điều hướng chính">
            {navigation.map((item) => <Tooltip key={item.id}><TooltipTrigger render={<button type="button" onClick={() => setActive(item.id)} className={cn('flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50', active === item.id && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground', collapsed && 'justify-center px-0')} />}><item.icon aria-hidden="true" />{!collapsed && item.label}</TooltipTrigger>{collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}</Tooltip>)}
          </nav>
          <div className="p-3"><Button variant="ghost" className={cn('w-full', collapsed ? 'px-0' : 'justify-start')} onClick={() => setCollapsed((value) => !value)}><PanelLeftClose data-icon="inline-start" className={cn(collapsed && 'rotate-180')} />{!collapsed && 'Thu gọn'}</Button></div>
        </aside>

        <div className={cn('transition-[padding] duration-200 md:pl-64', collapsed && 'md:pl-20')}>
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3"><Menu className="md:hidden" aria-hidden="true" /><div><p className="text-xs text-muted-foreground">Không gian học tập</p><h1 className="font-serif font-semibold">{current?.label}</h1></div></div>
            <div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={toggleTheme} aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>{dark ? <Sun /> : <Moon />}</Button><div className="flex size-8 items-center justify-center rounded-full bg-secondary font-serif text-sm font-bold">AN</div></div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:px-6 md:pb-8 lg:py-8">
            {!ready ? <p className="text-muted-foreground">Đang khởi tạo kho dữ liệu cục bộ…</p> : active === 'dashboard' ? <DashboardView onNavigate={setActive} /> : active === 'lessons' ? <LessonsView /> : active === 'quiz' ? <QuizView /> : active === 'mistakes' ? <MistakesView /> : <AIWorkspace />}
          </main>
        </div>

        <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl border bg-background/95 p-1 shadow-lg backdrop-blur md:hidden" aria-label="Điều hướng di động">
          {navigation.map((item) => <button key={item.id} type="button" onClick={() => setActive(item.id)} className={cn('flex min-w-12 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] text-muted-foreground', active === item.id && 'bg-primary text-primary-foreground')}><item.icon className="size-4" aria-hidden="true" /><span>{item.label.split(' ')[0]}</span></button>)}
        </nav>
      </div>
    </TooltipProvider>
  )
}

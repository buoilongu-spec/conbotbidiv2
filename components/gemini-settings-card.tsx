'use client'

import { useState } from 'react'
import { CheckCircle2, KeyRound, Plus, ShieldAlert, Trash2, Zap } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { GEMINI_MODELS, maskGeminiKey, type GeminiApiKey, type GeminiSettings } from '@/lib/gemini-settings'

const modelItems = GEMINI_MODELS.map((model) => ({ label: model.label, value: model.value }))

function statusLabel(status: GeminiApiKey['status']) {
  if (status === 'quota') return 'Hết hạn mức'
  if (status === 'invalid') return 'Key lỗi'
  return 'Sẵn sàng'
}

export function GeminiSettingsCard({ settings, onChange }: { settings: GeminiSettings; onChange: (settings: GeminiSettings) => void }) {
  const [label, setLabel] = useState('')
  const [secret, setSecret] = useState('')
  const selectedModel = GEMINI_MODELS.find((model) => model.value === settings.model) ?? GEMINI_MODELS[0]
  const activeKey = settings.keys.find((key) => key.id === settings.activeKeyId)

  function updateKey(id: string, patch: Partial<GeminiApiKey>) {
    onChange({ ...settings, keys: settings.keys.map((key) => key.id === id ? { ...key, ...patch } : key) })
  }

  function addKey() {
    const value = secret.trim()
    if (!value) return
    const key: GeminiApiKey = {
      id: crypto.randomUUID(),
      label: label.trim() || `Key ${settings.keys.length + 1}`,
      secret: value,
      enabled: true,
      remember: false,
      status: 'ready',
    }
    onChange({ ...settings, keys: [...settings.keys, key], activeKeyId: settings.activeKeyId ?? key.id })
    setLabel('')
    setSecret('')
  }

  function removeKey(id: string) {
    const keys = settings.keys.filter((key) => key.id !== id)
    onChange({ ...settings, keys, activeKeyId: settings.activeKeyId === id ? keys.find((key) => key.enabled)?.id ?? null : settings.activeKeyId })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2"><Zap aria-hidden="true" /> Cấu hình Gemini</CardTitle>
            <CardDescription>Chọn mô hình và luân phiên key khi Google trả về lỗi hạn mức.</CardDescription>
          </div>
          <Badge variant={activeKey ? 'secondary' : 'outline'}>{activeKey ? `Đang dùng: ${activeKey.label}` : 'Chưa có key'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-2 md:max-w-xl">
          <label htmlFor="gemini-model" className="text-sm font-medium">Mô hình Gemini</label>
          <Select items={modelItems} value={settings.model} onValueChange={(value) => value && onChange({ ...settings, model: value })}>
            <SelectTrigger id="gemini-model" className="w-full" aria-label="Chọn mô hình Gemini"><SelectValue /></SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>{modelItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-sm leading-6 text-muted-foreground">{selectedModel.description}</p>
        </div>

        <div className="flex flex-col gap-3">
          <div><h3 className="font-medium">Kho API key</h3><p className="text-sm text-muted-foreground">Key chính được thử trước; khi gặp lỗi 429 hệ thống thử mỗi key bật còn lại đúng một lần.</p></div>
          {settings.keys.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Chưa có key. Thêm key đầu tiên ở bên dưới để dùng công cụ AI.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {settings.keys.map((key) => {
                const active = key.id === settings.activeKeyId
                return (
                  <div key={key.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{key.label}</p><Badge variant={key.status === 'ready' ? 'secondary' : 'outline'}>{statusLabel(key.status)}</Badge>{active && <Badge>Key chính</Badge>}</div>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">{maskGeminiKey(key.secret)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-sm"><Switch checked={key.enabled} onCheckedChange={(enabled) => updateKey(key.id, { enabled, status: enabled ? 'ready' : key.status })} aria-label={`Bật ${key.label}`} /> Bật</label>
                      <label className="flex items-center gap-2 text-sm"><Switch checked={key.remember} onCheckedChange={(remember) => updateKey(key.id, { remember })} aria-label={`Ghi nhớ ${key.label}`} /> Ghi nhớ</label>
                      <Button size="sm" variant={active ? 'secondary' : 'outline'} onClick={() => onChange({ ...settings, activeKeyId: key.id })} disabled={!key.enabled}>{active ? <CheckCircle2 data-icon="inline-start" /> : <KeyRound data-icon="inline-start" />}{active ? 'Đang dùng' : 'Dùng key này'}</Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => removeKey(key.id)} aria-label={`Xóa ${key.label}`}><Trash2 /></Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-[0.55fr_1fr_auto]">
          <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Nhãn, ví dụ: Key dự phòng" aria-label="Nhãn API key" />
          <Input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="AIza..." aria-label="Gemini API key mới" autoComplete="off" />
          <Button onClick={addKey} disabled={!secret.trim()}><Plus data-icon="inline-start" /> Thêm key</Button>
        </div>

        {settings.keys.some((key) => key.remember) && <Alert><ShieldAlert aria-hidden="true" /><AlertTitle>Lưu ý bảo mật</AlertTitle><AlertDescription>Key được ghi nhớ bằng Web Storage trên thiết bị này và có thể bị đọc nếu trang gặp lỗ hổng XSS. Chỉ dùng key đã giới hạn quota trên thiết bị cá nhân.</AlertDescription></Alert>}
      </CardContent>
    </Card>
  )
}

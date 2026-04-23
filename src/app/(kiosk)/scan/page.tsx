'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, QrCode, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CHECKPOINT_ROUTES } from '@/lib/checkpoints'

const LAST_CHECKPOINT_KEY = 'scan_last_checkpoint_slug'

export default function ScanPage() {
  const checkpoints = Object.values(CHECKPOINT_ROUTES)
  const [lastSlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem(LAST_CHECKPOINT_KEY)
      return saved && saved in CHECKPOINT_ROUTES ? saved : null
    } catch {
      return null
    }
  })

  const lastCheckpoint = lastSlug ? CHECKPOINT_ROUTES[lastSlug as keyof typeof CHECKPOINT_ROUTES] : null

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Quét điểm kiểm tra</h1>
      <p className="text-base text-muted-foreground">
        Chọn công đoạn để bắt đầu quét và xác nhận hoàn thành.
      </p>

      {lastCheckpoint && (
        <Link href={lastCheckpoint.href} className="block">
          <Card className="border-primary/40 bg-primary/5 transition-colors hover:bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Clock className="size-5 text-primary" />
                  Tiếp tục: {lastCheckpoint.label}
                </span>
                <Badge variant="outline" className="text-sm">Gần nhất</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-base text-muted-foreground">{lastCheckpoint.description}</p>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="space-y-3">
        {checkpoints.map((item) => (
          <Link key={item.checkpoint} href={item.href} className="block">
            <Card className="transition-colors hover:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <QrCode className="size-5" />
                    {item.label}
                  </span>
                  <ArrowRight className="size-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-base text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

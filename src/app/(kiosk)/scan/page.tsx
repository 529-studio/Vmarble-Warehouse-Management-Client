import Link from 'next/link'
import { ArrowRight, QrCode } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CHECKPOINT_ROUTES } from '@/lib/checkpoints'

export default function ScanPage() {
  const checkpoints = Object.values(CHECKPOINT_ROUTES)

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Quét điểm kiểm tra</h1>
      <p className="text-base text-muted-foreground">
        Chọn công đoạn để bắt đầu quét và xác nhận hoàn thành.
      </p>

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

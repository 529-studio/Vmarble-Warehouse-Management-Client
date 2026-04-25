import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ArrowRight, Camera, CameraOff, Lock, ShieldAlert } from 'lucide-react'
import { fn } from 'storybook/test'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScannerView } from './scanner-view'

const meta: Meta<typeof ScannerView> = {
  title: 'Kiosk/ScannerView',
  component: ScannerView,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'mobile375' },
  },
  args: {
    onScan: fn(),
  },
}

export default meta
type Story = StoryObj<typeof ScannerView>

export const Default: Story = {
  name: 'Camera mode (falls back to manual in Storybook)',
}

export const CameraWithControls: Story = {
  name: 'Camera mode with low-light controls',
  args: {
    showControls: true,
  },
}

export const PermissionDenied: Story = {
  name: 'Error — NotAllowedError (permission denied)',
  render: () => (
    <div className="max-w-93.75 p-4">
      <ManualWithError
        errorKind="not-allowed"
        title="Chưa cấp quyền camera"
        description='Trình duyệt đã từ chối quyền truy cập camera. Nhấn vào biểu tượng khóa trên thanh địa chỉ và chọn "Cho phép" rồi tải lại trang.'
      />
    </div>
  ),
}

export const CameraNotFound: Story = {
  name: 'Error — NotFoundError (no camera device)',
  render: () => (
    <div className="max-w-93.75 p-4">
      <ManualWithError
        errorKind="not-found"
        title="Không tìm thấy camera"
        description="Thiết bị không có camera hoặc camera đang được sử dụng bởi ứng dụng khác. Kiểm tra lại phần cứng."
      />
    </div>
  ),
}

export const InsecureContext: Story = {
  name: 'Error — Insecure context (HTTP, not HTTPS)',
  render: () => (
    <div className="max-w-93.75 p-4">
      <ManualWithError
        errorKind="insecure-context"
        title="Yêu cầu kết nối HTTPS"
        description="Camera chỉ hoạt động trên kết nối bảo mật (HTTPS). Liên hệ quản trị viên để bật HTTPS cho staging."
      />
    </div>
  ),
}

export const ManualInputMode: Story = {
  name: 'Manual input (no error, user-initiated)',
  render: (args) => (
    <div className="max-w-93.75 space-y-2 p-4">
      <p className="text-sm font-medium">Nhập mã thủ công (camera không khả dụng)</p>
      <ScannerView {...args} />
    </div>
  ),
}

type ErrorKind = 'not-allowed' | 'not-found' | 'insecure-context'

const iconMap: Record<ErrorKind, React.ReactNode> = {
  'not-allowed': <ShieldAlert className="size-5 text-destructive" />,
  'not-found': <CameraOff className="size-5 text-destructive" />,
  'insecure-context': <Lock className="size-5 text-destructive" />,
}

function ManualWithError({
  errorKind,
  title,
  description,
}: {
  errorKind: ErrorKind
  title: string
  description: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        {iconMap[errorKind]}
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Nhập mã rồi bấm nút →" className="h-12 flex-1 text-base" readOnly />
        <Button type="button" size="default" className="h-12 shrink-0 px-4" aria-label="Xác nhận mã">
          <ArrowRight className="size-5" />
        </Button>
      </div>
      <Button size="sm" variant="ghost">
        <Camera className="size-4" />
        Thử lại camera
      </Button>
    </div>
  )
}

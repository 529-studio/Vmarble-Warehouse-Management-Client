import type { Meta, StoryObj } from '@storybook/react'
import { Camera, CameraOff, Lock, ShieldAlert } from 'lucide-react'
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

/**
 * NOTE: Storybook runs in a browser without a real camera feed.
 * The component will auto-fall back to the manual input mode when
 * `html5-qrcode` can't access the camera — which is the expected
 * Storybook behaviour.
 */
export const Default: Story = {
  name: 'Camera mode (falls back to manual in Storybook)',
}

/**
 * Shown when the user denies camera permission in the browser prompt.
 * Error name: NotAllowedError / PermissionDeniedError.
 * Guidance: tap the lock icon in the address bar and allow camera.
 */
export const PermissionDenied: Story = {
  name: 'Error — NotAllowedError (permission denied)',
  render: (args) => (
    <div className="max-w-93.75 p-4">
      <ManualWithError
        {...args}
        errorKind="not-allowed"
        title="Chưa cấp quyền camera"
        description='Trình duyệt đã từ chối quyền truy cập camera. Nhấn vào biểu tượng khóa trên thanh địa chỉ và chọn "Cho phép" rồi tải lại trang.'
      />
    </div>
  ),
}

/**
 * Shown when no camera hardware is found or it is in use by another app.
 * Error name: NotFoundError / DevicesNotFoundError.
 */
export const CameraNotFound: Story = {
  name: 'Error — NotFoundError (no camera device)',
  render: (args) => (
    <div className="max-w-93.75 p-4">
      <ManualWithError
        {...args}
        errorKind="not-found"
        title="Không tìm thấy camera"
        description="Thiết bị không có camera hoặc camera đang được sử dụng bởi ứng dụng khác. Kiểm tra lại phần cứng."
      />
    </div>
  ),
}

/**
 * Shown when the page is served over plain HTTP (not HTTPS).
 * Browser blocks getUserMedia entirely for insecure contexts.
 * Guidance: contact admin to enable HTTPS on staging.
 */
export const InsecureContext: Story = {
  name: 'Error — Insecure context (HTTP, not HTTPS)',
  render: (args) => (
    <div className="max-w-93.75 p-4">
      <ManualWithError
        {...args}
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

// ---------------------------------------------------------------------------
// Internal helper — renders the manual-mode UI with a pre-set error banner.
// Not exported as a story; used only by the error stories above via render().
// ---------------------------------------------------------------------------

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
  onScan: (code: string) => void
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
      <Input
        placeholder="Nhập mã rồi nhấn Enter..."
        className="h-12 text-base"
        readOnly
      />
      <Button size="sm" variant="ghost">
        <Camera className="size-4" />
        Thử lại camera
      </Button>
    </div>
  )
}

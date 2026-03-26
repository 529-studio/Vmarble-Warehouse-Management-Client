import type { Meta, StoryObj } from '@storybook/react'
import { toast } from 'sonner'
import { Button } from './button'
import { Toaster } from './sonner'

const meta: Meta<typeof Toaster> = {
  title: 'UI/Sonner (Toaster)',
  component: Toaster,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Toaster>

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => toast('Thông báo mặc định')}>
        Toast mặc định
      </Button>
      <Button
        variant="default"
        onClick={() => toast.success('Lưu thành công!')}
      >
        Toast thành công
      </Button>
      <Button
        variant="destructive"
        onClick={() => toast.error('Có lỗi xảy ra!')}
      >
        Toast lỗi
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.warning('Kho sắp đầy — > 80%')}
      >
        Toast cảnh báo
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast('In nhãn', {
            description: 'Đang gửi lệnh in đến máy in…',
            action: { label: 'Huỷ', onClick: () => {} },
          })
        }
      >
        Toast với action
      </Button>
    </div>
  ),
}

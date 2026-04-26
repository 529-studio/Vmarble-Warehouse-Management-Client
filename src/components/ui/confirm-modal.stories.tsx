import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { Button } from './button'
import { ConfirmModal } from './confirm-modal'

function ConfirmModalStory(props: {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  confirmVariant?: 'default' | 'destructive'
  isPending?: boolean
  pendingLabel?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={props.confirmVariant === 'destructive' ? 'destructive' : 'default'}
        onClick={() => setOpen(true)}
      >
        Mở confirm modal
      </Button>
      <ConfirmModal
        {...props}
        open={open}
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </div>
  )
}

const meta = {
  title: 'UI/ConfirmModal',
  component: ConfirmModalStory,
  tags: ['autodocs'],
  args: {
    title: 'Xác nhận hành động?',
    description: 'Hành động này sẽ cập nhật dữ liệu trong hệ thống.',
    confirmLabel: 'Xác nhận',
    cancelLabel: 'Hủy',
    confirmVariant: 'default',
    isPending: false,
  },
} satisfies Meta<typeof ConfirmModalStory>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Destructive: Story = {
  args: {
    title: 'Hủy kế hoạch sản xuất?',
    description: 'Kế hoạch sẽ bị hủy và không thể khôi phục.',
    confirmLabel: 'Hủy kế hoạch',
    confirmVariant: 'destructive',
  },
}

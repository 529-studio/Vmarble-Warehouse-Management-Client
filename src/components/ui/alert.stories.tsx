import type { Meta, StoryObj } from '@storybook/react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './alert'

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Alert>

export const Default: Story = {
  render: () => (
    <Alert>
      <CheckCircle className="size-4" />
      <AlertTitle>Thành công</AlertTitle>
      <AlertDescription>Thao tác đã được thực hiện thành công.</AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>Lỗi</AlertTitle>
      <AlertDescription>Có lỗi xảy ra. Vui lòng thử lại.</AlertDescription>
    </Alert>
  ),
}

export const WithoutIcon: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Thông báo</AlertTitle>
      <AlertDescription>
        Alert không có icon — dùng khi không cần nhấn mạnh loại thông báo.
      </AlertDescription>
    </Alert>
  ),
}

export const DescriptionOnly: Story = {
  render: () => (
    <Alert>
      <AlertDescription>
        Chỉ có mô tả, không có tiêu đề.
      </AlertDescription>
    </Alert>
  ),
}

import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'
import { Label } from './label'

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Label>

export const Default: Story = {
  args: { children: 'Nhãn trường' },
}

export const WithInput: Story = {
  render: () => (
    <div className="grid gap-1.5 w-full max-w-sm">
      <Label htmlFor="material">Loại vật liệu</Label>
      <Input id="material" placeholder="VD: PLYWOOD, MDF, HDF" />
    </div>
  ),
}

export const DisabledGroup: Story = {
  render: () => (
    <div className="group grid gap-1.5 w-full max-w-sm" data-disabled="true">
      <Label htmlFor="qty">Số lượng</Label>
      <Input id="qty" disabled placeholder="Không thể chỉnh sửa" />
    </div>
  ),
}

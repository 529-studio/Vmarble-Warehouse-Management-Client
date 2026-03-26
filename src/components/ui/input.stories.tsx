import type { Meta, StoryObj } from '@storybook/react'
import { Label } from './label'
import { Input } from './input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'file'],
    },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { placeholder: 'Nhập văn bản...' },
}

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="sku">Mã SKU</Label>
      <Input id="sku" placeholder="VD: PLY-18-A-WG" />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Giá trị không thể chỉnh sửa',
  },
}

export const NumberInput: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="thickness">Độ dày (mm)</Label>
      <Input id="thickness" type="number" placeholder="18" min={1} max={100} />
    </div>
  ),
}

export const ErrorState: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="lot">Số lô</Label>
      <Input id="lot" aria-invalid="true" defaultValue="INVALID-LOT" />
      <p className="text-sm text-destructive">Số lô không đúng định dạng.</p>
    </div>
  ),
}

export const FileUpload: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="file">Tải file</Label>
      <Input id="file" type="file" />
    </div>
  ),
}

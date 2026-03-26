import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Dialog>

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Mở Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận hành động</DialogTitle>
          <DialogDescription>
            Hành động này không thể hoàn tác. Dữ liệu sẽ bị xoá vĩnh viễn.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Huỷ</Button>
          <Button variant="destructive">Xác nhận xoá</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Tạo vị trí kho</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Thêm vị trí kho mới</DialogTitle>
          <DialogDescription>Điền thông tin vị trí lưu trữ mới.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="zone">Khu vực</Label>
            <Input id="zone" placeholder="VD: A, B, C..." />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="slot">Ô số</Label>
            <Input id="slot" type="number" placeholder="1" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Tạo vị trí</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

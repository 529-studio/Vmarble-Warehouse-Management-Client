import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Thẻ thông tin</CardTitle>
        <CardDescription>Mô tả ngắn về nội dung thẻ này.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Nội dung chính của thẻ — có thể là văn bản, bảng, biểu đồ, v.v.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm">Huỷ</Button>
        <Button size="sm">Lưu</Button>
      </CardFooter>
    </Card>
  ),
}

export const HeaderOnly: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Chỉ tiêu đề</CardTitle>
        <CardDescription>Không có nội dung phụ.</CardDescription>
      </CardHeader>
    </Card>
  ),
}

export const ContentOnly: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardContent>
        <p className="text-sm">Thẻ không có header, chỉ có nội dung.</p>
      </CardContent>
    </Card>
  ),
}

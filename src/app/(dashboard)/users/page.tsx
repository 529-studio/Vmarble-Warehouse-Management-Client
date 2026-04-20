'use client'

import { Suspense, useState } from 'react'
import { toast } from 'sonner'
import { Plus, UserX, UserCheck, ShieldCheck } from 'lucide-react'
import { mapApiErrorVi } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchInput } from '@/components/ui/search-input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useUsers, useCreateUser, useToggleUserStatus } from '@/lib/hooks/use-users'
import type { User, CreateUserInput, UserRole } from '@/types/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_ROLES: UserRole[] = [
  'admin',
  'cnc',
  'planner',
  'warehouse',
  'accountant',
  'cnc_manager',
  'foreman',
]

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  cnc: 'Vận hành CNC',
  planner: 'Kế hoạch',
  warehouse: 'Thủ kho',
  accountant: 'Kế toán',
  cnc_manager: 'Quản lý CNC',
  foreman: 'Quản đốc',
}

const ROLE_BADGE_VARIANT: Record<UserRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  admin: 'destructive',
  accountant: 'default',
  planner: 'default',
  warehouse: 'secondary',
  cnc_manager: 'secondary',
  foreman: 'secondary',
  cnc: 'outline',
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 5 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ── Create User Dialog ────────────────────────────────────────────────────────

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState<CreateUserInput>({
    username: '',
    password: '',
    role: 'cnc',
    full_name: '',
    email: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CreateUserInput, string>>>({})

  const { mutate, isPending } = useCreateUser()

  function validate(): boolean {
    const next: typeof errors = {}
    if (!form.username.trim()) next.username = 'Tên đăng nhập không được để trống'
    if (form.username.length < 3) next.username = 'Tối thiểu 3 ký tự'
    if (!form.password) next.password = 'Mật khẩu không được để trống'
    if (form.password.length < 6) next.password = 'Tối thiểu 6 ký tự'
    if (!form.role) next.role = 'Vui lòng chọn vai trò'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    mutate(form, {
      onSuccess: () => {
        toast.success('Tạo người dùng thành công')
        onOpenChange(false)
        setForm({ username: '', password: '', role: 'cnc', full_name: '', email: '' })
        setErrors({})
      },
      onError: (err) => {
        toast.error(mapApiErrorVi(err, 'Không thể tạo người dùng'))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm người dùng mới</DialogTitle>
          <DialogDescription>
            Tạo tài khoản mới cho nhân viên trong hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username">Tên đăng nhập *</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => {
                setForm((f) => ({ ...f, username: e.target.value }))
                setErrors((err) => ({ ...err, username: undefined }))
              }}
              placeholder="VD: nguyenvan_a"
              autoComplete="off"
            />
            {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Mật khẩu *</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }))
                setErrors((err) => ({ ...err, password: undefined }))
              }}
              placeholder="••••••••"
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="role">Vai trò *</Label>
            <Select
              value={form.role}
              onValueChange={(v) => {
                setForm((f) => ({ ...f, role: v as UserRole }))
                setErrors((e) => ({ ...e, role: undefined }))
              }}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Chọn vai trò…" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Họ và tên</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="VD: Nguyễn Văn A"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang tạo…' : 'Tạo tài khoản'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page Content ────────────────────────────────────────────────────────

function UsersContent() {
  const { data: users, isLoading, isError } = useUsers()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [toggleDialog, setToggleDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  })

  const { mutate: toggleStatus, isPending: isToggling } = useToggleUserStatus()

  const filteredUsers = (users ?? []).filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const handleToggleStatus = () => {
    if (!toggleDialog.user) return
    const nextStatus = !toggleDialog.user.is_active
    toggleStatus(
      { id: toggleDialog.user.id, active: nextStatus },
      {
        onSuccess: () => {
          toast.success(nextStatus ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản')
          setToggleDialog({ open: false, user: null })
        },
        onError: (err) => {
          toast.error(mapApiErrorVi(err, 'Thao tác thất bại'))
        },
      }
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo tên đăng nhập hoặc họ tên…"
          containerClassName="w-full sm:max-w-sm"
        />
        <Button className="sm:ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Thêm người dùng
        </Button>
      </div>

      {isError ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-10 text-center text-destructive">
            Không thể tải danh sách người dùng. Vui lòng thử lại sau.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {isLoading ? 'Đang tải…' : `Danh sách tài khoản (${filteredUsers.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="w-[100px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton />
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {search ? `Không tìm thấy người dùng "${search}"` : 'Chưa có người dùng nào.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.username}</span>
                          <span className="text-xs text-muted-foreground">{user.full_name || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROLE_BADGE_VARIANT[user.role] ?? 'outline'}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <UserCheck className="size-3.5" />
                            <span className="text-sm font-medium">Hoạt động</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-destructive">
                            <UserX className="size-3.5" />
                            <span className="text-sm font-medium">Bị khóa</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={user.is_active ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'}
                          onClick={() => setToggleDialog({ open: true, user })}
                        >
                          {user.is_active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog
        open={toggleDialog.open}
        onOpenChange={(open) => !open && setToggleDialog({ open: false, user: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleDialog.user?.is_active ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleDialog.user?.is_active
                ? `Bạn có chắc chắn muốn khóa tài khoản "${toggleDialog.user.username}"? Người dùng này sẽ không thể đăng nhập vào hệ thống.`
                : `Bạn có chắc chắn muốn mở khóa tài khoản "${toggleDialog.user?.username}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleToggleStatus()
              }}
              className={toggleDialog.user?.is_active ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-emerald-600 text-white hover:bg-emerald-700'}
              disabled={isToggling}
            >
              {isToggling ? 'Đang xử lý…' : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Page Shell ───────────────────────────────────────────────────────────────

export default function UsersPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
            <Card>
              <CardContent className="p-0">
                <TableSkeleton />
              </CardContent>
            </Card>
          </div>
        }
      >
        <UsersContent />
      </Suspense>
    </div>
  )
}

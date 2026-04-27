'use client'

import { Suspense, useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, UserX, UserCheck, ShieldCheck, Filter, X, Search, Check } from 'lucide-react'
import { mapApiErrorVi } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { ConfirmModal } from '@/components/ui/confirm-modal'
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
import { DataPagination } from '@/components/ui/data-pagination'
import { useUsers, useCreateUser, useToggleUserStatus } from '@/lib/hooks/use-users'
import type { User, CreateUserInput, UserRole, UserListParams } from '@/types/api'
import { cn } from '@/lib/utils'

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

const ROLE_CLASS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  planner: 'bg-blue-100 text-blue-800 border-blue-200',
  warehouse: 'bg-green-100 text-green-800 border-green-200',
  cnc: 'bg-orange-100 text-orange-800 border-orange-200',
  cnc_manager: 'bg-orange-100 text-orange-800 border-orange-200',
  accountant: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  foreman: 'bg-gray-100 text-gray-800 border-gray-200',
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

// ── Filters ──────────────────────────────────────────────────────────────────

function UserFilters({ params, onChange }: { params: UserListParams; onChange: (next: UserListParams) => void }) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const roles = useMemo(() => params.role?.split(',').filter(Boolean) || [], [params.role])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const lowerInput = inputValue.toLowerCase().trim()
      
      // Case 1: Typing with role: prefix
      if (lowerInput.startsWith('role:')) {
        const rolesPart = lowerInput.slice(5)
        if (rolesPart) {
          const newRoles = rolesPart.split(',').map(r => r.trim()).filter(r => USER_ROLES.includes(r as UserRole))
          if (newRoles.length > 0) {
            onChange({ ...params, role: Array.from(new Set([...roles, ...newRoles])).join(','), page: 1 })
            setInputValue('')
            return
          }
        }
      }
      
      // Case 2: Typing with status: prefix
      if (lowerInput.startsWith('status:')) {
        const statusPart = lowerInput.slice(7).trim()
        if (statusPart === 'active' || statusPart === 'inactive') {
          onChange({ ...params, is_active: statusPart === 'active', page: 1 })
          setInputValue('')
          return
        }
      }

      // Default: Normal username search
      onChange({ ...params, search: inputValue, page: 1 })
    } else if (e.key === 'Backspace' && inputValue === '') {
      if (params.is_active !== undefined) {
        onChange({ ...params, is_active: undefined, page: 1 })
      } else if (roles.length > 0) {
        const nextRoles = [...roles]
        nextRoles.pop()
        onChange({ ...params, role: nextRoles.length > 0 ? nextRoles.join(',') : undefined, page: 1 })
      }
    }
  }

  const suggestions = useMemo(() => {
    const input = inputValue.toLowerCase().trim()

    // Chỉ gợi ý khi có prefix "role:" hoặc "status:"
    if (input.startsWith('role:')) {
      const rolesPart = input.slice(5)
      const parts = rolesPart.split(',')
      const currentTyping = parts.pop()?.trim() || ''

      // Chỉ gợi ý các role chưa được chọn
      return USER_ROLES
        .filter(r => !roles.includes(r) && (r.includes(currentTyping) || ROLE_LABELS[r].toLowerCase().includes(currentTyping)))
        .map(r => ({ type: 'role' as const, value: r, label: ROLE_LABELS[r] }))
    }

    if (input.startsWith('status:')) {
      const currentTyping = input.slice(7).trim()

      // Nếu đã có status được chọn, không gợi ý nữa
      if (params.is_active !== undefined) {
        return []
      }

      return ['active', 'inactive']
        .filter(s => s.includes(currentTyping))
        .map(s => ({ type: 'status' as const, value: s, label: s === 'active' ? 'Đang hoạt động' : 'Đang bị khóa' }))
    }

    return []
  }, [inputValue, roles, params.is_active])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full" ref={containerRef}>
      <div className="relative flex-1 group">
        <div className={cn(
          "flex min-h-9 w-full flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        )}>
          <Search className="size-4 text-muted-foreground mr-1 self-center" />
          
          {roles.map((r) => (
            <Badge key={r} variant="secondary" className="gap-1 pr-1 font-normal h-6 bg-blue-50 text-blue-700 border-blue-200">
              role:{r}
              <button 
                onClick={() => {
                  const nextRoles = roles.filter(role => role !== r)
                  onChange({ ...params, role: nextRoles.length > 0 ? nextRoles.join(',') : undefined, page: 1 })
                }} 
                className="rounded-full hover:bg-blue-200/50 p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}

          {params.is_active !== undefined && (
            <Badge variant="secondary" className="gap-1 pr-1 font-normal h-6 bg-emerald-50 text-emerald-700 border-emerald-200">
              status:{params.is_active ? 'active' : 'inactive'}
              <button onClick={() => onChange({ ...params, is_active: undefined, page: 1 })} className="rounded-full hover:bg-emerald-200/50 p-0.5">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          
          <input
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder={roles.length === 0 && params.is_active === undefined ? "Lọc người dùng (role:, status:)..." : ""}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px]"
          />
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
            <div className="p-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Gợi ý kết quả</div>
              {suggestions.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    if (s.type === 'role') {
                      const nextRoles = Array.from(new Set([...roles, s.value]))
                      onChange({ ...params, role: nextRoles.join(','), page: 1 })
                    } else {
                      onChange({ ...params, is_active: s.value === 'active', page: 1 })
                    }
                    setInputValue('')
                    setShowSuggestions(false)
                  }}
                  className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-left"
                >
                  <Badge variant="outline" className="mr-2 h-5 font-normal">
                    {s.type}:{s.value}
                  </Badge>
                  <span className="text-muted-foreground truncate">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={params.is_active === undefined ? 'all' : String(params.is_active)}
          onValueChange={(v) => onChange({ ...params, is_active: v === 'all' ? undefined : v === 'true', page: 1 })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="true">Đang hoạt động</SelectItem>
            <SelectItem value="false">Đang bị khóa</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative" ref={dropdownRef}>
          <Button
            variant="outline"
            className="w-[160px] justify-start gap-2"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <Filter className="size-3.5 shrink-0" />
            <span className="truncate">
              {roles.length === 0 ? "Vai trò" : `Vai trò (${roles.length})`}
            </span>
          </Button>

          {dropdownOpen && (
            <div className="absolute z-50 mt-1 w-[200px] rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
              <div className="p-2">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...params, role: undefined, page: 1 })
                      setDropdownOpen(false)
                    }}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-left"
                  >
                    <span>Tất cả vai trò</span>
                    {roles.length === 0 && <Check className="size-3.5 text-emerald-600" />}
                  </button>
                  {USER_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        const nextRoles = roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role]
                        onChange({ ...params, role: nextRoles.length > 0 ? nextRoles.join(',') : undefined, page: 1 })
                      }}
                      className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-left"
                    >
                      <span>{ROLE_LABELS[role]}</span>
                      {roles.includes(role) && <Check className="size-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>
                <div className="border-t mt-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Xong
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page Content ────────────────────────────────────────────────────────

function UsersContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const params = useMemo((): UserListParams => {
    const p: UserListParams = {
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
    }
    const active = searchParams.get('active')
    if (active === 'true') p.is_active = true
    if (active === 'false') p.is_active = false
    return p
  }, [searchParams])

  const updateParams = (next: UserListParams) => {
    const sp = new URLSearchParams()
    if (next.page && next.page > 1) sp.set('page', String(next.page))
    if (next.search) sp.set('search', next.search)
    if (next.role) sp.set('role', next.role)
    if (next.is_active !== undefined) sp.set('active', String(next.is_active))
    
    router.push(`${pathname}?${sp.toString()}`)
  }

  const { data, isLoading, isError } = useUsers(params)
  const users = data?.items ?? []
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

  const [createOpen, setCreateOpen] = useState(false)
  const [toggleDialog, setToggleDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  })

  const { mutate: toggleStatus, isPending: isToggling } = useToggleUserStatus()

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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <UserFilters params={params} onChange={updateParams} />
          <Button onClick={() => setCreateOpen(true)} className="sm:shrink-0">
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
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base font-medium">
                  {isLoading ? 'Đang tải…' : `Danh sách tài khoản (${totalItems})`}
                </CardTitle>
                {(params.search || params.role || params.is_active !== undefined) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => updateParams({})}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="mr-2 size-3.5" />
                    Xóa bộ lọc
                  </Button>
                )}
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
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          Không tìm thấy người dùng nào phù hợp với bộ lọc.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.username}</span>
                              <span className="text-xs text-muted-foreground">{user.full_name || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={ROLE_CLASS[user.role]}>
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

            {!isLoading && totalPages > 1 && (
              <DataPagination
                currentPage={params.page || 1}
                totalPages={totalPages}
                totalItems={totalItems}
                limit={params.limit || 20}
                onPageChange={(p) => updateParams({ ...params, page: p })}
              />
            )}
          </div>
        )}
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmModal
        open={toggleDialog.open}
        title={toggleDialog.user?.is_active ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
        description={toggleDialog.user?.is_active
          ? `Bạn có chắc chắn muốn khóa tài khoản "${toggleDialog.user.username}"? Người dùng này sẽ không thể đăng nhập vào hệ thống.`
          : `Bạn có chắc chắn muốn mở khóa tài khoản "${toggleDialog.user?.username}"?`}
        confirmLabel="Xác nhận"
        confirmVariant={toggleDialog.user?.is_active ? 'destructive' : 'default'}
        isPending={isToggling}
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleDialog({ open: false, user: null })}
      />
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

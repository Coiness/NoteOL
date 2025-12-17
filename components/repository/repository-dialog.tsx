"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Plus, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { repositorySchema, RepositoryFormValues } from "@/lib/validations/repository"
import { Repository } from "@/types"

interface RepositoryDialogProps {
  repository?: Repository
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function RepositoryDialog({
  repository,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: RepositoryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = setControlledOpen ?? setInternalOpen
  const queryClient = useQueryClient()
  const isEdit = !!repository

  const form = useForm<RepositoryFormValues>({
    resolver: zodResolver(repositorySchema),
    defaultValues: {
      name: repository?.name || "",
      description: repository?.description || "",
      color: repository?.color || "#000000",
    },
  })

  useEffect(() => {
    if (repository) {
      form.reset({
        name: repository.name,
        description: repository.description || "",
        color: repository.color || "#000000",
      })
    } else {
      form.reset({
        name: "",
        description: "",
        color: "#000000",
      })
    }
  }, [repository, form])

  const mutation = useMutation({
    mutationFn: async (values: RepositoryFormValues) => {
      console.log('[创建知识库] 开始创建，values:', values, 'isEdit:', isEdit)
      const url = isEdit ? `/api/repositories/${repository.id}` : "/api/repositories"
      const method = isEdit ? "PUT" : "POST"

      console.log('[创建知识库] 调用 API:', method, url)
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      console.log('[创建知识库] API 响应:', res.status, res.ok)

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "操作失败")
      }

      return res.json()
    },
    onSuccess: () => {
      console.log('[创建知识库] 创建成功，刷新查询缓存')
      queryClient.invalidateQueries({ queryKey: ["repositories"] })
      toast.success(isEdit ? "知识库已更新" : "知识库已创建")
      setOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: RepositoryFormValues) => {
    console.log('[知识库创建] onSubmit 被调用，values:', values, '时间戳:', Date.now())
    const result = mutation.mutate(values)
    console.log('[知识库创建] mutation.mutate() 返回结果:', result)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={isEdit ? "ghost" : "default"} size={isEdit ? "icon" : "default"}>
            {isEdit ? <Settings className="h-4 w-4" /> : <><Plus className="mr-2 h-4 w-4" /> 新建知识库</>}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑知识库" : "新建知识库"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改知识库的基本信息" : "创建一个新的知识库来分类您的笔记"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：工作、学习..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea placeholder="可选的描述信息" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>颜色标记</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input type="color" className="w-12 h-8 p-1" {...field} />
                      <span className="text-sm text-muted-foreground">{field.value}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "保存更改" : "立即创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

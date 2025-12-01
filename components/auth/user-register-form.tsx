/**
 * 用户注册表单组件
 */

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { userRegisterSchema } from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface UserRegisterFormProps extends React.HTMLAttributes<HTMLDivElement> {}

type FormData = z.infer<typeof userRegisterSchema>

export function UserRegisterForm({ className, ...props }: UserRegisterFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(userRegisterSchema),
  })
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isSendingCode, setIsSendingCode] = React.useState<boolean>(false)
  const [countdown, setCountdown] = React.useState<number>(0)

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  async function onSendCode() {
    const email = getValues("email")
    if (!email) {
      return toast.error("请先输入邮箱地址")
    }
    
    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return toast.error("请输入有效的邮箱地址")
    }

    setIsSendingCode(true)
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "发送失败")
      }

      toast.success("验证码已发送，请查收邮件")
      setCountdown(60)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSendingCode(false)
    }
  }

  async function onSubmit(data: FormData) {
    setIsLoading(true)

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email.toLowerCase(),
        code: data.code,
        password: data.password,
        confirmPassword: data.confirmPassword,
      }),
    })

    setIsLoading(false)

    if (!response?.ok) {
      if (response.status === 409) {
        return toast.error("注册失败", {
          description: "该邮箱已被注册。",
        })
      }
      
      if (response.status === 422) {
        return toast.error("注册失败", {
          description: "请检查您的输入数据。",
        })
      }

      if (response.status === 400) {
         const data = await response.json()
         return toast.error("注册失败", {
           description: data.error,
         })
      }

      return toast.error("注册失败", {
        description: "发生未知错误，请稍后重试。",
      })
    }

    toast.success("注册成功", {
      description: "请使用您的账号登录。",
    })
    router.push("/login")
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="name">
              Name
            </Label>
            <Input
              id="name"
              placeholder="用户名"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={isLoading}
              {...register("name")}
            />
            {errors?.name && (
              <p className="px-1 text-xs text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <div className="flex gap-2">
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading || countdown > 0}
                {...register("email")}
              />
              <Button 
                type="button" 
                variant="outline" 
                disabled={isLoading || isSendingCode || countdown > 0}
                onClick={onSendCode}
                className="w-[120px]"
              >
                {isSendingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : (
                  "获取验证码"
                )}
              </Button>
            </div>
            {errors?.email && (
              <p className="px-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="code">
              Verification Code
            </Label>
            <Input
              id="code"
              placeholder="6位验证码"
              type="text"
              maxLength={6}
              disabled={isLoading}
              {...register("code")}
            />
            {errors?.code && (
              <p className="px-1 text-xs text-red-600">
                {errors.code.message}
              </p>
            )}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              Password
            </Label>
            <Input
              id="password"
              placeholder="密码"
              type="password"
              autoCapitalize="none"
              disabled={isLoading}
              {...register("password")}
            />
            {errors?.password && (
              <p className="px-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="confirmPassword">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              placeholder="确认密码"
              type="password"
              autoCapitalize="none"
              disabled={isLoading}
              {...register("confirmPassword")}
            />
            {errors?.confirmPassword && (
              <p className="px-1 text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button disabled={isLoading}>
            {isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            注册
          </Button>
        </div>
      </form>
    </div>
  )
}

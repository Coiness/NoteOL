import { Metadata } from "next"
import Link from "next/link"
import { UserRegisterForm } from "@/components/auth/user-register-form"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "注册",
  description: "创建一个新账户",
}

export default function RegisterPage() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute left-4 top-4 md:left-8 md:top-8"
        )}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        返回
      </Link>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px] bg-card border border-border shadow-lg rounded-lg p-8">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            创建账户
          </h1>
          <p className="text-sm text-muted-foreground">
            输入您的邮箱创建新账户
          </p>
        </div>
        <UserRegisterForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="hover:text-brand underline underline-offset-4"
          >
            已有账号？去登录
          </Link>
        </p>
      </div>
    </div>
  )
}

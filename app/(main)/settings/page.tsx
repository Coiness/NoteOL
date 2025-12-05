import { Metadata } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatsCards } from "@/components/settings/stats-cards"
import { ProfileForm } from "@/components/settings/profile-form"
import { PasswordForm } from "@/components/settings/password-form"

export const metadata: Metadata = {
  title: "设置",
  description: "管理你的账户设置和查看统计数据",
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      _count: {
        select: {
          notes: true,
          repositories: true,
          tags: true,
        },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  // 计算总字数
  const notes = await prisma.note.findMany({
    where: { userId: session.user.id },
    select: { wordCount: true },
  })

  const totalWordCount = notes.reduce((acc, note) => acc + (note.wordCount || 0), 0)

  const stats = {
    noteCount: user._count.notes,
    repoCount: user._count.repositories,
    tagCount: user._count.tags,
    wordCount: totalWordCount,
  }

  return (
    <div className="h-full overflow-y-auto space-y-6 p-10 pb-16">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">设置</h2>
        <p className="text-muted-foreground">
          管理你的账户设置和查看统计数据。
        </p>
      </div>
      <Separator className="my-6" />
      
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <StatsCards stats={stats} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-1" />
        </aside>
        <div className="flex-1 lg:max-w-3xl">
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">个人资料</TabsTrigger>
              <TabsTrigger value="security">安全设置</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">个人资料</h3>
                  <p className="text-sm text-muted-foreground">
                    更新你的个人信息。
                  </p>
                </div>
                <Separator className="mb-4" />
                <ProfileForm 
                  initialData={{
                    name: user.name || "",
                    email: user.email || "",
                  }} 
                />
              </div>
            </TabsContent>
            <TabsContent value="security" className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium">修改密码</h3>
                  <p className="text-sm text-muted-foreground">
                    为了账户安全，请定期修改密码。
                  </p>
                </div>
                <Separator className="mb-4" />
                <PasswordForm />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

import { authOptions } from "@/lib/auth"
import NextAuth from "next-auth"

// 交给NextAuth处理认证请求
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

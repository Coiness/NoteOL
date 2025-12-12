// 导出所有类型定义
export * from "./api"
export * from "./note"
export * from "./repository"
export * from "./search"
export * from "./user"
export * from "./offline"

// 站点配置类型
export type SiteConfig = {
  name: string
  description: string
  url: string
  ogImage: string
  links: {
    twitter: string
    github: string
  }
}

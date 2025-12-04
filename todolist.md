## 优先级 1：Bug 修复与核心体验
[x] 报错：`legacyBehavior` is deprecated (Next.js Link)
[x] 知识库无法删除
[] 编辑器样式优化 (Tiptap Typography & Theme)

## 优先级 2：核心交互功能
[] 自动保存 (Auto-save)
[] 快捷键支持 (Hotkeys)
[] 个人页面 (Profile Page)

## 优先级 3：搜索与排序增强
[] 知识库搜索功能
[] 知识库按日期排序功能
[] 笔记列表排序 (Note List Sorting)
[] 全局搜索栏和搜索页面

## 优先级 4：性能与优化
[] 预加载优化 (Preloading)

## 错误日志记录
### Error: legacyBehavior is deprecated
Console Error

## Error Message
`legacyBehavior` is deprecated and will be removed in a future release. A codemod is available to upgrade your components:

npx @next/codemod@latest new-link .

Learn more: https://nextjs.org/docs/app/building-your-application/upgrading/codemods#remove-a-tags-from-link-components


    at MainNav (components/layout/main-nav.tsx:25:11)
    at MainLayout (app\(main)\layout.tsx:13:11)

## Code Frame
  23 |       <NavigationMenuList>
  24 |         <NavigationMenuItem>
> 25 |           <Link href="/repositories" legacyBehavior passHref>
     |           ^
  26 |             <NavigationMenuLink
  27 |               className={cn(
  28 |                 navigationMenuTriggerStyle(),

Next.js version: 16.0.3 (Turbopack)

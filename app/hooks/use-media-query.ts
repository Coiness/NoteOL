import { useState, useEffect } from "react"

/**
 * useMediaQuery Hook
 * 
 * 用于监听 CSS 媒体查询的状态变化。
 * 可以用来在 JS 中响应式地处理布局变化，例如检测是否为移动端设备。
 * 
 * @param {string} query - CSS 媒体查询字符串 (例如: "(max-width: 768px)")
 * @returns {boolean} - 当前是否匹配该媒体查询
 * 
 * @example
 * const isMobile = useMediaQuery("(max-width: 768px)")
 * 
 * if (isMobile) {
 *   return <MobileView />
 * }
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    // 初始化状态
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    // 监听变化
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener("change", listener)
    console.log("添加媒体查询监听事件")

    // 清理监听器
    return () => media.removeEventListener("change", listener)
  }, [query])

  return matches
}
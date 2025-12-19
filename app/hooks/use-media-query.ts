import { useState, useEffect } from "react"

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener("change", listener)
    console.log("添加媒体查询监听事件")
    return () => media.removeEventListener("change", listener)
  }, [query])

  return matches
}
import { useEffect, useState } from 'react'

/**
 * useDebounce Hook
 * 
 * 用于处理值的防抖更新。只有当值在指定延迟时间内没有再次变化时，才会更新 debouncedValue。
 * 常用于搜索框输入、窗口大小调整等高频触发的场景，以减少副作用执行次数（如 API 请求）。
 * 
 * @template T - 值的类型
 * @param {T} value - 需要防抖的原始值
 * @param {number} [delay=500] - 延迟时间（毫秒），默认为 500ms
 * @returns {T} - 防抖后的值
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearchTerm = useDebounce(searchTerm, 500)
 * 
 * useEffect(() => {
 *   // 只有当用户停止输入 500ms 后才会执行搜索
 *   if (debouncedSearchTerm) {
 *     search(debouncedSearchTerm)
 *   }
 * }, [debouncedSearchTerm])
 */
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // 设置定时器，在 delay 毫秒后更新值
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500)

    // 清理函数：如果 value 在 delay 结束前再次变化，清除上一个定时器
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
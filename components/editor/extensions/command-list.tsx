/**
 * 命令菜单展示
 */
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { cn } from '@/lib/utils'

export const CommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]

    if (item) {
      props.command(item)
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => {
    const container = document.getElementById('slash-command-list')
    const activeItem = document.getElementById(`slash-command-item-${selectedIndex}`)
    
    if (container && activeItem) {
        activeItem.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
        })
    }
  }, [selectedIndex])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  if (!props.items.length) {
    return null
  }

  return (
    <div id="slash-command-list" className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col gap-1">
        {props.items.map((item: any, index: number) => {
          const Icon = item.icon
          return (
            <button
              id={`slash-command-item-${index}`}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
              )}
              key={index}
              onClick={() => selectItem(index)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
})

CommandList.displayName = 'CommandList'

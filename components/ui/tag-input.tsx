"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { cn, getTagColor } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface Tag {
  id: string
  name: string
}

interface TagInputProps {
  value?: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

export function TagInput({ value = [], onChange, placeholder = "添加标签..." }: TagInputProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  // 获取所有标签用于补全
  const { data: allTags } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch("/api/tags")
      if (!res.ok) throw new Error("Failed to fetch tags")
      const data = await res.json()
      return data.data
    },
  })

  const handleSelect = (tagName: string) => {
    if (value.includes(tagName)) {
      onChange(value.filter((t) => t !== tagName))
    } else {
      onChange([...value, tagName])
    }
    setInputValue("")
    // setOpen(false) // 保持打开状态以便连续选择
  }

  const handleRemove = (tagName: string) => {
    onChange(value.filter((t) => t !== tagName))
  }

  const handleCreate = () => {
    if (inputValue && !value.includes(inputValue)) {
      onChange([...value, inputValue])
      setInputValue("")
      setOpen(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {value.map((tagName) => (
        <Badge key={tagName} variant={getTagColor(tagName)} className="gap-1 pr-1">
          {tagName}
          <button
            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRemove(tagName)
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={() => handleRemove(tagName)}
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </Badge>
      ))}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            size="sm"
            className="h-8 border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput 
                placeholder="搜索或创建标签..." 
                value={inputValue}
                onValueChange={setInputValue}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue) {
                        handleCreate()
                    }
                }}
            />
            <CommandList>
              <CommandEmpty>
                {inputValue ? (
                    <div 
                        className="py-2 px-4 text-sm cursor-pointer hover:bg-accent"
                        onClick={handleCreate}
                    >
                        创建 &quot;{inputValue}&quot;
                    </div>
                ) : "无匹配标签"}
              </CommandEmpty>
              <CommandGroup heading="现有标签">
                {allTags?.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleSelect(tag.name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(tag.name) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

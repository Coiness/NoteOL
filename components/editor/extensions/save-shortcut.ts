import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { toast } from 'sonner'

export const SaveShortcut = Extension.create({
  name: 'saveShortcut',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('saveShortcut'),
        props: {
          handleKeyDown: (view, event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
              event.preventDefault()
              // 触发保存反馈
              toast.success("已保存", {
                description: "您的更改已自动保存到本地数据库",
                duration: 2000,
              })
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})

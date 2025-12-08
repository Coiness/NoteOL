import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

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
              // 这里可以触发一个自定义事件，或者调用传入的回调
              // 目前我们只是阻止默认行为（浏览器保存网页）
              // 因为我们有自动保存，所以不需要手动保存
              // 也可以在这里显示一个 toast 提示 "已自动保存"
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})

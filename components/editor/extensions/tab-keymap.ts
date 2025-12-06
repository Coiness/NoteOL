import { Extension } from '@tiptap/react'

export const TabKeymap = Extension.create({
  name: 'tabKeymap',
  addKeyboardShortcuts() {
    return {
      'Tab': () => {
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          return this.editor.commands.sinkListItem('listItem')
        }
        this.editor.commands.insertContent('  ')
        return true
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          return this.editor.commands.liftListItem('listItem')
        }
        return false
      }
    }
  }
})

import { getRenderedAttributes } from '@tiptap/core';
import { TaskItem } from '@tiptap/extension-task-item';

export const CustomTaskItem = TaskItem.extend({
  renderHTML({ node, HTMLAttributes }) {
    const checked = node.attrs.checked as boolean;
    const svgContent = checked
      ? [
          [
            'svg',
            {
              xmlns: 'http://www.w3.org/2000/svg',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '3',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              class: 'h-4 w-4',
            },
            ['polyline', { points: '20 6 9 17 4 12' }],
          ],
        ]
      : [];
    return [
      'li',
      { ...HTMLAttributes, 'data-type': 'taskItem' },
      [
        'label',
        ['span', { class: 'task-checkbox', 'data-checked': checked ? 'true' : undefined }, ...svgContent],
      ],
      ['div', { class: 'task-content' }, 0],
    ];
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement('li');
      listItem.dataset.type = 'taskItem';

      const checkboxWrapper = document.createElement('label');
      checkboxWrapper.contentEditable = 'false';

      const checkboxSpan = document.createElement('span');
      checkboxSpan.className = 'task-checkbox';

      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '3');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.classList.add('h-4', 'w-4');
      const polyline = document.createElementNS(ns, 'polyline');
      polyline.setAttribute('points', '20 6 9 17 4 12');
      svg.appendChild(polyline);
      checkboxSpan.appendChild(svg);

      const content = document.createElement('div');
      content.className = 'task-content';

      const updateCheckbox = (checked: boolean) => {
        if (checked) {
          checkboxSpan.setAttribute('data-checked', 'true');
        } else {
          checkboxSpan.removeAttribute('data-checked');
        }
      };

      updateCheckbox(node.attrs.checked as boolean);

      checkboxWrapper.addEventListener('mousedown', (event) => event.preventDefault());
      checkboxWrapper.addEventListener('click', (event) => {
        event.preventDefault();
        if (!editor.isEditable && !this.options.onReadOnlyChecked) {
          return;
        }

        const currentChecked = listItem.dataset.checked === 'true';
        const newChecked = !currentChecked;

        if (editor.isEditable && typeof getPos === 'function') {
          const position = getPos();
          if (typeof position !== 'number') return;
          editor
            .chain()
            .focus(undefined, { scrollIntoView: false })
            .command(({ tr }) => {
              const currentNode = tr.doc.nodeAt(position);
              tr.setNodeMarkup(position, undefined, {
                ...currentNode?.attrs,
                checked: newChecked,
              });
              return true;
            })
            .run();
        }
        if (!editor.isEditable && this.options.onReadOnlyChecked) {
          if (!this.options.onReadOnlyChecked(node, newChecked)) {
            updateCheckbox(currentChecked);
          }
        }
      });

      Object.entries(this.options.HTMLAttributes).forEach(([key, value]) => {
        listItem.setAttribute(key, value);
      });

      listItem.dataset.checked = String(node.attrs.checked);
      checkboxWrapper.append(checkboxSpan);
      listItem.append(checkboxWrapper, content);

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        listItem.setAttribute(key, value);
      });

      let prevRenderedAttributeKeys = new Set(Object.keys(HTMLAttributes));

      return {
        dom: listItem,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false;
          }

          listItem.dataset.checked = String(updatedNode.attrs.checked);
          updateCheckbox(updatedNode.attrs.checked as boolean);

          const extensionAttributes = editor.extensionManager.attributes;
          const newHTMLAttributes = getRenderedAttributes(updatedNode, extensionAttributes);
          const newKeys = new Set(Object.keys(newHTMLAttributes));
          const staticAttrs = this.options.HTMLAttributes;

          prevRenderedAttributeKeys.forEach((key) => {
            if (!newKeys.has(key)) {
              if (key in staticAttrs) {
                listItem.setAttribute(key, staticAttrs[key]);
              } else {
                listItem.removeAttribute(key);
              }
            }
          });

          Object.entries(newHTMLAttributes).forEach(([key, value]) => {
            if (value === null || value === undefined) {
              if (key in staticAttrs) {
                listItem.setAttribute(key, staticAttrs[key]);
              } else {
                listItem.removeAttribute(key);
              }
            } else {
              listItem.setAttribute(key, value);
            }
          });

          prevRenderedAttributeKeys = newKeys;
          return true;
        },
      };
    };
  },
});

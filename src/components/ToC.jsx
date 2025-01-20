import React from 'react';
import { TextSelection } from '@tiptap/pm/state';

const ToCItem = ({ item, onItemClick }) => {
  return (
    <div 
      className={`toc-item ${item.isActive ? 'is-active' : ''}`}
      style={{
        paddingLeft: `${item.level * 16}px`,
      }}
    >
      <a 
        href={`#${item.id}`} 
        className="toc-link"
        onClick={e => onItemClick(e, item.id)} 
        data-item-index={item.itemIndex}
      >
        {item.textContent}
      </a>
    </div>
  );
};

const ToCEmptyState = () => {
  return (
    <div className="toc-empty-state">
      <p>Start editing your document to see the outline.</p>
    </div>
  );
};

export const ToC = ({
  items = [],
  editor,
}) => {
  if (!items.length) {
    return <ToCEmptyState />;
  }

  const onItemClick = (e, id) => {
    e.preventDefault();

    if (editor) {
      const element = editor.view.dom.querySelector(`[data-toc-id="${id}"]`);
      
      if (element) {
        const pos = editor.view.posAtDOM(element, 0);

        // Set selection
        const tr = editor.view.state.tr;
        tr.setSelection(TextSelection.create(tr.doc, pos));
        editor.view.dispatch(tr);

        // Scroll the element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Update URL hash
        if (history.pushState) {
          history.pushState(null, null, `#${id}`);
        }

        // Get the editor content container
        const editorContent = editor.view.dom.closest('.editor-content');
        if (editorContent) {
          // Calculate scroll position
          const elementRect = element.getBoundingClientRect();
          const containerRect = editorContent.getBoundingClientRect();
          const scrollTop = elementRect.top - containerRect.top + editorContent.scrollTop;

          // Scroll with offset
          editorContent.scrollTo({
            top: Math.max(0, scrollTop - 20),
            behavior: 'smooth'
          });
        }
      }
    }
  };

  return (
    <>
      {items.map((item, i) => (
        <ToCItem 
          key={item.id || i} 
          item={item} 
          onItemClick={onItemClick}
        />
      ))}
    </>
  );
};

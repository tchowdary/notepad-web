import React, { useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { Box } from '@mui/material';

const BlockNoteEditor = forwardRef(({ content, onChange, darkMode, cursorPosition, onCursorChange, onFocusModeChange }, ref) => {
  // Creates a new editor instance with initial content if provided
  const editor = useCreateBlockNote({
    initialContent: content ? JSON.parse(content) : undefined,
  });

  // Handle content changes
  useEffect(() => {
    if (editor) {
      const handleUpdate = () => {
        // Get the editor's content as a JSON string
        const blocks = editor.topLevelBlocks;
        onChange(JSON.stringify(blocks));
      };

      // Subscribe to changes
      editor.onEditorContentChange(handleUpdate);
    }
  }, [editor, onChange]);

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    getMarkdown: () => {
      // This is a placeholder - BlockNote doesn't have a direct markdown export
      // You would need to implement a conversion function if needed
      return "Markdown export not implemented for BlockNote";
    },
    getText: () => {
      // Get plain text from the editor
      if (editor) {
        return editor.topLevelBlocks
          .map(block => {
            // This is a simple implementation - you might need to enhance this
            // based on your specific needs and block types
            return block.content?.map(item => item.text).join('') || '';
          })
          .join('\n');
      }
      return '';
    },
    clearContent: () => {
      if (editor) {
        editor.replaceBlocks(editor.topLevelBlocks, []);
      }
    }
  }), [editor]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      overflow: 'auto',
      bgcolor: darkMode ? '#1e1e1e' : '#FFFCF0',
    }}>
      <BlockNoteView 
        editor={editor} 
        theme={darkMode ? 'dark' : 'light'}
      />
    </Box>
  );
});

export default BlockNoteEditor;

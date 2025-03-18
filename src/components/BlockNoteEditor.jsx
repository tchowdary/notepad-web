import React, { useEffect, forwardRef, useImperativeHandle, useState } from 'react';
// Remove the import for Rubik font as we'll use the one from the project
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { Box } from '@mui/material';
import './BlockNoteEditor.css';

const BlockNoteEditor = forwardRef(({ content, onChange, darkMode, cursorPosition, onCursorChange, onFocusModeChange }, ref) => {
  // Creates a new editor instance with initial content if provided
  const editor = useCreateBlockNote({
    initialContent: content ? JSON.parse(content) : undefined,
    theme: {
      colors: {
        editor: {
          background: darkMode ? '#1e1e1e' : '#FFFCF0',
          text: darkMode ? '#e6edf3' : '#24292f',
        },
        menu: {
          background: darkMode ? '#2d2d2d' : '#f5f5f5',
          text: darkMode ? '#e6edf3' : '#24292f',
        }
      },
      borderRadius: 4,
      fontFamily: "Rubik, sans-serif"
    }
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
      <Box 
        sx={{ 
          maxWidth: '1000px', 
          margin: '0 auto', 
          width: '100%',
          height: '100%',
          padding: '0 20px',
        }}
        className={darkMode ? 'dark-mode' : ''}
      >
        <BlockNoteView 
          editor={editor} 
          theme={darkMode ? "dark" : "light"}
          className={`blocknote-editor ${darkMode ? 'dark-mode' : ''}`}
        />
      </Box>
    </Box>
  );
});

export default BlockNoteEditor;

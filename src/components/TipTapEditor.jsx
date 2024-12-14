import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Box, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import {
  FormatQuote,
  Code,
  HorizontalRule as HorizontalRuleIcon,
  FormatColorText,
  TableChart,
} from '@mui/icons-material';
import { marked } from 'marked';

const TipTapEditor = ({ content, onChange, darkMode }) => {
  const [contextMenu, setContextMenu] = React.useState(null);
  const editorRef = React.useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      HorizontalRule,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (text) {
          try {
            const html = marked.parse(text);
            editor.commands.setContent(html);
            return true;
          } catch (e) {
            console.error('Error parsing markdown:', e);
          }
        }
        return false;
      },
      attributes: {
        class: 'focus-visible:outline-none',
      },
    },
    autofocus: true,
  });

  // Focus editor when mounted or when tab becomes active
  useEffect(() => {
    if (editor) {
      const focusEditor = () => {
        editor.commands.focus('end');
      };
      focusEditor();
      // Also focus when the window regains focus
      window.addEventListener('focus', focusEditor);
      return () => window.removeEventListener('focus', focusEditor);
    }
  }, [editor]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      try {
        const html = marked.parse(content);
        if (html !== content) {
          editor.commands.setContent(html);
        } else {
          editor.commands.setContent(content);
        }
      } catch (e) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  const handleContextMenu = (event) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      isInTable: editor?.isActive('table'),
    });
  };

  const handleClose = () => {
    setContextMenu(null);
  };

  const formatOptions = [
    {
      title: 'H2',
      icon: <Typography variant="button" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>H2</Typography>,
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: 'H3',
      icon: <Typography variant="button" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>H3</Typography>,
      action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: 'H4',
      icon: <Typography variant="button" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>H4</Typography>,
      action: () => editor?.chain().focus().toggleHeading({ level: 4 }).run(),
    },
    {
      title: 'Code Block',
      icon: <Code />,
      action: () => editor?.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: 'Block Quote',
      icon: <FormatQuote />,
      action: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      title: 'Horizontal Rule',
      icon: <HorizontalRuleIcon />,
      action: () => editor?.chain().focus().setHorizontalRule().run(),
    },
    {
      title: 'Yellow Highlight',
      icon: <FormatColorText />,
      action: () => editor?.chain().focus().setColor('#ffd700').run(),
    },
    {
      title: 'Insert Table',
      icon: <TableChart />,
      action: () => {
        editor?.chain().focus()
          .insertTable({
            rows: 3,
            cols: 3,
            withHeaderRow: true
          })
          .run();
        handleClose();
      },
    },
  ];

  const tableOptions = [
    {
      title: 'Add Column Before',
      action: () => {
        editor?.chain().focus().addColumnBefore().run();
        handleClose();
      },
    },
    {
      title: 'Add Column After',
      action: () => {
        editor?.chain().focus().addColumnAfter().run();
        handleClose();
      },
    },
    {
      title: 'Delete Column',
      action: () => {
        editor?.chain().focus().deleteColumn().run();
        handleClose();
      },
    },
    {
      title: 'Add Row Before',
      action: () => {
        editor?.chain().focus().addRowBefore().run();
        handleClose();
      },
    },
    {
      title: 'Add Row After',
      action: () => {
        editor?.chain().focus().addRowAfter().run();
        handleClose();
      },
    },
    {
      title: 'Delete Row',
      action: () => {
        editor?.chain().focus().deleteRow().run();
        handleClose();
      },
    },
    {
      title: 'Delete Table',
      action: () => {
        editor?.chain().focus().deleteTable().run();
        handleClose();
      },
    },
  ];

  return (
    <Box
      ref={editorRef}
      onContextMenu={handleContextMenu}
      sx={{
        height: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'auto',
        '& .ProseMirror': {
          minHeight: '100%',
          maxWidth: '50em',
          margin: '0 auto',
          padding: '16px',
          outline: 'none',
          backgroundColor: darkMode ? '#1e1e1e' : '#FFFCF0',
          color: darkMode ? '#e6edf3' : '#24292f',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '16px',
          '& p': {
            margin: '0 0 1em 0',
            lineHeight: '1.6',
          },
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            margin: '1em 0 0.5em',
            lineHeight: '1.2',
          },
          '& ul, & ol': {
            paddingLeft: '1.2em',
            margin: '0 0 1em 0',
          },
          '& code': {
            backgroundColor: darkMode ? 'rgba(110, 118, 129, 0.4)' : 'rgba(175, 184, 193, 0.2)',
            padding: '0.2em 0.4em',
            borderRadius: '6px',
            fontSize: '85%',
          },
          '& pre': {
            backgroundColor: darkMode ? '#161b22' : '#f6f8fa',
            padding: '16px',
            borderRadius: '6px',
            overflow: 'auto',
            border: `1px solid ${darkMode ? '#30363d' : '#d0d7de'}`,
            margin: '0 0 1em 0',
            '& code': {
              backgroundColor: 'transparent',
              padding: '0',
            },
          },
          '& blockquote': {
            borderLeft: `4px solid ${darkMode ? '#30363d' : '#dfe2e5'}`,
            margin: '0 0 1em 0',
            padding: '0 1em',
            color: darkMode ? '#8b949e' : '#6a737d',
          },
          '& hr': {
            border: 'none',
            height: '2px',
            backgroundColor: darkMode ? '#30363d' : '#dfe2e5',
            margin: '1.5em 0',
          },
          '& table': {
            borderCollapse: 'collapse',
            margin: '0 0 1em 0',
            overflow: 'hidden',
            width: '100%',
            tableLayout: 'fixed',
          },
          '& table td, & table th': {
            border: `1px solid ${darkMode ? '#30363d' : '#dfe2e5'}`,
            padding: '0.5em',
            backgroundColor: darkMode ? '#161b22' : '#fff',
            wordBreak: 'break-word',
          },
          '& table th': {
            fontWeight: 'bold',
            textAlign: 'left',
            backgroundColor: darkMode ? '#21262d' : '#f6f8fa',
          },
        },
      }}
    >
      <EditorContent editor={editor} />
      
      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: {
            minWidth: 'auto',
            padding: '4px',
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          },
        }}
      >
        {contextMenu?.isInTable ? (
          tableOptions.map((option, index) => (
            <MenuItem
              key={`table-${index}`}
              onClick={option.action}
              sx={{
                fontSize: '14px',
                minHeight: '32px',
              }}
            >
              {option.title}
            </MenuItem>
          ))
        ) : (
          formatOptions.map((option, index) => (
            <MenuItem
              key={`format-${index}`}
              onClick={option.action}
              sx={{
                fontSize: '14px',
                minHeight: '32px',
                display: 'flex',
                gap: 1,
              }}
            >
              {option.icon}
              {option.title}
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
};

export default TipTapEditor;

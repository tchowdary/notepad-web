import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Box, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import {
  FormatQuote,
  Code,
  HorizontalRule as HorizontalRuleIcon,
  FormatColorText,
  TableChart,
  AutoFixHigh,
  AddCircleOutline,
  DeleteOutline,
  DeleteForever,
  TextFields,
  CheckBox,
} from '@mui/icons-material';
import { marked } from 'marked';
import { improveText } from '../utils/textImprovement';

const getTableStyles = (darkMode) => ({
  '& table': {
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    width: '100%',
    margin: '0',
    overflow: 'hidden',
    backgroundColor: darkMode ? '#1e1e1e' : '#FFFCF0',
    borderRadius: '6px',
    border: `1px solid ${darkMode ? '#30363d' : '#e0e0e0'}`,
  },
  '& td, & th': {
    minWidth: '1em',
    border: `1px solid ${darkMode ? '#30363d' : '#e0e0e0'}`,
    padding: '8px 12px',
    verticalAlign: 'top',
    boxSizing: 'border-box',
    position: 'relative',
    backgroundColor: darkMode ? '#1e1e1e' : '#FFFCF0',
  },
  '& th': {
    fontWeight: '600',
    textAlign: 'left',
    backgroundColor: darkMode ? '#252526' : '#FFFCF0',
    borderBottom: `2px solid ${darkMode ? '#30363d' : '#e0e0e0'}`,
    fontSize: '0.95em',
    color: darkMode ? '#e6edf3' : '#24292f',
  },
  '& tr:hover td': {
    backgroundColor: darkMode ? '#1f2428' : '#FFFDF5',
  },
  '& .selectedCell:after': {
    zIndex: '2',
    position: 'absolute',
    content: '""',
    left: '0',
    right: '0',
    top: '0',
    bottom: '0',
    background: 'rgba(200, 200, 255, 0.4)',
    pointerEvents: 'none',
  },
  '& .column-resize-handle': {
    position: 'absolute',
    right: '-2px',
    top: '0',
    bottom: '0',
    width: '4px',
    background: darkMode ? '#30363d' : '#e0e0e0',
    cursor: 'col-resize',
    zIndex: '20',
  },
});

const getEditorStyles = (darkMode) => ({
  '& .ProseMirror': {
    minHeight: '100%',
    outline: 'none',
    '& > * + *': {
      marginTop: '0.75em',
    },
    '& p': {
      margin: 0,
    },
    '& h1': {
      fontSize: '2em',
      fontWeight: '600',
      lineHeight: '1.25',
      margin: '1em 0 0.5em',
    },
    '& h2': {
      fontSize: '1.5em',
      fontWeight: '600',
      lineHeight: '1.25',
      margin: '1em 0 0.5em',
    },
    '& h3': {
      fontSize: '1.25em',
      fontWeight: '600',
      lineHeight: '1.25',
      margin: '1em 0 0.5em',
    },
    '& h4': {
      fontSize: '1em',
      fontWeight: '600',
      lineHeight: '1.25',
      margin: '1em 0 0.5em',
    },
    '& ul, & ol': {
      padding: '0 1rem',
    },
    '& blockquote': {
      borderLeft: `3px solid ${darkMode ? '#30363d' : '#dfe2e5'}`,
      color: darkMode ? '#8b949e' : '#6a737d',
      marginLeft: 0,
      marginRight: 0,
      paddingLeft: '1rem',
    },
    '& code': {
      backgroundColor: darkMode ? '#30363d' : '#f6f8fa',
      color: darkMode ? '#e6edf3' : '#24292f',
      borderRadius: '6px',
      padding: '0.2em 0.4em',
      fontSize: '85%',
      fontFamily: '"Rubik", sans-serif',
    },
    '& pre': {
      backgroundColor: darkMode ? '#30363d' : '#f6f8fa',
      padding: '1em',
      borderRadius: '6px',
      overflow: 'auto',
      '& code': {
        backgroundColor: 'transparent',
        padding: 0,
        fontSize: '90%',
      },
    },
    '& hr': {
      border: 'none',
      height: '2px',
      backgroundColor: darkMode ? '#30363d' : '#dfe2e5',
      margin: '1.5em 0',
    },
    '& ul[data-type="taskList"]': {
      listStyle: 'none',
      padding: 0,
      '& li': {
        display: 'flex',
        gap: '0.5rem',
        '& > label': {
          flex: '0 0 auto',
          marginRight: '0.5rem',
          userSelect: 'none',
        },
        '& > div': {
          flex: '1 1 auto',
        },
        '& input[type="checkbox"]': {
          cursor: 'pointer',
        },
      },
    },
    ...getTableStyles(darkMode),
  },
});

const TipTapEditor = ({ content, onChange, darkMode, cursorPosition, onCursorChange }) => {
  const [contextMenu, setContextMenu] = React.useState(null);
  const [improving, setImproving] = React.useState(false);
  const editorRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const isRestoringCursor = React.useRef(false);

  const handleImproveText = async () => {
    if (improving) return;
    
    const text = editor?.state.selection.empty ? 
      editor?.getHTML() : 
      editor?.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
      );

    if (!text?.trim()) return;

    setImproving(true);
    try {
      const improvedText = await improveText(text);
      if (improvedText) {
        if (!editor?.state.selection.empty) {
          editor?.chain()
            .focus()
            .deleteSelection()
            .insertContent(improvedText)
            .run();
        } else {
          editor?.commands.setContent(improvedText);
          onChange(improvedText);
        }
      }
    } catch (error) {
      console.error('Error improving text:', error);
    } finally {
      setImproving(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
      }),
      HorizontalRule,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    autofocus: false,
  });

  // Store cursor position in editor state
  useEffect(() => {
    if (editor) {
      editor.storage.cursorPosition = cursorPosition;
    }
  }, [editor, cursorPosition]);

  useEffect(() => {
    if (editor && editor.storage.cursorPosition) {
      const pos = editor.storage.cursorPosition;
      
      // Delay to ensure editor is ready
      setTimeout(() => {
        editor.commands.focus();
        
        if (typeof pos === 'number') {
          editor.commands.setTextSelection(pos);
        } else {
          editor.commands.setTextSelection({ from: pos.from, to: pos.to });
        }

        // Get the current selection
        const selection = editor.state.selection;
        const end = typeof pos === 'number' ? pos : pos.from;
        
        // Create a text selection at the target position
        const transaction = editor.state.tr.setSelection(
          editor.state.selection.constructor.near(editor.state.doc.resolve(end))
        );
        
        // Dispatch the transaction and ensure it's visible
        editor.view.dispatch(transaction);
        editor.view.dispatch(editor.state.tr.scrollIntoView());

        // Additional scroll to make sure it's in view
        const editorElement = editor.view.dom.closest('.ProseMirror');
        if (editorElement) {
          const rect = editor.view.coordsAtPos(end);
          const containerRect = editorElement.getBoundingClientRect();
          const scrollTop = rect.top - containerRect.top - (editorElement.clientHeight / 2);
          editorElement.scrollTo({
            top: scrollTop,
            behavior: 'auto'
          });
        }
      }, 100);
    }
  }, [editor]);

  // Track cursor position changes
  useEffect(() => {
    if (editor && onCursorChange) {
      const handleSelectionUpdate = () => {
        if (isRestoringCursor.current) return;
        
        const { from, to } = editor.state.selection;
        const position = from === to ? from : { from, to };
        onCursorChange(position);
      };
      
      editor.on('selectionUpdate', handleSelectionUpdate);
      return () => editor.off('selectionUpdate', handleSelectionUpdate);
    }
  }, [editor, onCursorChange]);

  useEffect(() => {
    if (editor) {
      const focusEditor = () => {
        editor.commands.focus();
      };
      focusEditor();
      return () => {};
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenu && menuRef.current && !menuRef.current.contains(event.target)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      // Also close on escape key
      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          setContextMenu(null);
        }
      };
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [contextMenu]);

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
      title: 'Highlight',
      icon: <FormatColorText />,
      action: () => editor?.chain().focus().setColor('#3AA99F').run(),
    },
    {
      title: 'Insert Table',
      icon: <TableChart />,
      action: () => {
        editor?.chain()
          .focus()
          .insertTable({
            rows: 2,
            cols: 2,
            withHeaderRow: true
          })
          .run();
        handleClose();
      },
    },
    {
      title: 'Improve Text',
      icon: <AutoFixHigh />,
      action: handleImproveText,
    },
    {
      title: 'Task List',
      icon: <CheckBox />,
      action: () => editor?.chain().focus().toggleTaskList().run(),
    },
  ];

  const tableOptions = [
    {
      title: 'Add Column Before',
      icon: <AddCircleOutline sx={{ transform: 'rotate(90deg)' }} />,
      action: () => {
        editor?.chain().focus().addColumnBefore().run();
        handleClose();
      },
    },
    {
      title: 'Add Column After',
      icon: <AddCircleOutline sx={{ transform: 'rotate(-90deg)' }} />,
      action: () => {
        editor?.chain().focus().addColumnAfter().run();
        handleClose();
      },
    },
    {
      title: 'Delete Column',
      icon: <DeleteOutline sx={{ transform: 'rotate(90deg)' }} />,
      action: () => {
        editor?.chain().focus().deleteColumn().run();
        handleClose();
      },
    },
    {
      title: 'Add Row Before',
      icon: <AddCircleOutline />,
      action: () => {
        editor?.chain().focus().addRowBefore().run();
        handleClose();
      },
    },
    {
      title: 'Add Row After',
      icon: <AddCircleOutline sx={{ transform: 'rotate(180deg)' }} />,
      action: () => {
        editor?.chain().focus().addRowAfter().run();
        handleClose();
      },
    },
    {
      title: 'Delete Row',
      icon: <DeleteOutline />,
      action: () => {
        editor?.chain().focus().deleteRow().run();
        handleClose();
      },
    },
    {
      title: 'Delete Table',
      icon: <DeleteForever />,
      action: () => {
        editor?.chain().focus().deleteTable().run();
        handleClose();
      },
    },
    {
      title: 'Add Text Below Table',
      icon: <TextFields />,
      action: () => {
        const { state } = editor;
        const { selection } = state;
        const tablePos = selection.$anchor.pos;
        let table = null;
        let tableEndPos = null;

        state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
          if (node.type.name === 'table' && pos <= tablePos && pos + node.nodeSize >= tablePos) {
            table = node;
            tableEndPos = pos + node.nodeSize;
            return false;
          }
        });

        if (tableEndPos !== null) {
          editor.chain()
            .insertContentAt(tableEndPos, { type: 'paragraph' })
            .focus(tableEndPos)
            .run();
        }
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
      }}
    >
      <Box
        sx={{
          maxWidth: '50em',
          margin: '0 auto',
          padding: '16px',
          outline: 'none',
          backgroundColor: darkMode ? '#1e1e1e' : '#FFFCF0',
          color: darkMode ? '#e6edf3' : '#24292f',
          fontFamily: '"Rubik", sans-serif',
          fontSize: '17px',
          lineHeight: '1.6',
          position: 'relative',
          height: '100%',
          ...getEditorStyles(darkMode),
        }}
      >
        <EditorContent editor={editor} onContextMenu={handleContextMenu} />
        {improving && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '4px',
              zIndex: 1000,
            }}
          >
            Improving text...
          </Box>
        )}
      </Box>
      {contextMenu && (
        <Stack
          ref={menuRef}
          direction="row"
          spacing={1}
          sx={{
            position: 'fixed',
            left: contextMenu.mouseX,
            top: contextMenu.mouseY,
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            borderRadius: 1,
            boxShadow: 3,
            p: 1,
            zIndex: 1000,
          }}
        >
          {contextMenu.isInTable ? (
            tableOptions.map((option, index) => (
              <Tooltip key={index} title={option.title}>
                <IconButton
                  size="small"
                  onClick={option.action}
                  sx={{
                    color: darkMode ? '#e6edf3' : '#24292f',
                  }}
                >
                  {option.icon}
                </IconButton>
              </Tooltip>
            ))
          ) : (
            formatOptions.map((option, index) => (
              <Tooltip key={index} title={option.title}>
                <IconButton
                  size="small"
                  onClick={option.action}
                  sx={{
                    color: darkMode ? '#e6edf3' : '#24292f',
                    '& .MuiSvgIcon-root': {
                      fontSize: '1.2rem',
                    },
                    ...(option.title.startsWith('H') && {
                      padding: '4px 8px',
                      minWidth: '32px',
                    }),
                  }}
                >
                  {option.icon}
                </IconButton>
              </Tooltip>
            ))
          )}
        </Stack>
      )}
    </Box>
  );
};

export default TipTapEditor;

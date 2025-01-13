import React, { useEffect, forwardRef, useImperativeHandle, useState, useRef, useCallback } from 'react';
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
import Image from '@tiptap/extension-image';
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
  ContentCopy,
  Mic as MicIcon,
} from '@mui/icons-material';
import { marked } from 'marked';
import { improveText } from '../utils/textImprovement';
import { compressImage } from '../utils/imageUtils';
import RecordRTC from 'recordrtc';
import RecordingDialog from './RecordingDialog';

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
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      margin: '1em 0',
      borderRadius: '4px',
    },
    ...getTableStyles(darkMode),
  },
});

const TipTapEditor = forwardRef(({ content, onChange, darkMode, cursorPosition, onCursorChange }, ref) => {
  const [contextMenu, setContextMenu] = React.useState(null);
  const [improving, setImproving] = React.useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [recorder, setRecorder] = useState(null);
  const [recordingStream, setRecordingStream] = useState(null);
  const [recordingError, setRecordingError] = useState(null);
  const editorRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const isRestoringCursor = React.useRef(false);
  const isEditorReady = React.useRef(false);
  const lastKnownPosition = React.useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: true,
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
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    autofocus: false,
    onCreate: ({ editor }) => {
      isEditorReady.current = true;
    },
    editorProps: {
      handlePaste: async (view, event) => {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files[0]) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = async (e) => {
              const base64Image = e.target.result;
              // Compress image before storing
              const compressedImage = await compressImage(base64Image);
              editor.commands.setImage({ src: compressedImage });
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        if (event.clipboardData) {
          // Try to get HTML content first
          const html = event.clipboardData.getData('text/html');
          if (html) {
            editor.commands.insertContent(html);
            return true;
          }
          // If no HTML, try plain text and convert from markdown
          const text = event.clipboardData.getData('text/plain');
          if (text) {
            const html = marked.parse(text);
            editor.commands.insertContent(html);
            return true;
          }
        }
        return false;
      },
      handleCopy: (view, event) => {
        const { state, dispatch } = view;
        const { empty, content } = state.selection;
        if (!empty) {
          // Get HTML and plain text versions
          const html = content().content.toHTML();
          const text = content().content.textBetween(0, content().content.size, '\n');
          // Set clipboard data
          event.clipboardData.setData('text/html', html);
          event.clipboardData.setData('text/plain', text);
          event.preventDefault();
        }
      },
      handleCut: (view, event) => {
        const { state, dispatch } = view;
        const { empty, content } = state.selection;
        if (!empty) {
          // Get HTML and plain text versions
          const html = content().content.toHTML();
          const text = content().content.textBetween(0, content().content.size, '\n');
          // Set clipboard data
          event.clipboardData.setData('text/html', html);
          event.clipboardData.setData('text/plain', text);
          // Remove selected content
          dispatch(state.tr.deleteSelection());
          event.preventDefault();
        }
      }
    }
  });

  // Only restore cursor position when switching between tabs
  useEffect(() => {
    if (editor && isEditorReady.current && cursorPosition && cursorPosition !== lastKnownPosition.current) {
      const pos = cursorPosition;
      lastKnownPosition.current = pos;
      try {
        isRestoringCursor.current = true;
        const docLength = editor.state.doc.content.size;
        // Ensure position is within valid range
        let targetPos;
        if (typeof pos === 'number') {
          targetPos = Math.min(Math.max(0, pos), docLength);
        } else {
          targetPos = {
            from: Math.min(Math.max(0, pos.from), docLength),
            to: Math.min(Math.max(0, pos.to), docLength)
          };
        }

        // Set selection
        if (typeof targetPos === 'number') {
          editor.commands.setTextSelection(targetPos);
        } else {
          editor.commands.setTextSelection(targetPos);
        }

        // Get the current selection end position
        const end = typeof targetPos === 'number' ? targetPos : targetPos.from;
        // Only scroll if the position is valid
        if (end <= docLength) {
          const resolvedPos = editor.state.doc.resolve(end);
          editor.view.dispatch(editor.state.tr.setSelection(
            editor.state.selection.constructor.near(resolvedPos)
          ));
          // Scroll into view without animation
          const editorElement = editor.view.dom.closest('.ProseMirror');
          if (editorElement) {
            const rect = editor.view.coordsAtPos(end);
            if (rect) {
              const containerRect = editorElement.getBoundingClientRect();
              const scrollTop = rect.top - containerRect.top - (editorElement.clientHeight / 2);
              requestAnimationFrame(() => {
                editorElement.scrollTop = scrollTop;
              });
            }
          }
        }
      } catch (error) {
        console.warn('Error restoring cursor position:', error);
      } finally {
        isRestoringCursor.current = false;
      }
    }
  }, [editor, cursorPosition]);

  // Track cursor position changes
  useEffect(() => {
    if (editor && onCursorChange && isEditorReady.current) {
      const handleSelectionUpdate = () => {
        if (isRestoringCursor.current) return;
        const { from, to } = editor.state.selection;
        const position = from === to ? from : { from, to };
        lastKnownPosition.current = position;
        onCursorChange(position);
      };
      editor.on('selectionUpdate', handleSelectionUpdate);
      return () => editor.off('selectionUpdate', handleSelectionUpdate);
    }
  }, [editor, onCursorChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isEditorReady.current = false;
      lastKnownPosition.current = null;
    };
  }, []);

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

  const handleCopyPlainText = () => {
    if (!editor) return;
    const selection = editor.state.selection;
    if (!selection.empty) {
      const text = editor.state.doc.textBetween(selection.from, selection.to, '\n');
      navigator.clipboard.writeText(text);
    }
    handleClose();
  };

  const handleStartRecording = async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      
      const newRecorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
      });

      newRecorder.startRecording();
      setRecorder(newRecorder);
      setIsRecording(true);
      setContextMenu(null);
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingError(error.message || 'Error accessing microphone');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (recorder) {
        return new Promise((resolve) => {
          recorder.stopRecording(async () => {
            try {
              const blob = await recorder.getBlob();
              await transcribeAudio(blob);
            } catch (err) {
              console.error('Transcription error:', err);
              setRecordingError(err.message || 'Error transcribing audio');
            } finally {
              cleanup();
              resolve();
            }
          });
        });
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setRecordingError(error.message || 'Error stopping recording');
      cleanup();
    }
  };

  const cleanup = () => {
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      setRecordingStream(null);
    }
    if (recorder) {
      try {
        recorder.destroy();
      } catch (err) {
        console.error('Error destroying recorder:', err);
      }
      setRecorder(null);
    }
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
      setElapsedTime(0);
    }
    setIsRecording(false);
    setIsProcessing(false);
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');

      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        throw new Error('OpenAI API key not found. Please set your API key in settings.');
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Transcription failed');
      }

      const data = await response.json();
      if (editor) {
        // Get the current selection position
        const { from } = editor.state.selection;
        
        // If we're at the start of a line, don't add an extra newline
        const needsNewline = from > 0 && editor.state.doc.textBetween(from - 1, from) !== '\n';
        
        // Insert the transcribed text at the current position
        editor
          .chain()
          .focus()
          .insertContent((needsNewline ? '\n' : '') + data.text)
          .run();
      }
    } catch (err) {
      console.error('Transcription error:', err);
      throw new Error('Failed to transcribe audio: ' + err.message);
    }
  };

  // Cleanup recording resources on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  const formatOptions = [
    {
      title: 'Copy as Plain Text',
      icon: <ContentCopy />,
      action: handleCopyPlainText,
    },
    {
      title: 'Voice to Text',
      icon: <MicIcon />,
      action: handleStartRecording,
    },
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

  // Expose editor instance through ref
  useImperativeHandle(ref, () => ({
    editor,
    clearContent: () => {
      editor?.chain().focus().clearContent().run();
    },
    getText: () => {
      return editor?.getText() || '';
    }
  }), [editor]);

  return (
    <Box 
      ref={editorRef}
      onContextMenu={handleContextMenu}
      sx={{
        position: 'relative',
        height: '100%',
        backgroundColor: darkMode ? '#1e1e1e' : '#FFFCF0',
        ...getTableStyles(darkMode),
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
          lineHeight: '1.8',
          position: 'relative',
          minHeight: '100%',
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
      <RecordingDialog
        open={isRecording || isProcessing}
        onClose={handleStopRecording}
        elapsedTime={elapsedTime}
        isProcessing={isProcessing}
        error={recordingError}
      />
    </Box>
  );
});

export default TipTapEditor;

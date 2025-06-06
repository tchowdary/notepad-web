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
import { Image as TiptapImage } from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import { getHierarchicalIndexes, TableOfContents } from '@tiptap-pro/extension-table-of-contents';
import Placeholder from '@tiptap/extension-placeholder'
import Details from '@tiptap-pro/extension-details'
import DetailsContent from '@tiptap-pro/extension-details-content'
import DetailsSummary from '@tiptap-pro/extension-details-summary'
import Emoji, { gitHubEmojis } from '@tiptap-pro/extension-emoji'
import { Mathematics } from '@tiptap-pro/extension-mathematics'
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { FormatBold, FormatItalic, FormatUnderlined, Code, FormatQuote, FormatListBulleted, FormatListNumbered, TableChart, DeleteOutline, ContentCopy, Mic as MicIcon, List as ListIcon, ChevronLeft, Remove, AutoFixHigh, TextFields, CheckBox, AddCircleOutline, DeleteForever, Expand, FormatPaint, } from '@mui/icons-material';
import { Box, IconButton, Menu, MenuItem, Stack, Tooltip, Typography, ListItemIcon, ListItemText, ToggleButton } from '@mui/material';
import { marked } from 'marked';
import { improveText } from '../utils/textImprovement';
import { compressImage } from '../utils/imageUtils';
import RecordRTC from 'recordrtc';
import RecordingDialog from './RecordingDialog';
import { ToC } from './ToC';
import './toc.css';
import './TipTapEditor.css';
import { sendAnthropicMessage } from '../services/aiService';
import { createLowlight } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import TurndownService from 'turndown';
import { DOMSerializer } from 'prosemirror-model';
import fileService from '../services/fileService';
import DropboxConfig from './DropboxConfig';
import BacklinkPalette from './BacklinkPalette';
import DbSyncService from '../services/dbSyncService';
import { base64Utils } from '../utils/converters';

// Create a new lowlight instance
const lowlight = createLowlight();

// Register languages
lowlight.register('javascript', javascript);
lowlight.register('js', javascript);
lowlight.register('typescript', typescript);
lowlight.register('ts', typescript);
lowlight.register('css', css);
lowlight.register('html', xml);
lowlight.register('xml', xml);
lowlight.register('json', json);
lowlight.register('bash', bash);
lowlight.register('shell', bash);
lowlight.register('markdown', markdown);
lowlight.register('md', markdown);
lowlight.register('yaml', yaml);

const codeBlockStyles = {
  'pre': {
    'background': darkMode => darkMode ? '#1f1a24' : '#f8f9fa',
    'color': darkMode => darkMode ? '#d4d4d4' : '#24292e',
    'fontFamily': '"JetBrains Mono", "Consolas", "Monaco", "Andale Mono", monospace',
    'padding': '0.75rem 1rem',
    'margin': '0.5rem 0',
    'borderRadius': '6px',
    'overflow': 'auto',
    'fontSize': '0.9em',
    'lineHeight': '1.5',
    'border': darkMode => darkMode ? '1px solid #2d2d2d' : '1px solid #e1e4e8',
    'position': 'relative',
    '&:hover .copy-button': {
      opacity: 1,
    }
  },
  'code': {
    'backgroundColor': 'transparent',
    'padding': '0',
    'margin': '0',
  },
  '.copy-button': {
    position: 'absolute',
    top: '8px',
    right: '8px',
    opacity: 0,
    transition: 'opacity 0.2s',
    backgroundColor: darkMode => darkMode ? '#2d2d2d' : '#f0f0f0',
    border: darkMode => darkMode ? '1px solid #404040' : '1px solid #d0d0d0',
    borderRadius: '4px',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      backgroundColor: darkMode => darkMode ? '#404040' : '#e0e0e0',
    }
  },
  // VSCode-like syntax highlighting
  '.hljs-comment,.hljs-quote': { color: '#6a737d' },
  '.hljs-variable,.hljs-template-variable,.hljs-tag,.hljs-name,.hljs-selector-id,.hljs-selector-class,.hljs-regexp,.hljs-deletion': { 
    color: darkMode => darkMode ? '#e06c75' : '#d73a49'
  },
  '.hljs-number,.hljs-built_in,.hljs-literal,.hljs-type,.hljs-params,.hljs-meta,.hljs-link': { 
    color: darkMode => darkMode ? '#d19a66' : '#005cc5'
  },
  '.hljs-attribute': { 
    color: darkMode => darkMode ? '#98c379' : '#22863a'
  },
  '.hljs-string,.hljs-symbol,.hljs-bullet,.hljs-addition': { 
    color: darkMode => darkMode ? '#98c379' : '#032f62'
  },
  '.hljs-title,.hljs-section': { 
    color: darkMode => darkMode ? '#61aeee' : '#005cc5'
  },
  '.hljs-keyword,.hljs-selector-tag': { 
    color: darkMode => darkMode ? '#c678dd' : '#d73a49'
  }
};

const getTableStyles = (darkMode) => ({
  '& table': {
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    width: '100%',
    margin: '0',
    overflow: 'hidden',
    backgroundColor: darkMode ? '#1f1a24' : '#FFFCF0',
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
    backgroundColor: darkMode ? '#1f1a24' : '#FFFCF0',
  },
  '& th': {
    fontWeight: '600',
    textAlign: 'left',
    backgroundColor: darkMode ? '#1f1a24' : '#FFFCF0',
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
    '& pre': {
      backgroundColor: darkMode ? '#1f1a24' : '#f6f8fa',
      borderRadius: '6px',
      color: darkMode ? '#e6edf3' : '#24292f',
      fontFamily: 'JetBrains Mono',
      padding: '0.75rem 1rem',
      margin: '0.5rem 0',
    },
    '& code': {
      backgroundColor: 'transparent',
      color: 'inherit',
      fontFamily: 'JetBrains Mono',
      fontSize: '0.9em',
      padding: 0,
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
    '& .table-of-contents': {
      background: darkMode ? '#1f1a24' : '#f6f8fa',
      padding: '1rem',
      margin: '1rem 0',
      borderRadius: '4px',
      border: `1px solid ${darkMode ? '#30363d' : '#e0e0e0'}`,
      '& ul': {
        listStyle: 'none',
        padding: 0,
        margin: 0,
      },
      '& li': {
        margin: '0.5rem 0',
        '& a': {
          color: darkMode ? '#58a6ff' : '#0969da',
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
          },
        },
      },
    },
    ...Object.entries(codeBlockStyles).reduce((acc, [selector, styles]) => {
      acc[`& ${selector}`] = typeof styles === 'function' ? styles(darkMode) : styles;
      return acc;
    }, {}),
  },
});

// Custom extension to handle backlinking
const Backlink = Extension.create({
  name: 'backlink',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('backlink'),
        props: {
          handleKeyDown: (view, event) => {
            // Check if the last two characters are "[["
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;
            
            const currentLineText = $from.doc.textBetween(
              $from.start(),
              $from.pos,
              "\n",
              "\n"
            );
            
            // If the user types [[ and the previous character isn't already [
            if (event.key === '[' && 
                currentLineText.length > 0 && 
                currentLineText.slice(-1) === '[') {
              
              // Get the position for the popup
              const coords = view.coordsAtPos($from.pos);
              
              // Dispatch a custom event to show the backlink palette
              window.dispatchEvent(new CustomEvent('show-backlink-palette', { 
                detail: { 
                  position: { 
                    top: coords.top + 20, 
                    left: coords.left 
                  } 
                } 
              }));
            }
            
            return false;
          }
        }
      })
    ];
  }
});

const CustomImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        renderHTML: attributes => ({
          src: attributes.src,
          style: 'cursor: pointer', // Make image clickable
          title: 'Double-click to open image in new tab', // Add tooltip
        }),
      },
    }
  },
});

const TipTapEditor = forwardRef(({ 
  tabId, 
  content, 
  onChange, 
  darkMode, 
  initialScrollTop, 
  onCursorChange, 
  onFocusModeChange, 
  onScrollUpdate, // Add scroll update callback prop
  cursorPosition // Add cursorPosition prop
 }, ref) => {
  const editorContainerRef = useRef(null); // Ref for the scrollable container
  const [contextMenu, setContextMenu] = React.useState(null);
  const [improving, setImproving] = React.useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [dropboxConfigOpen, setDropboxConfigOpen] = useState(false);

  const [tocItems, setTocItems] = useState([]);
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
  const lastKnownPosition = useRef(null); // Use ref for latest position
  const targetScrollTopRef = useRef(initialScrollTop); // Store target scroll
  const targetCursorPositionRef = useRef(cursorPosition); // Store target cursor
  const needsRestorationRef = useRef(true); // Flag to restore state on next focus
  const [isTocOpen, setIsTocOpen] = useState(() => {
    const saved = localStorage.getItem('tocOpen');
    return saved ? JSON.parse(saved) : false;
  });
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  const submenuTimeoutRef = useRef(null);
  const [showBacklinkPalette, setShowBacklinkPalette] = useState(false);
  const [backlinkPosition, setBacklinkPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    localStorage.setItem('tocOpen', JSON.stringify(isTocOpen));
  }, [isTocOpen]);

  const toggleToc = useCallback(() => {
    setIsTocOpen(prev => !prev);
  }, []);

  useEffect(() => {
    // Listen for the custom event to show the backlink palette
    const handleShowBacklinkPalette = (event) => {
      setBacklinkPosition(event.detail.position);
      setShowBacklinkPalette(true);
    };
    
    window.addEventListener('show-backlink-palette', handleShowBacklinkPalette);
    
    return () => {
      window.removeEventListener('show-backlink-palette', handleShowBacklinkPalette);
    };
  }, []);

  const handleBacklinkSelect = (note) => {
    if (editor) {
      const { from } = editor.state.selection;
      
      // Define the range to replace (the '[[')
      const range = { from: from - 2, to: from }; 
      
      // Insert the note name *with* the link mark already applied
      editor.chain().focus()
        .insertContentAt(range, [
          {
            type: 'text', // Specify inserting text content
            text: note.name,
            marks: [ // Apply marks directly during insertion
              {
                type: 'link', // Specify the link mark type
                attrs: { 
                  href: `note://${note.id}`, // Set the custom href
                  class: 'internal-note-link' // Apply our CSS class
                },
              },
            ],
          }
        ])
        // Optional: Move cursor immediately after the inserted link
        .setTextSelection(range.from + note.name.length) 
        .run();
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        codeBlock: false,
      }),
      CodeBlockLowlight
        .extend({
          addNodeView() {
            return ({ node, HTMLAttributes, getPos }) => {
              const dom = document.createElement('pre');
              const content = document.createElement('code');
              const wrapper = document.createElement('div');
              wrapper.style.position = 'relative';
              
              const copyButton = document.createElement('button');
              copyButton.className = 'copy-button';
              copyButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/></svg>';
              
              copyButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard.writeText(node.textContent).then(() => {
                  const originalContent = copyButton.innerHTML;
                  copyButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/></svg>';
                  setTimeout(() => {
                    copyButton.innerHTML = originalContent;
                  }, 2000);
                });
              });

              Object.entries(HTMLAttributes).forEach(([key, value]) => {
                dom.setAttribute(key, value);
              });

              if (node.textContent) {
                content.textContent = node.textContent;
              }

              dom.appendChild(content);
              wrapper.appendChild(dom);
              wrapper.appendChild(copyButton);

              return {
                dom: wrapper,
                contentDOM: content,
              };
            };
          },
        })
        .configure({
          lowlight,
        }),
      TextStyle.configure({ mergeNestedSpanStyles: true }),
      Color,
      Underline,
      Link.configure({
        openOnClick: false, // Set to false because we have a custom click handler
        autolink: true,     // Keep autolink for http/https if desired
        protocols: ['http', 'https', 'mailto', 'note'], // Add 'note' protocol
        validate: href => /^https?:\/\//.test(href) || /^mailto:/.test(href) || /^note:\/\//.test(href), // Validate allowed protocols
      }),
      Highlight.configure({
        multicolor: true,
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
      CustomImage.configure({
        inline: false,
        allowBase64: true,
      }),
      TableOfContents.configure({
        getIndex: getHierarchicalIndexes,
        onUpdate: (items) => {
          setTocItems(items);
        },
      }),
      Details.configure({
        persist: true,
        HTMLAttributes: {
          class: 'details',
        },
      }),
      DetailsSummary,
      DetailsContent,
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => {
          if (node.type.name === 'detailsSummary') {
            return 'Summary'
          }
          return null
        },
      }),
      Emoji.configure({
        emojis: gitHubEmojis,
        enableEmoticons: true,
      }),
      Mathematics.configure({
        katexOptions: {
          maxSize: 300,
          displayMode: false,
          throwOnError: false,
          output: 'html',
          leqno: false,
          fleqn: false,
          strict: false,
          trust: true
        },
      }),
      Backlink,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    autofocus: true,
    onCreate: ({ editor }) => {
      isEditorReady.current = true;
    },
    editorProps: {
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

  useEffect(() => {
    if (editor) {
      // Add double-click handler for images
      const handleDoubleClick = (event) => {
        const image = event.target.closest('img');
        if (image) {
          window.open(image.src, '_blank');
        }
      };

      editor.view.dom.addEventListener('dblclick', handleDoubleClick);
      return () => editor.view.dom.removeEventListener('dblclick', handleDoubleClick);
    }
  }, [editor]);

  useEffect(() => {
    if (editor) {
      // Add click handler for links
      const handleLinkClick = (event) => {
        const link = event.target.closest('a');
        if (link && link.href.includes('note://')) {
          // Handle internal note links
          event.preventDefault(); // Prevent default only for note links before handling
          
          // Extract the note ID from the URL
          const noteId = link.href.split('note://')[1];
          if (noteId) {
            // Fetch the note and open it in a new tab
            DbSyncService.getNoteById(noteId)
              .then(note => {
                if (note) {
                  // Create a tab object compatible with the app's structure
                  const tabData = {
                    name: note.name,
                    content: note.content ? base64Utils.decodeFromBase64(note.content) : '',
                    noteId: note.id,
                    due_date: note.due_date,
                    status: note.status
                  };
                  
                  // Open in a new tab by dispatching a custom event
                  window.dispatchEvent(new CustomEvent('open-note-in-new-tab', { 
                    detail: { tabData } 
                  }));
                }
              })
              .catch(error => {
                console.error('Error fetching note:', error);
              });
          }
        } else if (link && (link.href.startsWith('http://') || link.href.startsWith('https://'))) {
          // Handle external http/https links
          event.preventDefault(); // Prevent default navigation
          window.open(link.href, '_blank', 'noopener noreferrer'); // Open in new tab
        }
        // No explicit handling for mailto: or other protocols needed here
        // If they don't work due to openOnClick:false, further adjustments might be required.
      };

      editor.view.dom.addEventListener('click', handleLinkClick);
      return () => editor.view.dom.removeEventListener('click', handleLinkClick);
    }
  }, [editor]);

  useEffect(() => {
    if (editor) {
      const handlePaste = (event) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
          const file = item.getAsFile();
          if (!file) continue;

          event.preventDefault();
          
          // Upload to Dropbox and get direct link
          fileService.uploadFile(file)
            .then(result => {
              if (item.type.startsWith('image/')) {
                // For images, insert them directly into the editor
                editor.chain().focus().setImage({ src: result.url }).run();
              } else {
                // For other file types, insert as a link
                editor.chain()
                  .focus()
                  .setLink({ href: result.url })
                  .insertContent(result.filename)
                  .run();
              }
            })
            .catch(error => {
              console.error('Failed to upload file:', error);
              // No fallback for non-image files
              if (item.type.startsWith('image/')) {
                // Fallback to base64 if upload fails for images
                const reader = new FileReader();
                reader.onload = (e) => {
                  editor.chain().focus().setImage({ src: e.target.result }).run();
                };
                reader.readAsDataURL(file);
              }
            });
        }
      };

      editor.view.dom.addEventListener('paste', handlePaste);
      return () => editor.view.dom.removeEventListener('paste', handlePaste);
    }
  }, [editor]);

  // Effect to WATCH for prop changes and MARK state for restoration
  useEffect(() => {
    if (!editor || editor.isDestroyed) return; // Ensure editor is ready and not destroyed

    // Update the target state based on props
    targetScrollTopRef.current = initialScrollTop;
    targetCursorPositionRef.current = cursorPosition;

    // If tabId changes, we definitely need to restore on next focus
    // Also set if initial values change, though tabId is the primary trigger
    needsRestorationRef.current = true;
  }, [editor, initialScrollTop, cursorPosition, tabId]); // Dependencies: editor, initial positions, tabId

  // Effect to handle the ACTUAL restoration on FOCUS event
  useEffect(() => {
    if (!editor) return;

    const handleEditorFocus = () => {
      // console.log(`[TipTapEditor] Focus event (Tab ${tabId}). Needs restoration? ${needsRestorationRef.current}`);
      if (!needsRestorationRef.current) return; // Only restore once per flag cycle

      // Mark as processed immediately to prevent race conditions
      needsRestorationRef.current = false;

      // Defer restoration slightly using setTimeout to allow editor to settle
      const restoreTimer = setTimeout(() => {
        if (!editor || editor.isDestroyed) {
          console.warn(`[TipTapEditor] Restore on Focus (Tab ${tabId}): Editor destroyed before setTimeout callback.`);
          return;
        }

        // Restore Scroll
        const targetScroll = targetScrollTopRef.current;
        if (editorContainerRef.current && targetScroll !== undefined && targetScroll !== null) {
          console.log(`[TipTapEditor] Restoring Scroll on Focus+Timeout (Tab ${tabId}) to: ${targetScroll}`);
          editorContainerRef.current.scrollTop = targetScroll;
        }

        // Restore Cursor
        const targetCursor = targetCursorPositionRef.current;
        if (targetCursor !== null && targetCursor !== undefined) {
          if (targetCursor >= 0 && targetCursor <= editor.state.doc.content.size) {
            console.log(`[TipTapEditor] Restoring Cursor on Focus+Timeout (Tab ${tabId}) to: ${targetCursor}`);
            editor.commands.focus(targetCursor); // Use focus command
          } else {
            console.warn(`[TipTapEditor] Restore on Focus+Timeout (Tab ${tabId}): Invalid cursor position ${targetCursor} for doc size ${editor.state.doc.content.size}`);
          }
        }
      }, 0); // 0ms delay pushes execution to the next event loop tick

      // Note: No need to return clearTimeout here unless the component could unmount
      // between the focus event and the timeout callback, which is unlikely.
    };

    editor.on('focus', handleEditorFocus);

    return () => {
      editor.off('focus', handleEditorFocus);
    };
  }, [editor]); // Only depends on editor instance

  // Track cursor position changes
  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleSelectionUpdate = () => {
      if (isRestoringCursor.current) return;
      const { from, to } = editor.state.selection;
      const position = from === to ? from : { from, to };
      lastKnownPosition.current = position;
      onCursorChange(position);
    };
    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => editor.off('selectionUpdate', handleSelectionUpdate);
  }, [editor, onCursorChange]);

  // Handle scroll events on the container
  const handleScroll = useCallback((event) => {
    if (onScrollUpdate && tabId) {
      onScrollUpdate(tabId, event.target.scrollTop);
    }
  }, [onScrollUpdate, tabId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isEditorReady.current = false;
      lastKnownPosition.current = null;
    };
  }, []);

  const handleImproveText = async () => {
    if (improving) return;
    
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const fragment = editor.state.doc.slice(from, to).content;
    const serializer = DOMSerializer.fromSchema(editor.schema);
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(serializer.serializeFragment(fragment));
    const selectedHTML = tempDiv.innerHTML;
    setImproving(true);
    try {
      const improvedHTML = await improveText(selectedHTML);
      if (improvedHTML) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(improvedHTML).run();
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
      
      // Get proxy configuration
      const proxyUrl = localStorage.getItem('proxy_url');
      const apiKey = localStorage.getItem('proxy_key');
      
      if (!proxyUrl) {
        throw new Error('Proxy URL not found. Please configure the proxy URL in settings.');
      }
      
      if (!apiKey) {
        throw new Error('API key not found. Please set your API key in settings.');
      }
      
      // Create a file object from the blob
      const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: audioBlob.type });
      
      // Upload the audio file to Dropbox
      const fileService = await import('../services/fileService').then(module => module.default);
      
      if (!fileService.isConfigured()) {
        throw new Error('Dropbox is not configured. Please set up Dropbox in settings.');
      }
      
      const uploadResult = await fileService.uploadFile(audioFile);
      
      // Send the Dropbox URL to the proxy API for transcription
      const transcribeEndpoint = `${proxyUrl}/api/transcribe`;
      
      const response = await fetch(transcribeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          url: uploadResult.url
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Transcription failed');
      }
      
      const data = await response.json();
      
      // Process the transcription with Claude
      const anthropicKey = localStorage.getItem('anthropic_api_key');
      if (!anthropicKey) {
        throw new Error('Anthropic API key not found. Please set your API key in settings.');
      }

      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an AI assistant specialized in processing and improving transcribed voice notes. Your task is to edit the provided text for clarity, readability, and correctness, and then extract any task items mentioned.\n\nHere is the transcribed text you need to work with:\n\n<transcribed_text>\n${data.transcript}\n</transcribed_text>\n\nPlease follow these steps:\n\n1. Edit and format the text:\n   - Correct any spelling mistakes.\n   - Fix grammar issues.\n   - Adjust punctuation for clarity.\n   - Improve overall readability and flow.\n   - Format the text into appropriately sized paragraphs.\n\n2. After editing, carefully review the text to identify and extract any task items mentioned. Task items are typically actions, assignments, or to-do list entries that the speaker intends to complete or delegate.\n\nYour final output should be formatted as follows:\n\n# Edited Text\n[Insert the edited and formatted version of the transcribed text here]\n\n# Task Items\n- [List each extracted task item on a new line, starting with a dash]\n\nImportant notes:\n- Make your best effort to improve the text while maintaining the original meaning and intent of the speaker.\n- If you're unsure about a particular edit or task item, err on the side of caution and preserve the original content.\n- Do not include any commentary or explanations in your final output.`
            }
          ]
        }
      ];

      const aiResponse = await sendAnthropicMessage(
        messages,
        'Sonnet-3.7',
        anthropicKey
      );

      let aiContent = '';
      if (aiResponse && aiResponse.content) {
        if (Array.isArray(aiResponse.content)) {
          for (const item of aiResponse.content) {
            if (item.type === 'text') {
              if (item.text) {
                aiContent += item.text;
              } else if (item.content) {
                aiContent += item.content;
              }
            }
          }
        } else {
          aiContent = aiResponse.content;
        }
      }

      if (editor) {
        const { from } = editor.state.selection;
        
        const needsNewline = from > 0 && editor.state.doc.textBetween(from - 1, from) !== '\n';
        
        let content = needsNewline ? '\n' : '';
        
        content += '<h2>Original Transcription</h1>\n';
        content += `<p>${data.transcript}</p>`;
        content += '\n\n';
        
        content += '<h3>Audio Source</h3>\n';
        content += `<a href="${uploadResult.url}" target="_blank">Listen to audio recording</a>`;
        content += '\n\n';
        
        content += '<h1>AI Enhanced Content</h1>\n';
        
        if (aiContent && aiContent.trim().length > 0) {
          let processedContent = aiContent
            .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
            .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
            .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
            .replace(/^- (.*?)$/gm, '<li>$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
          
          content += processedContent;
        } else {
          content += '<p>AI processing did not return any content. Please try again.</p>';
        }
        
        editor
          .chain()
          .focus()
          .insertContent(content, {
            parseOptions: {
              preserveWhitespace: 'full'
            }
          })
          .run();
      }
    } catch (err) {
      console.error('Transcription error:', err);
      throw new Error('Failed to transcribe audio: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup recording resources on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  const formatOptions = [
    {
      icon: <AutoFixHigh />,
      title: 'Improve Text',
      action: handleImproveText,
    },
    {
      icon: <ContentCopy />,
      title: 'Copy as Plain Text',
      action: handleCopyPlainText,
    },
    {
      icon: <Expand />,
      title: 'Toggle Details',
      action: () => {
        if (editor.isActive('details')) {
          editor.chain().focus().unsetDetails().run();
        } else {
          editor.chain().focus().setDetails().run();
        }
      },
      isActive: () => editor.isActive('details'),
    },
    {
      icon: <TextFields />,
      title: 'Clear Format',
      action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
    },
    {
      icon: <MicIcon />,
      title: 'Voice Input',
      action: handleStartRecording,
    },
    {
      icon: <FormatPaint />,
      title: 'Text Color',
      action: () => {}, // Add a default no-op action
      submenu: [
        { title: 'Default', action: () => editor.chain().focus().unsetColor().run() },
        { title: 'White', action: () => editor.chain().focus().setColor('#FFFFFF').run() },
        { title: 'Black', action: () => editor.chain().focus().setColor('#000000').run() },
        { title: 'Red', action: () => editor.chain().focus().setColor('#FF0000').run() },
        { title: 'Orange', action: () => editor.chain().focus().setColor('#F98181').run() },
        { title: 'Blue', action: () => editor.chain().focus().setColor('#0000FF').run() },
      ],
      isActive: () => false,
    },
    {
      icon: <FormatBold />,
      title: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      icon: <FormatItalic />,
      title: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      icon: <FormatUnderlined />,
      title: 'Underline',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: () => editor.isActive('underline'),
    },
    {
      icon: <Code />,
      title: 'Code',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
    {
      icon: <FormatQuote />,
      title: 'Blockquote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      icon: <FormatListBulleted />,
      title: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      icon: <FormatListNumbered />,
      title: 'Ordered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      icon: <Remove />,
      title: 'Horizontal Rule',
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: <TableChart />,
      title: 'Insert Table',
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      icon: <ListIcon />,
      title: 'Configure Dropbox',
      action: () => setDropboxConfigOpen(true),
    },
    
    
  ];

  const tableOptions = [
    {
      title: 'Add Column Before',
      icon: <AddCircleOutline sx={{ transform: 'rotate(90deg)' }} />,
      action: () => {
        editor.chain().focus().addColumnBefore().run();
        handleClose();
      },
    },
    {
      title: 'Add Column After',
      icon: <AddCircleOutline sx={{ transform: 'rotate(-90deg)' }} />,
      action: () => {
        editor.chain().focus().addColumnAfter().run();
        handleClose();
      },
    },
    {
      title: 'Delete Column',
      icon: <DeleteOutline sx={{ transform: 'rotate(90deg)' }} />,
      action: () => {
        editor.chain().focus().deleteColumn().run();
        handleClose();
      },
    },
    {
      title: 'Add Row Before',
      icon: <AddCircleOutline />,
      action: () => {
        editor.chain().focus().addRowBefore().run();
        handleClose();
      },
    },
    {
      title: 'Add Row After',
      icon: <AddCircleOutline sx={{ transform: 'rotate(180deg)' }} />,
      action: () => {
        editor.chain().focus().addRowAfter().run();
        handleClose();
      },
    },
    {
      title: 'Delete Row',
      icon: <DeleteOutline />,
      action: () => {
        editor.chain().focus().deleteRow().run();
        handleClose();
      },
    },
    {
      title: 'Delete Table',
      icon: <DeleteForever />,
      action: () => {
        editor.chain().focus().deleteTable().run();
        handleClose();
      },
    },
    {
      title: 'Add Text Below Table',
      icon: <TextFields />,
      action: () => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        const isInTable = $from.parent.type.name === 'table';
        
        if (isInTable) {
          const tablePos = $from.pos;
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
        }
        handleClose();
      },
    },
  ];

  const handleContextMenu = useCallback((event) => {
    if (event.button === 2) {
      event.preventDefault();
      const isInTable = editor?.isActive('table');
      setContextMenu({
        mouseX: event.clientX + 2,
        mouseY: event.clientY - 6,
        isInTable
      });
    }
  }, [editor]);

  const handleClose = useCallback(() => {
    setContextMenu(null);
  }, []);

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

  const handleKeyDown = useCallback((event) => {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === '[') {
        event.preventDefault();
        toggleToc();
      } else if (event.key === ']') {
        event.preventDefault();
        if (onFocusModeChange) {
          onFocusModeChange();
        }
      }
    }
  }, [toggleToc, onFocusModeChange]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Expose editor instance through ref
  useImperativeHandle(ref, () => ({
    editor,
    getMarkdown: () => {
      if (editor) {
        const html = editor.getHTML();
        const turndownService = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
          emDelimiter: '*'
        });
        const markdown = turndownService.turndown(html);
        return markdown;
      }
      return '';
    },
    getText: () => editor?.state.doc.textContent,
    clearContent: () => editor?.commands.clearContent(),
    getScrollTop: () => {
      const scrollTop = editorContainerRef.current?.scrollTop || 0;
      return scrollTop;
    },
    getCursorPosition: () => lastKnownPosition.current,
  }), [editor, editorContainerRef]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'row',
      height: '100vh',
      bgcolor: darkMode ? '#1f1a24' : '#fff',
      color: darkMode ? '#fff' : '#000',
    }}>
      {/* Table of Contents */}
      <Box
        className="editor-sidebar"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: isTocOpen ? '300px' : '0px',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          borderLeft: 1,
          borderColor: darkMode ? 'rgba(255, 255, 255, 0.12)' : 'divider',
          position: 'relative',
          bgcolor: darkMode ? '#1f1a24' : '#FFFCF0',
          '&:hover': {
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            '-ms-overflow-style': 'none',
            'scrollbarWidth': 'none',
          }
        }}
      >
        {/* TOC Content */}
        <Box
          sx={{
            width: '300px',
            height: '100%',
            overflow: 'auto',
            p: 2,
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            '-ms-overflow-style': 'none',
            'scrollbarWidth': 'none',
            '&:hover': {
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              '-ms-overflow-style': 'none',
              'scrollbarWidth': 'none',
            }
          }}
        >
          <ToC items={tocItems} editor={editor} />
        </Box>
      </Box>

      {/* Editor Container */}
      <Box
        ref={editorContainerRef}
        onContextMenu={handleContextMenu}
        sx={{
          flexGrow: 1,
          overflowY: 'scroll',
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          '-ms-overflow-style': 'none',
          'scrollbarWidth': 'none',
          height: '100%',
          position: 'relative',
          bgcolor: darkMode ? '#1f1a24' : '#FFFCF0',
          scrollBehavior: 'smooth'
        }}
        onScroll={handleScroll} // Attach scroll handler
      >
        <Box
          className="editor-content"
          sx={{
            flex: 1,
            maxWidth: '55em',
            margin: '0 auto',
            padding: '16px',
            outline: 'none',
            backgroundColor: darkMode ? '#1f1a24' : '#FFFCF0',
            color: darkMode ? '#e6edf3' : '#24292f',
            fontFamily: '"Rubik", sans-serif',
            fontSize: '17px',
            lineHeight: '1.8',
            position: 'relative',
            minHeight: '100%',
            overflow: 'auto',
            ...getEditorStyles(darkMode),
          }}
        >
          {editor && <EditorContent editor={editor} />}
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
      </Box>

      <Menu
        open={Boolean(contextMenu)}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: {
            backgroundColor: darkMode ? '#1f1a24' : '#ffffff',
            color: darkMode ? '#e6edf3' : '#24292f',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }
        }}
        MenuListProps={{
          sx: {
            display: 'flex',
            flexDirection: 'row',
            padding: '4px',
          }
        }}
      >
        {(contextMenu?.isInTable ? tableOptions : formatOptions).map((option, index) => (
          <MenuItem 
            key={index} 
            onClick={() => { if (!option.submenu) { option.action(); } handleClose(); }}
            onMouseEnter={(e) => {
              if (submenuTimeoutRef.current) {
                clearTimeout(submenuTimeoutRef.current);
                submenuTimeoutRef.current = null;
              }
              if (option.submenu) {
                setActiveSubmenu(option.submenu);
                const rect = e.currentTarget.getBoundingClientRect();
                setSubmenuPosition({ top: rect.top, left: rect.right });
              }
            }}
            onMouseLeave={() => {
              if (option.submenu) {
                submenuTimeoutRef.current = setTimeout(() => { setActiveSubmenu(null); }, 200);
              }
            }}
            sx={{
              minWidth: 'auto',
              padding: '4px',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
              }
            }}
          >
            <IconButton
              size="small"
              sx={{
                color: option.isActive?.() ? 'primary.main' : 'inherit',
              }}
            >
              {option.icon}
            </IconButton>
          </MenuItem>
        ))}
      </Menu>

      {activeSubmenu && (
        <Box
          className="context-submenu"
          style={{
            position: 'absolute',
            top: submenuPosition.top,
            left: submenuPosition.left,
            background: document.body.classList.contains('dark') ? '#333' : '#fff',
            border: `1px solid ${document.body.classList.contains('dark') ? '#555' : '#ccc'}`,
            color: document.body.classList.contains('dark') ? '#fff' : '#000',
            zIndex: 1000,
            padding: '4px'
          }}
          onMouseEnter={() => {
            if (submenuTimeoutRef.current) {
              clearTimeout(submenuTimeoutRef.current);
              submenuTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            submenuTimeoutRef.current = setTimeout(() => { setActiveSubmenu(null); }, 200);
          }}
        >
          {activeSubmenu.map((subItem, subIndex) => (
            <Box
              key={subIndex}
              className="context-menu-item"
              onClick={() => { subItem.action(); setActiveSubmenu(null); }}
              style={{ padding: '4px 8px', cursor: 'pointer' }}
            >
              {subItem.title}
            </Box>
          ))}
        </Box>
      )}

      <RecordingDialog
        open={isRecording}
        elapsedTime={elapsedTime}
        isProcessing={isProcessing}
        onClose={handleStopRecording}
      />
      <DropboxConfig 
        open={dropboxConfigOpen}
        onClose={() => setDropboxConfigOpen(false)}
      />
      {showBacklinkPalette && (
        <BacklinkPalette
          isOpen={showBacklinkPalette}
          onClose={() => setShowBacklinkPalette(false)}
          onNoteSelect={handleBacklinkSelect}
          position={backlinkPosition}
          darkMode={darkMode}
        />
      )}
    </Box>
  );
});

export default TipTapEditor;
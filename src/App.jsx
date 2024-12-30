import { useState, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
// Lazy load components to improve initial load performance
import { lazy, Suspense } from 'react';

const Editor = lazy(() => import('./components/Editor').catch(() => ({ default: () => <div>Failed to load Editor</div> })));
const TabList = lazy(() => import('./components/TabList').catch(() => ({ default: () => <div>Failed to load TabList</div> })));
const Toolbar = lazy(() => import('./components/Toolbar').catch(() => ({ default: () => <div>Failed to load Toolbar</div> })));
const CommandBar = lazy(() => import('./components/CommandBar').catch(() => ({ default: () => <div>Failed to load CommandBar</div> })));
const ExcalidrawEditor = lazy(() => import('./components/ExcalidrawEditor').catch(() => ({ default: () => <div>Failed to load Excalidraw</div> })));
const TLDrawEditor = lazy(() => import('./components/TLDrawEditor').catch(() => ({ default: () => <div>Failed to load TLDraw</div> })));
const GitHubSettingsModal = lazy(() => import('./components/GitHubSettingsModal').catch(() => ({ default: () => <div>Failed to load GitHub Settings</div> })));
const TodoManager = lazy(() => import('./components/TodoManager').catch(() => ({ default: () => <div>Failed to load Todo Manager</div> })));
const QuickAddTask = lazy(() => import('./components/QuickAddTask').catch(() => ({ default: () => <div>Failed to load Quick Add</div> })));
const CommandPalette = lazy(() => import('./components/CommandPalette').catch(() => ({ default: () => <div>Failed to load Command Palette</div> })));
const ChatBox = lazy(() => import('./components/ChatBox').catch(() => ({ default: () => <div>Failed to load Chat</div> })));
const ApiKeyInput = lazy(() => import('./components/ApiKeyInput').catch(() => ({ default: () => <div>Failed to load API Settings</div> })));
const ResponsiveToolbar = lazy(() => import('./components/ResponsiveToolbar').catch(() => ({ default: () => <div>Failed to load Toolbar</div> })));
const TipTapEditor = lazy(() => import('./components/TipTapEditor').catch(() => ({ default: () => <div>Failed to load Editor</div> })));

// Keep GitHubService as regular import since it's a service
import GitHubService from './services/githubService';
import { saveTabs, loadTabs, deleteDrawing, saveDrawing, loadTodoData, saveTodoData } from './utils/db';
import { isPWA } from './utils/pwaUtils';
import { createCommandList } from './utils/commands';
import { converters } from './utils/converters';
import './App.css';

function App() {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [splitView, setSplitView] = useState(false);
  const [rightTab, setRightTab] = useState(null);
  const [wordWrap, setWordWrap] = useState(() => {
    const saved = localStorage.getItem('wordWrap');
    return saved !== null ? saved === 'true' : true;
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [focusMode, setFocusMode] = useState(false);
  const [showPreview, setShowPreview] = useState(() => localStorage.getItem('showPreview') === 'true');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showGitHubSettings, setShowGitHubSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [todoData, setTodoData] = useState({
    inbox: [],
    archive: [],
    projects: {}
  });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const editorRef = useRef(null);
  const tipTapEditorRef = useRef(null); // Reference to the TipTap editor
  const sidebarTimeoutRef = useRef(null);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      background: {
        default: darkMode ? '#1e1e1e' : '#FFFCF0',
        paper: darkMode ? '#252526' : '#FFFCF0',
      },
      divider: darkMode ? '#333333' : '#e0e0e0',
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#252526' : '#f5f5f5',
            borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#333333' : '#e0e0e0'}`,
            boxShadow: 'none',
          }),
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#252526' : '#f5f5f5',
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.mode === 'dark' ? '#007acc' : '#1976d2',
            },
          }),
        },
      },
      MuiTab: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#252526' : '#f5f5f5',
            color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333',
            '&.Mui-selected': {
              backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            },
          }),
        },
      },
    },
  });

  useEffect(() => {
    // Auto-hide sidebar in PWA mode
    if (isPWA()) {
      setShowSidebar(false);
    }
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const savedTabs = await loadTabs();
        if (savedTabs && savedTabs.length > 0) {
          setTabs(savedTabs);
          setActiveTab(savedTabs[0].id);
        } else {
          // Create default tab if no saved tabs
          const defaultTab = { 
            id: 1, 
            name: 'untitled.md', 
            content: '', 
            type: 'markdown', 
            editorType: 'tiptap' 
          };
          setTabs([defaultTab]);
          setActiveTab(1);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        // Create default tab on error
        const defaultTab = { 
          id: 1, 
          name: 'untitled.md', 
          content: '', 
          type: 'markdown', 
          editorType: 'tiptap' 
        };
        setTabs([defaultTab]);
        setActiveTab(1);
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  useEffect(() => {
    if (!isLoading) {  // Don't save during initial load
      saveTabs(tabs).catch(error => {
        console.error('Error saving tabs:', error);
      });
    }
  }, [tabs, isLoading]);

  useEffect(() => {
    localStorage.setItem('wordWrap', wordWrap);
  }, [wordWrap]);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('showPreview', showPreview);
  }, [showPreview]);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [focusMode]);

  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Exit focus mode on Escape key
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
        setShowSidebar(true);
        return;
      }
      
      // Handle Ctrl+K before any other key combinations
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setShowCommandBar(true);
        return;
      }
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    // Use capture phase to handle the event before React's event system
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [focusMode]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Command/Ctrl + Shift + A for quick add task
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        setQuickAddOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    const loadTodoState = async () => {
      try {
        const data = await loadTodoData();
        if (data) {
          setTodoData(data);
        }
      } catch (error) {
      }
    };
    loadTodoState();
  }, []);

  useEffect(() => {
    const saveTodoState = async () => {
      try {
        if (Object.keys(todoData.inbox).length > 0 || 
            Object.keys(todoData.archive).length > 0 || 
            Object.keys(todoData.projects).length > 0) {
          await saveTodoData(todoData);
        }
      } catch (error) {
        console.error('Error saving todo data:', error);
      }
    };
    saveTodoState();
  }, [todoData]);

  const handleNewTab = () => {
    const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
    const newTab = {
      id: newId,
      name: `Code-${newId}.md`,
      content: '',
      type: 'markdown',
      editorType: 'codemirror'
    };
    setTabs(prevTabs => [...prevTabs, newTab]);
    // Use requestAnimationFrame for smoother focus handling
    requestAnimationFrame(() => {
      setActiveTab(newId);
    });
  };

  const handleDoubleClickSidebar = () => {
    const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
    const newTab = {
      id: newId,
      name: `Note-${newId}.md`,
      content: '',
      type: 'markdown',
      editorType: 'tiptap'
    };
    setTabs(prevTabs => [...prevTabs, newTab]);
    // Use requestAnimationFrame for smoother focus handling
    requestAnimationFrame(() => {
      setActiveTab(newId);
    });
  };

  const handleTabClose = async (id) => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.type === 'excalidraw') {
      try {
        await deleteDrawing(id);
      } catch (error) {
        console.error('Error deleting drawing:', error);
      }
    }
    
    const newTabs = tabs.filter(tab => tab.id !== id);
    if (newTabs.length === 0) {
      // Create a new empty tab if we're closing the last one
      setTabs([{ id: 1, name: 'untitled.md', content: '', type: 'markdown', editorType: 'tiptap' }]);
      setActiveTab(1);
    } else {
      setTabs(newTabs);
      if (activeTab === id) {
        // Set active tab to the previous tab, or the first one if we're at the beginning
        const index = tabs.findIndex(tab => tab.id === id);
        const newActiveTab = tabs[index === 0 ? 1 : index - 1].id;
        setActiveTab(newActiveTab);
      }
    }
  };

  const handleTabRename = (id, newName) => {
    setTabs(tabs.map(tab => {
      if (tab.id === id) {
        // Ensure Excalidraw files keep their extension
        if (tab.type === 'excalidraw' && !newName.endsWith('.excalidraw')) {
          newName = `${newName}.excalidraw`;
        }
        return { ...tab, name: newName };
      }
      return tab;
    }));
  };

  const handleTabSelect = React.useCallback((id) => {
    // Only proceed if the tab is actually changing
    if (id === activeTab) return;

    // Save cursor position of current tab before switching
    const saveCursor = () => {
      if (activeTab) {
        let cursor = null;
        if (editorRef.current?.editorInstance) {
          cursor = editorRef.current.editorInstance.getCursor();
        } else if (tipTapEditorRef.current?.editor && !tipTapEditorRef.current.editor.isDestroyed) {
          const { from, to } = tipTapEditorRef.current.editor.state.selection;
          cursor = from === to ? from : { from, to };
        }
        
        if (cursor !== null) {
          setTabs(prevTabs => {
            const currentTab = prevTabs.find(tab => tab.id === activeTab);
            // Only update if cursor position has actually changed
            if (!currentTab?.cursorPosition || 
                JSON.stringify(currentTab.cursorPosition) !== JSON.stringify(cursor)) {
              return prevTabs.map(tab => 
                tab.id === activeTab ? { ...tab, cursorPosition: cursor } : tab
              );
            }
            return prevTabs;
          });
        }
      }
    };

    // Batch updates using requestAnimationFrame
    requestAnimationFrame(() => {
      saveCursor();
      setActiveTab(id);
    });
  }, [activeTab]);

  const handleCursorChange = React.useCallback((tabId, cursor) => {
    // Use a ref to track the last cursor position to avoid unnecessary state updates
    const lastCursor = React.useRef(null);
    
    if (!cursor || JSON.stringify(lastCursor.current) === JSON.stringify(cursor)) {
      return;
    }
    
    lastCursor.current = cursor;
    
    // Batch the update with requestAnimationFrame
    requestAnimationFrame(() => {
      setTabs(prevTabs => {
        const currentTab = prevTabs.find(tab => tab.id === tabId);
        if (!currentTab?.cursorPosition || 
            JSON.stringify(currentTab.cursorPosition) !== JSON.stringify(cursor)) {
          return prevTabs.map(tab =>
            tab.id === tabId ? { ...tab, cursorPosition: cursor } : tab
          );
        }
        return prevTabs;
      });
    });
  }, []);

  const handleContentChange = (id, newContent) => {
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab =>
        tab.id === id ? { ...tab, content: newContent } : tab
      );
      return updatedTabs;
    });
  };

  const handleTabAreaDoubleClick = (event) => {
    // Only create new tab if clicking on the tab area, not on existing tabs
    if (event.target.closest('.MuiTab-root') === null) {
      handleDoubleClickSidebar();
    }
  };

  const handleOpenFile = () => {
    fileInputRef.current.click();
  };

  const handleSaveFile = () => {
    const tab = tabs.find(tab => tab.id === activeTab);
    if (!tab) return;

    const blob = new Blob(
      [tab.type === 'excalidraw' || tab.type === 'tldraw' ? JSON.stringify(tab.content) : tab.content],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = tab.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
      const isExcalidraw = file.name.endsWith('.excalidraw');
      const isTLDraw = file.name.endsWith('.tldraw');
      const newTab = {
        id: newId,
        name: file.name,
        content: isExcalidraw || isTLDraw ? JSON.parse(content) : content,
        type: isExcalidraw ? 'excalidraw' : isTLDraw ? 'tldraw' : 'markdown',
        editorType: 'tiptap'
      };

      if (isExcalidraw) {
        // Save Excalidraw content to IndexedDB
        try {
          const content = JSON.parse(e.target.result);
          saveDrawing({ id: newId, ...content });
        } catch (error) {
          console.error('Error saving drawing:', error);
          return;
        }
      }

      setTabs([...tabs, newTab]);
      setActiveTab(newId);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleNewDrawing = (type = 'excalidraw') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
    setTabs([...tabs, { 
      id: newId, 
      name: `Drawing-${timestamp}.${type}`, 
      content: '', 
      type,
      editorType: 'tiptap'
    }]);
    setActiveTab(newId);
  };

  const handleNewTLDraw = () => {
    const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
    setTabs([...tabs, { id: newId, name: 'drawing.tldraw', content: '', type: 'tldraw', editorType: 'tiptap' }]);
    setActiveTab(newId);
  };

  const handleConvert = (converterId) => {
    if (!activeTab || !converterId || !converters[converterId]) {
      console.error('Invalid converter ID or no active tab');
      return;
    }
    
    try {
      const currentTab = tabs.find(t => t.id === activeTab);
      if (!currentTab || !currentTab.content) {
        console.error('No content to convert');
        return;
      }

      const selectedText = window.getSelection()?.toString();
      const textToConvert = selectedText || currentTab.content;
      const result = converters[converterId].convert(textToConvert);


      // Update the current tab by appending the result
      const updatedContent = currentTab.content + '\n\n' + result;
      const updatedTabs = tabs.map(tab => 
        tab.id === activeTab 
          ? { ...tab, content: updatedContent }
          : tab
      );
      setTabs(updatedTabs);
    } catch (error) {
      console.error('Conversion failed:', error);
    }
  };

  const handleFormatJson = () => {
    if (!activeTab) return;
    
    try {
      const currentTab = tabs.find(t => t.id === activeTab);
      const parsed = JSON.parse(currentTab.content);
      const formatted = JSON.stringify(parsed, null, 2);
      setTabs(tabs.map(tab => 
        tab.id === activeTab 
          ? { ...tab, content: formatted }
          : tab
      ));
    } catch (error) {
      console.error('JSON formatting failed:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleTodoClick = () => {
    // Check if todo tab already exists
    const todoTab = tabs.find(tab => tab.type === 'todo');
    if (todoTab) {
      setActiveTab(todoTab.id);
      return;
    }

    // Create new todo tab with consistent ID generation
    const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
    const newTab = {
      id: newId,
      name: 'Todo',
      content: '',
      type: 'todo',
      editorType: 'todo'
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTab(newId);
  };

  const handleQuickAddTask = (taskText) => {
    const newTask = {
      id: Date.now(),
      text: taskText,
      completed: false,
      list: 'inbox',
      urls: [],
      dueDate: null,
      notes: '',
    };

    setTodoData(prev => ({
      ...prev,
      inbox: [...prev.inbox, newTask]
    }));
  };

  const handleQuickAddClick = () => {
    setQuickAddOpen(true);
  };

  const handleFileSelectFromCommandPalette = async (file) => {
    const content = await GitHubService.getFileContent(file.path);
    if (content !== null) {
      let parsedContent = content;
      if (file.name.endsWith('.tldraw')) {
        try {
          // Parse but keep the entire state structure
          parsedContent = JSON.parse(content);
        } catch (error) {
          console.error('Error parsing TLDraw file:', error);
          return;
        }
      }
      
      const newTab = {
        id: Date.now(),
        name: file.name,
        content: parsedContent,
        type: file.name.endsWith('.tldraw') ? 'tldraw' : 'markdown',
        editorType: file.name.endsWith('.tldraw') ? 'tldraw' : 'tiptap',
        path: file.path
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTab(newTab.id);
    }
  };

  const handleChatToggle = () => {
    const newChatState = !showChat;
    setShowChat(newChatState);
    // Only hide sidebar when opening chat, restore it when closing
    if (newChatState) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }
  };

  const handleSplitViewToggle = () => {
    setSplitView(!splitView);
    if (!splitView) {
      setRightTab(null);
    }
  };

  const handleEditorClick = (event) => {
    // Only handle clicks in responsive mode
    if (window.innerWidth <= 960) {
      setShowSidebar(false);
    }
  };

  const handleCopyContent = () => {
    if (activeTab) {
      const tab = tabs.find(t => t.id === activeTab);
      if (tab) {
        // For TipTap editor, get plain text
        if (tipTapEditorRef.current?.editor) {
          const plainText = tipTapEditorRef.current.editor.getText();
          navigator.clipboard.writeText(plainText);
        } else {
          // For other editors, copy content as is
          navigator.clipboard.writeText(tab.content);
        }
      }
    }
  };

  const handleClearContent = () => {
    if (activeTab) {
      // For TipTap editor, use chain.clearContent()
      if (tipTapEditorRef.current?.editor) {
        tipTapEditorRef.current.editor.chain().focus().clearContent().run();
        // Update tabs state
        const updatedTabs = tabs.map(tab => {
          if (tab.id === activeTab) {
            return { ...tab, content: '' };
          }
          return tab;
        });
        setTabs(updatedTabs);
      } else {
        // For other editors
        const updatedTabs = tabs.map(tab => {
          if (tab.id === activeTab) {
            return { ...tab, content: '' };
          }
          return tab;
        });
        setTabs(updatedTabs);
      }
    }
  };

  const renderTab = (tab) => {
    if (tab.type === 'excalidraw') {
      return (
        <ExcalidrawEditor
          open={true}
          onClose={() => {}} // No-op since we're using tabs
          darkMode={darkMode}
          id={tab.id}
        />
      );
    } else if (tab.type === 'tldraw') {
      return (
        <TLDrawEditor
          darkMode={darkMode}
          id={tab.id}
          name={tab.name}
          initialContent={tab.content}
        />
      );
    } else if (tab.type === 'todo') {
      return (
        <TodoManager 
          tasks={todoData}
          onTasksChange={setTodoData}
        />
      );
    }

    // Use TipTap editor for markdown files
    if (tab.editorType === 'tiptap') {
      return (
        <TipTapEditor
          ref={tipTapEditorRef}
          key={tab.id} // Add key to force remount
          content={tab.content}
          onChange={(newContent) => handleContentChange(tab.id, newContent)}
          darkMode={darkMode}
          cursorPosition={tab.cursorPosition}
          onCursorChange={(pos) => handleCursorChange(tab.id, pos)}
        />
      );
    }

    // Fallback to CodeMirror editor
    return (
      <Editor
        content={tab.content}
        onChange={(newContent) => handleContentChange(tab.id, newContent)}
        wordWrap={wordWrap}
        darkMode={darkMode}
        showPreview={showPreview}
        cursorPosition={tab.cursorPosition}
        onCursorChange={(pos) => handleCursorChange(tab.id, pos)}
        ref={editorRef}
      />
    );
  };

  const commandList = createCommandList({
    onNewTab: handleNewTab,
    onOpenFile: handleOpenFile,
    onSaveFile: handleSaveFile,
    onWordWrapChange: setWordWrap,
    onDarkModeChange: setDarkMode,
    onShowPreviewChange: setShowPreview,
    onNewDrawing: handleNewDrawing,
    onFocusModeChange: () => {
      setFocusMode(!focusMode);
      setShowSidebar(focusMode);
    },
    onNewTLDraw: handleNewTLDraw,
    onConvert: handleConvert,
    onFormatJson: () => editorRef.current?.formatJson(),
    wordWrap,
    darkMode,
    showPreview,
    focusMode,
    setShowGitHubSettings,
    currentFile: activeTab ? tabs.find(tab => tab.id === activeTab) : null,
    setShowApiSettings,
    onTodoClick: handleTodoClick,
    onQuickAddClick: handleQuickAddClick,
    showChat,
    onChatToggle: handleChatToggle
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!isLoading && (
          <Suspense fallback={<div style={{ padding: 16 }}>Loading component...</div>}>
          <>
            <Box sx={{ 
              display: focusMode ? 'none' : 'block',
              '@media (max-width: 960px)': {
                display: 'none'
              }
            }}>
              <Toolbar 
                onNewTab={handleNewTab}
                onOpenFile={handleOpenFile}
                onSaveFile={handleSaveFile}
                wordWrap={wordWrap}
                onWordWrapChange={() => setWordWrap(!wordWrap)}
                darkMode={darkMode}
                onDarkModeChange={() => setDarkMode(!darkMode)}
                focusMode={focusMode}
                onFocusModeChange={() => {
                  setFocusMode(!focusMode);
                  setShowSidebar(focusMode);
                }}
                showPreview={showPreview}
                onShowPreviewChange={() => setShowPreview(!showPreview)}
                onNewDrawing={handleNewDrawing}
                onConvert={(converterId) => handleConvert(converterId)}
                onFormatJson={() => editorRef.current?.formatJson()}
                currentFile={activeTab ? tabs.find(tab => tab.id === activeTab) : null}
                setShowGitHubSettings={setShowGitHubSettings}
                onTodoClick={handleTodoClick}
                onQuickAddClick={handleQuickAddClick}
                showChat={showChat}
                onChatToggle={handleChatToggle}
                setSplitView={setSplitView}
                setRightTab={setRightTab}
                splitView={splitView}
              />
            </Box>

            <CommandBar
              open={showCommandBar}
              onClose={() => setShowCommandBar(false)}
              commands={commandList}
            />
            <GitHubSettingsModal
              open={showGitHubSettings}
              onClose={() => setShowGitHubSettings(false)}
            />
            <ApiKeyInput
              open={showApiSettings}
              onClose={() => setShowApiSettings(false)}
            />
            <QuickAddTask
              open={quickAddOpen}
              onClose={() => setQuickAddOpen(false)}
              onAddTask={handleQuickAddTask}
              darkMode={darkMode}
            />
            <CommandPalette
              isOpen={showCommandPalette}
              onClose={() => setShowCommandPalette(false)}
              onFileSelect={handleFileSelectFromCommandPalette}
              darkMode={darkMode}
            />
            
            <ResponsiveToolbar
              darkMode={darkMode}
              onDarkModeChange={() => setDarkMode(!darkMode)}
              onChatToggle={() => setShowChat(!showChat)}
              showChat={showChat}
              onSidebarToggle={() => setShowSidebar(!showSidebar)}
              showSidebar={showSidebar}
              onCopy={handleCopyContent}
              onClear={handleClearContent}
            />
            <Box sx={{ 
              display: 'flex', 
              flex: 1,
              overflow: 'hidden'
            }}>
              {/* Main Content Area */}
              <Box sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: showChat ? 'row' : 'column',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {/* Editor Area */}
                <Box 
                  onClick={handleEditorClick}
                  sx={{ 
                    flex: 1,
                    minWidth: 0,
                    position: 'relative',
                    overflow: 'auto',
                    // Add overlay when sidebar is shown in mobile
                    '&::after': {
                      content: '""',
                      display: { xs: showSidebar ? 'block' : 'none', md: 'none' },
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      bgcolor: 'rgba(0, 0, 0, 0.3)',
                      zIndex: 1,
                      pointerEvents: 'none' // Allow scrolling when overlay is shown
                    }
                  }}
                >
                  {splitView ? (
                    <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%' }}>
                      <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {activeTab && renderTab(tabs.find(tab => tab.id === activeTab))}
                      </Box>
                      <Box sx={{ flex: 1, overflow: 'auto', borderLeft: `1px solid ${theme.palette.divider}` }}>
                        {rightTab && renderTab(tabs.find(tab => tab.id === rightTab))}
                      </Box>
                    </Box>
                  ) : (
                    activeTab && renderTab(tabs.find(tab => tab.id === activeTab))
                  )}
                </Box>
                
                {showChat && (
                  <Box
                    sx={{
                      width: { xs: '100%', md: '50%' },
                      flexShrink: 0,
                      borderLeft: `1px solid ${theme.palette.divider}`,
                      bgcolor: theme.palette.background.paper,
                      position: { xs: 'fixed', md: 'relative' },
                      right: { xs: 0, md: 'auto' },
                      top: { xs: 0, md: 'auto' },
                      height: { xs: '100%', md: 'auto' },
                      zIndex: { xs: theme.zIndex.drawer + 1, md: 1 },
                    }}
                  >
                    <ChatBox />
                  </Box>
                )}
              </Box>

              {/* Right Sidebar */}
              {!focusMode && (showSidebar || window.innerWidth > 960) && !showChat && (
                <Box
              
                  sx={{
                    width: 250,
                    flexShrink: 0,
                    borderLeft: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.background.paper,
                    overflowY: 'auto',
                    position: 'relative',
                    zIndex: 1,
                    '@media (max-width: 960px)': {
                      position: 'fixed',
                      right: 0,
                      height: '100%',
                      transform: showSidebar ? 'translateX(0)' : 'translateX(100%)',
                      transition: 'transform 0.3s ease-in-out'
                    }
                  }}
                >
                  <TabList
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabSelect={handleTabSelect}
                    onTabClose={handleTabClose}
                    onTabRename={handleTabRename}
                    onTabAreaDoubleClick={handleTabAreaDoubleClick}
                    setRightTab={setRightTab}
                    splitView={splitView}
                  />
                </Box>
              )}
            </Box>
          </Suspense>
        )}
      </Box>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept=".txt,.md,.markdown,.json,.js,.jsx,.ts,.tsx,.html,.css,.yaml,.yml,.xml,.sql,.py,.excalidraw,.tldraw"
      />
    </ThemeProvider>
  );
}

export default App;

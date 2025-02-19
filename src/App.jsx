import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import Editor from './components/Editor';
import TabList from './components/TabList';
import Toolbar from './components/Toolbar';
import CommandBar from './components/CommandBar';
import ExcalidrawEditor from './components/ExcalidrawEditor';
import TLDrawEditor from './components/TLDrawEditor';
import GitHubSettingsModal from './components/GitHubSettingsModal';
import TodoManager from './components/TodoManager';
import QuickAddTask from './components/QuickAddTask';
import CommandPalette from './components/CommandPalette';
import GitHubService from './services/githubService';
import ChatBox from './components/ChatBox';
import ApiKeyInput from './components/ApiKeyInput';
import ResponsiveToolbar from './components/ResponsiveToolbar';
import TipTapEditor from './components/TipTapEditor'; // Import TipTapEditor
import QuickChat from './components/QuickChat';
import TabSwitcher from './components/TabSwitcher';
import { saveTabs, loadTabs, deleteDrawing, saveDrawing, loadTodoData, saveTodoData } from './utils/db';
import { isPWA } from './utils/pwaUtils';
import { createCommandList } from './utils/commands';
import { converters } from './utils/converters';
import { chatStorage } from './services/chatStorageService';
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
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [quickChatInput, setQuickChatInput] = useState('');
  const editorRef = useRef(null);
  const tipTapEditorRef = useRef(null); // Reference to the TipTap editor
  const sidebarTimeoutRef = useRef(null);
  const [showTabSwitcher, setShowTabSwitcher] = useState(false);

  const location = useLocation();

  // Handle direct hash URLs for tabs
  useEffect(() => {
    const hash = location.hash;
    if (hash && !location.pathname.includes('chat')) {
      const tabId = hash.slice(1); // Remove the # symbol
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        setActiveTab(tabId);
      }
    }
  }, [location.hash, tabs]);

  // Update document title based on selected tab, if not on Jarvis route
  useEffect(() => {
    if (!location.pathname.toLowerCase().includes('jarvis')) {
      const activeTabObj = tabs.find(tab => tab.id === activeTab);
      if (activeTabObj) {
        document.title = activeTabObj.name;
      } else {
        document.title = "notepad";
      }
    }
  }, [activeTab, tabs, location.pathname]);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      background: {
        default: darkMode ? '#161D26' : '#FFFCF0',
        paper: darkMode ? '#161D26' : '#FFFCF0',
      },
      divider: darkMode ? '#333333' : '#e0e0e0',
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#161D26' : '#f5f5f5',
            borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#333333' : '#e0e0e0'}`,
            boxShadow: 'none',
          }),
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#161D26' : '#f5f5f5',
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.mode === 'dark' ? '#007acc' : '#1976d2',
            },
          }),
        },
      },
      MuiTab: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#161D26' : '#f5f5f5',
            color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333',
            '&.Mui-selected': {
              backgroundColor: theme.palette.mode === 'dark' ? '#161D26' : '#ffffff',
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
        const urlParams = new URLSearchParams(window.location.search);
        const tabId = urlParams.get('tab');
        const shouldFocus = urlParams.get('focus') === 'true';
        const numericTabId = tabId ? parseInt(tabId, 10) : null;
        
        console.log('Initializing with:', {
          tabId,
          numericTabId,
          shouldFocus,
          savedTabs,
          hasMatchingTab: numericTabId && savedTabs.some(t => t.id === numericTabId)
        });

        if (savedTabs && savedTabs.length > 0) {
          setTabs(savedTabs);
          if (numericTabId && !isNaN(numericTabId) && savedTabs.some(t => t.id === numericTabId)) {
            console.log('Setting active tab to:', numericTabId);
            setActiveTab(numericTabId);
            if (shouldFocus) {
              setFocusMode(true);
              setShowSidebar(false);
            }
          } else {
            console.log('Falling back to first tab:', savedTabs[0].id);
            setActiveTab(savedTabs[0].id);
          }
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
  }, [location.search]);

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
      // Open tab switcher on Shift+Tab
      if (e.shiftKey && e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setShowTabSwitcher(true);
        return;
      }

      // Alt + C for quick chat
      if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowQuickChat(true);
        return;
      }

      // Exit focus mode and chat on Escape key
      if (e.key === 'Escape') {
        if (focusMode) {
          setFocusMode(false);
          setShowSidebar(true);
        }
        if (isChatFullscreen) {
          setIsChatFullscreen(false);
          setShowChat(false);
          setShowSidebar(true);
        } else if (showChat) {
          handleChatToggle();
        }
        return;
      }
      
      // Open chat in fullscreen with Ctrl/Cmd + Shift + C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleChatFullscreen();
        return;
      }

      // Handle Ctrl+K before any other key combinations
      if ((e.ctrlKey) && e.key.toLowerCase() === 'k') {
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
  }, [focusMode, showChat, isChatFullscreen]);

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

  const handleNewTab = ({ type = 'codemirror', name = '', content = '' } = {}) => {
    const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
    const newTab = {
      id: newId,
      name: name || (type === 'tiptap' ? `Note-${newId}.md` : `Code-${newId}.txt`),
      content: content,
      type: 'markdown',
      editorType: type
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

  const handleTabSelect = (id) => {
    // Save cursor position of current tab before switching
    if (activeTab && editorRef.current?.editorInstance) {
      const cursor = editorRef.current.editorInstance.getCursor();
      setTabs(prevTabs => prevTabs.map(tab => 
        tab.id === activeTab ? { ...tab, cursorPosition: cursor } : tab
      ));
    }
    setActiveTab(id);
  };

  const handleCursorChange = (tabId, cursor) => {
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.id === tabId ? { ...tab, cursorPosition: cursor } : tab
    ));
  };

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
      const isMarkdown = file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown');
      const newTab = {
        id: newId,
        name: file.name,
        content: isExcalidraw || isTLDraw ? JSON.parse(content) : content,
        type: isExcalidraw ? 'excalidraw' : isTLDraw ? 'tldraw' : 'markdown',
        editorType: isExcalidraw ? 'excalidraw' : 
                   isTLDraw ? 'tldraw' : 
                   isMarkdown ? 'tiptap' : 'codemirror'
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
        editorType: file.name.endsWith('.tldraw') ? 'tldraw' : 
                   (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown')) ? 'tiptap' : 'codemirror',
        path: file.path
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTab(newTab.id);
    }
  };

  const handleChatToggle = () => {
    const newChatState = !showChat;
    setShowChat(newChatState);
    // Reset fullscreen when toggling chat
    if (!newChatState) {
      setIsChatFullscreen(false);
    }
  };

  const handleChatFullscreen = () => {
    setShowChat(true);
    setIsChatFullscreen(true);
    setShowSidebar(false);
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

  const handleQuickChatSubmit = (text) => {
    setQuickChatInput(text);
    setShowChat(true);
    setShowQuickChat(false);
  };

  const handleMessageSent = () => {
    setQuickChatInput('');
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
        ref={editorRef}
        content={tab.content}
        onChange={(newContent) => handleContentChange(tab.id, newContent)}
        wordWrap={wordWrap}
        darkMode={darkMode}
        showPreview={showPreview}
        focusMode={focusMode}
        cursorPosition={tab.cursorPosition}
        onCursorChange={(cursor) => handleCursorChange(tab.id, cursor)}
        filename={tab.name}
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
      <Routes>
        <Route path="/jarvis" element={
          <Box sx={{ height: '100vh', width: '100vw' }}>
            <ChatBox 
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              fullScreen={true}
            />
          </Box>
        } />
        <Route path="/*" element={
          <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Rest of your existing App UI */}
            {!isLoading && (
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
                    editorRef={tipTapEditorRef}
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
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
                          ...(isChatFullscreen ? {
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            zIndex: theme.zIndex.drawer + 2,
                            bgcolor: 'background.default',
                          } : {
                            width: '40%',
                            minWidth: '400px',
                            maxWidth: '800px',
                            height: '100%',
                            position: 'relative',
                            borderLeft: `1px solid ${theme.palette.divider}`,
                          })
                        }}
                      >
                        <ChatBox 
                          onFullscreenChange={setIsChatFullscreen} 
                          initialFullscreen={isChatFullscreen}
                          initialInput={quickChatInput}
                          createNewSessionOnMount={quickChatInput !== ''} // Only create new session if coming from quick chat
                          onMessageSent={handleMessageSent}
                        />
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
              </>
            )}
          </Box>
        } />
      </Routes>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept=".txt,.md,.markdown,.json,.js,.jsx,.ts,.tsx,.html,.css,.yaml,.yml,.xml,.sql,.py,.excalidraw,.tldraw"
      />
      <QuickChat
        open={showQuickChat}
        onClose={() => setShowQuickChat(false)}
        onSubmit={handleQuickChatSubmit}
      />
      <TabSwitcher
        open={showTabSwitcher}
        onClose={() => setShowTabSwitcher(false)}
        tabs={tabs}
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
      />
    </ThemeProvider>
  );
}

export default App;

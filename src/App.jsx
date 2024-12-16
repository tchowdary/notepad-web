import { useState, useEffect, useRef } from 'react';
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
import { saveTabs, loadTabs, deleteDrawing, saveDrawing, loadTodoData, saveTodoData } from './utils/db';
import { isPWA } from './utils/pwaUtils';
import { createCommandList } from './utils/commands';
import { converters } from './utils/converters';
import './App.css';

function App() {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tabs, setTabs] = useState([{ id: 1, name: 'untitled.md', content: '', type: 'markdown', editorType: 'tiptap' }]);
  const [activeTab, setActiveTab] = useState(1);
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
  const editorRef = useRef(null);
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
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#eeeeee',
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

  // Handle mouse movement to show/hide sidebar in PWA mode
  useEffect(() => {
    if (!isPWA()) return;

    const handleMouseMove = (e) => {
      if (e.clientX <= 20) { // Show sidebar when mouse is near the left edge
        setShowSidebar(true);
        if (sidebarTimeoutRef.current) {
          clearTimeout(sidebarTimeoutRef.current);
        }
      } else if (e.clientX > 250) { // Hide sidebar when mouse moves away
        if (sidebarTimeoutRef.current) {
          clearTimeout(sidebarTimeoutRef.current);
        }
        sidebarTimeoutRef.current = setTimeout(() => {
          setShowSidebar(false);
        }, 1000);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
      }
    };
  }, []);

  // Load tabs from IndexedDB on mount
  useEffect(() => {
    const initTabs = async () => {
      try {
        setIsLoading(true);
        const savedTabs = await loadTabs();
        if (savedTabs && savedTabs.length > 0) {
          setTabs(savedTabs);
          setActiveTab(savedTabs[0].id);
        }
      } catch (error) {
        console.error('Error loading tabs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initTabs();
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
  }, []);

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

  const handleTabSelect = (id) => {
    setActiveTab(id);
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
      const isTLDraw = file.name.endsWith('.tldr');
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
    setTabs([...tabs, { id: newId, name: 'drawing.tldr', content: '', type: 'tldraw', editorType: 'tiptap' }]);
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

  const handleFileSelectFromCommandPalette = async (file) => {
    const content = await GitHubService.getFileContent(file.path);
    if (content !== null) {
      const newTab = {
        id: Date.now(),
        name: file.name,
        content,
        type: 'markdown',
        editorType: 'tiptap',
        path: file.path
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTab(newTab.id);
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

    return (
      <Editor
        content={tab.content}
        onChange={(newContent) => handleContentChange(tab.id, newContent)}
        wordWrap={wordWrap}
        darkMode={darkMode}
        showPreview={showPreview}
        focusMode={focusMode}
        ref={editorRef}
        editorType={tab.editorType}
      />
    );
  };

  if (isLoading) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {!focusMode && (
          <Toolbar 
            onNewTab={handleNewTab}
            onOpenFile={handleOpenFile}
            onSaveFile={handleSaveFile}
            wordWrap={wordWrap}
            onWordWrapChange={() => setWordWrap(!wordWrap)}
            darkMode={darkMode}
            onDarkModeChange={() => setDarkMode(!darkMode)}
            focusMode={focusMode}
            onFocusModeChange={() => setFocusMode(!focusMode)}
            showPreview={showPreview}
            onShowPreviewChange={() => setShowPreview(!showPreview)}
            onNewDrawing={handleNewDrawing}
            onConvert={(converterId) => handleConvert(converterId)}
            onFormatJson={() => editorRef.current?.formatJson()}
            currentFile={activeTab ? tabs.find(tab => tab.id === activeTab) : null}
            setShowGitHubSettings={setShowGitHubSettings}
            onTodoClick={handleTodoClick}
          />
        )}
        <CommandBar
          open={showCommandBar}
          onClose={() => setShowCommandBar(false)}
          commands={createCommandList({
            onNewTab: handleNewTab,
            onOpenFile: handleOpenFile,
            onSaveFile: handleSaveFile,
            onWordWrapChange: setWordWrap,
            onDarkModeChange: setDarkMode,
            onShowPreviewChange: setShowPreview,
            onNewDrawing: handleNewDrawing,
            onFocusModeChange: setFocusMode,
            onNewTLDraw: handleNewTLDraw,
            onConvert: handleConvert,
            onFormatJson: () => editorRef.current?.formatJson(),
            wordWrap,
            darkMode,
            showPreview,
            focusMode,
            setShowGitHubSettings,
            currentFile: activeTab ? tabs.find(tab => tab.id === activeTab) : null
          })}
        />
        <GitHubSettingsModal
          open={showGitHubSettings}
          onClose={() => setShowGitHubSettings(false)}
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
        <Box sx={{ 
          display: 'flex', 
          flex: 1,
          overflow: 'hidden',
          position: 'relative'
        }}>
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}>
            {activeTab && renderTab(tabs.find(tab => tab.id === activeTab))}
          </Box>
          {!focusMode && (
            <Box
              sx={{
                width: 250,
                flexShrink: 0,
                display: isPWA() && !showSidebar ? 'none' : 'block',
                transition: 'all 0.3s ease',
                borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                backgroundColor: (theme) => theme.palette.background.paper,
                position: 'relative',
                zIndex: 1
              }}
              onMouseEnter={() => {
                if (isPWA()) {
                  setShowSidebar(true);
                  if (sidebarTimeoutRef.current) {
                    clearTimeout(sidebarTimeoutRef.current);
                  }
                }
              }}
              onMouseLeave={() => {
                if (isPWA()) {
                  sidebarTimeoutRef.current = setTimeout(() => {
                    setShowSidebar(false);
                  }, 1000);
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
              />
            </Box>
          )}
        </Box>
      </Box>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept=".txt,.md,.markdown,.json,.js,.jsx,.ts,.tsx,.html,.css,.yaml,.yml,.xml,.sql,.py,.excalidraw,.tldr"
      />
    </ThemeProvider>
  );
}

export default App;

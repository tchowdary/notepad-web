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
import { saveTabs, loadTabs, deleteDrawing, saveDrawing, loadTodoData, saveTodoData } from './utils/db';
import { isPWA } from './utils/pwaUtils';
import { createCommandList } from './utils/commands';
import { converters } from './utils/converters';
import { syncNotes, fetchNotes, syncTodos, fetchTodos, generateUniqueId, archiveNote } from './services/supabaseService';
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
  const [todoData, setTodoData] = useState({
    inbox: [],
    archive: [],
    projects: {}
  });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const editorRef = useRef(null);
  const sidebarTimeoutRef = useRef(null);

  // Helper function to merge tabs based on most recent updates
  const mergeTabs = (localTabs, remoteTabs) => {
    const tabMap = new Map();
    let maxId = 0;
    
    // Add all local tabs to the map and track max ID
    localTabs.forEach(tab => {
      const id = parseInt(tab.id);
      maxId = Math.max(maxId, id);
      tabMap.set(id.toString(), tab);
    });
    
    // Update or add remote tabs if they're more recent
    remoteTabs.forEach(tab => {
      const id = parseInt(tab.id);
      maxId = Math.max(maxId, id);
      const localTab = tabMap.get(id.toString());
      if (!localTab || new Date(tab.updated_at) > new Date(localTab.updated_at)) {
        tabMap.set(id.toString(), {
          ...tab,
          id: parseInt(tab.id) // Ensure ID is a number
        });
      }
    });
    
    // Convert map values to array and sort by ID
    return Array.from(tabMap.values())
      .sort((a, b) => parseInt(a.id) - parseInt(b.id));
  };

  // Helper function to merge data based on timestamps
  const mergeData = (localData, remoteData) => {
    if (!remoteData.updated_at) return localData;
    if (!localData.updated_at) return remoteData;
    
    return new Date(remoteData.updated_at) > new Date(localData.updated_at)
      ? remoteData
      : localData;
  };

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

  useEffect(() => {
    const initTabs = async () => {
      try {
        setIsLoading(true);
        console.log('Loading tabs from IndexedDB...');
        // Load from IndexedDB first
        const savedTabs = await loadTabs();
        console.log('Loaded tabs from IndexedDB:', savedTabs);

        // Try to fetch from Supabase
        try {
          console.log('Fetching tabs from Supabase...');
          const supabaseTabs = await fetchNotes();
          console.log('Fetched tabs from Supabase:', supabaseTabs);

          if (supabaseTabs && Array.isArray(supabaseTabs) && supabaseTabs.length > 0) {
            // Merge tabs, preferring the most recently updated ones
            const mergedTabs = mergeTabs(savedTabs || [], supabaseTabs);
            console.log('Merged tabs:', mergedTabs);
            setTabs(mergedTabs);
            setActiveTab(mergedTabs[0]?.id);
            // Sync merged tabs back to IndexedDB
            await saveTabs(mergedTabs);
          } else {
            console.log('No tabs in Supabase, using IndexedDB data');
            if (savedTabs && savedTabs.length > 0) {
              setTabs(savedTabs);
              setActiveTab(savedTabs[0].id);
            } else {
              // Create default tab if no tabs exist
              const defaultTab = {
                id: generateUniqueId(),
                name: 'untitled.md',
                content: '',
                type: 'markdown',
                editorType: 'tiptap'
              };
              setTabs([defaultTab]);
              setActiveTab(defaultTab.id);
              await saveTabs([defaultTab]);
            }
          }
        } catch (error) {
          console.error('Error fetching from Supabase:', error);
          // If Supabase fails, use IndexedDB data
          if (savedTabs && savedTabs.length > 0) {
            setTabs(savedTabs);
            setActiveTab(savedTabs[0].id);
          } else {
            // Create default tab if no tabs exist
            const defaultTab = {
              id: generateUniqueId(),
              name: 'untitled.md',
              content: '',
              type: 'markdown',
              editorType: 'tiptap'
            };
            setTabs([defaultTab]);
            setActiveTab(defaultTab.id);
            await saveTabs([defaultTab]);
          }
        }
      } catch (error) {
        console.error('Error initializing tabs:', error);
        // Create default tab if everything fails
        const defaultTab = {
          id: generateUniqueId(),
          name: 'untitled.md',
          content: '',
          type: 'markdown',
          editorType: 'tiptap'
        };
        setTabs([defaultTab]);
        setActiveTab(defaultTab.id);
        try {
          await saveTabs([defaultTab]);
        } catch (e) {
          console.error('Error saving default tab:', e);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initTabs();
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
    const loadAndSyncTodoData = async () => {
      try {
        // Load from IndexedDB first
        const localTodoData = await loadTodoData();
        
        // Try to fetch from Supabase
        try {
          const supabaseTodoData = await fetchTodos();
          // Use the most recently updated data
          const mergedTodoData = mergeData(localTodoData, supabaseTodoData);
          setTodoData(mergedTodoData);
          // Sync merged data back to IndexedDB
          await saveTodoData(mergedTodoData);
        } catch (error) {
          console.error('Error fetching todos from Supabase:', error);
          setTodoData(localTodoData);
        }
      } catch (error) {
        console.error('Error loading todo data:', error);
      }
    };
    loadAndSyncTodoData();
  }, []);

  useEffect(() => {
    const syncData = async () => {
      try {
        await saveTodoData(todoData);
        await syncTodos(todoData);
      } catch (error) {
        console.error('Error syncing todo data:', error);
      }
    };
    syncData();
  }, [todoData]);

  useEffect(() => {
    if (!isLoading && tabs.length > 0) {  // Don't sync during initial load
      const syncData = async () => {
        try {
          console.log('Syncing tabs to storage...', tabs);
          await saveTabs(tabs);
          await syncNotes(tabs);
          console.log('Tabs synced successfully');
        } catch (error) {
          console.error('Error syncing tabs:', error);
        }
      };
      
      // Add a small delay to avoid too frequent syncs
      const timeoutId = setTimeout(syncData, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [tabs, isLoading]);

  const handleCloseTab = async (id) => {
    try {
      // Get the tab that's being closed
      const tabToClose = tabs.find(tab => tab.id === id);
      
      // Remove the tab from local state only
      const newTabs = tabs.filter(tab => tab.id !== id);
      
      // If we're closing the active tab, set a new active tab
      if (activeTab === id) {
        const index = tabs.findIndex(tab => tab.id === id);
        const newActiveTab = newTabs[index] || newTabs[index - 1] || newTabs[0];
        setActiveTab(newActiveTab ? newActiveTab.id : null);
      }
      
      setTabs(newTabs);

      // Mark the note as archived in Supabase instead of deleting
      try {
        await archiveNote(id);
      } catch (error) {
        console.error('Error archiving note in Supabase:', error);
      }

      // If it's a drawing, handle local cleanup
      if (tabToClose?.type === 'excalidraw') {
        try {
          await deleteDrawing(id);
        } catch (error) {
          console.error('Error deleting drawing from IndexedDB:', error);
        }
      }
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  };

  const handleNewTab = () => {
    const newId = generateUniqueId();
    const timestamp = new Date().toISOString();
    const newTab = {
      id: newId,
      name: 'untitled.md',
      content: '',
      type: 'markdown',
      editorType: 'tiptap',
      created_at: timestamp,
      updated_at: timestamp
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newId);
  };

  const handleDoubleClickSidebar = () => {
    const newId = generateUniqueId();
    const newTab = {
      id: newId,
      name: `Note-${newId}.md`,
      content: '',
      type: 'markdown',
      editorType: 'tiptap',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setTabs(prevTabs => [...prevTabs, newTab]);
    // Use requestAnimationFrame for smoother focus handling
    requestAnimationFrame(() => {
      setActiveTab(newId);
    });
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

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const newId = generateUniqueId();
      const isExcalidraw = file.name.endsWith('.excalidraw');
      const isTLDraw = file.name.endsWith('.tldr');
      const newTab = {
        id: newId,
        name: file.name,
        content: isExcalidraw || isTLDraw ? JSON.parse(content) : content,
        type: isExcalidraw ? 'excalidraw' : isTLDraw ? 'tldraw' : 'markdown',
        editorType: 'tiptap',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
    const timestamp = new Date().toISOString();
    const newId = generateUniqueId();
    setTabs([...tabs, { 
      id: newId, 
      name: `Drawing-${timestamp.slice(0, 19).replace(/[:.]/g, '-')}.${type}`, 
      content: '', 
      type: type,
      editorType: 'tiptap',
      created_at: timestamp,
      updated_at: timestamp
    }]);
    setActiveTab(newId);
  };

  const handleNewTLDraw = () => {
    const newId = generateUniqueId();
    setTabs([...tabs, { id: newId, name: 'drawing.tldr', content: '', type: 'tldraw', editorType: 'tiptap', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
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
    const newId = generateUniqueId();
    const newTab = {
      id: newId,
      name: 'Todo',
      content: '',
      type: 'todo',
      editorType: 'todo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
                onTabClose={handleCloseTab}
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

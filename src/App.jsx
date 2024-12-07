import { useState, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import Editor from './components/Editor';
import TabList from './components/TabList';
import Toolbar from './components/Toolbar';
import ExcalidrawEditor from './components/ExcalidrawEditor';
import { saveTabs, loadTabs, deleteDrawing, saveDrawing } from './utils/db';
import { isPWA } from './utils/pwaUtils';
import './App.css';

function App() {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tabs, setTabs] = useState([{ id: 1, name: 'untitled.md', content: '', type: 'markdown' }]);
  const [activeTab, setActiveTab] = useState(1);
  const [wordWrap, setWordWrap] = useState(() => {
    const saved = localStorage.getItem('wordWrap');
    return saved !== null ? saved === 'true' : true;
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [focusMode, setFocusMode] = useState(false);
  const [showPreview, setShowPreview] = useState(() => localStorage.getItem('showPreview') === 'true');
  const [showSidebar, setShowSidebar] = useState(true);
  const editorRef = useRef(null);
  const sidebarTimeoutRef = useRef(null);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      background: {
        default: darkMode ? '#1e1e1e' : '#ffffff',
        paper: darkMode ? '#252526' : '#f5f5f5',
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

  const handleNewTab = () => {
    const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
    setTabs([...tabs, { id: newId, name: 'untitled.md', content: '', type: 'markdown' }]);
    setActiveTab(newId);
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
      setTabs([{ id: 1, name: 'untitled.md', content: '', type: 'markdown' }]);
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
    setTabs(tabs.map(tab =>
      tab.id === id ? { ...tab, content: newContent } : tab
    ));
  };

  const handleTabAreaDoubleClick = (event) => {
    // Only create new tab if clicking on the tab area, not on existing tabs
    if (event.target.closest('.MuiTab-root') === null) {
      handleNewTab();
    }
  };

  const handleOpenFile = () => {
    fileInputRef.current.click();
  };

  const handleSaveFile = () => {
    const tab = tabs.find(tab => tab.id === activeTab);
    if (!tab) return;

    const blob = new Blob(
      [tab.type === 'excalidraw' ? JSON.stringify(tab.content) : tab.content],
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
      const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
      const isExcalidraw = file.name.endsWith('.excalidraw');
      const newTab = {
        id: newId,
        name: file.name,
        type: isExcalidraw ? 'excalidraw' : 'markdown',
        content: isExcalidraw ? '' : e.target.result
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

  const handleNewDrawing = () => {
    const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
    const newTab = { 
      id: newId, 
      name: `Drawing ${newId}.excalidraw`,
      type: 'excalidraw',
      content: '' // Content will be stored in drawings store
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newId);
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
      />
    );
  };

  if (isLoading) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary'
      }}>
        {!focusMode && (
          <Toolbar
            onNewTab={handleNewTab}
            onOpenFile={() => fileInputRef.current?.click()}
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
            onConvert={() => {}}
            currentFile={activeTab ? tabs.find(tab => tab.id === activeTab) : null}
          />
        )}
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
                onTabAreaDoubleClick={handleNewTab}
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
        accept=".txt,.md,.markdown,.json,.js,.jsx,.ts,.tsx,.html,.css,.yaml,.yml,.xml,.sql,.py,.excalidraw"
      />
    </ThemeProvider>
  );
}

export default App;

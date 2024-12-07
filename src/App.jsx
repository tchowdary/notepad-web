import { useState, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import Editor from './components/Editor';
import TabList from './components/TabList';
import Toolbar from './components/Toolbar';
import ExcalidrawEditor from './components/ExcalidrawEditor';
import { saveTabs, loadTabs } from './utils/db';
import { isPWA } from './utils/pwaUtils';
import './App.css';

function App() {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tabs, setTabs] = useState([{ id: 1, name: 'untitled.md', content: '' }]);
  const [activeTab, setActiveTab] = useState(1);
  const [wordWrap, setWordWrap] = useState(() => {
    const saved = localStorage.getItem('wordWrap');
    return saved !== null ? saved === 'true' : true;
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [focusMode, setFocusMode] = useState(false);
  const [showPreview, setShowPreview] = useState(() => localStorage.getItem('showPreview') === 'true');
  const [showDrawing, setShowDrawing] = useState(false);
  const [currentDrawingId, setCurrentDrawingId] = useState(null);
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
    setTabs([...tabs, { id: newId, name: 'untitled.md', content: '' }]);
    setActiveTab(newId);
  };

  const handleTabClose = (id) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(tab => tab.id !== id);
    setTabs(newTabs);
    if (activeTab === id) {
      // Find the nearest tab to switch to
      const closedTabIndex = tabs.findIndex(tab => tab.id === id);
      const newActiveTab = newTabs[Math.min(closedTabIndex, newTabs.length - 1)];
      setActiveTab(newActiveTab.id);
    }
  };

  const handleTabSelect = (id) => {
    setActiveTab(id);
  };

  const handleTabRename = (id, newName) => {
    setTabs(tabs.map(tab => 
      tab.id === id ? { ...tab, name: newName } : tab
    ));
  };

  const handleContentChange = (newContent) => {
    setTabs(tabs.map(tab =>
      tab.id === activeTab ? { ...tab, content: newContent } : tab
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

  const handleSaveFile = (id) => {
    const currentTab = tabs.find(tab => tab.id === id);
    if (!currentTab) return;

    const fileName = currentTab.name.endsWith('.md') 
      ? currentTab.name 
      : `${currentTab.name}.md`;
    
    const blob = new Blob([currentTab.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
        setTabs([...tabs, { id: newId, name: file.name, content: e.target.result }]);
        setActiveTab(newId);
      };
      reader.readAsText(file);
    }
    // Reset input value to allow opening the same file again
    event.target.value = null;
  };

  const handleNewDrawing = () => {
    setShowDrawing(true);
  };

  const handleConvert = (event) => {// Debug log
    if (editorRef.current) {
      const buttonElement = event.currentTarget;
      editorRef.current.setConverterMenuAnchor(buttonElement);
    }
  };

  if (isLoading) {
    return null;
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab);

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
            onConvert={handleConvert}
          />
        )}
        <Box sx={{ 
          display: 'flex', 
          flexGrow: 1, 
          overflow: 'hidden',
          position: 'relative',
          ...(focusMode && {
            backgroundColor: theme => theme.palette.background.paper,
          })
        }}>
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex',
            overflow: 'hidden',
            ...(focusMode && {
              maxWidth: '900px',
              margin: '0 auto',
              width: '100%'
            })
          }}>
            {showPreview ? (
              <>
                <Box sx={{ width: '50%', overflow: 'auto' }}>
                  <Editor
                    ref={editorRef}
                    content={activeTabContent?.content || ''}
                    onChange={handleContentChange}
                    wordWrap={wordWrap}
                    darkMode={darkMode}
                    showLineNumbers={!focusMode}
                  />
                </Box>
                <Box sx={{ width: '50%', overflow: 'auto', borderLeft: 1, borderColor: 'divider' }}>
                  <div dangerouslySetInnerHTML={{ __html: '' }} />
                </Box>
              </>
            ) : (
              <Editor
                ref={editorRef}
                content={activeTabContent?.content || ''}
                onChange={handleContentChange}
                wordWrap={wordWrap}
                darkMode={darkMode}
                showLineNumbers={!focusMode}
              />
            )}
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
        <ExcalidrawEditor
          open={showDrawing}
          onClose={() => setShowDrawing(false)}
          darkMode={darkMode}
          id={currentDrawingId}
        />
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.css,.html"
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;

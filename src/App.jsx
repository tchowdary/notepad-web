import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import Editor from './components/Editor';
import TabList from './components/TabList';
import Toolbar from './components/Toolbar';
import './App.css';

function App() {
  const [tabs, setTabs] = useState(() => {
    const savedTabs = localStorage.getItem('tabs');
    return savedTabs ? JSON.parse(savedTabs) : [{ id: 1, name: 'Untitled', content: '' }];
  });
  const [activeTab, setActiveTab] = useState(() => {
    const savedTabs = localStorage.getItem('tabs');
    if (savedTabs) {
      const parsedTabs = JSON.parse(savedTabs);
      return parsedTabs.length > 0 ? parsedTabs[0].id : 1;
    }
    return 1;
  });
  const [wordWrap, setWordWrap] = useState(() => {
    const saved = localStorage.getItem('wordWrap');
    return saved !== null ? saved === 'true' : true;
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [focusMode, setFocusMode] = useState(false);
  const [showPreview, setShowPreview] = useState(() => localStorage.getItem('showPreview') === 'true');

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      background: {
        default: darkMode ? '#1e1e1e' : '#ffffff',
        paper: darkMode ? '#1e1e1e' : '#f5f5f5',
      },
    },
  });

  useEffect(() => {
    localStorage.setItem('tabs', JSON.stringify(tabs));
  }, [tabs]);

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
    setTabs([...tabs, { id: newId, name: 'Untitled', content: '' }]);
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

  const handleFileOpen = (fileName, content) => {
    const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
    const newTab = { id: newId, name: fileName, content: content };
    setTabs([...tabs, newTab]);
    setActiveTab(newId);
  };

  const handleFileDownload = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
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

  // Find the current tab, fallback to the first tab if active tab is not found
  const currentTab = tabs.find(tab => tab.id === activeTab) || tabs[0];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
        overflow: 'hidden'
      }}>
        <Toolbar
          onNewTab={handleNewTab}
          wordWrap={wordWrap}
          onWordWrapToggle={() => setWordWrap(!wordWrap)}
          darkMode={darkMode}
          onDarkModeToggle={() => setDarkMode(!darkMode)}
          onFocusMode={() => setFocusMode(!focusMode)}
          showPreview={showPreview}
          onPreviewToggle={() => setShowPreview(!showPreview)}
          focusMode={focusMode}
          onFileOpen={handleFileOpen}
          onFileDownload={handleFileDownload}
          className={focusMode ? 'focus-mode-toolbar' : ''}
        />
        {!focusMode && (
          <TabList
            tabs={tabs}
            activeTab={activeTab}
            onTabClose={handleTabClose}
            onTabSelect={handleTabSelect}
            onTabRename={handleTabRename}
          />
        )}
        <Box sx={{ 
          flexGrow: 1, 
          position: 'relative',
          overflow: 'hidden',
          minHeight: 0,
          ...(focusMode && {
            maxWidth: '750px',
            margin: '0 auto',
            padding: '2rem',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            '& .CodeMirror': {
              flex: 1,
              fontSize: '18px',
              lineHeight: '1.8',
              padding: '20px 0',
              backgroundColor: 'transparent',
              height: 'auto !important'
            },
            '& .CodeMirror-lines': {
              padding: '0',
            },
            '& .CodeMirror-line': {
              padding: '0',
            },
            '& .CodeMirror-linenumbers': {
              display: 'none',
            },
            '& .CodeMirror-scroll': {
              minHeight: '100%',
            }
          })
        }}>
          <Editor
            content={currentTab.content}
            onChange={handleContentChange}
            wordWrap={wordWrap}
            darkMode={darkMode}
            showPreview={showPreview}
            focusMode={focusMode}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;

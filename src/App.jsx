import { useState, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import Editor from './components/Editor';
import TabList from './components/TabList';
import Toolbar from './components/Toolbar';
import './App.css';

function App() {
  const fileInputRef = useRef(null);
  const [tabs, setTabs] = useState(() => {
    const savedTabs = localStorage.getItem('tabs');
    return savedTabs ? JSON.parse(savedTabs) : [{ id: 1, name: 'untitled.md', content: '' }];
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

  const handleFileOpen = () => {
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Toolbar
          onNewTab={handleNewTab}
          onOpenFile={() => fileInputRef.current.click()}
          onSaveFile={() => handleSaveFile(activeTab)}
          wordWrap={wordWrap}
          onWordWrapChange={() => setWordWrap(!wordWrap)}
          darkMode={darkMode}
          onDarkModeChange={() => setDarkMode(!darkMode)}
          focusMode={focusMode}
          onFocusModeChange={() => setFocusMode(!focusMode)}
          showPreview={showPreview}
          onShowPreviewChange={() => setShowPreview(!showPreview)}
        />
        <Box sx={{ display: 'flex', flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
          <Box className="main-content">
            <Editor
              content={tabs.find(tab => tab.id === activeTab)?.content || ''}
              onChange={handleContentChange}
              wordWrap={wordWrap}
              darkMode={darkMode}
              focusMode={focusMode}
              showPreview={showPreview}
            />
          </Box>
          <TabList
            tabs={tabs}
            activeTab={activeTab}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            onTabRename={handleTabRename}
            onTabAreaDoubleClick={handleTabAreaDoubleClick}
          />
        </Box>
      </Box>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.css,.html"
      />
    </ThemeProvider>
  );
}

export default App;

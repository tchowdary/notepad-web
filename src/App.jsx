import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import Editor from './components/Editor';
import TabList from './components/TabList';
import Toolbar from './components/Toolbar';
import CommandBar from './components/CommandBar';
import ExcalidrawEditor from './components/ExcalidrawEditor';
import TLDrawEditor from './components/TLDrawEditor';
import GitHubSettingsModal from './components/GitHubSettingsModal';
import TodoManager from './components/TodoManager';
import TodoManagerNew from './components/TodoManagerNew';
import QuickAddTask from './components/QuickAddTask';
import CommandPalette from './components/CommandPalette';
import GitHubService from './services/githubService';
import DbSyncService from './services/dbSyncService';
import ChatBox from './components/ChatBox';
import ApiKeyInput from './components/ApiKeyInput';
import ResponsiveToolbar from './components/ResponsiveToolbar';
import TipTapEditor from './components/TipTapEditor'; // Import TipTapEditor
import TodoTask from './components/TodoTask'; // Import TodoTask component
import QuickChat from './components/QuickChat';
import TabSwitcher from './components/TabSwitcher';
import { saveTabs, loadTabs, deleteDrawing, saveDrawing, loadTodoData, saveTodoData, updateTabNoteIds } from './utils/db';
import { isPWA } from './utils/pwaUtils';
import { createCommandList } from './utils/commands';
import { converters } from './utils/converters';
import { chatStorage } from './services/chatStorageService';
import { openDB, TABS_STORE } from './utils/db';
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
  const [showMsTodo, setShowMsTodo] = useState(false);
  const [isMsTodoFullscreen, setIsMsTodoFullscreen] = useState(false);
  const editorRef = useRef(null);
  const tipTapEditorRef = useRef(null); // Reference to the TipTap editor
  const sidebarTimeoutRef = useRef(null);
  const [showTabSwitcher, setShowTabSwitcher] = useState(false);
  const [settings, setSettings] = useState({ autoSync: true });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

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
        default: darkMode ? '#1f1a24' : '#FFFCF0',
        paper: darkMode ? '#1f1a24' : '#FFFCF0',
      },
      divider: darkMode ? '#333333' : '#e0e0e0',
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#1f1a24' : '#f5f5f5',
            borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#333333' : '#e0e0e0'}`,
            boxShadow: 'none',
          }),
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#1f1a24' : '#f5f5f5',
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.mode === 'dark' ? '#007acc' : '#1976d2',
            },
          }),
        },
      },
      MuiTab: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? '#1f1a24' : '#f5f5f5',
            color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333',
            '&.Mui-selected': {
              backgroundColor: theme.palette.mode === 'dark' ? '#1f1a24' : '#ffffff',
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
    // Reload settings for database sync service when they change
    DbSyncService.loadSettings();
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'proxy_url' || e.key === 'proxy_key') {
        DbSyncService.loadSettings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const performSync = async () => {
      // Don't sync if the user has disabled auto-sync
      const autoSyncEnabled = localStorage.getItem('autoSync') !== 'false';
      if (!autoSyncEnabled) {
        return;
      }

      try {
        // Use the DbSyncService instance directly
        const syncService = DbSyncService;
        
        // Update the sync service with current settings from localStorage
        syncService.settings = {
          proxyUrl: localStorage.getItem('proxy_url'),
          proxyKey: localStorage.getItem('proxy_key')
        };
        
        // Check if sync service is properly configured
        if (!syncService.isConfigured()) {
          console.log('Sync service not configured, skipping auto-sync');
          return;
        }
        
        console.log('Starting auto-sync...');
        
        // Perform the sync operation
        const syncResults = await syncService.syncAllNotes();
        
        if (syncResults && syncResults.length > 0) {
          console.log(`Auto-sync completed with ${syncResults.length} notes synced`);
          
          // First update IndexedDB
          await updateTabNoteIds(syncResults);
          
          // Then reload tabs from IndexedDB to ensure state is in sync
          const freshTabs = await loadTabs();
          setTabs(freshTabs);
        } else {
          console.log('No notes needed syncing');
        }
      } catch (error) {
        console.error('Error during auto-sync:', error);
      }
    };

    // Make sure DbSyncService's auto-sync is stopped
    DbSyncService.stopAutoSync();

    // Run sync immediately when component mounts
    performSync();
    
    // Set up interval for periodic sync
    const syncInterval = setInterval(performSync, 60000); // Every 1 minute

    // Clean up interval on unmount
    return () => {
      clearInterval(syncInterval);
      // Make sure to stop any running auto-sync when unmounting
      DbSyncService.stopAutoSync();
    };
  }, [isLoading]);

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
        if (isMsTodoFullscreen) {
          setIsMsTodoFullscreen(false);
          setShowMsTodo(false);
          setShowSidebar(true);
        } else if (showMsTodo) {
          handleMsTodoClick();
        }
        return;
      }
      
      // Open chat in fullscreen with Ctrl/Cmd + Shift + C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleChatFullscreen();
        return;
      }

      // Open Todo Manager in fullscreen with Ctrl/Cmd + Shift + T
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleMsTodoFullscreen();
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
  }, [focusMode, showChat, isChatFullscreen, showMsTodo, isMsTodoFullscreen]);

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
    let tabName = name;
    let tabType = 'markdown';
    let editorType = type;
    let completed = false;
    let dueDate = '';
    
    if (!name) {
      if (type === 'tiptap') {
        tabName = `Note-${newId}.md`;
      } else if (type === 'codemirror') {
        tabName = `Code-${newId}.txt`;
      } else if (type === 'todo') {
        tabName = `Task-${newId}.todo`;
        // Initialize with empty content
        content = '';
      }
    }
    
    const newTab = {
      id: newId,
      name: tabName,
      content: content,
      type: tabType,
      editorType: editorType,
      completed: completed,
      dueDate: dueDate
    };
    setTabs(prevTabs => [...prevTabs, newTab]);
    // Use requestAnimationFrame for smoother focus handling
    requestAnimationFrame(() => {
      setActiveTab(newId);
    });
  };

  const handleDoubleClickSidebar = (options = {}) => {
    handleNewTab({ type: options.type || 'tiptap' });
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
        return { 
          ...tab, 
          name: newName,
          lastModified: new Date().toISOString() // Add timestamp for sync tracking
        };
      }
      return tab;
    }));
  };

  const handleTabSelect = async (tabId) => {
    // Load the latest data for this tab from IndexedDB
    try {
      const updatedTabs = await loadTabs();
      setTabs(updatedTabs);
      setActiveTab(tabId);
    } catch (error) {
      console.error('Error loading updated tabs:', error);
      setActiveTab(tabId); // Still switch tabs even if update fails
    }
  };

  const handleCursorChange = (tabId, cursor) => {
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.id === tabId ? { ...tab, cursorPosition: cursor } : tab
    ));
  };

  const handleContentChange = (id, newContent, attributes = {}) => {
    setTabs(prevTabs => {
      const updatedTabs = prevTabs.map(tab =>
        tab.id === id ? { 
          ...tab, 
          content: newContent,
          lastModified: new Date().toISOString(), // Add timestamp for sync tracking
          // Add any additional attributes passed (like completed and dueDate)
          ...(attributes.completed !== undefined ? { completed: attributes.completed } : {}),
          ...(attributes.dueDate !== undefined ? { dueDate: attributes.dueDate } : {})
        } : tab
      );
      return updatedTabs;
    });
  };

  const handleTabAreaDoubleClick = (options = {}) => {
    // If event is provided, only create new tab if clicking on the tab area, not on existing tabs
    if (!options.event || options.event.target.closest('.MuiTab-root') === null) {
      handleNewTab({ type: options.type || 'tiptap' });
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
    // Check if it's a database note with base64 encoded content
    if (file.noteId && file.content) {
      try {
        // Try to decode base64 content if it appears to be encoded
        const isBase64 = /^[A-Za-z0-9+/=]+$/.test(file.content.replace(/\s/g, ''));
        const decodedContent = isBase64 ? atob(file.content) : file.content;
        
        // Determine editor type based on file extension
        let type = 'markdown';
        let editorType = 'codemirror';
        
        if (file.name.endsWith('.tldraw')) {
          type = 'tldraw';
          editorType = 'tldraw';
        } else if (file.name.toLowerCase().endsWith('.todo')) {
          type = 'todo';
          editorType = 'todo';
        } else if (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown')) {
          type = 'markdown';
          editorType = 'tiptap';
        }
        
        // Extract due date and completed status from API response
        let dueDate = '';
        let completed = false;
        
        // Map API status field to completed boolean
        if (file.status === 'CLOSED') {
          completed = true;
        }
        
        // Map API due_date field to dueDate
        if (file.due_date) {
          dueDate = file.due_date;
        }
        
        // Create a new tab with the decoded content and extracted fields
        const newTab = {
          id: Date.now(),
          name: file.name,
          content: decodedContent,
          noteId: file.noteId,
          lastSynced: new Date().toISOString(),
          type,
          editorType,
          completed,
          dueDate
        };
        
        // Add the new tab and set it as active
        setTabs(prevTabs => [...prevTabs, newTab]);
        setActiveTab(newTab.id);
        return;
      } catch (error) {
        console.error('Error decoding note content:', error);
      }
    }
    
    // Handle GitHub files as before
    if (file.path && file.name) {
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

  const handleMsTodoClick = () => {
    const newTodoState = !showMsTodo;
    setShowMsTodo(newTodoState);
    // Reset fullscreen when toggling todo manager
    if (!newTodoState) {
      setIsMsTodoFullscreen(false);
    }
  };

  const handleMsTodoFullscreen = () => {
    setShowMsTodo(true);
    setIsMsTodoFullscreen(true);
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

  const handleTabsUpdate = async () => {
    try {
      const updatedTabs = await loadTabs();
      setTabs(updatedTabs);
    } catch (error) {
      console.error('Error loading updated tabs:', error);
    }
  };

  const handleSetRightTab = async (tabId) => {
    // Load the latest data for this tab from IndexedDB
    try {
      const updatedTabs = await loadTabs();
      setTabs(updatedTabs);
      setRightTab(tabId);
    } catch (error) {
      console.error('Error loading updated tabs:', error);
      setRightTab(tabId); // Still switch tabs even if update fails
    }
  };

  const handleManualSync = async () => {
    try {
      // Show syncing status to the user
      setSyncStatus('Syncing notes...');
      setIsSyncing(true);
      
      // Use the DbSyncService instance directly
      const syncService = DbSyncService;
      
      // Update the sync service with current settings
      syncService.settings = {
        proxyUrl: localStorage.getItem('proxy_url'),
        proxyKey: localStorage.getItem('proxy_key')
      };
      
      // Check if sync service is properly configured
      if (!syncService.isConfigured()) {
        setSyncStatus('Sync service not configured. Please check your settings.');
        setIsSyncing(false);
        return;
      }
      
      console.log('Starting manual sync...');
      
      // Sync the Todo file first if it exists
      const todoTab = tabs.find(tab => tab.name === 'Todo');
      if (todoTab) {
        console.log('Syncing Todo file...');
        const todoResult = await syncService.syncNote(todoTab);
        if (todoResult && todoResult.noteId) {
          // Update the Todo tab with the noteId
          const updatedTabs = [...tabs];
          const todoIndex = updatedTabs.findIndex(tab => tab.id === todoTab.id);
          if (todoIndex !== -1) {
            updatedTabs[todoIndex] = {
              ...updatedTabs[todoIndex],
              noteId: todoResult.noteId,
              lastSynced: new Date().toISOString()
            };
            setTabs(updatedTabs);
          }
        }
      }
      
      // Then sync all other notes
      const syncResults = await syncService.syncAllNotes();
      
      // Update the tabs state with the noteIds from the sync results
      if (syncResults && syncResults.length > 0) {
        // First update IndexedDB
        await updateTabNoteIds(syncResults);
        
        // Then reload tabs from IndexedDB to ensure state is in sync
        const freshTabs = await loadTabs();
        setTabs(freshTabs);
        
        // Update sync status
        setSyncStatus(`Synced ${syncResults.length} notes successfully.`);
      } else {
        setSyncStatus('No notes needed syncing.');
      }
    } catch (error) {
      console.error('Error during manual sync:', error);
      setSyncStatus(`Error during sync: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTabContentChange = (tabId, newContent, additionalData = {}) => {
    setTabs(prevTabs => {
      return prevTabs.map(tab => {
        if (tab.id === tabId) {
          // Update the tab with new content and any additional data
          const updatedTab = { ...tab, content: newContent };
          
          // Handle additional data like completed status or due date
          if (additionalData.completed !== undefined) {
            updatedTab.completed = additionalData.completed;
          }
          
          if (additionalData.dueDate !== undefined) {
            updatedTab.dueDate = additionalData.dueDate;
          }
          
          return updatedTab;
        }
        return tab;
      });
    });
  };

  const handleTabNameChange = (tabId, newName) => {
    setTabs(prevTabs => {
      return prevTabs.map(tab => {
        if (tab.id === tabId) {
          // Add .todo extension if not already present
          let displayName = newName;
          if (!displayName.toLowerCase().endsWith('.todo')) {
            displayName = `${displayName}.todo`;
          }
          
          // Update the tab name
          return { ...tab, name: displayName };
        }
        return tab;
      });
    });
    
    // If this is a todo, also update it in the database
    const tab = tabs.find(tab => tab.id === tabId);
    if (tab && tab.noteId && tab.editorType === 'todo') {
      DbSyncService.updateNote({
        id: tab.noteId,
        name: newName // Store the original name without extension in the database
      });
    }
  };

  const handleOpenTodo = async (todo) => {
    // Check if this todo is already open in a tab
    const existingTab = tabs.find(tab => tab.noteId === todo.id);
    
    if (existingTab) {
      // If the tab is already open, switch to it
      setActiveTab(existingTab.id);
      setShowMsTodo(false); // Close the todo manager
    } else {
      try {
        // Fetch the complete todo data from the proxy API
        const fullTodo = await DbSyncService.getNoteById(todo.id);
        
        if (!fullTodo) {
          console.error('Failed to fetch todo data');
          return;
        }
        
        // Create a new tab for this todo
        const newId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
        
        // Decode content if needed
        let content = '';
        if (fullTodo.content) {
          try {
            content = decodeURIComponent(escape(atob(fullTodo.content)));
          } catch (e) {
            console.error('Error decoding todo content:', e);
            content = fullTodo.content;
          }
        }
        
        // Add .todo extension to the name if not already present
        let displayName = fullTodo.name || '';
        if (!displayName.toLowerCase().endsWith('.todo')) {
          displayName = `${displayName}.todo`;
        }
        
        const newTab = {
          id: newId,
          name: displayName,
          content: content,
          noteId: fullTodo.id,
          type: 'markdown',
          editorType: 'todo',
          completed: fullTodo.status === 'CLOSED',
          dueDate: fullTodo.due_date || ''
        };
        
        setTabs(prevTabs => [...prevTabs, newTab]);
        setActiveTab(newId);
        setShowMsTodo(false); // Close the todo manager
      } catch (error) {
        console.error('Error opening todo in tab:', error);
      }
    }
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
    onChatToggle: handleChatToggle,
    onManualSync: handleManualSync
  });

  const renderTab = (tab) => {
    // Check if tab is undefined or null
    if (!tab) {
      console.warn('Attempted to render undefined tab');
      return null;
    }
    
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
      // Use TodoManager for the main Todo list
      if (tab.name === 'Todo') {
        return (
          <TodoManager 
            tasks={todoData}
            onTasksChange={setTodoData}
          />
        );
      }
      
      // Use TodoTask for individual .todo files
      return (
        <TodoTask
          ref={editorRef}
          id={tab.id}
          content={tab.content}
          completed={tab.completed}
          dueDate={tab.dueDate}
          name={tab.name ? tab.name.replace(/\.todo$/i, '') : ''} // Remove .todo extension for display
          onChange={(newContent, attributes) => handleTabContentChange(tab.id, newContent, attributes)}
          onNameChange={(newName) => handleTabNameChange(tab.id, newName)}
          darkMode={darkMode}
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
          onFocusModeChange={() => {
            setFocusMode(!focusMode);
            setShowSidebar(focusMode);
          }}
        />
      );
    }
    
    // Use TodoTask component for todo type
    if (tab.editorType === 'todo') {
      return (
        <TodoTask
          ref={editorRef}
          id={tab.id}
          content={tab.content}
          completed={tab.completed}
          dueDate={tab.dueDate}
          onChange={(newContent, attributes) => handleContentChange(tab.id, newContent, attributes)}
          onNameChange={(newName) => handleTabNameChange(tab.id, newName)}
          darkMode={darkMode}
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
                    setRightTab={handleSetRightTab}
                    splitView={splitView}
                    editorRef={tipTapEditorRef}
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isSyncing={isSyncing}
                    syncStatus={syncStatus}
                    onCommandPaletteOpen={() => setShowCommandPalette(true)}
                    onMsTodoClick={handleMsTodoClick}
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
                  onChatToggle={() => {
                    setShowChat(!showChat);
                    if (!showChat) {
                      setIsChatFullscreen(true);
                    }
                  }}
                  showChat={showChat}
                  onSidebarToggle={() => setShowSidebar(!showSidebar)}
                  showSidebar={showSidebar}
                  onCopy={handleCopyContent}
                  onClear={handleClearContent}
                  onCommandPaletteOpen={() => setShowCommandPalette(true)}
                  onMsTodoClick={handleMsTodoClick}
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
                    flexDirection: 'row',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {/* Editor Area */}
                    <Box 
                      onClick={handleEditorClick}
                      sx={{ 
                        flex: (showChat || showMsTodo) ? '0 1 60%' : 1,
                        minWidth: 0,
                        position: 'relative',
                        overflow: 'auto',
                        transition: 'flex 0.3s ease',
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
                          pointerEvents: 'none'
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
                            flex: '0 0 40%',
                            minWidth: { xs: '300px', sm: '350px', md: '400px' },
                            maxWidth: '800px',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            transition: 'flex 0.3s ease',
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

                    {showMsTodo && (
                      <Box 
                        sx={{ 
                          ...(isMsTodoFullscreen ? {
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            zIndex: theme.zIndex.drawer + 2,
                            bgcolor: 'background.default',
                          } : {
                            flex: '0 0 40%',
                            minWidth: { xs: '300px', sm: '350px', md: '400px' },
                            maxWidth: '800px',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            transition: 'flex 0.3s ease',
                          })
                        }}
                      >
                        <TodoManagerNew 
                          darkMode={darkMode}
                          onOpenTodo={handleOpenTodo}
                          tabs={tabs}
                          activeTab={activeTab}
                          onFullscreenChange={setIsMsTodoFullscreen}
                          isFullscreen={isMsTodoFullscreen}
                        />
                      </Box>
                    )}
                  </Box>

                  {/* Right Sidebar */}
                  {!focusMode && (showSidebar || window.innerWidth > 960) && !showChat && !showMsTodo && (
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
                        setRightTab={handleSetRightTab}
                        splitView={splitView}
                        onTabsUpdate={handleTabsUpdate}
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

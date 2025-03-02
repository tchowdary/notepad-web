import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  useTheme,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  ListItemIcon,
  Input,
  Modal,
  InputBase,
  InputAdornment,
  Fab,
  Switch,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { 
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Fullscreen as FullscreenIcon,
  Key as KeyIcon,
  ContentCopy as CopyIcon,
  AutoFixHigh as AutoFixHighIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as MarkdownIcon,
  Check as CheckIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  sendOpenAIMessage,
  sendAnthropicMessage,
  sendGeminiMessage,
  sendDeepSeekMessage,
  sendGroqMessage,
  sendProxyMessage,
  getAvailableProviders,
  getAISettings,
} from '../services/aiService';
import { chatStorage } from '../services/chatStorageService';
import { customInstructionsStorage } from '../services/customInstructionsService';
import ApiKeyInput from './ApiKeyInput';
import VoiceRecorder from './VoiceRecorder';
import { processTranscription } from '../services/llmService';
import { generateText } from '../services/llmService';
import { setJarvisFavicon, restoreOriginalFavicon } from '../utils/faviconUtils';
import fileService from '../services/fileService'; // Import fileService

const generateTitleFromUserMessage = async ({ message }) => {
  try {
    let messageText = '';
    if (Array.isArray(message.content)) {
      const textContent = message.content.find(item => item.type === 'text');
      messageText = textContent ? textContent.text : 'New Chat';
    } else if (typeof message.content === 'string') {
      messageText = message.content;
    }

    // Truncate message to first 300 characters for title generation
    const truncatedMessage = messageText.slice(0, 300);
    const isMessageTruncated = messageText.length > 300;
    const titlePrompt = isMessageTruncated ? `${truncatedMessage}...` : truncatedMessage;

    const { text: title } = await generateText({
      model: 'gpt-4o-mini',
      system: `
        - you will generate a short title based on the first message a user begins a conversation with
        - ensure it is not more than 80 characters long
        - the title should be a summary of the user's message
        - do not use quotes or colons`,
      prompt: titlePrompt
    });

    return title || messageText.slice(0, 80); // Fallback to simple title if AI fails
  } catch (error) {
    console.error('Error generating title:', error);
    // Fallback to simple title generation if AI fails
    if (Array.isArray(message.content)) {
      const textContent = message.content.find(item => item.type === 'text');
      return textContent ? textContent.text.slice(0, 80) : 'New Chat';
    }
    return typeof message.content === 'string' ? message.content.slice(0, 80) : 'New Chat';
  }
};

const ChatBox = ({ onFullscreenChange, initialFullscreen, initialInput = '', createNewSessionOnMount = false, onMessageSent, fullScreen = false, darkMode, setDarkMode }) => {
  const theme = useTheme();
  const [darkModeState, setDarkModeState] = useState(theme?.palette?.mode === 'dark');
  
  // Create a safe theme accessor
  const getThemeColor = (path, fallback) => {
    try {
      return path.split('.').reduce((obj, key) => obj[key], theme) || fallback;
    } catch (e) {
      return fallback;
    }
  };

  // Replace the direct theme usage with a memoized theme object
  const themeStyles = useMemo(() => ({
    root: {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: fullScreen ? '100%' : '400px',
      backgroundColor: getThemeColor('palette.background.default', darkModeState ? '#1e1e1e' : '#FFFCF0'),
      borderLeft: `1px solid ${getThemeColor('palette.divider', darkModeState ? '#333333' : '#e0e0e0')}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      transition: 'width 0.3s ease',
    },
    messageContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      backgroundColor: getThemeColor('palette.background.default', darkModeState ? '#1e1e1e' : '#FFFCF0'),
    },
    messageContent: {
      fontFamily: 'Geist, sans-serif',
      fontSize: '14px',
      color: getThemeColor('palette.text.primary', darkModeState ? '#cccccc' : '#666666'),
      fontStyle: 'italic',
      backgroundColor: getThemeColor('palette.action.hover', darkModeState ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'),
      padding: '8px 12px',
      borderRadius: '4px',
      marginBottom: '8px',
      whiteSpace: 'pre-wrap'
    },
    input: {
      position: 'absolute',
      bottom: 0,
      left: fullScreen ? '300px' : 0,
      right: 0,
      backgroundColor: getThemeColor('palette.background.default', darkModeState ? '#1e1e1e' : '#FFFCF0'),
      borderTop: `1px solid ${getThemeColor('palette.divider', darkModeState ? '#333333' : '#e0e0e0')}`,
      zIndex: 1,
      width: fullScreen ? 'calc(100% - 300px)' : '100%',
    },
    // Common theme values
    text: {
      primary: getThemeColor('palette.text.primary', darkModeState ? '#ffffff' : '#000000'),
      secondary: getThemeColor('palette.text.secondary', darkModeState ? '#cccccc' : '#666666'),
    },
    background: {
      default: getThemeColor('palette.background.default', darkModeState ? '#1e1e1e' : '#FFFCF0'),
      paper: getThemeColor('palette.background.paper', darkModeState ? '#2d2d2d' : '#ffffff'),
    },
    action: {
      hover: getThemeColor('palette.action.hover', darkModeState ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'),
    },
    primary: {
      main: getThemeColor('palette.primary.main', '#1976d2'),
      dark: getThemeColor('palette.primary.dark', '#1565c0'),
      light: getThemeColor('palette.primary.light', '#42a5f5'),
      contrastText: getThemeColor('palette.primary.contrastText', '#ffffff'),
    },
    divider: getThemeColor('palette.divider', darkModeState ? '#333333' : '#e0e0e0'),
  }), [theme, darkModeState, fullScreen]);

  // Update all theme references to use flattened structure
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const [historyAnchorEl, setHistoryAnchorEl] = useState(null);
  const [customInstructions, setCustomInstructions] = useState([]);
  const [selectedInstruction, setSelectedInstruction] = useState(null);
  const [instructionDialogOpen, setInstructionDialogOpen] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [newInstructionName, setNewInstructionName] = useState('');
  const [newInstructionContent, setNewInstructionContent] = useState('');
  const [instructionMenuAnchorEl, setInstructionMenuAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(fullScreen || initialFullscreen || false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [parsedStreamingContent, setParsedStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [modelSettings, setModelSettings] = useState(() => {
    // Initialize with the current settings from localStorage
    return getAISettings();
  });
  const streamingContentRef = useRef('');
  const thinkingContentRef = useRef('');
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewMessage, setIsNewMessage] = useState(false);

  const initialized = useRef(false);

  const handleSendMessage = useCallback(async () => {
    if ((!input.trim() && !selectedFile) || !selectedProvider || isLoading) return;
    setError('');
    setIsLoading(true);
    setIsNewMessage(true);

    try {
      // Validate provider format
      if (!selectedProvider.includes('|')) {
        throw new Error('Invalid provider format. Expected "provider|model"');
      }
      
      const [providerName, modelId] = selectedProvider.split('|');
      
      if (!providerName || !modelId) {
        throw new Error('Invalid provider or model selection');
      }
      
      const messageContent = [];

      // Check if an image or file is selected
      if (selectedFile) {
        if (selectedFile.type === 'markdown' || selectedFile.type === 'csv') {
          messageContent.push({
            type: 'text',
            text: selectedFile.data,
            url: selectedFile.url
          });
        } else if (selectedFile.type === 'pdf') {
          messageContent.push({
            type: 'pdf',
            media_type: selectedFile.mediaType,
            data: selectedFile.data,
            url: selectedFile.url
          });
        } else if (selectedFile.type.startsWith('image')) {
          messageContent.push({
            type: 'image',
            media_type: selectedFile.mediaType,
            data: selectedFile.data,
            url: selectedFile.url
          });
        }
      }

      // Include text input and file URL if available
      if (input.trim() || (selectedFile && selectedFile.url)) {
        const textContent = [
          input.trim(),
          selectedFile?.url ? `\nFile URL: ${selectedFile.url}` : ''
        ].filter(Boolean).join('');

        messageContent.push({
          type: 'text',
          text: textContent
        });
      }

      const newMessage = {
        role: 'user',
        content: messageContent,
        timestamp: new Date().toISOString()
      };

      // Update messages state with user message
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      
      // Generate title if this is the first message in the session
      if (messages.length === 0) {
        try {
          const title = await generateTitleFromUserMessage({ message: newMessage });
          const session = await chatStorage.getSession(activeSessionId);
          if (session) {
            const updatedSession = {
              ...session,
              title,
              messages: updatedMessages,
              lastUpdated: new Date().toISOString()
            };
            await chatStorage.saveSession(updatedSession);
            
            // Update sessions state to reflect the new title
            const updatedSessions = await chatStorage.getAllSessions();
            setSessions(updatedSessions);
          }
        } catch (titleError) {
          console.error('Error generating title:', titleError);
          // Continue with the chat even if title generation fails
        }
      }
      
      setInput('');
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }

      try {
        let apiKey;
        if (providerName === 'proxy') {
          apiKey = localStorage.getItem('proxy_key');
          if (!apiKey) {
            throw new Error('No proxy API key found. Please configure the proxy API key.');
          }
        } else {
          apiKey = localStorage.getItem(`${providerName}_api_key`);
          if (!apiKey) {
            throw new Error(`No API key found for ${providerName}`);
          }
        }

        let finalResponse;
        if (providerName === 'gemini') {
          const response = await sendGeminiMessage(updatedMessages, modelId, apiKey, selectedInstruction);
          finalResponse = response;
          const newUpdatedMessages = [...updatedMessages, finalResponse];
          setMessages(newUpdatedMessages);
          
          if (activeSessionId) {
            const existingSession = await chatStorage.getSession(activeSessionId);
            await chatStorage.saveSession({
              ...existingSession,
              messages: newUpdatedMessages,
              lastUpdated: new Date().toISOString()
            });
          }
        } else {
          setIsStreaming(true);
          setStreamingContent('');
          setParsedStreamingContent('');
          streamingContentRef.current = '';
          thinkingContentRef.current = '';
          
          const handleStream = (content, type) => {
            if (!content) return; // Skip empty content
            
            if (type === 'thinking') {
              thinkingContentRef.current += content;
              setStreamingContent(thinkingContentRef.current);
              setParsedStreamingContent(renderMessageContent([
                {
                  type: 'thinking',
                  content: thinkingContentRef.current
                }
              ]));
            } else {
              // Don't clear thinking content, keep both
              streamingContentRef.current += content;
              setStreamingContent(streamingContentRef.current);
              // Show both thinking and text content while streaming
              setParsedStreamingContent(renderMessageContent([
                {
                  type: 'thinking',
                  content: thinkingContentRef.current
                },
                {
                  type: 'text',
                  text: streamingContentRef.current
                }
              ]));
            }
          };

          let sendMessagePromise;
          
          try {
            if (providerName === 'proxy') {
              sendMessagePromise = sendProxyMessage(updatedMessages, modelId, apiKey, selectedInstruction, handleStream);
            } else if (providerName === 'openai') {
              sendMessagePromise = sendOpenAIMessage(updatedMessages, modelId, apiKey, selectedInstruction, handleStream);
            } else if (providerName === 'groq') {
              sendMessagePromise = sendGroqMessage(updatedMessages, modelId, apiKey, selectedInstruction, handleStream);
            } else if (providerName === 'deepseek') {
              sendMessagePromise = sendDeepSeekMessage(updatedMessages, modelId, apiKey, selectedInstruction, handleStream);
            } else {
              sendMessagePromise = sendAnthropicMessage(updatedMessages, modelId, apiKey, selectedInstruction, handleStream);
            }
            
            await sendMessagePromise;
          } catch (streamError) {
            console.error('Error during streaming:', streamError);
            throw streamError;
          }

          finalResponse = {
            role: 'assistant',
            content: [
              ...(thinkingContentRef.current ? [{
                type: 'thinking',
                content: thinkingContentRef.current
              }] : []),
              {
                type: 'text',
                text: streamingContentRef.current || 'Sorry, there was an issue with the response.'
              }
            ],
            timestamp: new Date().toISOString()
          };

          setIsStreaming(false);
          setStreamingContent('');
          setParsedStreamingContent('');
          const finalUpdatedMessages = [...updatedMessages, finalResponse];
          setMessages(finalUpdatedMessages);
          
          if (activeSessionId) {
            try {
              const existingSession = await chatStorage.getSession(activeSessionId);
              if (existingSession) {
                await chatStorage.saveSession({
                  ...existingSession,
                  messages: finalUpdatedMessages,
                  lastUpdated: new Date().toISOString()
                });
              }
            } catch (saveError) {
              console.error('Error saving session:', saveError);
            }
          }
        }
      } catch (err) {
        console.error('Error sending message:', err);
        setError(err.message || 'An error occurred while sending the message');
        // Save the user message even if the AI response fails
        if (activeSessionId) {
          try {
            await chatStorage.saveSession({
              id: activeSessionId,
              messages: updatedMessages,
              lastUpdated: new Date().toISOString()
            });
          } catch (saveError) {
            console.error('Error saving session after error:', saveError);
          }
        }
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [input, selectedFile, selectedProvider, isLoading, messages, activeSessionId, selectedInstruction]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    
    return sessions.filter(session => {
      // Search in all messages of the session
      return session.messages?.some(message => {
        let content = '';
        if (typeof message.content === 'string') {
          content = message.content;
        } else if (Array.isArray(message.content)) {
          const textContent = message.content.find(item => item.type === 'text');
          content = textContent ? textContent.text : '';
        }
        return content.toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  }, [sessions, searchQuery]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        console.log('Fetching providers...');
        const availableProviders = await getAvailableProviders();
        console.log('Providers fetched:', availableProviders);
        
        // Ensure providers is an array and has valid structure
        if (!Array.isArray(availableProviders) || availableProviders.length === 0) {
          console.warn('No providers available or invalid providers format');
          setProviders([]);
          setError('No AI providers available. Please check your configuration.');
          return;
        }
        
        // Filter out any providers with invalid structure
        const validProviders = availableProviders.filter(p => 
          p && typeof p === 'object' && p.name && Array.isArray(p.models) && p.models.length > 0
        );
        
        setProviders(validProviders);
        
        // Only set a provider if we have valid ones
        if (validProviders.length > 0) {
          const lastProvider = localStorage.getItem('last_selected_provider');
          let providerFound = false;
          
          if (lastProvider) {
            // Check if the last provider exists in the available providers
            for (const p of validProviders) {
              if (!p.models) continue;
              for (const m of p.models) {
                if (m && `${p.name}|${m.id}` === lastProvider) {
                  setSelectedProvider(lastProvider);
                  providerFound = true;
                  break;
                }
              }
              if (providerFound) break;
            }
          }
          
          // If no valid last provider, set the first available one
          if (!providerFound && validProviders[0] && validProviders[0].models && validProviders[0].models[0]) {
            const defaultProvider = `${validProviders[0].name}|${validProviders[0].models[0].id}`;
            setSelectedProvider(defaultProvider);
            localStorage.setItem('last_selected_provider', defaultProvider);
          }
        } else {
          console.warn('No valid providers found');
          setError('No valid AI providers available. Please check your configuration.');
        }
      } catch (error) {
        console.error('Error fetching providers:', error);
        setError('Failed to load AI providers. Please check your configuration.');
      }
    };
    
    fetchProviders();
    
    // Listen for changes to localStorage that might affect providers
    const handleStorageChange = (e) => {
      if (e.key === 'proxy_url' || e.key === 'proxy_key' || e.key === 'ai_settings') {
        console.log('Storage changed, refreshing providers...');
        fetchProviders();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const initializeChat = async () => {
      if (createNewSessionOnMount) {
        await createNewSession();
      } else {
        // Load sessions and set the most recent one as active
        const loadedSessions = await chatStorage.getAllSessions();
        if (loadedSessions.length > 0) {
          // Sort by lastUpdated and get the most recent
          const sortedSessions = loadedSessions.sort((a, b) => 
            new Date(b.lastUpdated) - new Date(a.lastUpdated)
          );
          const mostRecent = sortedSessions[0];
          setActiveSessionId(mostRecent.id);
          setMessages(mostRecent.messages || []);
        } else {
          // If no sessions exist, create a new one
          await createNewSession();
        }
      }
      if (initialInput && !initialized.current) {
        setInput(initialInput);
        initialized.current = true;
      }
    };
    
    initializeChat();
  }, [createNewSessionOnMount, initialInput]);

  useEffect(() => {
    const sendInitialMessage = async () => {
      if (initialInput && initialized.current && input === initialInput) {
        initialized.current = false;
        setTimeout(() => {
          handleSendMessage();
          onMessageSent?.();
        }, 100);
      }
    };

    sendInitialMessage();
  }, [initialInput, input, handleSendMessage, onMessageSent]);

  useEffect(() => {
    let mounted = true;

    const loadSessions = async () => {
      try {
        const savedSessions = await chatStorage.getAllSessions();
        if (!mounted) return;
        
        setSessions(savedSessions);
        if (savedSessions.length > 0) {
          const lastSession = savedSessions[0]; // Sessions are sorted by lastUpdated
          setActiveSessionId(lastSession.id);
          setMessages(lastSession.messages);
        } else {
          await createNewSession();
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
        if (!mounted) return;
        setError('Failed to load chat history');
      }
    };

    loadSessions();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    const saveSession = async () => {
      if (!activeSessionId || messages.length === 0) return;

      try {
        const existingSession = await chatStorage.getSession(activeSessionId);
        if (!existingSession) return;

        // Only update lastUpdated if messages have changed
        const session = {
          ...existingSession,
          messages,
          lastUpdated: JSON.stringify(messages) !== JSON.stringify(existingSession.messages) 
            ? new Date().toISOString() 
            : existingSession.lastUpdated,
        };
        
        await chatStorage.saveSession(session);
        if (!mounted) return;

        const updatedSessions = await chatStorage.getAllSessions();
        if (!mounted) return;
        setSessions(updatedSessions);
      } catch (error) {
        console.error('Error saving session:', error);
        if (!mounted) return;
        setError('Failed to save chat session');
      }
    };

    saveSession();
    return () => { mounted = false; };
  }, [messages, activeSessionId]);

  useEffect(() => {
    const loadCustomInstructions = async () => {
      const instructions = await customInstructionsStorage.getAllInstructions();
      setCustomInstructions(instructions);
      
      // Only set selected instruction if there was a valid last selection
      const lastInstruction = localStorage.getItem('last_selected_instruction');
      if (lastInstruction !== null && lastInstruction !== 'null') {
        const instruction = instructions.find(i => i.id === lastInstruction);
        if (instruction) {
          setSelectedInstruction(instruction);
        }
      }
    };
    loadCustomInstructions();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsSidebarOpen(false);
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      onFullscreenChange?.(true);
    } else {
      onFullscreenChange?.(false);
    }
  }, [isFullscreen, onFullscreenChange]);

  useEffect(() => {
    setIsFullscreen(fullScreen || initialFullscreen || false);
  }, [fullScreen, initialFullscreen]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isNewMessage && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
      setIsNewMessage(false);
    }
  }, [messages, isNewMessage]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const originalTitle = document.title;
    if (isFullscreen) {
      document.title = 'Jarvis';
      setJarvisFavicon();
    }
    return () => {
      if (isFullscreen) {
        document.title = originalTitle;
        restoreOriginalFavicon();
      }
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (selectedProvider) {
      const [providerName, modelId] = selectedProvider.split('|');
      
      // Get current settings
      const settings = getAISettings();
      
      // Initialize model settings if they don't exist
      if (!settings[providerName].modelSettings) {
        settings[providerName].modelSettings = {};
      }
      
      if (!settings[providerName].modelSettings[modelId]) {
        settings[providerName].modelSettings[modelId] = {};
      }
      
      // Save the initialized settings
      localStorage.setItem('ai_settings', JSON.stringify(settings));
      
      // Update state with the settings
      setModelSettings({...settings});
    }
  }, [selectedProvider]);

  useEffect(() => {
    console.log('Model settings updated:', modelSettings);
  }, [modelSettings]);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  const createNewSession = async () => {
    try {
      const newSession = {
        id: Date.now().toString(),
        messages: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        title: 'New Chat'  // Default title
      };
      await chatStorage.saveSession(newSession);
      const updatedSessions = await chatStorage.getAllSessions();
      setSessions(updatedSessions);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setHistoryAnchorEl(null);
      setIsNewMessage(true); // Auto-scroll for new sessions
      setSelectedInstruction(null);
      localStorage.removeItem('last_selected_instruction');
      setInstructionMenuAnchorEl(null);
    } catch (error) {
      console.error('Error creating new session:', error);
      setError('Failed to create new chat session');
    }
  };

  const switchSession = async (sessionId) => {
    try {
      const session = await chatStorage.getSession(sessionId);
      if (session) {
        setActiveSessionId(session.id);
        setMessages(session.messages || []);
        setHistoryAnchorEl(null);
      }
    } catch (error) {
      console.error('Error switching session:', error);
      setError('Failed to switch chat session');
    }
  };

  const handleDeleteSession = async (sessionId, event) => {
    event.stopPropagation();
    try {
      await chatStorage.deleteSession(sessionId);
      const updatedSessions = await chatStorage.getAllSessions();
      setSessions(updatedSessions);
      
      if (sessionId === activeSessionId) {
        if (updatedSessions.length > 0) {
          setActiveSessionId(updatedSessions[0].id);
          setMessages(updatedSessions[0].messages);
        } else {
          await createNewSession();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete chat session');
    }
  };

  const handleCopyMessage = async (content, index) => {
    let textToCopy = '';
    if (typeof content === 'string') {
      textToCopy = content;
    } else if (Array.isArray(content)) {
      const textContent = content.find(item => item.type === 'text');
      textToCopy = textContent ? textContent.text : '';
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    if (file.type === 'application/pdf') {
      reader.readAsDataURL(file);
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1];
        try {
          const uploadResult = await fileService.uploadFile(file);
          setSelectedFile({
            type: 'pdf',
            name: file.name,
            //data: base64Data,
            mediaType: 'application/pdf',
            url: uploadResult.url
          });
        } catch (error) {
          console.error('Error uploading to Dropbox:', error);
          setError('Failed to upload file to Dropbox');
        }
      };
    } else if (file.type === 'text/markdown' || file.name.endsWith('.md') || 
               file.type === 'text/csv' || file.name.endsWith('.csv')) {
      reader.readAsText(file);
      reader.onload = async (e) => {
        const content = e.target.result;
        try {
          const uploadResult = await fileService.uploadFile(file);
          setSelectedFile({
            type: file.type === 'text/csv' || file.name.endsWith('.csv') ? 'csv' : 'markdown',
            name: file.name,
            data: content,
            content: content,
            url: uploadResult.url
          });
        } catch (error) {
          console.error('Error uploading to Dropbox:', error);
          setError('Failed to upload file to Dropbox');
        }
      };
    } else if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1];
        try {
          const uploadResult = await fileService.uploadFile(file);
          setSelectedFile({
            type: 'image',
            name: file.name,
            mediaType: file.type,
            url: uploadResult.url
          });
        } catch (error) {
          console.error('Error uploading to Dropbox:', error);
          setError('Failed to upload file to Dropbox');
        }
      };
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        try {
          const uploadResult = await fileService.uploadFile(file);
          setSelectedFile({
            type: 'image',
            name: file.name || `pasted-image-${Date.now()}.${file.type.split('/')[1]}`,
            mediaType: file.type,
            url: uploadResult.url
          });
        } catch (error) {
          console.error('Error uploading pasted image to Dropbox:', error);
          setError('Failed to upload pasted image to Dropbox');
        }
        break;
      }
    }
  };

  const handleCreateInstruction = async () => {
    if (!newInstructionName.trim() || !newInstructionContent.trim()) return;

    const instruction = {
      name: newInstructionName,
      content: newInstructionContent,
    };

    const savedInstruction = await customInstructionsStorage.saveInstruction(instruction);
    setCustomInstructions(await customInstructionsStorage.getAllInstructions());
    setSelectedInstruction(savedInstruction);
    localStorage.setItem('last_selected_instruction', savedInstruction.id);
    
    setNewInstructionName('');
    setNewInstructionContent('');
    setInstructionDialogOpen(false);
    setEditingInstruction(null);
  };

  const handleEditInstruction = (instruction) => {
    setEditingInstruction(instruction);
    setNewInstructionName(instruction.name);
    setNewInstructionContent(instruction.content);
    setInstructionDialogOpen(true);
  };

  const handleDeleteInstruction = async (id) => {
    await customInstructionsStorage.deleteInstruction(id);
    setCustomInstructions(await customInstructionsStorage.getAllInstructions());
    if (selectedInstruction?.id === id) {
      setSelectedInstruction(null);
      localStorage.removeItem('last_selected_instruction');
    }
  };

  const renderMessageContent = (content) => {
    // Handle null or undefined content
    if (content === null || content === undefined) {
      return null;
    }
    
    // If content is a string, render it with markdown
    if (typeof content === 'string') {
      return (
        <Typography 
          variant="body1" 
          component="div"
          sx={{ 
            fontFamily: 'Geist, sans-serif',
            fontSize: '16px',
            lineHeight: 1.7,
            '& h1, & h2, & h3, & h4, & h5, & h6': {
              fontWeight: 600,
              lineHeight: 1.3,
              marginTop: '1.5em',
              marginBottom: '0.5em'
            },
            '& h1': { fontSize: '2em' },
            '& h2': { fontSize: '1.5em' },
            '& h3': { fontSize: '1.25em' },
            '& h4': { fontSize: '1.1em' },
            '& h5': { fontSize: '1em' },
            '& h6': { fontSize: '0.875em' },
            '& p': {
              marginBottom: '1em',
              marginTop: 0
            },
            '& pre': {
              marginBottom: '1.5em',
              '& code': {
                fontFamily: 'Geist Mono, monospace',
                fontSize: '0.9em'
              }
            },
            '& code': {
              fontFamily: 'Geist Mono, monospace',
              fontSize: '0.9em',
              padding: '0.2em 0.4em',
              borderRadius: '4px',
              backgroundColor: 'rgba(0, 0, 0, 0.1)'
            },
            '& ul, & ol': {
              marginTop: '0.5em',
              marginBottom: '1em',
              paddingLeft: '2em'
            },
            '& li': {
              marginBottom: '0.5em',
              '& p': {
                marginBottom: '0.5em'
              },
              '& > ul, & > ol': {
                marginTop: '0.5em',
                marginBottom: '0.5em'
              }
            },
            '& ul > li': { listStyle: 'disc' },
            '& ul > li > ul > li': { listStyle: 'circle' },
            '& ul > li > ul > li > ul > li': { listStyle: 'square' },
            '& ol > li': { listStyle: 'decimal' }
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <Box sx={{ position: 'relative' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleCopyMessage(String(children).replace(/\n$/, ''), 'code')}
                      sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: 'text.secondary',
                        bgcolor: 'background.paper',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        zIndex: 1,
                      }}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </Box>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </Typography>
      );
    }

    // If content is an array, handle each item
    if (Array.isArray(content)) {
      // Return null for empty arrays
      if (content.length === 0) {
        return null;
      }
      
      return content.map((item, index) => {
        // Skip null or undefined items
        if (item === null || item === undefined) {
          return null;
        }
        
        if (item.type === 'text' || item.type === 'markdown') {
          const textContent = item.text || item.content;
          if (textContent === undefined || textContent === null) {
            return null;
          }
          return renderMessageContent(textContent);
        }
        if (item.type === 'thinking') {
          if (item.content === undefined || item.content === null) {
            return null;
          }
          return (
            <Box key={`thinking-${index}`} sx={{ mb: 2 }}>
              <Typography 
                variant="body2" 
                component="div"
                sx={{ 
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  color: themeStyles.text.primary,
                  fontStyle: 'italic',
                  backgroundColor: themeStyles.action.hover,
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  whiteSpace: 'pre-wrap'
                }}
              >
                🤔 {item.content}
              </Typography>
            </Box>
          );
        }
        // Handle other content types (image, pdf, etc.)
        if (item.type === 'image') {
          if (!item.data && !item.url) {
            return null;
          }
          return (
            <Box key={index} sx={{ my: 2 }}>
              <img 
                src={item.url || (item.data ? `data:${item.media_type || 'image/png'};base64,${item.data}` : '')}
                alt="User uploaded image"
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
              />
            </Box>
          );
        } else if (item.type === 'file' || item.type === 'pdf') {
          if (!item.data && !item.url) {
            return null;
          }
          const mediaType = item.media_type || (item.type === 'pdf' ? 'application/pdf' : 'application/octet-stream');
          return (
            <Box key={index} sx={{ my: 2 }}>
              <embed 
                src={item.url || `data:${mediaType};base64,${item.data}`}
                type={mediaType}
                width="100%"
                height="500"
              />
            </Box>
          );
        }
        return null;
      });
    }

    // If content is an object with type and content fields
    if (content && typeof content === 'object') {
      if ('type' in content) {
        if (content.type === 'thinking') {
          if (content.content === undefined || content.content === null) {
            return null;
          }
          return (
            <Typography 
              variant="body2" 
              component="div"
              sx={{ 
                fontFamily: 'Geist, sans-serif',
                fontSize: '14px',
                color: themeStyles.text.primary,
                fontStyle: 'italic',
                backgroundColor: themeStyles.action.hover,
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '8px',
                whiteSpace: 'pre-wrap'
              }}
            >
              🤔 {content.content}
            </Typography>
          );
        } else if (content.type === 'text') {
          if (content.text === undefined || content.text === null) {
            return null;
          }
          return renderMessageContent(content.text);
        }
      }
    }

    // If content is undefined or null, return null
    return null;
  };

  const renderMessageInput = () => (
    <Box
      sx={themeStyles.input}
    >
      <Box sx={{ 
        p: 2,
        width: '100%',
        maxWidth: isFullscreen ? '900px' : '100%', // Match message width
      }}>
        <Paper
          component="form"
          sx={{
            p: '8px 16px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'background.paper',
            borderRadius: '12px',
            boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.1)',
          }}
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <InputBase
            sx={{ 
              flex: 1,
              minHeight: '60px', 
              '& textarea': {
                minHeight: '60px !important', 
                padding: '8px 0', 
              }
            }}
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            onPaste={handlePaste}
            multiline
            maxRows={6} 
            ref={inputRef}
            startAdornment={
              <InputAdornment position="start">
                <IconButton
                  sx={{ p: '8px' }}
                  aria-label="attach file"
                  component="label"
                  size="small"
                >
                  <input
                    type="file"
                    hidden
                    onChange={handleFileUpload}
                    accept=".txt,.csv,.md,.pdf,image/*"
                  />
                  <AttachFileIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            }
          />
          {selectedFile && (
            <Box sx={{ display: 'flex', alignItems: 'center', px: 1, mb: 1 }}>
              <Typography variant="body2" color="textSecondary">
                {selectedFile.name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setSelectedFile(null)}
                sx={{ ml: 1 }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            pt: 1,
            mt: 1,
            borderTop: 1, 
            borderColor: 'divider'
          }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    localStorage.setItem('last_selected_provider', e.target.value);
                  }}
                  size="small"
                  sx={{ 
                    minWidth: 120,
                    height: '32px',
                    fontSize: '0.85rem',
                    '& .MuiSelect-select': {
                      padding: '4px 8px',
                    }
                  }}
                  IconComponent={KeyboardArrowDownIcon}
                >
                  {providers.map((provider) =>
                    provider.models.map((model) => (
                      <MenuItem
                        key={`${provider.name}|${model.id}`}
                        value={`${provider.name}|${model.id}`}
                        selected={selectedProvider === `${provider.name}|${model.id}`}
                        onClick={() => {
                          setSelectedProvider(`${provider.name}|${model.id}`);
                          localStorage.setItem('last_selected_provider', `${provider.name}|${model.id}`);
                          setSettingsAnchorEl(null);
                        }}
                      >
                        {model.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
                
                {/* Model-specific settings - inline */}
                {selectedProvider && (() => {
                  const [providerName, modelId] = selectedProvider.split('|');
                  
                  // OpenAI reasoning effort setting
                  if (providerName === 'openai') {
                    const reasoningEffort = modelSettings[providerName]?.modelSettings?.[modelId]?.reasoningEffort || 'none';
                    
                    console.log('OpenAI reasoning effort:', reasoningEffort);
                    
                    return (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <Typography variant="caption">Reasoning:</Typography>
                        <Select
                          size="small"
                          value={reasoningEffort}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            console.log('Reasoning effort changed to:', newValue);
                            updateModelSetting(providerName, modelId, 'reasoningEffort', newValue);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            height: '32px',
                            fontSize: '0.85rem',
                            '.MuiSelect-select': {
                              padding: '4px 32px 4px 8px',
                            }
                          }}
                        >
                          <MenuItem value="none">None</MenuItem>
                          <MenuItem value="low">Low</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                        </Select>
                      </Box>
                    );
                  }
                  
                  // Anthropic thinking setting
                  if (providerName === 'anthropic') {
                    const isThinkingEnabled = Boolean(modelSettings[providerName]?.modelSettings?.[modelId]?.thinking);
                    const budgetTokens = modelSettings[providerName]?.modelSettings?.[modelId]?.budget_tokens || 8000;
                    
                    console.log('Anthropic thinking:', isThinkingEnabled, 'Budget tokens:', budgetTokens);
                    
                    return (
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          position: 'relative',
                          zIndex: 1
                        }}
                      >
                        <Typography variant="caption">Thinking:</Typography>
                        <Switch
                          size="small"
                          checked={isThinkingEnabled}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            console.log('Switch changed to:', newValue);
                            updateModelSetting(providerName, modelId, 'thinking', newValue);
                            // If turning on thinking, set default budget tokens
                            if (newValue && !modelSettings[providerName]?.modelSettings?.[modelId]?.budget_tokens) {
                              updateModelSetting(providerName, modelId, 'budget_tokens', 8000);
                            }
                          }}
                        />
                        {isThinkingEnabled && (
                          <div style={{ display: 'inline-block' }}>
                            <select
                              value={budgetTokens}
                              onChange={(e) => {
                                const newValue = parseInt(e.target.value);
                                console.log('Token budget changed to:', newValue);
                                updateModelSetting(providerName, modelId, 'budget_tokens', newValue);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '90px',
                                height: '28px',
                                fontSize: '0.85rem',
                                padding: '2px 4px',
                                border: `1px solid ${themeStyles.divider}`,
                                borderRadius: '4px',
                                backgroundColor: 'background.paper',
                                color: 'text.primary'
                              }}
                            >
                              <option value="8000">8,000</option>
                              <option value="16000">16,000</option>
                              <option value="24000">24,000</option>
                              <option value="32000">32,000</option>
                              <option value="64000">64,000</option>
                            </select>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              marginLeft: '4px',
                              color: 'text.secondary'
                            }}>tokens</span>
                          </div>
                        )}
                      </Box>
                    );
                  }
                  
                  return null;
                })()}
              </Box>
              
              <Select
                value={selectedInstruction ? selectedInstruction.id : ''}
                onChange={(e) => {
                  if (e.target.value === 'create_new') {
                    setEditingInstruction(null);
                    setNewInstructionName('');
                    setNewInstructionContent('');
                    setInstructionDialogOpen(true);
                    return;
                  }
                  const instruction = customInstructions.find(i => i.id === e.target.value);
                  setSelectedInstruction(instruction || null);
                  localStorage.setItem('last_selected_instruction', instruction ? instruction.id : null);
                }}
                size="small"
                sx={{ 
                  minWidth: 120,
                  height: '32px',
                  fontSize: '0.85rem',
                  '& .MuiSelect-select': {
                    padding: '4px 8px',
                  }
                }}
                IconComponent={KeyboardArrowDownIcon}
                displayEmpty
                endAdornment={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {selectedInstruction && (
                      <>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditInstruction(selectedInstruction);
                          }}
                          sx={{ mr: 0.5, p: 0.5 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInstruction(selectedInstruction.id);
                          }}
                          sx={{ mr: -1, p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Box>
                }
              >
                <MenuItem value="">
                  <em>No prompt</em>
                </MenuItem>
                <MenuItem value="create_new" sx={{ color: themeStyles.primary.main }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AddIcon fontSize="small" />
                    <Typography variant="body2">Create New</Typography>
                  </Box>
                </MenuItem>
                {customInstructions.length > 0 && <Divider />}
                {customInstructions.map((instruction) => (
                  <MenuItem key={instruction.id} value={instruction.id}>
                    {instruction.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <IconButton
              color="primary"
              sx={{ 
                p: '8px',
                backgroundColor: themeStyles.primary.main,
                color: themeStyles.primary.contrastText,
                '&:hover': {
                  backgroundColor: themeStyles.primary.dark,
                },
                borderRadius: '50%',
                width: '36px',
                height: '36px'
              }}
              aria-label="send message"
              onClick={handleSendMessage}
              disabled={isLoading || (!input.trim() && !selectedFile)}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Paper>
      </Box>
    </Box>
  );

  const renderSessionPreview = (session) => {
    if (!session.messages || session.messages.length === 0) {
      return 'Empty chat';
    }

    // Use title if available, otherwise use preview from first message
    if (session.title) {
      return session.title;
    }

    const firstMessage = session.messages[0];
    let preview = '';
    
    if (firstMessage) {
      if (typeof firstMessage.content === 'string') {
        preview = firstMessage.content;
      } else if (Array.isArray(firstMessage.content)) {
        const textContent = firstMessage.content.find(item => item.type === 'text');
        preview = textContent ? textContent.text : '';
      }
    }
    
    return preview.length > 80 ? preview.slice(0, 77) + '...' : preview;
  };

  const updateModelSetting = (provider, modelId, setting, value) => {
    console.log('Updating model setting:', provider, modelId, setting, value);
    
    // Get the latest settings from localStorage
    const settings = getAISettings();
    
    // Initialize objects if they don't exist
    if (!settings[provider]) {
      settings[provider] = { modelSettings: {} };
    }
    if (!settings[provider].modelSettings) {
      settings[provider].modelSettings = {};
    }
    if (!settings[provider].modelSettings[modelId]) {
      settings[provider].modelSettings[modelId] = {};
    }
    
    // Update the setting
    settings[provider].modelSettings[modelId][setting] = value;
    
    // Save back to localStorage
    localStorage.setItem('ai_settings', JSON.stringify(settings));
    
    // Update the state with a completely new object to ensure React detects the change
    setModelSettings({...settings});
    
    console.log('Updated settings:', settings[provider].modelSettings[modelId]);
  };

  return (
    <Box sx={themeStyles.root}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1, 
        borderBottom: `1px solid ${themeStyles.divider}`,
        justifyContent: 'space-between'
      }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Chat
        </Typography>
        <Box>
          {setDarkMode && (
            <IconButton onClick={() => setDarkMode(!darkMode)} size="small">
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          )}
          {!fullScreen && (
            <IconButton onClick={() => setIsFullscreen(!isFullscreen)} size="small">
              <FullscreenIcon />
            </IconButton>
          )}
        </Box>
      </Box>
      {isFullscreen ? (
        <Modal
          open={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              bgcolor: themeStyles.background.default,
              outline: 'none',
              display: 'flex',
              position: 'relative',
            }}
          >
            {showScrollButton && (
              <Fab
                size="small"
                color="primary"
                sx={{
                  position: 'fixed',
                  right: 32,
                  bottom: 120,
                  zIndex: 1000,
                  opacity: 0.9,
                  '&:hover': {
                    opacity: 1
                  }
                }}
                onClick={scrollToBottom}
              >
                <KeyboardArrowDownIcon />
              </Fab>
            )}
            {/* Sidebar */}
            <Box
              sx={{
                width: isSidebarOpen ? '300px' : '0px',  
                height: '100%',
                bgcolor: 'background.paper',
                transition: 'width 0.2s',
                overflow: 'hidden',
                borderRight: 1,
                borderColor: themeStyles.divider,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                borderBottom: `1px solid ${themeStyles.divider}`,
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  position: 'relative',
                }}>
                  <TextField
                    size="small"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      ...(searchQuery && {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setSearchQuery('')}
                              edge="end"
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        )
                      })
                    }}
                  />
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                }}>
                  <IconButton size="small" onClick={() => setHistoryAnchorEl(inputRef.current)}>
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setIsFullscreen(true)}>
                    <FullscreenIcon fontSize="small" />
                  </IconButton>
                  <VoiceRecorder onTranscriptionComplete={async (transcript) => {
                    try {
                      const response = await processTranscription(transcript);
                      const newMessage = {
                        role: 'assistant',
                        content: response,
                        timestamp: new Date().toISOString(),
                      };
                      setMessages(prev => [...prev, 
                        { role: 'user', content: transcript, timestamp: new Date().toISOString() },
                        newMessage
                      ]);
                    } catch (error) {
                      console.error('Error processing voice input:', error);
                      setError('Failed to process voice input');
                    }
                  }} />
                  <IconButton size="small" onClick={() => setApiKeyDialogOpen(true)}>
                    <KeyIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={createNewSession}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <IconButton
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                size="small"
                sx={{
                  position: 'absolute',
                  right: -20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'background.paper',
                  border: `1px solid ${themeStyles.divider}`,
                  borderRadius: '50%',
                  '&:hover': {
                    backgroundColor: themeStyles.action.hover,
                  },
                  zIndex: 1,
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <List sx={{ flex: 1, overflowY: 'auto' }}>
                {filteredSessions.map((session) => (
                  <ListItem
                    key={session.id}
                    button
                    selected={session.id === activeSessionId}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setMessages(session.messages);
                    }}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.5,
                      position: 'relative',
                      minHeight: '64px',  // Increased height for two lines
                      py: 1,  // Added vertical padding
                      '&:hover .delete-button': {
                        opacity: 1,
                      },
                      ...(session.id === activeSessionId && {
                        backgroundColor: themeStyles.primary.main + '1A', // 10% opacity
                        '&:hover': {
                          backgroundColor: themeStyles.primary.main + '26', // 15% opacity
                        },
                      }),
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, alignSelf: 'flex-start', mt: 0.5 }}>
                      <ChatBubbleOutlineIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={renderSessionPreview(session)}
                      primaryTypographyProps={{
                        sx: { 
                          fontFamily: 'Geist, sans-serif',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'normal',  
                          fontSize: '0.9rem',
                          fontWeight: session.title ? 500 : 400,
                          WebkitLineClamp: 2,  
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.2em',
                          maxHeight: '2.4em'  
                        }
                      }}
                      secondaryTypographyProps={{
                        sx: {
                          fontSize: '0.7rem',
                          color: 'text.secondary'
                        }
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="delete-button"
                      sx={{
                        position: 'absolute',
                        right: 8,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        backgroundColor: 'background.paper',
                        color: 'text.primary',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
                {filteredSessions.length === 0 && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No chats found
                    </Typography>
                  </Box>
                )}
              </List>
              <Box sx={{ 
                p: 1, 
                borderTop: `1px solid ${themeStyles.divider}`,
                display: 'flex',
                justifyContent: 'center'
              }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={createNewSession}
                  fullWidth
                  sx={{ 
                    borderRadius: 1,
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    px: 2
                  }}
                >
                  New Chat
                </Button>
              </Box>
            </Box>

            {/* Main chat area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Messages area */}
              <Box
                ref={messagesContainerRef}
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  paddingBottom: '160px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {messages.map((message, index) => (
                  <Box 
                    key={index} 
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: isFullscreen ? '1100px' : '100%',
                      px: 2,
                      py: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 'fit-content',
                        position: 'relative',
                        backgroundColor: message.role === 'user' 
                          ? themeStyles.action.hover
                          : themeStyles.background.default,
                        color: themeStyles.text.primary,
                        borderRadius: 2,
                        p: 2,
                        mb: 2,
                        '&:hover': {
                          backgroundColor: message.role === 'user'
                            ? darkModeState ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                            : themeStyles.action.hover,
                        },
                      }}
                    >
                      {renderMessageContent(message.content)}
                      <IconButton
                        size="small"
                        onClick={() => handleCopyMessage(message.content, index)}
                        className="copy-button"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          backgroundColor: message.role === 'user' ? themeStyles.action.hover : themeStyles.background.default,
                          color: message.role === 'user' ? themeStyles.text.primary : themeStyles.text.primary,
                          '&:hover': {
                            backgroundColor: message.role === 'user' ? darkModeState ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' : themeStyles.action.hover,
                          },
                        }}
                      >
                        {copiedIndex === index ? (
                          <CheckIcon fontSize="small" />
                        ) : (
                          <CopyIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Box>
                  </Box>
                ))}
                {isStreaming && (
                  <Box 
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: isFullscreen ? '1100px' : '100%',
                      px: 2,
                      py: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        position: 'relative',
                        backgroundColor: themeStyles.background.default,
                        color: themeStyles.text.primary,
                        borderRadius: 2,
                        p: 2,
                      }}
                    >
                      {parsedStreamingContent}
                    </Box>
                  </Box>
                )}
              </Box>

              {renderMessageInput()}
            </Box>
          </Box>
        </Modal>
      ) : (
        // Non-fullscreen layout
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            maxHeight: '100vh',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Chat Messages Container */}
            <Box
              ref={messagesContainerRef}
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                paddingBottom: '160px',
                width: '100%',
              }}
            >
              {messages.map((message, index) => (
                <Box 
                  key={index} 
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                    px: 2,
                    py: 1,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '80%',
                      position: 'relative',
                      backgroundColor: message.role === 'user' 
                        ? themeStyles.action.hover
                        : themeStyles.background.default,
                      color: themeStyles.text.primary,
                      borderRadius: 2,
                      p: 2,
                      mb: 2,
                      '&:hover': {
                        backgroundColor: message.role === 'user'
                          ? darkModeState ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                          : themeStyles.action.hover,
                      },
                    }}
                  >
                    {renderMessageContent(message.content)}
                    <IconButton
                      size="small"
                      onClick={() => handleCopyMessage(message.content, index)}
                      className="copy-button"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        backgroundColor: message.role === 'user' ? themeStyles.action.hover : themeStyles.background.default,
                        color: message.role === 'user' ? themeStyles.text.primary : themeStyles.text.primary,
                        '&:hover': {
                          backgroundColor: message.role === 'user' ? darkModeState ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' : themeStyles.action.hover,
                        },
                      }}
                    >
                      {copiedIndex === index ? (
                        <CheckIcon fontSize="small" />
                      ) : (
                        <CopyIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                </Box>
              ))}
              {isStreaming && (
                <Box 
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    maxWidth: '100%',
                    px: 2,
                    py: 1,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '80%',
                      position: 'relative',
                      backgroundColor: themeStyles.background.default,
                      color: themeStyles.text.primary,
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    {parsedStreamingContent}
                  </Box>
                </Box>
              )}
            </Box>

            {showScrollButton && (
              <Fab
                size="small"
                color="primary"
                sx={{
                  position: 'fixed',
                  right: 32,
                  bottom: 120,
                  zIndex: 1000,
                  opacity: 0.9,
                  '&:hover': {
                    opacity: 1
                  }
                }}
                onClick={scrollToBottom}
              >
                <KeyboardArrowDownIcon />
              </Fab>
            )}
            {renderMessageInput()}
          </Box>
        </Box>
      )}

      {/* Existing menus and dialogs */}
      <Menu
        anchorEl={settingsAnchorEl}
        open={Boolean(settingsAnchorEl)}
        onClose={() => setSettingsAnchorEl(null)}
      >
        {providers.map(provider => 
          provider.models.map(model => (
            <MenuItem 
              key={`${provider.name}|${model.id}`}
              value={`${provider.name}|${model.id}`}
              selected={selectedProvider === `${provider.name}|${model.id}`}
              onClick={() => {
                setSelectedProvider(`${provider.name}|${model.id}`);
                localStorage.setItem('last_selected_provider', `${provider.name}|${model.id}`);
                setSettingsAnchorEl(null);
              }}
            >
              {`${provider.name.charAt(0).toUpperCase() + provider.name.slice(1)} - ${model.name}`}
            </MenuItem>
          ))
        )}
      </Menu>

      <Menu
        anchorEl={historyAnchorEl}
        open={Boolean(historyAnchorEl)}
        onClose={() => setHistoryAnchorEl(null)}
        PaperProps={{
          sx: { maxWidth: '400px' }
        }}
      >
        {sessions.map(session => {
          const firstMessage = session.messages[0];
          let preview = '';
          
          if (firstMessage) {
            if (typeof firstMessage.content === 'string') {
              preview = firstMessage.content;
            } else if (Array.isArray(firstMessage.content)) {
              const textContent = firstMessage.content.find(item => item.type === 'text');
              preview = textContent ? textContent.text : '[No text available]';
            } else if (firstMessage.content?.type === 'image') {
              preview = '[Image]';
            }
          }
          
          preview = preview.length > 60 ? preview.substring(0, 60) + '...' : preview;
          const date = new Date(session.lastUpdated).toLocaleString();
          
          return (
            <MenuItem
              key={session.id}
              onClick={() => {
                setActiveSessionId(session.id);
                setMessages(session.messages);
              }}
              selected={session.id === activeSessionId}
              sx={{ 
                whiteSpace: 'normal',
                minWidth: '400px'
              }}
            >
              <ListItemText 
                primary={preview || 'Empty session'}
                secondary={date}
                primaryTypographyProps={{
                  sx: { 
                    fontSize: '0.9rem',
                    mb: 0.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.2em',
                    maxHeight: '2.4em'  
                  }
                }}
                secondaryTypographyProps={{
                  sx: { 
                    fontSize: '0.75rem',
                    color: 'text.secondary'
                  }
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>

      <Menu
        anchorEl={instructionMenuAnchorEl}
        open={Boolean(instructionMenuAnchorEl)}
        onClose={() => setInstructionMenuAnchorEl(null)}
      >
        <MenuItem 
          onClick={() => {
            setEditingInstruction(null);
            setNewInstructionName('');
            setNewInstructionContent('');
            setInstructionDialogOpen(true);
            setInstructionMenuAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText primary="Create New Instruction" />
        </MenuItem>
        <Divider />
        {customInstructions.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="No custom instructions" secondary="Create one to get started" />
          </MenuItem>
        ) : (
          customInstructions.map(instruction => (
            <MenuItem
              key={instruction.id}
              selected={selectedInstruction?.id === instruction.id}
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                minWidth: '300px'
              }}
            >
              <ListItemText 
                primary={instruction.name}
                onClick={() => {
                  setSelectedInstruction(instruction);
                  localStorage.setItem('last_selected_instruction', instruction.id);
                  setInstructionMenuAnchorEl(null);
                }}
              />
              <Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditInstruction(instruction);
                    setInstructionMenuAnchorEl(null);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteInstruction(instruction.id);
                    setInstructionMenuAnchorEl(null);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </MenuItem>
          ))
        )}
        {selectedInstruction && (
          <>
            <Divider />
            <MenuItem 
              onClick={() => {
                setSelectedInstruction(null);
                localStorage.removeItem('last_selected_instruction');
                setInstructionMenuAnchorEl(null);
              }}
            >
              <ListItemText primary="Clear Selection" />
            </MenuItem>
          </>
        )}
      </Menu>

      <ApiKeyInput
        open={apiKeyDialogOpen}
        onClose={() => setApiKeyDialogOpen(false)}
      />

      <Dialog
        open={instructionDialogOpen}
        onClose={() => setInstructionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingInstruction ? 'Edit Custom Instruction' : 'Create Custom Instruction'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Instruction Name"
            fullWidth
            value={newInstructionName}
            onChange={(e) => setNewInstructionName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Instruction Content"
            fullWidth
            multiline
            rows={4}
            value={newInstructionContent}
            onChange={(e) => setNewInstructionContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstructionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateInstruction} variant="contained">
            {editingInstruction ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatBox;

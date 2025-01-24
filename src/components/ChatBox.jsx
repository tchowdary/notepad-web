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
  getAvailableProviders,
} from '../services/aiService';
import { chatStorage } from '../services/chatStorageService';
import { customInstructionsStorage } from '../services/customInstructionsService';
import ApiKeyInput from './ApiKeyInput';
import VoiceRecorder from './VoiceRecorder';
import { processTranscription } from '../services/llmService';
import { generateText } from '../services/llmService';

const generateTitleFromUserMessage = async ({ message }) => {
  try {
    let messageText = '';
    if (Array.isArray(message.content)) {
      const textContent = message.content.find(item => item.type === 'text');
      messageText = textContent ? textContent.text : 'New Chat';
    } else if (typeof message.content === 'string') {
      messageText = message.content;
    }

    const { text: title } = await generateText({
      model: 'gpt-4o-mini',
      system: `
        - you will generate a short title based on the first message a user begins a conversation with
        - ensure it is not more than 80 characters long
        - the title should be a summary of the user's message
        - do not use quotes or colons`,
      prompt: messageText
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
  const streamingContentRef = useRef('');
  const theme = useTheme();
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
      const [providerName, modelId] = selectedProvider.split('|');
      const messageContent = [];

      // Check if an image or file is selected
      if (selectedFile) {
        if (selectedFile.type === 'markdown' || selectedFile.type === 'csv') {
          messageContent.push({
            type: 'text',
            text: selectedFile.data
          });
        } else if (selectedFile.type === 'pdf') {
          messageContent.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: selectedFile.mediaType,
              data: selectedFile.data
            },
            cache_control: {
              type: 'ephemeral'
            }
          });
        } else {
          messageContent.push({
            type: selectedFile.type,
            source: {
              type: 'base64',
              media_type: selectedFile.mediaType,
              data: selectedFile.data
            }
          });
        }
      }

      // Include text input if available
      if (input.trim()) {
        messageContent.push({
          type: 'text',
          text: input.trim()
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
      }
      
      setInput('');
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }

      try {
        const apiKey = localStorage.getItem(`${providerName}_api_key`);
        if (!apiKey) {
          throw new Error(`No API key found for ${providerName}`);
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
          
          const handleStream = (content) => {
            streamingContentRef.current += content;
            setStreamingContent(streamingContentRef.current);
            // Parse the markdown in real-time
            setParsedStreamingContent(renderMessageContent(streamingContentRef.current));
          };

          await (providerName === 'openai' 
            ? sendOpenAIMessage(updatedMessages, modelId, apiKey, selectedInstruction, handleStream)
            : providerName === 'deepseek'
            ? sendDeepSeekMessage(updatedMessages, modelId, apiKey, selectedInstruction, handleStream)
            : sendAnthropicMessage(updatedMessages, modelId, apiKey, selectedInstruction, handleStream));

          finalResponse = {
            role: 'assistant',
            content: streamingContentRef.current,
            timestamp: new Date().toISOString()
          };

          setIsStreaming(false);
          setStreamingContent('');
          setParsedStreamingContent('');
          const finalUpdatedMessages = [...updatedMessages, finalResponse];
          setMessages(finalUpdatedMessages);
          
          if (activeSessionId) {
            const existingSession = await chatStorage.getSession(activeSessionId);
            await chatStorage.saveSession({
              ...existingSession,
              messages: finalUpdatedMessages,
              lastUpdated: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        setError(err.message);
        // Save the user message even if the AI response fails
        if (activeSessionId) {
          await chatStorage.saveSession({
            id: activeSessionId,
            messages: updatedMessages,
            lastUpdated: new Date().toISOString()
          });
        }
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    } catch (error) {
      setError(error.message);
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
    const availableProviders = getAvailableProviders();
    setProviders(availableProviders);
    
    const lastProvider = localStorage.getItem('last_selected_provider');
    if (lastProvider && availableProviders.some(p => 
      p.models.some(m => `${p.name}|${m.id}` === lastProvider)
    )) {
      setSelectedProvider(lastProvider);
    } else if (availableProviders.length > 0) {
      const defaultProvider = `${availableProviders[0].name}|${availableProviders[0].models[0].id}`;
      setSelectedProvider(defaultProvider);
      localStorage.setItem('last_selected_provider', defaultProvider);
    }
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
    }
    return () => {
      if (isFullscreen) {
        document.title = originalTitle;
      }
    };
  }, [isFullscreen]);

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

  const handleProviderChange = (value) => {
    setSelectedProvider(value);
    localStorage.setItem('last_selected_provider', value);
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
      reader.onload = (e) => {
        const base64Data = e.target.result.split(',')[1];
        setSelectedFile({
          type: 'document',
          name: file.name,
          data: base64Data,
          mediaType: 'application/pdf'
        });
      };
    } else if (file.type === 'text/markdown' || file.name.endsWith('.md') || 
               file.type === 'text/csv' || file.name.endsWith('.csv')) {
      reader.readAsText(file);
      reader.onload = (e) => {
        const content = e.target.result;
        setSelectedFile({
          type: file.type === 'text/csv' || file.name.endsWith('.csv') ? 'csv' : 'markdown',
          name: file.name,
          data: content,
          content: content
        });
      };
    } else if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const base64Data = e.target.result.split(',')[1];
        setSelectedFile({
          type: 'image',
          name: file.name,
          data: base64Data,
          mediaType: file.type
        });
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
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Data = event.target.result.split(',')[1];
            setSelectedFile({
              type: 'image',
              mediaType: file.type,
              data: base64Data
            });
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('Error processing pasted image:', error);
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
      return content.map((item, index) => {
        if (item.type === 'text' || item.type === 'markdown') {
          return renderMessageContent(item.text || item.content);
        }
        if (item.type === 'image') {
          return (
            <Box key={index} sx={{ my: 2 }}>
              <img 
                src={`data:${item.source.media_type};base64,${item.source.data}`}
                alt="User uploaded image"
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
              />
            </Box>
          );
        } else if (item.type === 'pdf') {
          return (
            <Box key={index} sx={{ my: 2 }}>
              <embed 
                src={`data:application/pdf;base64,${item.data}`}
                type="application/pdf"
                width="100%"
                height="500"
              />
            </Box>
          );
        } else if (item.type === 'document') {
          return (
            <Box key={index} sx={{ my: 2 }}>
              <embed 
                src={`data:${item.source.media_type};base64,${item.source.data}`}
                type={item.source.media_type}
                width="100%"
                height="500"
              />
            </Box>
          );
        }
        return null;
      });
    }

    // If content is undefined or null, return null
    return null;
  };

  const renderMessageInput = () => (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: isFullscreen ? '250px' : 0,
        right: 0,
        backgroundColor: theme.palette.background.default,
        borderTop: `1px solid ${theme.palette.divider}`,
        zIndex: 1,
        width: isFullscreen ? 'calc(100% - 250px)' : '100%',
        display: 'flex',
        justifyContent: 'center', // Center the input container
      }}
    >
      <Box sx={{ 
        p: 2,
        width: '100%',
        maxWidth: isFullscreen ? '900px' : '100%', // Match message width
      }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              bgcolor: 'background.paper', 
              p: 0.5, 
              borderRadius: 1,
              width: '100%',
              flexWrap: 'nowrap',
              overflow: 'hidden',
              minHeight: '40px',
            }}
          >
            {/* Toolbar Icons */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton size="small" onClick={createNewSession}>
                <AddIcon />
              </IconButton>
              <IconButton size="small" onClick={() => setHistoryAnchorEl(inputRef.current)}>
                <HistoryIcon />
              </IconButton>

              <IconButton size="small" onClick={() => setIsFullscreen(true)}>
                <FullscreenIcon />
              </IconButton>
              <IconButton size="small" onClick={() => setApiKeyDialogOpen(true)}>
                <KeyIcon />
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
            </Box>
            <Select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                localStorage.setItem('last_selected_provider', e.target.value);
              }}
              size="small"
              sx={{ 
                minWidth: 180,
                flexShrink: 1  
              }}
            >
              {providers.map((provider) =>
                provider.models.map((model) => (
                  <MenuItem
                    key={`${provider.name}|${model.id}`}
                    value={`${provider.name}|${model.id}`}
                  >
                    {model.name}
                  </MenuItem>
                ))
              )}
            </Select>
            
           
            <IconButton
                size="small"
                onClick={(e) => setInstructionMenuAnchorEl(e.currentTarget)}
                color={selectedInstruction ? "primary" : "default"}
                sx={{ flexShrink: 0 }}  
              >
                <AutoFixHighIcon />
              </IconButton>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1,
                flexGrow: 0,
                flexShrink: 1,
                minWidth: 120  
              }}
            >
              <Select
                value={selectedInstruction ? selectedInstruction.id : ''}
                onChange={(e) => {
                  const instruction = customInstructions.find(i => i.id === e.target.value);
                  setSelectedInstruction(instruction || null);
                  localStorage.setItem('last_selected_instruction', instruction ? instruction.id : null);
                }}
                size="small"
                sx={{ 
                  flexGrow: 0,
                  flexShrink: 1,
                  minWidth: 120,
                  maxWidth: 150
                }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {customInstructions.map((instruction) => (
                  <MenuItem key={instruction.id} value={instruction.id}>
                    {instruction.name}
                  </MenuItem>
                ))}
              </Select>
              
              
            </Box>
            

            
            
          </Box>
        </Box>

        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
          <Paper
            component="form"
            sx={{
              p: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              minHeight: '45px',
              backgroundColor: 'background.paper',
            }}
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <IconButton
              sx={{ p: '10px' }}
              aria-label="attach file"
              component="label"
            >
              <input
                type="file"
                hidden
                onChange={handleFileUpload}
                accept=".txt,.csv,.md,.pdf,image/*"
              />
              <AttachFileIcon />
            </IconButton>
            
            <InputBase
              sx={{ 
                ml: 1, 
                flex: 1,
                minHeight: '60px', 
                '& textarea': {
                  minHeight: '60px !important', 
                  padding: '8px 0', 
                }
              }}
              placeholder="Type a message..."
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
            />
            
            {selectedFile && (
              <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  {selectedFile.name}
                </Typography>
                <IconButton size="small" onClick={() => setSelectedFile(null)}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            <IconButton
              color="primary"
              sx={{ p: '10px' }}
              aria-label="send message"
              onClick={handleSendMessage}
              disabled={isLoading || (!input.trim() && !selectedFile)}
            >
              {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
            </IconButton>
          </Paper>
        </Box>
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
    
    if (Array.isArray(firstMessage.content)) {
      const textContent = firstMessage.content.find(item => item.type === 'text');
      preview = textContent ? textContent.text : 'No text content';
    } else if (typeof firstMessage.content === 'string') {
      preview = firstMessage.content;
    }
    
    return preview.length > 80 ? preview.slice(0, 77) + '...' : preview;
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      position: 'relative',
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1, 
        borderBottom: '1px solid',
        borderColor: 'divider',
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
              bgcolor: theme.palette.background.default,
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
                width: isSidebarOpen ? '250px' : '0px',  
                height: '100%',
                bgcolor: 'background.paper',
                transition: 'width 0.2s',
                overflow: 'hidden',
                borderRight: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ 
                p: 2, 
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  
                  <IconButton
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    size="small"
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                </Box>
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                        backgroundColor: theme.palette.primary.main + '1A', // 10% opacity
                        '&:hover': {
                          backgroundColor: theme.palette.primary.main + '26', // 15% opacity
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
                          opacity: 0.7
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
                        width: '100%',
                        position: 'relative',
                        backgroundColor: message.role === 'user' ? theme.palette.primary.dark : theme.palette.background.paper,
                        color: message.role === 'user' ? theme.palette.primary.contrastText : theme.palette.text.primary,
                        borderRadius: 2,
                        p: 2,
                        '&:hover .copy-button': {
                          opacity: 1,
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
                          backgroundColor: message.role === 'user' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                          color: message.role === 'user' ? 'white' : 'inherit',
                          '&:hover': {
                            backgroundColor: message.role === 'user' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
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
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
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
                      backgroundColor: message.role === 'user' ? theme.palette.primary.dark : theme.palette.background.paper,
                      color: message.role === 'user' ? theme.palette.primary.contrastText : theme.palette.text.primary,
                      borderRadius: 2,
                      p: 2,
                      '&:hover .copy-button': {
                        opacity: 1,
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
                        backgroundColor: message.role === 'user' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                        color: message.role === 'user' ? 'white' : 'inherit',
                        '&:hover': {
                          backgroundColor: message.role === 'user' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
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
                      backgroundColor: theme.palette.background.paper,
                      color: theme.palette.text.primary,
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
                handleProviderChange(`${provider.name}|${model.id}`);
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
                    overflow: 'hidden'
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

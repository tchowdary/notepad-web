import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import { 
  Send as SendIcon, 
  ContentCopy as CopyIcon, 
  Add as AddIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AutoFixHigh as AutoFixHighIcon,
  Image as ImageIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Key as KeyIcon,
  AttachFile as AttachFileIcon,
  PictureAsPdf as PdfIcon,
  Description as MarkdownIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  sendOpenAIMessage,
  sendAnthropicMessage,
  sendGeminiMessage,
  getAvailableProviders,
} from '../services/aiService';
import { chatStorage } from '../services/chatStorageService';
import { customInstructionsStorage } from '../services/customInstructionsService';
import ApiKeyInput from './ApiKeyInput';

const ChatBox = () => {
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingContentRef = useRef('');
  const theme = useTheme();
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

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
        const session = {
          id: activeSessionId,
          messages,
          created: sessions.find(s => s.id === activeSessionId)?.created || new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
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

  const createNewSession = async () => {
    try {
      const newSession = {
        id: Date.now().toString(),
        messages: [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
      await chatStorage.saveSession(newSession);
      const updatedSessions = await chatStorage.getAllSessions();
      setSessions(updatedSessions);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setHistoryAnchorEl(null);
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
        setMessages(session.messages);
      }
      setHistoryAnchorEl(null);
    } catch (error) {
      console.error('Error switching session:', error);
      setError('Failed to switch chat session');
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleProviderChange = (value) => {
    setSelectedProvider(value);
    localStorage.setItem('last_selected_provider', value);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
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
          type: 'pdf',
          name: file.name,
          data: base64Data
        });
      };
    } else if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
      reader.readAsText(file);
      reader.onload = (e) => {
        setSelectedFile({
          type: 'markdown',
          name: file.name,
          content: e.target.result
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

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedFile) || !selectedProvider || isLoading) return;
    setError('');
    setIsLoading(true);

    try {
      const [providerName, modelId] = selectedProvider.split('|');
      const messageContent = [];

      if (selectedFile) {
        switch (selectedFile.type) {
          case 'pdf':
            messageContent.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: selectedFile.data
              },
              cache_control: {
                type: 'ephemeral'
              }
            });
            break;
          case 'markdown':
            messageContent.push({
              type: 'text',
              text: selectedFile.content
            });
            break;
          case 'image':
            messageContent.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: selectedFile.mediaType,
                data: selectedFile.data
              }
            });
            break;
        }
      }

      if (input.trim()) {
        messageContent.push({
          type: 'text',
          text: input.trim()
        });
      }

      const newMessage = {
        role: 'user',
        content: input.trim(),
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMessage]);
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
          // Handle Gemini without streaming
          const response = await sendGeminiMessage(messages.concat([newMessage]), modelId, apiKey, selectedInstruction);
          finalResponse = response;
          setMessages(prev => [...prev, finalResponse]);
        } else {
          // Handle OpenAI and Anthropic with streaming
          setIsStreaming(true);
          setStreamingContent('');
          streamingContentRef.current = '';
          
          const handleStream = (content) => {
            streamingContentRef.current += content;
            setStreamingContent(streamingContentRef.current);
          };

          await (providerName === 'openai' 
            ? sendOpenAIMessage(messages.concat([newMessage]), modelId, apiKey, selectedInstruction, handleStream)
            : sendAnthropicMessage(messages.concat([newMessage]), modelId, apiKey, selectedInstruction, handleStream));

          finalResponse = {
            role: 'assistant',
            content: streamingContentRef.current,
            timestamp: new Date().toISOString()
          };

          setIsStreaming(false);
          setStreamingContent('');
          setMessages(prev => [...prev, finalResponse]);
        }
        
        if (activeSessionId) {
          await chatStorage.saveSession({
            id: activeSessionId,
            messages: messages.concat([newMessage, finalResponse]),
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (err) {
        setError(err.message);
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
            fontSize: '17px',
            lineHeight: 1.8,
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
            components={{
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
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
        }
        return null;
      });
    }

    // If content is undefined or null, return null
    return null;
  };

  return (
    <>
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
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                p: 1,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'background.paper',
              }}
            >
              

              <Tooltip title="Exit Fullscreen">
                <IconButton onClick={() => setIsFullscreen(false)} size="small">
                  <FullscreenExitIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* Messages Container */}
            <Box
              ref={messagesContainerRef}
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: theme.palette.divider,
                  borderRadius: '4px',
                },
              }}
            >
              {messages.map((message, index) => (
                <Box 
                  key={index} 
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 3,
                      width: '100%',
                      bgcolor: message.role === 'user' ? theme.palette.primary.main : theme.palette.background.paper,
                      color: message.role === 'user' ? theme.palette.primary.contrastText : theme.palette.text.primary,
                      borderRadius: 2,
                      overflow: 'auto',
                      maxHeight: '80vh',
                    }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      {renderMessageContent(message.content)}
                      <IconButton
                        size="small"
                        onClick={() => handleCopy(message.content, index)}
                        sx={{
                          position: 'absolute',
                          right: -8,
                          top: -8,
                          color: message.role === 'user' ? 'inherit' : theme.palette.text.secondary,
                        }}
                      >
                        {copiedIndex === index ? <Typography variant="caption">Copied!</Typography> : <CopyIcon fontSize="small" />}
                      </IconButton>
                    </Box>
                  </Paper>
                </Box>
              ))}
              {isStreaming && streamingContent && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 3,
                      width: '100%',
                      bgcolor: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <Typography sx={{ whiteSpace: 'pre-wrap', pr: 4, fontFamily: 'Rubik, sans-serif', lineHeight: 1.8 }}>
                        {streamingContent}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input Container */}
            <Box
              sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  inputRef={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  multiline
                  maxRows={5}
                  fullWidth
                  placeholder="Type your message..."
                  variant="outlined"
                  size="medium"
                  InputProps={{
                    sx: { fontSize: '1rem', minHeight: '56px' },
                    startAdornment: (
                      <Tooltip title={selectedInstruction ? `Custom Instruction: ${selectedInstruction.name}` : "Select Custom Instruction"}>
                        <IconButton
                          onClick={(e) => setInstructionMenuAnchorEl(e.currentTarget)}
                          color={selectedInstruction ? "primary" : "default"}
                          size="small"
                          sx={{ mr: 1 }}
                        >
                          <AutoFixHighIcon />
                        </IconButton>
                      </Tooltip>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      paddingRight: '14px',
                    }
                  }}
                />
                <label htmlFor="file-upload">
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*,.pdf,.md"
                    onChange={handleFileUpload}
                    sx={{ display: 'none' }}
                  />
                  <IconButton component="span" disabled={isLoading}>
                    <AttachFileIcon />
                  </IconButton>
                </label>

                <IconButton
                  onClick={handleSendMessage}
                  disabled={!selectedProvider || (!input.trim() && !selectedFile) || isLoading}
                >
                  {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Modal>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            maxHeight: '100vh',
            position: 'relative',
            '@media (max-width: 960px)': {
              height: '100vh',
              width: '100vw',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Messages Container */}
          <Box
            ref={messagesContainerRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              '@media (max-width: 960px)': {
                flex: 1,
                height: 'auto',
                pb: '140px', // Increased bottom padding to account for input box
              },
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.divider,
                borderRadius: '4px',
              },
            }}
          >
            {messages.map((message, index) => (
              <Box 
                key={index} 
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 3,
                    width: '100%',
                    bgcolor: message.role === 'user' ? theme.palette.primary.main : theme.palette.background.paper,
                    color: message.role === 'user' ? theme.palette.primary.contrastText : theme.palette.text.primary,
                    borderRadius: 2,
                    overflow: 'auto',
                    maxHeight: '80vh',
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    {message.role === 'user' ? (
                      <>
                        <Typography sx={{ whiteSpace: 'pre-wrap', pr: 4, fontFamily: 'Rubik, sans-serif', lineHeight: 1.8 }}>
                          {renderMessageContent(message.content)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(message.content, index)}
                          sx={{
                            position: 'absolute',
                            right: -8,
                            top: -8,
                            color: theme.palette.primary.contrastText,
                            opacity: 0.7,
                            '&:hover': {
                              opacity: 1,
                              bgcolor: 'rgba(255,255,255,0.2)',
                            },
                          }}
                        >
                          <Tooltip title={copiedIndex === index ? "Copied!" : "Copy"}>
                            <CopyIcon fontSize="small" />
                          </Tooltip>
                        </IconButton>
                      </>
                    ) : (
                      <>
                        {renderMessageContent(message.content)}
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(message.content, index)}
                          sx={{
                            position: 'absolute',
                            right: -8,
                            top: -8,
                            color: theme.palette.text.secondary,
                            opacity: 0.7,
                            '&:hover': {
                              opacity: 1,
                              bgcolor: 'rgba(0,0,0,0.1)',
                            },
                          }}
                        >
                          <Tooltip title={copiedIndex === index ? "Copied!" : "Copy"}>
                            <CopyIcon fontSize="small" />
                          </Tooltip>
                        </IconButton>
                      </>
                    )}
                  </Box>
                </Paper>
              </Box>
            ))}
            {isStreaming && streamingContent && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 3,
                    width: '100%',
                    bgcolor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <Typography sx={{ whiteSpace: 'pre-wrap', pr: 4, fontFamily: 'Rubik, sans-serif', lineHeight: 1.8 }}>
                      {streamingContent}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input Container */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '@media (max-width: 960px)': {
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
              },
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Tooltip title="Model Settings">
                <IconButton 
                  size="small"
                  onClick={(e) => setSettingsAnchorEl(e.currentTarget)}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Chat History">
                <IconButton 
                  size="small"
                  onClick={(e) => setHistoryAnchorEl(e.currentTarget)}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="New Chat">
                <IconButton 
                  size="small"
                  onClick={createNewSession}
                  color="primary"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Fullscreen">
              <IconButton onClick={() => setIsFullscreen(true)} size="small">
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="API Keys">
              <IconButton onClick={() => setApiKeyDialogOpen(true)} size="small">
                <KeyIcon />
              </IconButton>
            </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', p: 2, pt: 0 }}>
              <input
                type="file"
                accept="image/*,.pdf,.md"
                style={{ display: 'none' }}
                id="file-upload"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload">
                <IconButton component="span" color={selectedFile ? "primary" : "default"}>
                  <AttachFileIcon />
                </IconButton>
              </label>
              {selectedFile && (
                <Typography variant="body2" color="textSecondary">
                  {selectedFile.name}
                </Typography>
              )}
              <TextField
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                multiline
                maxRows={5}
                fullWidth
                placeholder="Type your message..."
                variant="outlined"
                size="medium"
                InputProps={{
                  sx: { fontSize: '1rem', minHeight: '56px' },
                  startAdornment: (
                    <Tooltip title={selectedInstruction ? `Custom Instruction: ${selectedInstruction.name}` : "Select Custom Instruction"}>
                      <IconButton
                        onClick={(e) => setInstructionMenuAnchorEl(e.currentTarget)}
                        color={selectedInstruction ? "primary" : "default"}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <AutoFixHighIcon />
                      </IconButton>
                    </Tooltip>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    paddingRight: '14px',
                  }
                }}
              />
              <IconButton 
                onClick={handleSendMessage} 
                color="primary"
                disabled={!selectedProvider || (!input.trim() && !selectedFile) || isLoading}
                sx={{ height: 40, width: 40 }}
              >
                {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </Box>
          </Box>

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
                  preview = '[Image with text]';
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
                    setHistoryAnchorEl(null);
                  }}
                  selected={session.id === activeSessionId}
                  sx={{ 
                    whiteSpace: 'normal',
                    minWidth: '300px'
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
      )}

      {/* Existing menus and dialogs */}
    </>
  );
};

export default ChatBox;

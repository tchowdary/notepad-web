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
  const [selectedImage, setSelectedImage] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        setSelectedImage({
          data: base64Data,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedImage) || !selectedProvider || isLoading) return;

    const [providerName, model] = selectedProvider.split('|');
    const newMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    if (selectedImage) {
      newMessage.content = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: selectedImage.type,
            data: selectedImage.data
          }
        },
        {
          type: "text",
          text: input || "What's in this image?"
        }
      ];
    }

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setSelectedImage(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    try {
      setIsLoading(true);
      setError('');
      const apiKey = localStorage.getItem(`${providerName}_api_key`);
      if (!apiKey) {
        throw new Error(`No API key found for ${providerName}`);
      }

      let response;
      switch (providerName) {
        case 'openai':
          response = await sendOpenAIMessage(messages.concat([newMessage]), model, apiKey, selectedInstruction);
          break;
        case 'anthropic':
          response = await sendAnthropicMessage(messages.concat([newMessage]), model, apiKey, selectedInstruction);
          break;
        case 'gemini':
          response = await sendGeminiMessage(messages.concat([newMessage]), model, apiKey, selectedInstruction);
          break;
        default:
          throw new Error(`Unknown provider: ${providerName}`);
      }

      setMessages(prev => [...prev, response]);
      
      if (activeSessionId) {
        await chatStorage.saveSession({
          id: activeSessionId,
          messages: messages.concat([newMessage, response]),
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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
    if (Array.isArray(content)) {
      return content.map((item, index) => {
        if (item.type === 'text') {
          return (
            <Typography 
              key={index} 
              variant="body1" 
              component="div"
              sx={{ 
                fontFamily: 'Rubik, sans-serif',
                lineHeight: 1.8,
                '& p': {
                  marginBottom: '1em',
                  marginTop: 0
                },
                '& pre': {
                  marginBottom: '1.5em'
                }
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
                {item.text}
              </ReactMarkdown>
            </Typography>
          );
        } else if (item.type === 'image') {
          return (
            <Box key={index} sx={{ my: 2 }}>
              <img 
                src={`data:${item.source.media_type};base64,${item.source.data}`}
                alt="User uploaded image"
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
              />
            </Box>
          );
        }
        return null;
      });
    }

    return (
      <Typography 
        variant="body1" 
        component="div"
        sx={{ 
          fontFamily: 'Rubik, sans-serif',
          lineHeight: 1.8,
          '& p': {
            marginBottom: '1em',
            marginTop: 0
          },
          '& pre': {
            marginBottom: '1.5em'
          }
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
                  size="small"
                  disabled={isLoading}
                />

                <label htmlFor="image-input">
                  <Input
                    id="image-input"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageSelect}
                    sx={{ display: 'none' }}
                  />
                  <IconButton component="span" disabled={isLoading}>
                    <ImageIcon />
                  </IconButton>
                </label>

                <IconButton
                  onClick={handleSendMessage}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
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
                pb: 8, // Add padding at bottom for mobile to account for input
                height: 'calc(100vh - 120px)', // Account for header and input height
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
              }
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
            <div ref={messagesEndRef} />
          </Box>

          {/* Input Container */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              position: { xs: 'fixed', md: 'sticky' },
              bottom: { xs: 0, md: 'auto' },
              left: { xs: 0, md: 'auto' },
              right: { xs: 0, md: 'auto' },
              width: '100%',
              zIndex: 2,
              '@media (max-width: 960px)': {
                pb: 4, // Extra padding at bottom for mobile to avoid overlap with responsive toolbar
              }
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
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
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', p: 2 }}>
              <input
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                id="image-upload"
                onChange={handleImageSelect}
              />
              <label htmlFor="image-upload">
                <IconButton component="span" color={selectedImage ? "primary" : "default"}>
                  <ImageIcon />
                </IconButton>
              </label>
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
                size="small"
                InputProps={{
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
                disabled={!selectedProvider || (!input.trim() && !selectedImage) || isLoading}
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

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
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  sendOpenAIMessage,
  sendAnthropicMessage,
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
  const theme = useTheme();
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

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
      if (instructions.length > 0) {
        const lastInstruction = localStorage.getItem('last_selected_instruction');
        const instruction = instructions.find(i => i.id === lastInstruction) || instructions[0];
        setSelectedInstruction(instruction);
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

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedProvider) return;

    const [provider, model] = selectedProvider.split('|');
    const newMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, newMessage];

    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const apiKey = localStorage.getItem(`${provider}_api_key`);
      if (!apiKey) {
        throw new Error(`No API key found for ${provider}`);
      }

      const response = provider === 'openai'
        ? await sendOpenAIMessage(updatedMessages, model, apiKey, selectedInstruction)
        : await sendAnthropicMessage(updatedMessages, model, apiKey, selectedInstruction);

      setMessages([...updatedMessages, response]);
      
      if (activeSessionId) {
        await chatStorage.saveSession({
          id: activeSessionId,
          messages: [...updatedMessages, response],
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

  const renderers = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'javascript';
      
      if (!inline) {
        return (
          <Box sx={{ position: 'relative', my: 2 }}>
            <IconButton
              size="small"
              onClick={() => handleCopy(String(children), props.key)}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.2)',
                },
              }}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{
                margin: 0,
                borderRadius: 4,
                padding: '2em 1em 1em 1em',
              }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </Box>
        );
      }
      return <code className={className} {...props}>{children}</code>;
    },
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {messages.map((message, index) => (
          <Box 
            key={index} 
            sx={{ 
              position: 'relative',
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              width: '100%'
            }}
          >
            <Paper
              sx={{
                p: 2,
                width: '100%',
                bgcolor: message.role === 'user' ? theme.palette.primary.main : theme.palette.background.paper,
                color: message.role === 'user' ? theme.palette.primary.contrastText : theme.palette.text.primary,
              }}
            >
              <Box sx={{ position: 'relative' }}>
                {message.role === 'user' ? (
                  <>
                    <Typography sx={{ whiteSpace: 'pre-wrap', pr: 4, fontFamily: 'Rubik, sans-serif' }}>
                      {message.content}
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
                    <ReactMarkdown components={renderers}>{message.content}</ReactMarkdown>
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

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
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
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', p: 2 }}>
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
            disabled={!selectedProvider || !input.trim() || isLoading}
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
      >
        {sessions.map(session => (
          <MenuItem 
            key={session.id} 
            onClick={() => switchSession(session.id)}
            selected={session.id === activeSessionId}
          >
            {new Date(session.created).toLocaleString()} ({session.messages.length})
          </MenuItem>
        ))}
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
  );
};

export default ChatBox;

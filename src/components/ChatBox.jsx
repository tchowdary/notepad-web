import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import {
  sendOpenAIMessage,
  sendAnthropicMessage,
  getAvailableProviders,
} from '../services/aiService';

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [error, setError] = useState('');
  const theme = useTheme();

  useEffect(() => {
    // Load available providers
    const availableProviders = getAvailableProviders();
    setProviders(availableProviders);
    
    // Set first available provider as default
    if (availableProviders.length > 0) {
      setSelectedProvider(`${availableProviders[0].name}|${availableProviders[0].selectedModel}`);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !selectedProvider) return;

    setError('');
    const [provider, modelId] = selectedProvider.split('|');
    const settings = JSON.parse(localStorage.getItem('ai_settings'));
    const apiKey = settings[provider].key;

    // Add user message
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    try {
      const response = provider === 'openai'
        ? await sendOpenAIMessage(newMessages, modelId, apiKey)
        : await sendAnthropicMessage(newMessages, modelId, apiKey);

      setMessages(prev => [...prev, response]);
    } catch (error) {
      setError(error.message);
      console.error('AI API error:', error);
    }
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: theme.palette.background.default 
    }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <FormControl fullWidth size="small">
          <InputLabel>Select Model</InputLabel>
          <Select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            label="Select Model"
          >
            {providers.map(provider => 
              provider.models.map(model => (
                <MenuItem 
                  key={`${provider.name}|${model.id}`}
                  value={`${provider.name}|${model.id}`}
                >
                  {`${provider.name.charAt(0).toUpperCase() + provider.name.slice(1)} - ${model.name}`}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Box>

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
          <Paper
            key={index}
            sx={{
              p: 2,
              maxWidth: '80%',
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              bgcolor: message.role === 'user' ? theme.palette.primary.main : theme.palette.background.paper,
              color: message.role === 'user' ? theme.palette.primary.contrastText : theme.palette.text.primary,
              whiteSpace: 'pre-wrap',
            }}
          >
            <Typography component="div" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        {!selectedProvider && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please configure AI models in settings (Cmd/Ctrl+Shift+M)
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder={selectedProvider ? "Type your message..." : "Configure AI models first"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!selectedProvider}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            multiline
            maxRows={4}
          />
          <IconButton 
            onClick={handleSend} 
            color="primary"
            disabled={!selectedProvider || !input.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatBox;

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

const DEFAULT_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o3-mini', name: 'o3 Mini' },
  ],
  groq: [
    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill LLaMA 70B' }
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek V3 Chat' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1' }
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' }
  ],
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini Flash' },
    { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini Thinking' }
  ]
};

const ApiKeyInput = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showKey, setShowKey] = useState(false);
  const [editModelDialog, setEditModelDialog] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [proxyConfig, setProxyConfig] = useState({
    url: localStorage.getItem('proxy_url') || '',
    key: localStorage.getItem('proxy_key') || ''
  });
  
  // Provider states
  const [providers, setProviders] = useState({
    openai: {
      key: localStorage.getItem('openai_api_key') || '',
      models: DEFAULT_MODELS.openai,
      selectedModel: localStorage.getItem('openai_model') || DEFAULT_MODELS.openai[0].id,
      modelSettings: JSON.parse(localStorage.getItem('openai_model_settings') || '{}'),
    },
    groq: {
      key: localStorage.getItem('groq_api_key') || '',
      models: DEFAULT_MODELS.groq,
      selectedModel: localStorage.getItem('groq_model') || DEFAULT_MODELS.groq[0].id,
      temperature: parseFloat(localStorage.getItem('groq_temperature')) || 0.6,
      modelSettings: JSON.parse(localStorage.getItem('groq_model_settings') || '{}'),
    },
    deepseek: {
      key: localStorage.getItem('deepseek_api_key') || '',
      models: DEFAULT_MODELS.deepseek,
      selectedModel: localStorage.getItem('deepseek_model') || DEFAULT_MODELS.deepseek[0].id,
      temperature: parseFloat(localStorage.getItem('deepseek_temperature')) || 0,
      modelSettings: JSON.parse(localStorage.getItem('deepseek_model_settings') || '{}'),
    },
    anthropic: {
      key: localStorage.getItem('anthropic_api_key') || '',
      models: DEFAULT_MODELS.anthropic,
      selectedModel: localStorage.getItem('anthropic_model') || DEFAULT_MODELS.anthropic[0].id,
      temperature: parseFloat(localStorage.getItem('anthropic_temperature')) || 0.7,
      modelSettings: JSON.parse(localStorage.getItem('anthropic_model_settings') || '{}'),
    },
    gemini: {
      key: localStorage.getItem('gemini_api_key') || '',
      models: DEFAULT_MODELS.gemini,
      selectedModel: localStorage.getItem('gemini_model') || DEFAULT_MODELS.gemini[0].id,
      temperature: parseFloat(localStorage.getItem('gemini_temperature')) || 0.7,
      modelSettings: JSON.parse(localStorage.getItem('gemini_model_settings') || '{}'),
    }
  });

  useEffect(() => {
    // Load saved settings
    const savedSettings = localStorage.getItem('ai_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Ensure all providers exist in the saved settings
      const updatedSettings = {
        openai: {
          key: parsed.openai?.key || localStorage.getItem('openai_api_key') || '',
          models: parsed.openai?.models || DEFAULT_MODELS.openai,
          selectedModel: parsed.openai?.selectedModel || localStorage.getItem('openai_model') || DEFAULT_MODELS.openai[0].id,
          modelSettings: parsed.openai?.modelSettings || JSON.parse(localStorage.getItem('openai_model_settings') || '{}'),
        },
        groq: {
          key: parsed.groq?.key || localStorage.getItem('groq_api_key') || '',
          models: parsed.groq?.models || DEFAULT_MODELS.groq,
          selectedModel: parsed.groq?.selectedModel || localStorage.getItem('groq_model') || DEFAULT_MODELS.groq[0].id,
          modelSettings: parsed.groq?.modelSettings || JSON.parse(localStorage.getItem('groq_model_settings') || '{}'),
        },
        deepseek: {
          key: parsed.deepseek?.key || localStorage.getItem('deepseek_api_key') || '',
          models: parsed.deepseek?.models || DEFAULT_MODELS.deepseek,
          selectedModel: parsed.deepseek?.selectedModel || localStorage.getItem('deepseek_model') || DEFAULT_MODELS.deepseek[0].id,
          modelSettings: parsed.deepseek?.modelSettings || JSON.parse(localStorage.getItem('deepseek_model_settings') || '{}'),
        },
        anthropic: {
          key: parsed.anthropic?.key || localStorage.getItem('anthropic_api_key') || '',
          models: parsed.anthropic?.models || DEFAULT_MODELS.anthropic,
          selectedModel: parsed.anthropic?.selectedModel || localStorage.getItem('anthropic_model') || DEFAULT_MODELS.anthropic[0].id,
          modelSettings: parsed.anthropic?.modelSettings || JSON.parse(localStorage.getItem('anthropic_model_settings') || '{}'),
        },
        gemini: {
          key: parsed.gemini?.key || localStorage.getItem('gemini_api_key') || '',
          models: parsed.gemini?.models || DEFAULT_MODELS.gemini,
          selectedModel: parsed.gemini?.selectedModel || localStorage.getItem('gemini_model') || DEFAULT_MODELS.gemini[0].id,
          modelSettings: parsed.gemini?.modelSettings || JSON.parse(localStorage.getItem('gemini_model_settings') || '{}'),
        }
      };
      setProviders(updatedSettings);
    }
  }, []);

  const handleSave = () => {
    // Save all settings
    localStorage.setItem('ai_settings', JSON.stringify(providers));
    
    // Also maintain backward compatibility
    if (providers.openai.key) {
      localStorage.setItem('openai_api_key', providers.openai.key);
      localStorage.setItem('openai_model', providers.openai.selectedModel);
    }
    if (providers.groq.key) {
      localStorage.setItem('groq_api_key', providers.groq.key);
      localStorage.setItem('groq_model', providers.groq.selectedModel);
      localStorage.setItem('groq_temperature', providers.groq.temperature);
    }
    if (providers.deepseek.key) {
      localStorage.setItem('deepseek_api_key', providers.deepseek.key);
      localStorage.setItem('deepseek_model', providers.deepseek.selectedModel);
      localStorage.setItem('deepseek_temperature', providers.deepseek.temperature);
    }
    if (providers.anthropic.key) {
      localStorage.setItem('anthropic_api_key', providers.anthropic.key);
      localStorage.setItem('anthropic_model', providers.anthropic.selectedModel);
      localStorage.setItem('anthropic_temperature', providers.anthropic.temperature);
    }
    if (providers.gemini.key) {
      localStorage.setItem('gemini_api_key', providers.gemini.key);
      localStorage.setItem('gemini_model', providers.gemini.selectedModel);
      localStorage.setItem('gemini_temperature', providers.gemini.temperature);
    }

    // Save proxy settings
    localStorage.setItem('proxy_url', proxyConfig.url);
    localStorage.setItem('proxy_key', proxyConfig.key);
    
    onClose();
  };

  const getCurrentProvider = () => {
    return activeTab === 0 ? 'openai' : activeTab === 1 ? 'groq' : activeTab === 2 ? 'deepseek' : activeTab === 3 ? 'anthropic' : 'gemini';
  };

  const handleAddModel = () => {
    setEditingModel({ id: '', name: '', isNew: true });
    setEditModelDialog(true);
  };

  const handleEditModel = (model) => {
    setEditingModel({ ...model, isNew: false });
    setEditModelDialog(true);
  };

  const handleDeleteModel = (modelId) => {
    const provider = getCurrentProvider();
    setProviders(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        models: prev[provider].models.filter(m => m.id !== modelId)
      }
    }));
  };

  const handleSaveModel = (model) => {
    const provider = getCurrentProvider();
    if (!provider) return;

    // For Gemini, validate model ID format
    if (provider === 'gemini' && !model.id.startsWith('gemini-')) {
      model.id = `gemini-${model.id}`;
    }

    setProviders(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        models: model.isNew
          ? [...prev[provider].models, { id: model.id, name: model.name }]
          : prev[provider].models.map(m => m.id === model.id ? { ...m, name: model.name } : m)
      }
    }));
    setEditModelDialog(false);
  };

  const handleProviderChange = (provider, field, value) => {
    setProviders(prev => {
      const updated = {
        ...prev,
        [provider]: {
          ...prev[provider],
          [field]: value
        }
      };

      // Save to localStorage
      if (field === 'key') {
        localStorage.setItem(`${provider}_api_key`, value);
      } else if (field === 'selectedModel') {
        localStorage.setItem(`${provider}_model`, value);
      }

      localStorage.setItem('ai_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const handleModelSettingChange = (provider, modelId, setting, value) => {
    setProviders(prev => {
      const updated = {
        ...prev,
        [provider]: {
          ...prev[provider],
          modelSettings: {
            ...prev[provider].modelSettings,
            [modelId]: {
              ...prev[provider].modelSettings[modelId],
              [setting]: value
            }
          }
        }
      };
      localStorage.setItem(`${provider}_model_settings`, JSON.stringify(updated[provider].modelSettings));
      localStorage.setItem('ai_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const ModelDialog = () => (
    <Dialog open={editModelDialog} onClose={() => setEditModelDialog(false)}>
      <DialogTitle>{editingModel?.isNew ? 'Add Model' : 'Edit Model'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Model ID"
            value={editingModel?.id || ''}
            onChange={(e) => setEditingModel(prev => ({ ...prev, id: e.target.value }))}
            disabled={!editingModel?.isNew}
          />
          <TextField
            label="Display Name"
            value={editingModel?.name || ''}
            onChange={(e) => setEditingModel(prev => ({ ...prev, name: e.target.value }))}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditModelDialog(false)}>Cancel</Button>
        <Button 
          onClick={() => handleSaveModel(editingModel)}
          variant="contained"
          disabled={!editingModel?.id || !editingModel?.name}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );

  const ProviderContent = ({ provider }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <Box sx={{ mt: 2 }}>
        <TextField
          label="API Key"
          type={showKey ? 'text' : 'password'}
          fullWidth
          value={providers[provider].key}
          onChange={(e) => handleProviderChange(provider, 'key', e.target.value)}
          InputProps={{
            endAdornment: (
              <IconButton onClick={() => setShowKey(!showKey)}>
                {showKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            ),
          }}
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Model</InputLabel>
          <Select
            value={providers[provider].selectedModel}
            onChange={(e) => handleProviderChange(provider, 'selectedModel', e.target.value)}
            label="Model"
          >
            {providers[provider].models.map((model) => (
              <MenuItem key={model.id} value={model.id}>
                {model.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ mt: 2 }}>
        <List>
          {providers[provider].models.map((model) => (
            <React.Fragment key={model.id}>
              <ListItem>
                <ListItemText
                  primary={model.name}
                  secondary={model.id}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleEditModel(model)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDeleteModel(model.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              <Box sx={{ pl: 2, pr: 2, pb: 2 }}>
                <FormControl fullWidth sx={{ mb: 1 }}>
                  <InputLabel>Temperature</InputLabel>
                  <Select
                    value={providers[provider].modelSettings[model.id]?.temperature ?? 'none'}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleModelSettingChange(
                        provider,
                        model.id,
                        'temperature',
                        value === 'none' ? undefined : parseFloat(value)
                      );
                    }}
                    label="Temperature"
                    size="small"
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value={0}>0 - Deterministic</MenuItem>
                    <MenuItem value={0.3}>0.3 - Conservative</MenuItem>
                    <MenuItem value={0.7}>0.7 - Balanced</MenuItem>
                    <MenuItem value={1}>1.0 - Creative</MenuItem>
                  </Select>
                </FormControl>
                {provider === 'openai' && (
                  <FormControl fullWidth>
                    <InputLabel>Reasoning Effort</InputLabel>
                    <Select
                      value={providers.openai.modelSettings[model.id]?.reasoningEffort || 'none'}
                      onChange={(e) => handleModelSettingChange('openai', model.id, 'reasoningEffort', e.target.value)}
                      label="Reasoning Effort"
                      size="small"
                    >
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>
                )}
                {provider === 'anthropic' && (
                  <>
                    <FormControl fullWidth sx={{ mb: 1 }}>
                      <InputLabel>Thinking</InputLabel>
                      <Select
                        value={providers.anthropic.modelSettings[model.id]?.thinking ?? false}
                        onChange={(e) => handleModelSettingChange('anthropic', model.id, 'thinking', e.target.value)}
                        label="Thinking"
                        size="small"
                      >
                        <MenuItem value={false}>Disabled</MenuItem>
                        <MenuItem value={true}>Enabled</MenuItem>
                      </Select>
                    </FormControl>
                    {providers.anthropic.modelSettings[model.id]?.thinking && (
                      <FormControl fullWidth>
                        <InputLabel>Budget Tokens</InputLabel>
                        <Select
                          value={providers.anthropic.modelSettings[model.id]?.budget_tokens ?? 16000}
                          onChange={(e) => handleModelSettingChange('anthropic', model.id, 'budget_tokens', parseInt(e.target.value))}
                          label="Budget Tokens"
                          size="small"
                        >
                          <MenuItem value={8000}>8,000 tokens</MenuItem>
                          <MenuItem value={16000}>16,000 tokens</MenuItem>
                          <MenuItem value={24000}>24,000 tokens</MenuItem>
                          <MenuItem value={32000}>32,000 tokens</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </>
                )}
              </Box>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">Models</Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddModel}
          size="small"
        >
          Add Model
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Configure AI Models</DialogTitle>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          centered
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="OpenAI" />
          <Tab label="Groq" />
          <Tab label="DeepSeek" />
          <Tab label="Anthropic" />
          <Tab label="Gemini" />
          <Tab label="Proxy" />
        </Tabs>

        <DialogContent>
          {activeTab === 0 && <ProviderContent provider="openai" />}
          {activeTab === 1 && <ProviderContent provider="groq" />}
          {activeTab === 2 && <ProviderContent provider="deepseek" />}
          {activeTab === 3 && <ProviderContent provider="anthropic" />}
          {activeTab === 4 && <ProviderContent provider="gemini" />}
          {activeTab === 5 && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Proxy URL"
                type="text"
                value={proxyConfig.url}
                onChange={(e) => setProxyConfig(prev => ({ ...prev, url: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Proxy API Key"
                type={showKey ? 'text' : 'password'}
                value={proxyConfig.key}
                onChange={(e) => setProxyConfig(prev => ({ ...prev, key: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowKey(!showKey)}>
                      {showKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                }}
              />
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Configured Providers: {Object.entries(providers)
                .filter(([_, config]) => config.key)
                .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1))
                .join(', ') || 'None'}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!providers.openai.key && !providers.groq.key && !providers.deepseek.key && !providers.anthropic.key && !providers.gemini.key}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ModelDialog />
    </>
  );
};

export default ApiKeyInput;

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
    { id: 'gpt-o1-mini', name: 'GPT-o1 Mini' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'Claude 3.5 Haiku', name: 'Claude 3.5 Haiku' }
  ]
};

const ApiKeyInput = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showKey, setShowKey] = useState(false);
  const [editModelDialog, setEditModelDialog] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  
  // Provider states
  const [providers, setProviders] = useState({
    openai: {
      key: '',
      models: [],
      selectedModel: '',
    },
    anthropic: {
      key: '',
      models: [],
      selectedModel: '',
    }
  });

  useEffect(() => {
    // Load saved settings
    const savedSettings = localStorage.getItem('ai_settings');
    if (savedSettings) {
      setProviders(JSON.parse(savedSettings));
    } else {
      // Initialize with default models
      setProviders({
        openai: {
          key: localStorage.getItem('openai_api_key') || '',
          models: DEFAULT_MODELS.openai,
          selectedModel: localStorage.getItem('openai_model') || DEFAULT_MODELS.openai[0].id,
        },
        anthropic: {
          key: localStorage.getItem('anthropic_api_key') || '',
          models: DEFAULT_MODELS.anthropic,
          selectedModel: localStorage.getItem('anthropic_model') || DEFAULT_MODELS.anthropic[0].id,
        }
      });
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
    if (providers.anthropic.key) {
      localStorage.setItem('anthropic_api_key', providers.anthropic.key);
      localStorage.setItem('anthropic_model', providers.anthropic.selectedModel);
    }
    
    onClose();
  };

  const getCurrentProvider = () => {
    return activeTab === 0 ? 'openai' : 'anthropic';
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
      <TextField
        fullWidth
        label={`${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`}
        type={showKey ? 'text' : 'password'}
        value={providers[provider].key}
        onChange={(e) => setProviders(prev => ({
          ...prev,
          [provider]: { ...prev[provider], key: e.target.value }
        }))}
        InputProps={{
          endAdornment: (
            <IconButton onClick={() => setShowKey(!showKey)} edge="end">
              {showKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
          ),
        }}
      />
      
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

      <List>
        {providers[provider].models.map((model, index) => (
          <React.Fragment key={model.id}>
            {index > 0 && <Divider />}
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
          </React.Fragment>
        ))}
      </List>

      <FormControl fullWidth>
        <InputLabel>Selected Model</InputLabel>
        <Select
          value={providers[provider].selectedModel}
          onChange={(e) => setProviders(prev => ({
            ...prev,
            [provider]: { ...prev[provider], selectedModel: e.target.value }
          }))}
          label="Selected Model"
        >
          {providers[provider].models.map((model) => (
            <MenuItem key={model.id} value={model.id}>
              {model.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Configure AI Models</DialogTitle>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          centered
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="OpenAI" />
          <Tab label="Anthropic" />
        </Tabs>

        <DialogContent>
          {activeTab === 0 && <ProviderContent provider="openai" />}
          {activeTab === 1 && <ProviderContent provider="anthropic" />}

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
            disabled={!providers.openai.key && !providers.anthropic.key}
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

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import ApiService from '../services/apiService';

const ApiSettingsModal = ({ open, onClose }) => {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('proxy_url') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('proxy_key') || '');
  const [autoSync, setAutoSync] = useState(localStorage.getItem('api_auto_sync') !== 'false');
  const [testingConnection, setTestingConnection] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (open) {
      // Refresh settings when modal opens
      setApiUrl(localStorage.getItem('proxy_url') || '');
      setApiKey(localStorage.getItem('proxy_key') || '');
      setAutoSync(localStorage.getItem('api_auto_sync') !== 'false');
      setTestResult(null);
    }
  }, [open]);

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem('proxy_url', apiUrl);
    localStorage.setItem('proxy_key', apiKey);
    localStorage.setItem('api_auto_sync', autoSync.toString());
    
    // Update API service with new settings
    ApiService.loadSettings();
    
    // Start or stop auto sync based on setting
    if (autoSync) {
      ApiService.startAutoSync();
    } else {
      ApiService.stopAutoSync();
    }
    
    // Import notes from API
    if (apiUrl && apiKey) {
      ApiService.importNotesFromApi().catch(error => {
        console.error('Error importing notes from API:', error);
      });
    }
    
    onClose();
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    
    try {
      // Temporarily update API service settings
      const tempSettings = {
        url: apiUrl,
        apiKey: apiKey
      };
      
      // Create a temporary API service instance for testing
      const tempApiService = {
        settings: tempSettings,
        isConfigured: () => !!(tempSettings.url && tempSettings.apiKey),
        getAllNotes: async () => {
          if (!tempSettings.url || !tempSettings.apiKey) {
            throw new Error('API URL and API Key are required');
          }
          
          const response = await fetch(`${tempSettings.url}/api/notes`, {
            method: 'GET',
            headers: {
              'x-api-key': tempSettings.apiKey
            }
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || response.statusText);
          }
          
          return await response.json();
        }
      };
      
      // Test the connection
      const notes = await tempApiService.getAllNotes();
      
      setTestResult({
        success: true,
        message: `Connection successful! Found ${notes.length} notes.`
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Connection failed: ${error.message}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncNow = async () => {
    // Save current settings first
    localStorage.setItem('proxy_url', apiUrl);
    localStorage.setItem('proxy_key', apiKey);
    
    // Update API service with new settings
    ApiService.loadSettings();
    
    // Trigger sync
    try {
      await ApiService.syncAllNotes();
      setTestResult({
        success: true,
        message: 'Manual sync completed successfully!'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Manual sync failed: ${error.message}`
      });
    }
  };

  const handleImportNotes = async () => {
    setImporting(true);
    setTestResult(null);
    
    try {
      // Save current settings first
      localStorage.setItem('proxy_url', apiUrl);
      localStorage.setItem('proxy_key', apiKey);
      
      // Update API service with new settings
      ApiService.loadSettings();
      
      // Import notes from API
      const importCount = await ApiService.importNotesFromApi();
      
      setTestResult({
        success: true,
        message: `Successfully imported ${importCount} notes from the API.`
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Failed to import notes: ${error.message}`
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>API Settings</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          Configure your API settings for real-time note syncing.
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <TextField
            label="API URL"
            fullWidth
            margin="normal"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://your-api-url.com"
          />
          
          <TextField
            label="API Key"
            fullWidth
            margin="normal"
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            InputProps={{
              endAdornment: (
                <Button 
                  onClick={() => setShowApiKey(!showApiKey)}
                  size="small"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </Button>
              )
            }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
              />
            }
            label="Enable real-time syncing"
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="outlined" 
            onClick={handleTestConnection}
            disabled={!apiUrl || !apiKey || testingConnection || importing}
          >
            {testingConnection ? <CircularProgress size={24} /> : 'Test Connection'}
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={handleSyncNow}
            disabled={!apiUrl || !apiKey || testingConnection || importing}
          >
            Sync Now
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={handleImportNotes}
            disabled={!apiUrl || !apiKey || testingConnection || importing}
          >
            {importing ? <CircularProgress size={24} /> : 'Import Notes from API'}
          </Button>
        </Box>
        
        {testResult && (
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: testResult.success ? 'success.light' : 'error.light',
              borderRadius: 1,
              color: 'white'
            }}
          >
            <Typography variant="body2">
              {testResult.message}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiSettingsModal;

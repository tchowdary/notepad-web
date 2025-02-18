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
} from '@mui/material';
import imageService from '../services/imageService';

export default function DropboxConfig({ open, onClose }) {
  const [refreshToken, setRefreshToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Load existing credentials if any
    const token = localStorage.getItem('dropbox_refresh_token');
    const id = localStorage.getItem('dropbox_client_id');
    const secret = localStorage.getItem('dropbox_client_secret');
    
    if (token) setRefreshToken(token);
    if (id) setClientId(id);
    if (secret) setClientSecret(secret);
    
    if (token && id && secret) {
      setStatus('Configured');
    }
  }, []);

  const handleSave = async () => {
    if (refreshToken && clientId && clientSecret) {
      try {
        imageService.setRefreshToken(refreshToken);
        imageService.setClientCredentials(clientId, clientSecret);
        await imageService.generateAccessToken();
        setStatus('Configured');
        onClose();
      } catch (error) {
        setStatus('Error: Invalid credentials');
        console.error('Error configuring Dropbox:', error);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Dropbox Configuration</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To configure Dropbox integration, please enter your Dropbox app credentials.
            You can find these in your Dropbox App Console. Make sure to enable offline access
            to generate a refresh token.
          </Typography>
          <TextField
            fullWidth
            label="Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            margin="normal"
            helperText="Your Dropbox app's client ID"
          />
          <TextField
            fullWidth
            label="Client Secret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            margin="normal"
            type="password"
            helperText="Your Dropbox app's client secret"
          />
          <TextField
            fullWidth
            label="Refresh Token"
            value={refreshToken}
            onChange={(e) => setRefreshToken(e.target.value)}
            margin="normal"
            type="password"
            helperText={status ? `Status: ${status}` : 'Your Dropbox app\'s refresh token'}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={!refreshToken || !clientId || !clientSecret}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

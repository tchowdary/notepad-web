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
  const [accessToken, setAccessToken] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Load existing token if any
    const token = localStorage.getItem('dropbox_access_token');
    if (token) {
      setAccessToken(token);
      setStatus('Configured');
    }
  }, []);

  const handleSave = () => {
    if (accessToken) {
      imageService.setAccessToken(accessToken);
      setStatus('Configured');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Dropbox Configuration</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To configure Dropbox integration for image uploads, please enter your Dropbox access token.
            You can generate this token from your Dropbox App Console.
          </Typography>
          <TextField
            fullWidth
            label="Dropbox Access Token"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            margin="normal"
            type="password"
            helperText={status ? `Status: ${status}` : ''}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!accessToken}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import dropboxAuthService from '../services/dropboxAuthService';
import imageService from '../services/imageService';

export default function DropboxConfig({ open, onClose }) {
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [processingCode, setProcessingCode] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code && !processingCode && !dropboxAuthService.isAuthenticated()) {
      handleAuthCode(code);
    }
  }, [processingCode]);

  const checkAuthStatus = () => {
    if (dropboxAuthService.isAuthenticated()) {
      setStatus('Authenticated');
      setActiveStep(2);
    } else {
      setStatus('Not configured');
      // Load saved credentials if they exist
      const savedClientId = localStorage.getItem('dropbox_client_id');
      const savedClientSecret = localStorage.getItem('dropbox_client_secret');
      if (savedClientId) setClientId(savedClientId);
      if (savedClientSecret) setClientSecret(savedClientSecret);
    }
  };

  const handleAuthCode = async (code) => {
    if (processingCode) return;
    
    setProcessingCode(true);
    try {
      await dropboxAuthService.getTokenFromCode(code);
      setStatus('Authenticated');
      setActiveStep(2);
      // Remove the code from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Error handling auth code:', error);
      setStatus('Authentication failed');
      setError('Failed to authenticate with Dropbox. Please try again.');
      setActiveStep(0);
    } finally {
      setProcessingCode(false);
    }
  };

  const handleConnect = async () => {
    setError('');
    try {
      if (!clientId || !clientSecret) {
        setError('Please enter both Client ID and Client Secret');
        return;
      }
      dropboxAuthService.setCredentials(clientId, clientSecret);
      const authUrl = await dropboxAuthService.getAuthUrl();
      setActiveStep(1);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting auth flow:', error);
      setError('Failed to start authentication. Please check your credentials.');
    }
  };

  const handleDisconnect = () => {
    dropboxAuthService.logout();
    setStatus('Not configured');
    setActiveStep(0);
    setError('');
  };

  const steps = ['Configure Credentials', 'Authorize', 'Connected'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Dropbox Configuration</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {!dropboxAuthService.isAuthenticated() ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter your Dropbox API credentials to enable image uploads.
                You can find these in your Dropbox App Console.
              </Typography>
              <TextField
                fullWidth
                label="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                margin="normal"
                error={!!error && !clientId}
              />
              <TextField
                fullWidth
                label="Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                margin="normal"
                type="password"
                error={!!error && !clientSecret}
              />
              {error && (
                <Typography color="error" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Successfully connected to Dropbox!
              Status: {status}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {!dropboxAuthService.isAuthenticated() ? (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={handleConnect} color="primary" variant="contained">
              Connect to Dropbox
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleDisconnect} color="secondary">
              Disconnect
            </Button>
            <Button onClick={onClose}>Close</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

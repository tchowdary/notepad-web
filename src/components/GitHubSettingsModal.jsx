import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';

const GitHubSettingsModal = ({ open, onClose }) => {
  const [settings, setSettings] = useState({
    token: '',
    repo: '',
    branch: 'main'
  });

  useEffect(() => {
    // Load existing settings when modal opens
    if (open) {
      setSettings({
        token: localStorage.getItem('github_token') || '',
        repo: localStorage.getItem('github_repo') || '',
        branch: localStorage.getItem('github_branch') || 'main'
      });
    }
  }, [open]);

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem('github_token', settings.token);
    localStorage.setItem('github_repo', settings.repo);
    localStorage.setItem('github_branch', settings.branch);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>GitHub Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="GitHub Token"
            type="password"
            fullWidth
            value={settings.token}
            onChange={(e) => setSettings({ ...settings, token: e.target.value })}
            placeholder="Enter your GitHub personal access token"
          />
          <TextField
            label="Repository"
            fullWidth
            value={settings.repo}
            onChange={(e) => setSettings({ ...settings, repo: e.target.value })}
            placeholder="username/repository"
            helperText="Format: username/repository"
          />
          <TextField
            label="Branch"
            fullWidth
            value={settings.branch}
            onChange={(e) => setSettings({ ...settings, branch: e.target.value })}
            placeholder="main"
          />
        </Box>
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

export default GitHubSettingsModal;

import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const ApiKeyInput = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('anthropic_api_key');
    setShowInput(!savedKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('anthropic_api_key', apiKey);
    setShowInput(false);
    if (onSave) onSave();
  };

  if (!showInput) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <TextField
        size="small"
        type={showKey ? 'text' : 'password'}
        placeholder="Enter Claude API Key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        InputProps={{
          endAdornment: (
            <IconButton
              size="small"
              onClick={() => setShowKey(!showKey)}
              edge="end"
            >
              {showKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
          ),
        }}
      />
      <Button
        variant="contained"
        size="small"
        onClick={handleSave}
        disabled={!apiKey}
      >
        Save
      </Button>
    </Box>
  );
};

export default ApiKeyInput;

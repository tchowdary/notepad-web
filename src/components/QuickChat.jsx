import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Box,
} from '@mui/material';

const QuickChat = ({ open, onClose, onSubmit }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Use a small timeout to ensure the Dialog is mounted
      const timeoutId = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = e.target.value.trim();
      if (text) {
        onSubmit(text);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{
        onEntered: () => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        },
      }}
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '20%',
          margin: 2,
        },
      }}
    >
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <TextField
            inputRef={inputRef}
            multiline
            rows={4}
            variant="outlined"
            placeholder="Type your message and press Enter to send..."
            onKeyDown={handleKeyDown}
            autoFocus
            fullWidth
            InputProps={{
              onFocus: (e) => {
                // Move cursor to end of text
                const value = e.target.value;
                e.target.value = '';
                e.target.value = value;
              },
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default QuickChat;

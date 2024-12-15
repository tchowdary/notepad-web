import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  IconButton,
  Box,
  Typography,
  Paper,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const QuickAddTask = ({ open, onClose, onAddTask, darkMode }) => {
  const [task, setTask] = useState('');
  const inputRef = useRef(null);

  // Reset task when dialog opens
  useEffect(() => {
    if (open) {
      setTask('');
    }
  }, [open]);

  // Focus input when dialog opens
  const handleEntered = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (task.trim()) {
      onAddTask(task);
      setTask('');
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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
        onEntered: handleEntered,
      }}
      PaperProps={{
        sx: {
          bgcolor: darkMode ? '#1e1e1e' : 'background.paper',
          color: darkMode ? '#ffffff' : 'text.primary',
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }
      }}
    >
      <Paper 
        elevation={0}
        sx={{ 
          p: 2,
          bgcolor: 'transparent',
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 500 }}>
            Quick Add Task
          </Typography>
          <IconButton 
            onClick={onClose}
            size="small"
            sx={{ 
              color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
              '&:hover': {
                color: darkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0 }}>
          <form onSubmit={handleSubmit}>
            <TextField
              inputRef={inputRef}
              multiline
              rows={3}
              fullWidth
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What needs to be done?"
              variant="outlined"
              InputProps={{
                autoFocus: true,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: darkMode ? '#252526' : 'background.paper',
                  borderRadius: 1.5,
                  '& fieldset': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  },
                  '&:hover fieldset': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.3)' : 'primary.main',
                  },
                },
                '& .MuiInputBase-input': {
                  color: darkMode ? '#ffffff' : 'text.primary',
                },
              }}
            />
          </form>
          <Typography 
            variant="caption" 
            sx={{ 
              mt: 1, 
              display: 'block',
              color: darkMode ? 'rgba(255,255,255,0.5)' : 'text.secondary',
            }}
          >
            Press Enter to add • Shift + Enter for new line • Esc to cancel
          </Typography>
        </DialogContent>
      </Paper>
    </Dialog>
  );
};

export default QuickAddTask;

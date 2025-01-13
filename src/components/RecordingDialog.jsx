import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  IconButton,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Stop as StopIcon } from '@mui/icons-material';

const RecordingDialog = ({ open, onClose, elapsedTime, isProcessing, error }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onClose={isProcessing ? undefined : onClose}>
      <DialogTitle>{isProcessing ? 'Processing Recording' : 'Recording in Progress'}</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            p: 2,
            minWidth: '300px',
          }}
        >
          {error ? (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          ) : (
            <>
              <CircularProgress size={48} color="error" />
              {!isProcessing && (
                <>
                  <Typography variant="h4">{formatTime(elapsedTime)}</Typography>
                  <IconButton
                    onClick={onClose}
                    color="error"
                    sx={{ mt: 2 }}
                  >
                    <StopIcon fontSize="large" />
                  </IconButton>
                </>
              )}
              {isProcessing && (
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Transcribing audio...
                </Typography>
              )}
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default RecordingDialog;

import React, { useEffect, useState } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import { Dialog, DialogContent, AppBar, Toolbar, IconButton, Typography, Button } from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import { env } from '../env';

// Define environment variables
const BACKEND_V2_GET_URL = env.BACKEND_V2_GET_URL;
const BACKEND_V2_POST_URL = env.BACKEND_V2_POST_URL;
const LIBRARY_URL = env.LIBRARY_URL;
const LIBRARY_BACKEND = env.LIBRARY_BACKEND;

const ExcalidrawEditor = ({ open, onClose, darkMode, id }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [excalidrawData, setExcalidrawData] = useState(null);

  useEffect(() => {
    const savedData = localStorage.getItem(`excalidraw-${id}`);
    if (savedData) {
      setExcalidrawData(JSON.parse(savedData));
    }
  }, [id]);

  const handleChange = (elements, appState, files) => {
    const data = { elements, appState, files };
    localStorage.setItem(`excalidraw-${id}`, JSON.stringify(data));
  };

  const handleExport = async () => {
    if (!excalidrawAPI) return;
    
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    
    const blob = await exportToBlob({
      elements,
      appState,
      files: excalidrawAPI.getFiles(),
      getDimensions: () => ({ width: 1920, height: 1080 }),
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drawing-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
    >
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar variant="dense">
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Drawing
          </Typography>
          <Button 
            color="inherit" 
            startIcon={<SaveIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Toolbar>
      </AppBar>
      <DialogContent sx={{ padding: 0 }}>
        <div style={{ height: '100%', width: '100%' }}>
          <Excalidraw
            ref={(api) => setExcalidrawAPI(api)}
            theme={darkMode ? "dark" : "light"}
            initialData={excalidrawData}
            onChange={handleChange}
            UIOptions={{
              canvasActions: {
                export: false,
                loadScene: false,
                saveAsImage: false,
                saveToActiveFile: false,
              },
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExcalidrawEditor;

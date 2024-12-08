import React, { useEffect, useState, useCallback } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { env } from '../env';
import { saveDrawing, loadDrawing } from '../utils/db';

// Define environment variables
const BACKEND_V2_GET_URL = env.BACKEND_V2_GET_URL;
const BACKEND_V2_POST_URL = env.BACKEND_V2_POST_URL;
const LIBRARY_URL = env.LIBRARY_URL;
const LIBRARY_BACKEND = env.LIBRARY_BACKEND;

// Separate component for the actual Excalidraw instance
const ExcalidrawInstance = ({ darkMode, id, initialData, onSave }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  const handleChange = useCallback(async (elements, appState, files) => {
    if (!elements || !appState) return;
    onSave(elements, appState, files);
  }, [onSave]);

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
    <>
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        right: 8, 
        zIndex: 1,
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1
      }}>
        <Tooltip title="Export as PNG">
          <IconButton onClick={handleExport} size="small">
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Excalidraw
        onChange={handleChange}
        initialData={initialData}
        theme={darkMode ? "dark" : "light"}
        onPointerUpdate={(payload) => setExcalidrawAPI(payload.excalidrawAPI)}
        UIOptions={{
          canvasActions: {
            export: false,
            loadScene: false,
            saveAsImage: false,
            saveToActiveFile: false,
          },
          theme: darkMode ? "dark" : "light",
        }}
        renderTopRightUI={null}
      />
    </>
  );
};

// Main container component
const ExcalidrawEditor = ({ darkMode, id }) => {
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    const loadExcalidrawData = async () => {
      setInitialData(null); // Reset data before loading new drawing
      try {
        const data = await loadDrawing(id);
        const newData = {
          elements: (data?.elements || []),
          appState: {
            ...(data?.appState || {}),
            theme: darkMode ? "dark" : "light",
            viewBackgroundColor: darkMode ? "#121212" : "#ffffff",
            gridColor: darkMode ? "#2a2a2a" : "#cccccc",
            exportWithDarkMode: darkMode,
          },
          files: data?.files || {}
        };
        setInitialData(newData);
      } catch (error) {
        console.error('Error loading drawing:', error);
        // Set empty drawing data on error
        setInitialData({
          elements: [],
          appState: {
            theme: darkMode ? "dark" : "light",
            viewBackgroundColor: darkMode ? "#121212" : "#ffffff",
            gridColor: darkMode ? "#2a2a2a" : "#cccccc",
            exportWithDarkMode: darkMode,
          },
          files: {}
        });
      }
    };

    loadExcalidrawData();
  }, [id, darkMode]);

  const handleSave = useCallback(async (elements, appState, files) => {
    

    const data = {
      id,
      elements,
      appState: {
        ...appState,
        theme: darkMode ? "dark" : "light",
        viewBackgroundColor: darkMode ? "#121212" : "#ffffff",
        gridColor: darkMode ? "#2a2a2a" : "#cccccc",
        exportWithDarkMode: darkMode,
      },
      files
    };

    try {
      await saveDrawing(data);
    } catch (error) {
      console.error('Error saving drawing:', error);
    }
  }, [id, darkMode]);

  return (
    <Box sx={{ 
      height: '100%', 
      width: '100%', 
      position: 'relative',
      bgcolor: darkMode ? '#121212' : '#ffffff'
    }}>
      {initialData && (
        <ExcalidrawInstance
          key={id} // Force new instance for each drawing
          darkMode={darkMode}
          id={id}
          initialData={initialData}
          onSave={handleSave}
        />
      )}
    </Box>
  );
};

export default ExcalidrawEditor;

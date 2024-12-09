import React, { useCallback } from 'react';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { saveDrawing, loadDrawing } from '../utils/db';

const TLDrawInstance = ({ darkMode, id, initialData, onSave }) => {
  const handleChange = useCallback(
    (editor) => {
      const snapshot = editor.store.getSnapshot();
      onSave(snapshot);
    },
    [onSave]
  );

  const handleExport = useCallback(async (editor) => {
    const blob = await editor.getSvg();
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `drawing-${id}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  }, [id]);

  return (
    <>
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        right: 8, 
        zIndex: 1,
        backgroundColor: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
        borderRadius: '4px',
        backdropFilter: 'blur(4px)'
      }}>
        <Tooltip title="Export as SVG">
          <IconButton onClick={handleExport} size="small">
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Tldraw
        persistenceKey={`tldraw-${id}`}
        darkMode={darkMode}
        onChangePresence={handleChange}
        initialData={initialData}
      />
    </>
  );
};

const TLDrawEditor = ({ darkMode, id }) => {
  const loadTLDrawData = useCallback(async () => {
    try {
      const data = await loadDrawing(id);
      return data?.tldrawData || undefined;
    } catch (error) {
      console.error('Error loading drawing:', error);
      return undefined;
    }
  }, [id]);

  const saveTLDrawData = useCallback(async (data) => {
    try {
      await saveDrawing(id, { tldrawData: data });
    } catch (error) {
      console.error('Error saving drawing:', error);
    }
  }, [id]);

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative',
      '& .tldraw': {
        position: 'absolute',
        inset: 0,
      }
    }}>
      <TLDrawInstance
        darkMode={darkMode}
        id={id}
        onSave={saveTLDrawData}
        initialData={loadTLDrawData()}
      />
    </Box>
  );
};

export default TLDrawEditor;

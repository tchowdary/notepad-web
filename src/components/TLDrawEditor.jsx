import React, { useCallback, useState } from 'react';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Download as DownloadIcon, FolderOpen as FolderOpenIcon } from '@mui/icons-material';
import { saveDrawing, loadDrawing } from '../utils/db';

const TLDrawInstance = ({ darkMode, id, initialData, onSave }) => {
  const [editor, setEditor] = useState(null);

  const handleMount = useCallback((editor) => {
    setEditor(editor);
  }, []);

  const handleChange = useCallback(
    (editor) => {
      const snapshot = editor.store.getSnapshot();
      onSave(snapshot);
    },
    [onSave]
  );

  const handleExport = useCallback(() => {
    if (!editor) return;
    
    // Use the editor's built-in serialization
    const serializedState = editor.getSnapshot();
    
    const blob = new Blob([JSON.stringify(serializedState)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drawing-${id}.tldr`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [editor, id]);

  const handleFileUpload = useCallback((event) => {
    if (!editor) return;
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target.result);
          
          // Load the state using the editor's built-in method
          editor.loadSnapshot(content);
          
        } catch (err) {
          console.error('Error loading file:', err);
        }
      };
      reader.readAsText(file);
    }
    // Clear the input value so the same file can be loaded again
    event.target.value = '';
  }, [editor]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        right: 8, 
        zIndex: 1,
        backgroundColor: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
        borderRadius: '4px',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        gap: 1,
        padding: '4px'
      }}>
        <input
          type="file"
          accept=".tldr"
          style={{ display: 'none' }}
          id={`file-upload-${id}`}
          onChange={handleFileUpload}
        />
        <Tooltip title="Open TLDR file">
          <IconButton 
            size="small" 
            onClick={() => document.getElementById(`file-upload-${id}`).click()}
          >
            <FolderOpenIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Save as TLDR">
          <IconButton onClick={handleExport} size="small">
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Tldraw
        persistenceKey={`tldraw-${id}`}
        darkMode={darkMode}
        onMount={handleMount}
        onChange={handleChange}
        initialData={initialData}
      />
    </Box>
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

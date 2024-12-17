import React, { useCallback, useState, useEffect } from 'react';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Download as DownloadIcon, FolderOpen as FolderOpenIcon, Sync as SyncIcon } from '@mui/icons-material';
import { saveDrawing, loadDrawing } from '../utils/db';
import githubService from '../services/githubService';

const TLDrawInstance = ({ darkMode, id, initialData, onSave }) => {
  const [editor, setEditor] = useState(null);

  const handleMount = useCallback((editor) => {
    setEditor(editor);
  }, []);

  const handleChange = useCallback(
    (editor) => {
      const snapshot = editor.store.getSnapshot();
      onSave({
        document: snapshot,
        session: {
          version: 0,
          currentPageId: editor.currentPageId,
          exportBackground: true,
          isFocusMode: false,
          isDebugMode: false,
          isToolLocked: false,
          isGridMode: false,
          pageStates: [{
            pageId: editor.currentPageId,
            camera: editor.camera,
            selectedShapeIds: [],
            focusedGroupId: null
          }]
        }
      });
    },
    [onSave]
  );

  const handleExport = useCallback(() => {
    if (!editor) return;
    
    // Use the editor's built-in serialization
    const serializedState = editor.getSnapshot();
    
    const blob = new Blob([JSON.stringify({
      document: serializedState,
      session: {
        version: 0,
        currentPageId: editor.currentPageId,
        exportBackground: true,
        isFocusMode: false,
        isDebugMode: false,
        isToolLocked: false,
        isGridMode: false,
        pageStates: [{
          pageId: editor.currentPageId,
          camera: editor.camera,
          selectedShapeIds: [],
          focusedGroupId: null
        }]
      }
    })], { type: 'application/json' });
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

  const handleSync = useCallback(async () => {
    if (!editor) return;
    
    try {
      const serializedState = editor.getSnapshot();
      // First save locally
      onSave(serializedState);
      
      // Then sync to GitHub
      await githubService.uploadFile(`${id}.tldraw`, JSON.stringify(serializedState));
      console.log('Diagram synced with GitHub successfully');
    } catch (error) {
      console.error('Error syncing with GitHub:', error);
    }
  }, [editor, onSave, id]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box sx={{ 
        position: 'absolute', 
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
        backgroundColor: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
        borderRadius: '0 0 4px 4px',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        gap: 1,
        padding: '4px 8px'
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
        <Tooltip title="Sync with GitHub">
          <IconButton onClick={handleSync} size="small">
            <SyncIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Tldraw
        persistenceKey={`tldraw-${id}`}
        darkMode={darkMode}
        onMount={handleMount}
        onChange={handleChange}
        snapshot={initialData?.document}
      />
    </Box>
  );
};

const TLDrawEditor = ({ darkMode, id, initialContent }) => {
  const [loadedData, setLoadedData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (initialContent) {
          setLoadedData(initialContent);
          return;
        }
        const data = await loadDrawing(id);
        setLoadedData(data?.tldrawData);
      } catch (error) {
        console.error('Error loading drawing:', error);
      }
    };
    loadData();
  }, [id, initialContent]);

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
        initialData={loadedData}
      />
    </Box>
  );
};

export default TLDrawEditor;

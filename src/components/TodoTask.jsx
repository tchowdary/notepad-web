import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import TipTapEditor from './TipTapEditor';
import { Box, Typography, Checkbox, TextField, Paper } from '@mui/material';
import { Today } from '@mui/icons-material';

const TodoTask = forwardRef(({ content, onChange, darkMode, id, completed, dueDate }, ref) => {
  // Store editor content directly
  const [editorContent, setEditorContent] = useState(content || '');
  const tipTapEditorRef = useRef(null);
  const isInitialMount = useRef(true);
  const isUpdatingFromProps = useRef(false);
  const previousIdRef = useRef(id);

  // Reset state when id changes (new task)
  useEffect(() => {
    if (previousIdRef.current !== id) {
      // This is a new task, reset the editor
      setEditorContent(content || '');
      if (tipTapEditorRef.current) {
        tipTapEditorRef.current.clearContent();
      }
      previousIdRef.current = id;
    }
  }, [id, content]);

  // Debounce the onChange callback to prevent too many updates
  const debouncedOnChange = useCallback(() => {
    if (isInitialMount.current || isUpdatingFromProps.current) {
      return;
    }
    
    onChange(editorContent);
  }, [editorContent, onChange]);

  // Only update from props when content changes externally
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (previousIdRef.current !== id) {
      // Already handled in the id change effect
      return;
    }
    
    try {
      isUpdatingFromProps.current = true;
      setEditorContent(content || '');
      setTimeout(() => {
        isUpdatingFromProps.current = false;
      }, 0);
    } catch (e) {
      console.error('Error updating content:', e);
      isUpdatingFromProps.current = false;
    }
  }, [content, id]);

  // Call the debounced onChange when state changes
  useEffect(() => {
    if (isInitialMount.current || isUpdatingFromProps.current) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      debouncedOnChange();
    }, 300); // Debounce for 300ms
    
    return () => clearTimeout(timeoutId);
  }, [editorContent, debouncedOnChange]);

  const handleCompletedChange = () => {
    // Pass the completed status as a separate attribute to onChange
    onChange(editorContent, { completed: !completed });
  };

  const handleDueDateChange = (e) => {
    const newDueDate = e.target.value;
    // Call onChange with the new content and due date
    onChange(editorContent, { dueDate: newDueDate });
  };

  const handleEditorChange = (content) => {
    setEditorContent(content);
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getContent: () => {
      return editorContent;
    },
    getMarkdown: () => {
      return tipTapEditorRef.current?.getMarkdown() || '';
    },
    getText: () => {
      return tipTapEditorRef.current?.getText() || '';
    },
    clearContent: () => {
      setEditorContent('');
      if (tipTapEditorRef.current) {
        tipTapEditorRef.current.clearContent();
      }
    }
  }));

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      bgcolor: darkMode ? '#1f1a24' : '#FFFCF0'
    }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 1, 
          mb: 1, 
          bgcolor: darkMode ? '#282433' : '#FFFCF0',
          borderBottom: '1px solid',
          borderColor: darkMode ? '#333333' : '#e0e0e0'
        }}
      >
        {/* Header row with checkbox and due date */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          alignItems: 'center', 
          gap: 0.25
        }}>
          <Checkbox 
            checked={completed || false} 
            onChange={handleCompletedChange}
            size="small"
            sx={{ 
              padding: '1px',  
              width: '20px',  
              height: '20px',  
              color: darkMode ? '#aaa' : '#666',
              '&.Mui-checked': {
                color: darkMode ? '#68d391' : '#4caf50',
              }
            }}
          />
          <TextField
            type="date"
            size="small"
            value={dueDate || ''}
            onChange={handleDueDateChange}
            InputProps={{
              startAdornment: (
                <Today sx={{ 
                  fontSize: '14px',  
                  mr: 0.25,  
                  color: darkMode ? '#aaa' : '#666' 
                }} />
              ),
            }}
            sx={{
              '& .MuiInputBase-root': {
                height: '24px',
                fontSize: '12px',
                padding: '1px 5px',
                color: darkMode ? '#ddd' : '#333',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: darkMode ? '#444' : '#ddd',
              },
              '& .MuiInputBase-input': {
                padding: '0px 5px',
              },
              width: '140px'
            }}
          />
        </Box>
      </Paper>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TipTapEditor
          ref={tipTapEditorRef}
          content={editorContent}
          onChange={handleEditorChange}
          darkMode={darkMode}
          key={`editor-${id}`} // Add key to force re-render when id changes
        />
      </Box>
    </Box>
  );
});

export default TodoTask;

import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import TipTapEditor from './TipTapEditor';
import { Box, Typography, Checkbox, TextField, IconButton, Paper } from '@mui/material';
import { Done, Flag, Today, Delete } from '@mui/icons-material';

const TodoTask = forwardRef(({ content, onChange, darkMode, id }, ref) => {
  // Parse content only once during initialization
  const initialData = React.useMemo(() => {
    try {
      return content ? JSON.parse(content) : {};
    } catch (e) {
      console.error('Error parsing initial todo content:', e);
      return {};
    }
  }, [content]);

  const [todoData, setTodoData] = useState({
    title: '',
    completed: false,
    dueDate: '',
    priority: 'normal',
    ...initialData
  });
  
  const [editorContent, setEditorContent] = useState(initialData.description || '');
  const tipTapEditorRef = useRef(null);
  const isInitialMount = useRef(true);
  const isUpdatingFromProps = useRef(false);
  const previousContentRef = useRef(content);

  // Debounce the onChange callback to prevent too many updates
  const debouncedOnChange = useCallback(() => {
    if (isInitialMount.current || isUpdatingFromProps.current) {
      return;
    }
    
    const newContent = JSON.stringify({
      ...todoData,
      description: editorContent
    });
    
    onChange(newContent);
  }, [todoData, editorContent, onChange]);

  // Only update from props when content changes externally
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Skip if content hasn't changed
    if (content === previousContentRef.current) {
      return;
    }
    
    previousContentRef.current = content;
    
    if (content) {
      try {
        isUpdatingFromProps.current = true;
        const parsedContent = JSON.parse(content);
        setTodoData(prev => ({
          ...prev,
          ...parsedContent
        }));
        setEditorContent(parsedContent.description || '');
        setTimeout(() => {
          isUpdatingFromProps.current = false;
        }, 0);
      } catch (e) {
        console.error('Error parsing todo content:', e);
        isUpdatingFromProps.current = false;
      }
    }
  }, [content]);

  // Call the debounced onChange when state changes
  useEffect(() => {
    if (isInitialMount.current || isUpdatingFromProps.current) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      debouncedOnChange();
    }, 300); // Debounce for 300ms
    
    return () => clearTimeout(timeoutId);
  }, [todoData, editorContent, debouncedOnChange]);

  const handleCompletedChange = () => {
    const newData = {
      ...todoData,
      completed: !todoData.completed
    };
    setTodoData(newData);
    onChange(newData);
  };

  const handleDueDateChange = (e) => {
    const newData = {
      ...todoData,
      dueDate: e.target.value
    };
    setTodoData(newData);
    onChange(newData);
  };

  const handlePriorityChange = () => {
    const priorities = ['low', 'normal', 'high'];
    const currentIndex = priorities.indexOf(todoData.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    
    const newData = {
      ...todoData,
      priority: priorities[nextIndex]
    };
    setTodoData(newData);
    onChange(newData);
  };

  const handleEditorChange = (content) => {
    setEditorContent(content);
    onChange({
      ...todoData,
      description: content
    });
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getContent: () => {
      return JSON.stringify({
        ...todoData,
        description: editorContent
      });
    },
    getMarkdown: () => {
      return tipTapEditorRef.current?.getMarkdown() || '';
    },
    getText: () => {
      return tipTapEditorRef.current?.getText() || '';
    },
    clearContent: () => {
      setTodoData({
        title: '',
        completed: false,
        dueDate: '',
        priority: 'normal'
      });
      setEditorContent('');
      tipTapEditorRef.current?.clearContent();
    }
  }));

  const getPriorityColor = () => {
    switch(todoData.priority) {
      case 'high': return darkMode ? '#ff6b6b' : '#d32f2f';
      case 'low': return darkMode ? '#63b3ed' : '#2196f3';
      default: return darkMode ? '#68d391' : '#4caf50';
    }
  };

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
            checked={todoData.completed} 
            onChange={handleCompletedChange}
            size="small"
            sx={{ 
              padding: '1px',  
              width: '20px',  
              height: '20px',  
              color: darkMode ? '#aaa' : '#666',
              '&.Mui-checked': {
                color: getPriorityColor(),
              }
            }}
          />
          <TextField
            type="date"
            size="small"
            value={todoData.dueDate}
            onChange={handleDueDateChange}
            InputProps={{
              startAdornment: (
                <Today sx={{ 
                  fontSize: '14px',  
                  mr: 0.25,  
                  color: darkMode ? '#aaa' : '#666' 
                }} />
              ),
              sx: { 
                height: '20px',  
                minWidth: 'auto'  
              }
            }}
            sx={{ 
              '& .MuiInputBase-input': {
                color: darkMode ? '#fff' : '#333',
                fontSize: '0.65rem',  
                py: 0,  
                px: 0.25,  
                height: '20px',  
                lineHeight: '20px'  
              },
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none'
              }
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
        />
      </Box>
    </Box>
  );
});

export default TodoTask;

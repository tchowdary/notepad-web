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

  const handleTitleChange = (e) => {
    setTodoData(prev => ({
      ...prev,
      title: e.target.value
    }));
  };

  const handleCompletedChange = () => {
    setTodoData(prev => ({
      ...prev,
      completed: !prev.completed
    }));
  };

  const handleDueDateChange = (e) => {
    setTodoData(prev => ({
      ...prev,
      dueDate: e.target.value
    }));
  };

  const handlePriorityChange = () => {
    const priorities = ['low', 'normal', 'high'];
    const currentIndex = priorities.indexOf(todoData.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    
    setTodoData(prev => ({
      ...prev,
      priority: priorities[nextIndex]
    }));
  };

  const handleEditorChange = (content) => {
    setEditorContent(content);
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
          p: 2, 
          mb: 2, 
          bgcolor: darkMode ? '#282433' : '#FFFCF0',
          borderBottom: '1px solid',
          borderColor: darkMode ? '#333333' : '#e0e0e0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Checkbox 
            checked={todoData.completed} 
            onChange={handleCompletedChange}
            sx={{ 
              color: darkMode ? '#aaa' : '#666',
              '&.Mui-checked': {
                color: getPriorityColor(),
              }
            }}
          />
          <TextField
            fullWidth
            variant="standard"
            placeholder="Task title"
            value={todoData.title}
            onChange={handleTitleChange}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '1.2rem',
                textDecoration: todoData.completed ? 'line-through' : 'none',
                color: todoData.completed ? (darkMode ? '#aaa' : '#888') : 'inherit'
              },
              '& .MuiInput-underline:before': {
                borderBottomColor: 'transparent'
              },
              '& .MuiInput-underline:hover:before': {
                borderBottomColor: darkMode ? '#444' : '#ddd'
              }
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
          <IconButton 
            size="small" 
            onClick={handlePriorityChange}
            sx={{ color: getPriorityColor() }}
          >
            <Flag />
          </IconButton>
          
          <TextField
            type="date"
            size="small"
            value={todoData.dueDate}
            onChange={handleDueDateChange}
            InputProps={{
              startAdornment: (
                <Today fontSize="small" sx={{ mr: 1, color: darkMode ? '#aaa' : '#666' }} />
              ),
            }}
            sx={{ 
              ml: 1,
              '& .MuiInputBase-input': {
                color: darkMode ? '#fff' : '#333',
                fontSize: '0.875rem',
                py: 0.5
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

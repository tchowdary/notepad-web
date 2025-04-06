import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Checkbox,
  TextField,
  Button,
  Divider,
  Paper,
  Tab,
  Tabs,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Inbox as InboxIcon,
  Archive as ArchiveIcon,
  Today as TodayIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  EventNote as EventNoteIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import DbSyncService from '../services/dbSyncService';
import TodoTask from './TodoTask';

// Function to format date to dd-mm-yy format
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

// Function to check if a date is today
const isToday = (dateString) => {
  if (!dateString) return false;
  const today = new Date();
  const date = new Date(dateString);
  return date.toDateString() === today.toDateString();
};

// Function to get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const TodoManagerNew = ({ darkMode, onOpenTodo, tabs, activeTab }) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('inbox');
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Fetch todos based on the active view
  useEffect(() => {
    fetchTodos();
  }, [activeView]);

  const fetchTodos = async () => {
    if (!DbSyncService.isConfigured()) {
      console.error('DbSyncService not configured');
      return;
    }

    setLoading(true);
    try {
      let params = {};
      
      // Set parameters based on the active view
      if (activeView === 'inbox') {
        params = { type: 'todo', status: 'OPEN' };
      } else if (activeView === 'archive') {
        params = { type: 'todo', status: 'CLOSED' };
      } else if (activeView === 'today') {
        const today = getTodayString();
        params = { type: 'todo', due_date: today };
      }

      // Construct URL with query parameters
      const url = new URL(`${DbSyncService.settings.proxyUrl}/api/notes`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      
      const response = await fetch(url.toString(), {
        headers: {
          'x-api-key': DbSyncService.settings.proxyKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch todos: ${response.statusText}`);
      }

      const data = await response.json();
      const todoList = data.notes || [];
      
      // Decode content if it exists
      const decodedTodos = todoList.map(todo => {
        if (todo.content) {
          try {
            todo.content = decodeURIComponent(escape(atob(todo.content)));
          } catch (e) {
            console.error('Error decoding todo content:', e);
          }
        }
        return todo;
      });
      
      setTodos(decodedTodos);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodoText.trim()) return;
    
    try {
      setLoading(true);
      
      const todoData = {
        name: newTodoText,
        content: '',
        type: 'todo',
        status: 'OPEN',
        due_date: newTodoDueDate || null
      };
      
      await DbSyncService.createNote(
        todoData.name,
        todoData.content,
        todoData.type,
        todoData.due_date,
        false
      );
      
      // Refresh the list
      fetchTodos();
      
      // Clear the form
      setNewTodoText('');
      setNewTodoDueDate('');
    } catch (error) {
      console.error('Error adding todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTodoStatus = async (todo) => {
    try {
      setLoading(true);
      
      // Toggle the status
      const newStatus = todo.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      
      await DbSyncService.updateNote(
        todo.id,
        todo.name,
        todo.content || '',
        'todo',
        todo.due_date,
        newStatus === 'CLOSED'
      );
      
      // Refresh the list
      fetchTodos();
    } catch (error) {
      console.error('Error toggling todo status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTodo = async (todo) => {
    // In this implementation, we'll just mark it as deleted by updating its status
    try {
      setLoading(true);
      
      await DbSyncService.updateNote(
        todo.id,
        todo.name,
        todo.content || '',
        'todo',
        todo.due_date,
        true // Mark as completed/closed
      );
      
      // Refresh the list
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTodo = async () => {
    if (!selectedTodo || !editMode) return;
    
    try {
      setLoading(true);
      
      await DbSyncService.updateNote(
        selectedTodo.id,
        newTodoText,
        selectedTodo.content || '',
        'todo',
        newTodoDueDate || selectedTodo.due_date,
        selectedTodo.status === 'CLOSED'
      );
      
      // Reset edit mode
      setEditMode(false);
      setSelectedTodo(null);
      setNewTodoText('');
      setNewTodoDueDate('');
      
      // Refresh the list
      fetchTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTodo = (todo) => {
    setSelectedTodo(todo);
    setNewTodoText(todo.name);
    setNewTodoDueDate(todo.due_date || '');
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setSelectedTodo(null);
    setNewTodoText('');
    setNewTodoDueDate('');
  };

  const handleSelectTodo = (todo) => {
    setSelectedTodo(todo);
  };

  const handleOpenTodoInTab = (todo) => {
    if (onOpenTodo) {
      onOpenTodo(todo);
    }
  };

  // Check if a todo is already open in a tab
  const isTodoOpenInTab = (todoId) => {
    if (!tabs) return false;
    return tabs.some(tab => tab.noteId === todoId);
  };

  // Get the tab ID if the todo is already open
  const getOpenTodoTabId = (todoId) => {
    if (!tabs) return null;
    const tab = tabs.find(tab => tab.noteId === todoId);
    return tab ? tab.id : null;
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100%', 
      bgcolor: darkMode ? '#1f1a24' : '#FFFCF0'
    }}>
      {/* Left Sidebar */}
      <Box sx={{ 
        width: 240, 
        borderRight: 1, 
        borderColor: 'divider', 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: darkMode ? '#282433' : '#f5f5f5'
      }}>
        <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Rubik, sans-serif' }}>
          Todo
        </Typography>
        
        <List>
          <ListItem 
            button 
            selected={activeView === 'inbox'}
            onClick={() => setActiveView('inbox')}
            sx={{ 
              borderRadius: 1,
              mb: 1,
              bgcolor: activeView === 'inbox' ? (darkMode ? '#3a3347' : '#e0e0e0') : 'transparent'
            }}
          >
            <ListItemIcon>
              <InboxIcon color={activeView === 'inbox' ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText 
              primary="Inbox" 
              sx={{ '& .MuiTypography-root': { fontFamily: 'Rubik, sans-serif' } }}
            />
          </ListItem>
          
          <ListItem 
            button 
            selected={activeView === 'today'}
            onClick={() => setActiveView('today')}
            sx={{ 
              borderRadius: 1,
              mb: 1,
              bgcolor: activeView === 'today' ? (darkMode ? '#3a3347' : '#e0e0e0') : 'transparent'
            }}
          >
            <ListItemIcon>
              <TodayIcon color={activeView === 'today' ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText 
              primary="Today" 
              sx={{ '& .MuiTypography-root': { fontFamily: 'Rubik, sans-serif' } }}
            />
          </ListItem>
          
          <ListItem 
            button 
            selected={activeView === 'archive'}
            onClick={() => setActiveView('archive')}
            sx={{ 
              borderRadius: 1,
              mb: 1,
              bgcolor: activeView === 'archive' ? (darkMode ? '#3a3347' : '#e0e0e0') : 'transparent'
            }}
          >
            <ListItemIcon>
              <ArchiveIcon color={activeView === 'archive' ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText 
              primary="Completed" 
              sx={{ '& .MuiTypography-root': { fontFamily: 'Rubik, sans-serif' } }}
            />
          </ListItem>
        </List>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Rubik, sans-serif' }}>
          {activeView === 'inbox' ? 'Inbox' : activeView === 'today' ? 'Today' : 'Completed'}
        </Typography>

        {/* Add Todo Form */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: darkMode ? '#282433' : '#fff',
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              label={editMode ? "Update Todo" : "Add New Todo"}
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  editMode ? handleUpdateTodo() : handleAddTodo();
                }
              }}
              sx={{ 
                '& .MuiInputBase-root': { 
                  fontFamily: 'Rubik, sans-serif' 
                } 
              }}
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                type="date"
                size="small"
                label="Due Date"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  '& .MuiInputBase-root': { 
                    fontFamily: 'Rubik, sans-serif' 
                  },
                  flex: 1
                }}
              />
              
              {editMode ? (
                <>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleUpdateTodo}
                    startIcon={<CheckIcon />}
                  >
                    Update
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleAddTodo}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Todo List */}
        <Paper 
          elevation={0} 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            bgcolor: darkMode ? '#282433' : '#fff',
            borderRadius: 2
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : todos.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">
                No todos found in {activeView}
              </Typography>
            </Box>
          ) : (
            <List>
              {todos.map((todo) => (
                <ListItem
                  key={todo.id}
                  sx={{ 
                    borderBottom: '1px solid',
                    borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    '&:hover': {
                      bgcolor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
                    }
                  }}
                  secondaryAction={
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton 
                          edge="end" 
                          onClick={() => handleEditTodo(todo)}
                          size="small"
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDeleteTodo(todo)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={todo.status === 'CLOSED'}
                      onChange={() => handleToggleTodoStatus(todo)}
                      sx={{ 
                        color: darkMode ? '#aaa' : '#666',
                        '&.Mui-checked': {
                          color: darkMode ? '#68d391' : '#4caf50',
                        }
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography 
                        sx={{ 
                          textDecoration: todo.status === 'CLOSED' ? 'line-through' : 'none',
                          color: todo.status === 'CLOSED' ? 'text.secondary' : 'text.primary',
                          fontFamily: 'Rubik, sans-serif'
                        }}
                      >
                        {todo.name}
                      </Typography>
                    }
                    secondary={
                      todo.due_date && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <CalendarIcon fontSize="small" color={isToday(todo.due_date) ? "error" : "action"} />
                          <Typography 
                            variant="caption"
                            color={isToday(todo.due_date) ? "error" : "textSecondary"}
                          >
                            {formatDate(todo.due_date)}
                          </Typography>
                        </Box>
                      )
                    }
                    onClick={() => handleSelectTodo(todo)}
                    onDoubleClick={() => handleOpenTodoInTab(todo)}
                    sx={{ cursor: 'pointer' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      {/* Right Panel - Todo Details */}
      {selectedTodo && !editMode && (
        <Box sx={{ 
          width: 300, 
          borderLeft: 1, 
          borderColor: 'divider', 
          p: 2,
          bgcolor: darkMode ? '#282433' : '#f5f5f5',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Rubik, sans-serif' }}>
            Task Details
          </Typography>
          
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              mb: 2, 
              bgcolor: darkMode ? '#1f1a24' : '#fff',
              borderRadius: 2
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              {selectedTodo.name}
            </Typography>
            
            {selectedTodo.due_date && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                <CalendarIcon fontSize="small" color={isToday(selectedTodo.due_date) ? "error" : "action"} />
                <Typography>
                  Due: {formatDate(selectedTodo.due_date)}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={() => handleEditTodo(selectedTodo)}
                fullWidth
              >
                Edit
              </Button>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => handleOpenTodoInTab(selectedTodo)}
                fullWidth
              >
                Open in Tab
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button 
                variant="outlined" 
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteTodo(selectedTodo)}
                fullWidth
              >
                Delete
              </Button>
            </Box>
          </Paper>
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Notes
          </Typography>
          
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              flex: 1,
              bgcolor: darkMode ? '#1f1a24' : '#fff',
              borderRadius: 2,
              overflow: 'auto'
            }}
          >
            {selectedTodo.content ? (
              <Typography>
                {selectedTodo.content}
              </Typography>
            ) : (
              <Typography color="textSecondary" variant="body2">
                No notes for this task
              </Typography>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default TodoManagerNew;

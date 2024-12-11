import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  ListItemButton,
} from '@mui/material';
import { Transform as DefaultIcon } from '@mui/icons-material';

const CommandBar = ({ open, onClose, commands }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCommandIds, setRecentCommandIds] = useState([]);
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Focus search input when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedIndex(0);
      const timeoutId = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  // Load recent command IDs from localStorage on mount
  useEffect(() => {
    const storedRecent = JSON.parse(localStorage.getItem('recentCommandIds') || '[]');
    setRecentCommandIds(storedRecent);
  }, []);

  // Update filtered commands when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      const recentCommands = recentCommandIds
        .map(id => commands.find(cmd => cmd.id === id))
        .filter(Boolean)
        .slice(0, 5);
      setFilteredCommands(recentCommands);
    } else {
      const filtered = commands.filter(cmd =>
        cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCommands(filtered);
    }
  }, [searchQuery, commands, recentCommandIds]);

  const handleCommandSelect = (command) => {
    const updatedRecent = [
      command.id,
      ...recentCommandIds.filter(id => id !== command.id)
    ].slice(0, 5);
    
    setRecentCommandIds(updatedRecent);
    localStorage.setItem('recentCommandIds', JSON.stringify(updatedRecent));
    command.action();
    onClose();
  };

  const handleKeyDown = (event) => {
    const count = filteredCommands.length;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => (prev - 1 + count) % count);
        break;
      case 'Enter':
        event.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleCommandSelect(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          setSelectedIndex(prev => (prev - 1 + count) % count);
        } else {
          setSelectedIndex(prev => (prev + 1) % count);
        }
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const renderIcon = (command) => {
    const Icon = command.icon || DefaultIcon;
    return <Icon fontSize="small" />;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      onKeyDown={handleKeyDown}
      PaperProps={{
        sx: {
          maxWidth: '600px',
          width: '90%',
        }
      }}
    >
      <DialogContent>
        <TextField
          inputRef={searchInputRef}
          fullWidth
          autoFocus
          placeholder="Search commands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          sx={{ mb: 2 }}
        />
        <List ref={listRef} sx={{ maxHeight: '400px', overflow: 'auto' }}>
          {filteredCommands.map((command, index) => (
            <ListItemButton
              key={command.id}
              onClick={() => handleCommandSelect(command)}
              selected={index === selectedIndex}
              dense
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'inherit'
                  },
                  '& .MuiTypography-root': {
                    color: 'inherit'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                {renderIcon(command)}
              </ListItemIcon>
              <ListItemText 
                primary={command.label}
                secondary={command.description}
                secondaryTypographyProps={{
                  sx: { color: 'inherit', opacity: 0.8 }
                }}
              />
              {command.shortcut && (
                <Typography variant="body2" sx={{ ml: 2, color: 'inherit', opacity: 0.8 }}>
                  {command.shortcut}
                </Typography>
              )}
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default CommandBar;

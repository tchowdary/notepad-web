import React, { useState, useEffect } from 'react';
import { Dialog, List, ListItem, ListItemText, Typography } from '@mui/material';

const TabSwitcher = ({ tabs, activeTab, onTabSelect, open, onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  useEffect(() => {
    if (open) {
      setSelectedIndex(activeIndex);
    }
  }, [open, activeIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!open) return;

      switch(event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => (prev + 1) % tabs.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => (prev - 1 + tabs.length) % tabs.length);
          break;
        case 'Enter':
          event.preventDefault();
          onTabSelect(tabs[selectedIndex].id);
          onClose();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, tabs, selectedIndex, onTabSelect, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          width: 400,
          maxHeight: '80vh',
        },
        zIndex: 99999
      }}
    >
      <Typography variant="h6" component="h2" sx={{ p: 2, pb: 1 }}>
        Switch Tab
      </Typography>
      <List sx={{ p: 1 }}>
        {tabs.map((tab, index) => (
          <ListItem
            key={tab.id}
            button
            selected={index === selectedIndex}
            onClick={() => {
              onTabSelect(tab.id);
              onClose();
            }}
            sx={{
              borderRadius: 1,
              mb: 0.5
            }}
          >
            <ListItemText primary={tab.name} />
          </ListItem>
        ))}
      </List>
    </Dialog>
  );
};

export default TabSwitcher;

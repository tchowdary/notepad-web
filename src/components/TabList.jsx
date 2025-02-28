import React, { useState } from 'react';
import { Box, Tabs, Menu, MenuItem } from '@mui/material';
import Tab from './Tab';

const TabList = ({ tabs, activeTab, onTabClose, onTabSelect, onTabRename, onTabAreaDoubleClick, setRightTab, splitView }) => {
  const [contextMenu, setContextMenu] = useState(null);
  
  // Find the index of the active tab
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  const handleDoubleClick = (event) => {
    // Get the closest tab parent if any
    const tabElement = event.target.closest('.tab-item');
    const tabsContainer = event.target.closest('.MuiTabs-flexContainer');
    
    // Only create new tab if clicking in the tabs container but not on a tab
    if (!tabElement && tabsContainer) {
      onTabAreaDoubleClick({ event, type: 'tiptap' });  // Explicitly set type to tiptap for double-click
    }
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    // Only show context menu if clicking in the tabs container but not on a tab
    const tabElement = event.target.closest('.tab-item');
    const tabsContainer = event.target.closest('.MuiTabs-flexContainer');
    
    if (!tabElement && tabsContainer) {
      setContextMenu({
        mouseX: event.clientX - 2,
        mouseY: event.clientY - 4,
      });
    }
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleNewTab = (type = 'tiptap') => {
    onTabAreaDoubleClick({ type });  // Pass the editor type
    handleContextMenuClose();
  };

  return (
    <Box 
      sx={{ 
        borderLeft: 1, 
        borderColor: 'divider',
        height: '100%',
        width: '250px',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
      onContextMenu={handleContextMenu}
    >
      <Tabs
        value={activeIndex}
        variant="scrollable"
        orientation="vertical"
        scrollButtons={false}
        sx={{ 
          height: '100%',
          '& .MuiTabs-flexContainer': {
            height: '100%',
            bgcolor: 'background.paper'
          },
          '& .MuiTabs-indicator': {
            left: 0,
            width: '2px'
          },
          '& .MuiTab-root': {
            fontFamily: 'Rubik, sans-serif',
            textTransform: 'none'
          }
        }}
        onDoubleClick={handleDoubleClick}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={tab.id}
            id={tab.id}
            label={tab.name}
            active={index === activeIndex}
            onClose={onTabClose}
            onSelect={onTabSelect}
            onRename={onTabRename}
            setRightTab={setRightTab}
            splitView={splitView}
          />
        ))}
      </Tabs>
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => handleNewTab('tiptap')}>New Doc</MenuItem>
        <MenuItem onClick={() => handleNewTab('codemirror')}>New Code</MenuItem>
      </Menu>
    </Box>
  );
};

export default TabList;

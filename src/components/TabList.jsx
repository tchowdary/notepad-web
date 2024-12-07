import React from 'react';
import { Box, Tabs } from '@mui/material';
import Tab from './Tab';

const TabList = ({ tabs, activeTab, onTabClose, onTabSelect, onTabRename, onTabAreaDoubleClick }) => {
  // Find the index of the active tab
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  const handleDoubleClick = (event) => {
    // Get the closest tab parent if any
    const tabElement = event.target.closest('.tab-item');
    const tabsContainer = event.target.closest('.MuiTabs-flexContainer');
    
    // Only create new tab if clicking in the tabs container but not on a tab
    if (!tabElement && tabsContainer) {
      onTabAreaDoubleClick(event);
    }
  };

  return (
    <Box 
      sx={{ 
        borderLeft: 1, 
        borderColor: 'divider',
        height: '100%',
        width: '250px',
        overflow: 'hidden'
      }}
    >
      <Tabs
        value={activeIndex}
        variant="scrollable"
        orientation="vertical"
        scrollButtons={false}
        sx={{ 
          height: '100%',
          '& .MuiTabs-flexContainer': {
            height: '100%'
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
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default TabList;

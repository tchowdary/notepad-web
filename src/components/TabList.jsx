import React from 'react';
import { Box, Tabs } from '@mui/material';
import Tab from './Tab';

const TabList = ({ tabs, activeTab, onTabClose, onTabSelect, onTabRename }) => {
  // Find the index of the active tab
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={activeIndex}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 'auto' }}
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

import React, { useState } from 'react';
import { Box, Tab as MuiTab, IconButton, TextField } from '@mui/material';
import { Close as CloseIcon, Edit as EditIcon } from '@mui/icons-material';

const Tab = ({ id, label, active, onClose, onSelect, onRename }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(label);

  const handleRename = (e) => {
    e.preventDefault();
    onRename(id, newName);
    setIsEditing(false);
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(id);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        bgcolor: active ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {isEditing ? (
        <form onSubmit={handleRename}>
          <TextField
            size="small"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onBlur={() => setIsEditing(false)}
            onClick={(e) => e.stopPropagation()}
          />
        </form>
      ) : (
        <MuiTab
          label={label}
          onClick={handleClick}
          sx={{ minWidth: 'auto', flexGrow: 1 }}
        />
      )}
      <IconButton 
        size="small" 
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton 
        size="small" 
        onClick={(e) => {
          e.stopPropagation();
          onClose(id);
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default Tab;

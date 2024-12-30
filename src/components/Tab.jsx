import React, { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon, Edit as EditIcon } from '@mui/icons-material';

const Tab = ({ id, label, active, onClose, onSelect, onRename, setRightTab }) => {
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
    if (setRightTab && splitView) {
      setRightTab(id);
    } else {
      onSelect(id);
    }
  };

  return (
    <Box
      onClick={handleClick}
      className="tab-item"
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        minHeight: '40px',
        padding: '8px 8px 8px 16px',
        cursor: 'pointer',
        bgcolor: active ? 'action.selected' : 'transparent',
        '&:hover': { 
          bgcolor: 'action.hover',
          '& .tab-actions': {
            opacity: 1,
            visibility: 'visible'
          }
        },
      }}
    >
      {isEditing ? (
        <form onSubmit={handleRename}>
          <input
            type="text"
            size="small"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onBlur={() => setIsEditing(false)}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              fontSize: '13px',
              textAlign: 'left',
              color: 'text.primary',
              opacity: active ? 1 : 0.7
            }}
          />
        </form>
      ) : (
        <Typography
          noWrap
          sx={{
            flex: 1,
            fontSize: '13px',
            textAlign: 'left',
            color: 'text.primary',
            opacity: active ? 1 : 0.7
          }}
        >
          {label}
        </Typography>
      )}
      <Box 
        className="tab-actions"
        sx={{ 
          display: 'flex',
          opacity: 0,
          visibility: 'hidden',
          transition: 'opacity 0.2s, visibility 0.2s',
          ml: 1,
          '& .MuiIconButton-root': {
            padding: 0.5,
            marginLeft: 0.5
          }
        }}
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onClose(id);
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Tab;

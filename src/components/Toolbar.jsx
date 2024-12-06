import React from 'react';
import {
  AppBar,
  Toolbar as MuiToolbar,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  WrapText as WrapTextIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Fullscreen as FullscreenIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';

const Toolbar = ({
  onNewTab,
  wordWrap,
  onWordWrapToggle,
  darkMode,
  onDarkModeToggle,
  onFocusMode,
  showPreview,
  onPreviewToggle,
}) => {
  const theme = useTheme();

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{
        backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
        color: theme.palette.mode === 'dark' ? '#fff' : '#000'
      }}
    >
      <MuiToolbar variant="dense">
        <Tooltip title="New Tab">
          <IconButton onClick={onNewTab} color="inherit">
            <AddIcon />
          </IconButton>
        </Tooltip>

        <FormControlLabel
          control={
            <Switch
              checked={wordWrap}
              onChange={onWordWrapToggle}
              size="small"
              color="default"
            />
          }
          label="Word Wrap"
          sx={{ 
            color: 'inherit',
            '& .MuiSwitch-track': {
              backgroundColor: theme.palette.mode === 'dark' ? '#555' : '#999'
            }
          }}
        />

        <Tooltip title="Toggle Preview">
          <IconButton onClick={onPreviewToggle} color="inherit">
            <PreviewIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Toggle Dark Mode">
          <IconButton onClick={onDarkModeToggle} color="inherit">
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Focus Mode">
          <IconButton onClick={onFocusMode} color="inherit">
            <FullscreenIcon />
          </IconButton>
        </Tooltip>
      </MuiToolbar>
    </AppBar>
  );
};

export default Toolbar;

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar as MuiToolbar,
  IconButton,
  Tooltip,
  useTheme,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  WrapText as WrapTextIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Fullscreen as FullscreenIcon,
  Preview as PreviewIcon,
  FolderOpen as FolderOpenIcon,
  Download as DownloadIcon,
  FullscreenExit as FullscreenExitIcon,
  FormatAlignJustify as WrapOnIcon,
  FormatAlignLeft as WrapOffIcon,
  Draw as DrawIcon,
  Transform as TransformIcon,
  GitHub as GitHubIcon,
  Code as CodeIcon,
  Brush as BrushIcon,
  Palette as PaletteIcon,
  CheckBoxOutlined as TodoIcon,
} from '@mui/icons-material';
import GitHubSettingsModal from './GitHubSettingsModal';
import githubService from '../services/githubService';
import { converters } from '../utils/converters';

const Toolbar = ({
  onNewTab,
  onOpenFile,
  onSaveFile,
  wordWrap,
  onWordWrapChange,
  darkMode,
  onDarkModeChange,
  focusMode,
  onFocusModeChange,
  showPreview,
  onShowPreviewChange,
  onNewDrawing,
  onConvert,
  onFormatJson,
  className,
  currentFile,
  onTodoClick,
}) => {
  const theme = useTheme();
  const [showGitHubSettings, setShowGitHubSettings] = useState(false);
  const [convertAnchorEl, setConvertAnchorEl] = useState(null);

  const handleGitHubSync = async () => {
    if (!githubService.isConfigured()) {
      setShowGitHubSettings(true);
      return;
    }
    
    try {
      console.log('Starting GitHub sync...');
      await githubService.syncAllFiles();
      console.log('GitHub sync completed successfully');
    } catch (error) {
      console.error('Failed to sync with GitHub:', error);
    }
  };

  const handleConvertClick = (event) => {
    setConvertAnchorEl(event.currentTarget);
  };

  const handleConvertClose = () => {
    setConvertAnchorEl(null);
  };

  const handleConvertSelect = (converterId) => {
    onConvert(converterId);
    handleConvertClose();
  };

  return (
    <AppBar 
      position="static" 
      color="default" 
      elevation={0}
      className={className}
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
      }}
    >
      <MuiToolbar 
        variant="dense"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0.5,
          minHeight: '48px !important',
          padding: '0 8px !important',
        }}
      >
        <Tooltip title="New File (Ctrl+N)">
          <IconButton onClick={onNewTab} size="small">
            <AddIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Todo Manager">
          <IconButton onClick={onTodoClick} size="small">
            <TodoIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Open File (Ctrl+O)">
          <IconButton onClick={onOpenFile} size="small">
            <FolderOpenIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Save File (Ctrl+S)">
          <IconButton onClick={onSaveFile} size="small">
            <DownloadIcon />
          </IconButton>
        </Tooltip>

        {/* <Tooltip title={wordWrap ? "Word Wrap: On" : "Word Wrap: Off"}>
          <IconButton onClick={onWordWrapChange} size="small">
            {wordWrap ? <WrapOnIcon /> : <WrapOffIcon />}
          </IconButton>
        </Tooltip> */}

        <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
          <IconButton onClick={onDarkModeChange} size="small">
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={focusMode ? "Exit Focus Mode" : "Focus Mode"}>
          <IconButton onClick={onFocusModeChange} size="small">
            {focusMode ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={showPreview ? "Hide Preview" : "Show Preview"}>
          <IconButton onClick={onShowPreviewChange} size="small">
            <PreviewIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="New TLDraw">
          <IconButton
            onClick={() => {
              onNewDrawing('tldraw');
            }}
            size="small"
          >
            <PaletteIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="New Excalidraw">
          <IconButton
            onClick={() => {
              onNewDrawing('excalidraw');
            }}
            size="small"
          >
            <DrawIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Convert Text">
          <IconButton 
            onClick={handleConvertClick}
            size="small"
            id="convert-button"
          >
            <TransformIcon />
          </IconButton>
        </Tooltip>
        <Menu
          id="convert-menu"
          anchorEl={convertAnchorEl}
          open={Boolean(convertAnchorEl)}
          onClose={handleConvertClose}
        >
          {Object.entries(converters).map(([id, converter]) => (
            <MenuItem key={id} onClick={() => handleConvertSelect(id)}>
              {converter.name}
            </MenuItem>
          ))}
        </Menu>

        <Tooltip title="Format JSON">
          <IconButton onClick={onFormatJson} size="small">
            <CodeIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={githubService.isConfigured() ? "Sync with GitHub" : "Configure GitHub"}>
          <IconButton onClick={handleGitHubSync} size="small">
            <GitHubIcon />
          </IconButton>
        </Tooltip>

        <GitHubSettingsModal
          open={showGitHubSettings}
          onClose={() => setShowGitHubSettings(false)}
        />
      </MuiToolbar>
    </AppBar>
  );
};

export default Toolbar;

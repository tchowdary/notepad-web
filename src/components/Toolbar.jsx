import React, { useRef } from 'react';
import {
  AppBar,
  Toolbar as MuiToolbar,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  WrapText as WrapTextIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Fullscreen as FullscreenIcon,
  Preview as PreviewIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  FullscreenExit as FullscreenExitIcon,
  FormatAlignJustify as WrapOnIcon,
  FormatAlignLeft as WrapOffIcon,
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
  focusMode,
  onFileOpen,
  onFileDownload,
  className,
}) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onFileOpen(file.name, e.target.result);
      };
      reader.readAsText(file);
    }
    event.target.value = null; // Reset input
  };

  return (
    <AppBar 
      position="static" 
      elevation={1}
      className={className}
      data-dark={darkMode}
      sx={{
        backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
        color: theme.palette.mode === 'dark' ? '#fff' : '#000'
      }}
    >
      <MuiToolbar variant="dense">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          accept=".md,.txt"
        />
        
        {!focusMode && (
          <>
            <Tooltip title="New Tab">
              <IconButton onClick={onNewTab} color="inherit">
                <AddIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Open File">
              <IconButton onClick={() => fileInputRef.current.click()} color="inherit">
                <UploadFileIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Download as Markdown">
              <IconButton onClick={onFileDownload} color="inherit">
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={wordWrap ? "Disable Word Wrap" : "Enable Word Wrap"}>
              <IconButton onClick={onWordWrapToggle} color="inherit">
                {wordWrap ? <WrapOnIcon /> : <WrapOffIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Toggle Preview">
              <IconButton onClick={onPreviewToggle} color="inherit">
                <PreviewIcon />
              </IconButton>
            </Tooltip>
          </>
        )}

        <Tooltip title="Toggle Dark Mode">
          <IconButton onClick={onDarkModeToggle} color="inherit">
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={focusMode ? "Exit Focus Mode (Esc)" : "Focus Mode"}>
          <IconButton onClick={onFocusMode} color="inherit">
            {focusMode ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      </MuiToolbar>
    </AppBar>
  );
};

export default Toolbar;

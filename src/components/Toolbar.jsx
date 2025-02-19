import React, { useState } from 'react';
import {
  AppBar,
  Toolbar as MuiToolbar,
  IconButton,
  Tooltip,
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
  PlaylistAdd as QuickAddIcon,
  TaskAlt as TodoManagerIcon,
  Chat as ChatIcon,
  ViewColumn as SplitViewIcon,
  CalendarViewWeek as WeeklyNotesIcon,
} from '@mui/icons-material';
import GitHubSettingsModal from './GitHubSettingsModal';
import ApiKeyInput from './ApiKeyInput';
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
  onQuickAddClick,
  onChatToggle,
  showChat,
  setSplitView,
  setRightTab,
  splitView,
  editorRef, // Add editor ref prop
}) => {
  const [showGitHubSettings, setShowGitHubSettings] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
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

  const handleWeeklyNotes = async () => {
    const now = new Date();
    // Get the start of the week (Monday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // If Sunday, go back to previous Monday
    
    // Format the date as DD-MMM-YY
    const day = String(startOfWeek.getDate()).padStart(2, '0');
    const month = startOfWeek.toLocaleString('default', { month: 'short' });
    const year = startOfWeek.getFullYear().toString().slice(-2);
    const weeklyNoteTitle = `${day}-${month}-${year}.md`;

    // If GitHub is configured, try to fetch existing content or create new file
    if (githubService.isConfigured()) {
      try {
        // Let githubService handle the file path structure
        const content = await githubService.getFileContent(githubService.getFilePath(weeklyNoteTitle));
        if (content) {
          onNewTab({ type: 'tiptap', name: weeklyNoteTitle, content });
          return;
        }
      } catch (error) {
        console.log('No existing weekly note found, creating new one');
      }

      // Create new file in GitHub using the service's file path structure
      try {
        const initialContent = `# Week of ${day} ${month} ${year}\n\nCreated: ${now.toISOString()}\n\n`;
        await githubService.uploadFile(weeklyNoteTitle, initialContent);
        onNewTab({ type: 'tiptap', name: weeklyNoteTitle, content: initialContent });
        return;
      } catch (error) {
        console.error('Error creating weekly note in GitHub:', error);
      }
    }
    
    // Create new empty tab if GitHub is not configured
    onNewTab({ type: 'tiptap', name: weeklyNoteTitle });
  };

  return (
    <AppBar 
      position="static" 
      color={darkMode ? "default" : "primary"} 
      elevation={0}
      className={className}
      sx={{
        borderBottom: `1px solid ${darkMode ? '#333' : '#ccc'}`,
        bgcolor: darkMode ? '#333' : '#fff',
        '& .MuiIconButton-root': {
          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
          '&:hover': {
            color: darkMode ? '#fff' : '#000',
          }
        },
        '& .MuiTooltip-tooltip': {
          fontSize: '0.75rem',
          opacity: 0.9
        }
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
        <Tooltip title="Quick Add Task">
          <IconButton onClick={onQuickAddClick} size="small">
            <QuickAddIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Todo Manager">
          <IconButton onClick={onTodoClick} size="small">
            <TodoManagerIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Open File (Ctrl+O)">
          <IconButton onClick={onOpenFile} size="small">
            <FolderOpenIcon />
          </IconButton>
        </Tooltip>

        {/* <Tooltip title="Save File (Ctrl+S)">
          <IconButton onClick={onSaveFile} size="small">
            <DownloadIcon />
          </IconButton>
        </Tooltip> */}

        {/* <Tooltip title={wordWrap ? "Word Wrap: On" : "Word Wrap: Off"}>
          <IconButton onClick={onWordWrapChange} size="small">
            {wordWrap ? <WrapOnIcon /> : <WrapOffIcon />}
          </IconButton>
        </Tooltip> */}

        <Tooltip title="Download as Markdown">
          <IconButton 
            onClick={() => {
              if (editorRef?.current && currentFile) {
                // Get markdown content using the exposed method
                const markdown = editorRef.current.getMarkdown();
                const blob = new Blob([markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Use the current file name, ensure it has .md extension
                const fileName = currentFile.name.toLowerCase().endsWith('.md') 
                  ? currentFile.name 
                  : `${currentFile.name}.md`;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }
            }} 
            size="small"
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>

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
            <DrawIcon />
          </IconButton>
        </Tooltip>

        {/* <Tooltip title="New Excalidraw">
          <IconButton
            onClick={() => {
              onNewDrawing('excalidraw');
            }}
            size="small"
          >
            <DrawIcon />
          </IconButton>
        </Tooltip> */}

        {/* <Tooltip title="Convert Text">
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
        </Menu> */}

        {/* <Tooltip title="Format JSON">
          <IconButton onClick={onFormatJson} size="small">
            <CodeIcon />
          </IconButton>
        </Tooltip> */}

        <ApiKeyInput 
          open={showApiKeyInput}
          onClose={() => setShowApiKeyInput(false)}
          onSave={() => {
            setShowApiKeyInput(false);
            // You can add any callback logic here if needed
            // For example, refreshing available models in the chat
          }} 
        />

        { <Tooltip title="Toggle Chat">
          <IconButton
            color={showChat ? 'primary' : 'inherit'}
            onClick={onChatToggle}
            size="large"
          >
            <ChatIcon />
          </IconButton>
        </Tooltip> }

        <Tooltip title="Split View">
          <IconButton onClick={() => {
            setSplitView(!splitView);
          }} size="small" color={splitView ? 'primary' : 'inherit'}>
            <SplitViewIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="New Tab (Ctrl+N)">
          <IconButton onClick={onNewTab} size="small">
            <AddIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Weekly Notes">
          <IconButton onClick={handleWeeklyNotes} size="small">
            <WeeklyNotesIcon />
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

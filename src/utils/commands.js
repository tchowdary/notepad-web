import {
  Add as AddIcon,
  WrapText as WrapTextIcon,
  DarkMode as DarkModeIcon,
  Preview as PreviewIcon,
  FolderOpen as FolderOpenIcon,
  Download as DownloadIcon,
  Draw as DrawIcon,
  Transform as TransformIcon,
  Code as CodeIcon,
  AccessTime as TimeIcon,
  TextFormat as TextFormatIcon,
  TableView as TableIcon,
  Key as KeyIcon,
  Security as SecurityIcon,
  Fullscreen as FullscreenIcon,
  Edit as TLDrawIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { converters } from './converters';
import githubService from '../services/githubService';

export const createCommandList = ({
  onNewTab,
  onOpenFile,
  onSaveFile,
  onWordWrapChange,
  onDarkModeChange,
  onShowPreviewChange,
  onNewDrawing,
  onFocusModeChange,
  onNewTLDraw,
  onConvert,
  onFormatJson,
  wordWrap,
  darkMode,
  showPreview,
  focusMode,
  setShowGitHubSettings,
  currentFile,
  onToggleFullScreen,
}) => {
  const mainCommands = [
    {
      id: 'new-file',
      label: 'New File',
      description: 'Create a new file',
      icon: AddIcon,
      action: onNewTab,
      shortcut: 'Ctrl+N'
    },
    {
      id: 'open-file',
      label: 'Open File',
      description: 'Open an existing file',
      icon: FolderOpenIcon,
      action: onOpenFile,
      shortcut: 'Ctrl+O'
    },
    {
      id: 'save-file',
      label: 'Save File',
      description: 'Save current file',
      icon: DownloadIcon,
      action: onSaveFile,
      shortcut: 'Ctrl+S'
    },
    {
      id: 'download-file',
      label: 'Download File',
      description: 'Download current file',
      icon: DownloadIcon,
      action: onSaveFile
    },
    {
      id: 'github-sync',
      label: githubService.isConfigured() ? 'Sync with GitHub' : 'Configure GitHub',
      description: githubService.isConfigured() ? 'Sync current file with GitHub' : 'Configure GitHub integration',
      icon: GitHubIcon,
      action: async () => {
        if (!githubService.isConfigured()) {
          setShowGitHubSettings(true);
          return;
        }
        if (currentFile) {
          try {
            await githubService.uploadFile(currentFile.name, currentFile.content);
          } catch (error) {
            console.error('Failed to sync with GitHub:', error);
          }
        }
      }
    },
    {
      id: 'format-json',
      label: 'Format JSON',
      description: 'Format JSON content',
      icon: CodeIcon,
      action: onFormatJson
    },
    {
      id: 'word-wrap',
      label: wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap',
      description: 'Toggle word wrap',
      icon: WrapTextIcon,
      action: () => onWordWrapChange(!wordWrap)
    },
    {
      id: 'dark-mode',
      label: darkMode ? 'Light Mode' : 'Dark Mode',
      description: 'Toggle dark mode',
      icon: DarkModeIcon,
      action: () => onDarkModeChange(!darkMode)
    },
    {
      id: 'preview',
      label: showPreview ? 'Hide Preview' : 'Show Preview',
      description: 'Toggle markdown preview',
      icon: PreviewIcon,
      action: () => onShowPreviewChange(!showPreview)
    },
    {
      id: 'focus-mode',
      label: focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode',
      description: 'Toggle focus mode',
      icon: FullscreenIcon,
      action: () => onFocusModeChange(!focusMode)
    },
    {
      id: 'new-drawing',
      label: 'New Excalidraw',
      description: 'Create a new Excalidraw drawing',
      icon: DrawIcon,
      action: () => onNewDrawing('excalidraw')
    },
    {
      id: 'new-tldraw',
      label: 'New TLDraw',
      description: 'Create a new TLDraw drawing',
      icon: TLDrawIcon,
      action: () => onNewDrawing('tldraw')
    }
  ];

  // Create converter commands
  const converterCommands = Object.entries(converters).map(([id, converter]) => {
    let IconComponent;
    switch (id) {
      case 'timestamp':
        IconComponent = TimeIcon;
        break;
      case 'textFormatConverter':
        IconComponent = TextFormatIcon;
        break;
      case 'jsonToCsv':
        IconComponent = TableIcon;
        break;
      case 'jwt':
        IconComponent = KeyIcon;
        break;
      case 'certDecoder':
        IconComponent = SecurityIcon;
        break;
      default:
        IconComponent = TransformIcon;
    }

    return {
      id: `convert-${id}`,
      label: converter.name,
      description: `Convert text using ${converter.name}`,
      icon: IconComponent,
      action: () => onConvert(id),
      category: 'convert'
    };
  });

  return [...mainCommands, ...converterCommands];
};

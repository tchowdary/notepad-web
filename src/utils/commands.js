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
  Chat as ChatIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
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
  onChatToggle,
  showChat,
  setShowApiSettings,
  onManualSync,
}) => {
  const mainCommands = [
    {
      id: 'new-code-file',
      label: 'New Code File',
      description: 'Create a new code file',
      icon: CodeIcon,
      action: () => onNewTab({ type: 'codemirror' }),
      shortcut: 'Ctrl+Shift+N'
    },
    {
      id: 'new-file',
      label: 'New Note',
      description: 'Create a new note with rich text editor',
      icon: AddIcon,
      action: () => onNewTab({ type: 'tiptap' }),
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
    },
    {
      id: 'configure-ai',
      label: 'Configure AI Models',
      description: 'Configure OpenAI and Anthropic API keys and models',
      icon: KeyIcon,
      shortcut: 'mod+shift+m',
      action: () => setShowApiSettings(true),
    },
    {
      id: 'toggle-chat',
      label: 'Toggle Chat',
      description: 'Toggle chat',
      icon: showChat ? ChatIcon : ChatBubbleOutlineIcon,
      action: () => onChatToggle(),
      shortcut: 'Ctrl+Shift+C',
    },
    {
      id: 'manual-sync',
      label: 'Manual Sync',
      description: 'Sync with database manually',
      icon: TransformIcon,
      action: onManualSync,
    },
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
      case 'upperCaseConverter':
      case 'lowerCaseConverter':
        IconComponent = TextFormatIcon;
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

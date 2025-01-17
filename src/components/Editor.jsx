import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/css/css';
import 'codemirror/mode/python/python';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/yaml/yaml';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/selection/mark-selection';
import 'codemirror/addon/selection/selection-pointer';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/indent-fold';
import 'codemirror/addon/fold/comment-fold';
import 'codemirror/addon/fold/foldgutter.css';
import { Box, Menu, MenuItem, IconButton, Stack } from '@mui/material';
import MarkdownPreview from './MarkdownPreview';
import TipTapEditor from './TipTapEditor';
import { converters } from '../utils/converters';
import {
  Code as CodeIcon,
  DataObject as JsonIcon,
  FormatAlignCenter as FormatIcon,
} from '@mui/icons-material';

const Editor = forwardRef(({ 
  content, 
  onChange, 
  wordWrap = false, 
  darkMode = false,
  showLineNumbers = true,
  showPreview,
  focusMode,
  editorType = 'codemirror',
  cursorPosition = null,
  onCursorChange,
  filename = ''
}, ref) => {
  const [editorInstance, setEditorInstance] = useState(null);
  const [improving, setImproving] = useState(false);
  const [converterAnchor, setConverterAnchor] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [fileMode, setFileMode] = useState('markdown');
  const [contextMenu, setContextMenu] = useState(null);

  // Restore cursor position when editor instance or cursorPosition changes
  useEffect(() => {
    if (editorInstance && cursorPosition && !editorInstance.somethingSelected()) {
      editorInstance.setCursor(cursorPosition);
    }
  }, [editorInstance, cursorPosition]);

  // Detect file type from extension
  useEffect(() => {
    if (editorInstance && content) {
      // Try to detect JSON content
      try {
        JSON.parse(content);
        setIsJsonMode(true);
        setFileMode({ name: 'javascript', json: true });
        editorInstance.setOption('mode', { name: 'javascript', json: true });
        return;
      } catch (e) {
        setIsJsonMode(false);
      }

      // Get file extension from props
      const filename = editorInstance.getOption('filename');
      if (filename) {
        const ext = filename.toLowerCase().split('.').pop();
        let mode = 'markdown';
        
        switch (ext) {
          case 'js':
          case 'jsx':
            mode = 'javascript';
            break;
          case 'css':
            mode = 'css';
            break;
          case 'html':
          case 'xml':
            mode = 'xml';
            break;
          case 'py':
            mode = 'python';
            break;
          case 'sql':
            mode = 'sql';
            break;
          case 'yml':
          case 'yaml':
            mode = 'yaml';
            break;
          case 'json':
            mode = { name: 'javascript', json: true };
            break;
          default:
            mode = 'markdown';
        }
        
        setFileMode(mode);
        editorInstance.setOption('mode', mode);
      }
    }
  }, [editorInstance, content]);

  const detectLanguage = (content) => {
    // Try to detect JSON
    try {
      JSON.parse(content);
      return { name: 'javascript', json: true };
    } catch (e) {
      // Not JSON
    }

    // Check for YAML patterns (key: value structure, indentation)
    const yamlPattern = /^[\w\s-]+:\s*.+$/m;
    if (yamlPattern.test(content) && content.includes(':') && !content.includes('{')) {
      return 'yaml';
    }

    // Check for JavaScript patterns (function declarations, var/let/const, etc.)
    const jsPattern = /(function|const|let|var|import|export|class|=>)/;
    if (jsPattern.test(content)) {
      return 'javascript';
    }

    // Default to markdown
    return 'markdown';
  };

  const autodetectAndApplyLanguage = () => {
    if (!editorInstance) return;
    const content = editorInstance.getValue();
    const detectedMode = detectLanguage(content);
    setFileMode(detectedMode);
    editorInstance.setOption('mode', detectedMode);
    handleContextMenuClose();
  };

  useImperativeHandle(ref, () => ({
    setConverterMenuAnchor: (anchor) => {
      const selection = editorInstance?.getSelection();
      setConverterAnchor(anchor);
    },
    getSelectedText: () => {
      return editorInstance?.getSelection() || content;
    },
    formatJson: () => {
      if (!editorInstance) return;
      try {
        const currentValue = editorInstance.getValue();
        const parsedJson = JSON.parse(currentValue);
        const formattedJson = JSON.stringify(parsedJson, null, 2);
        editorInstance.setValue(formattedJson);
        setIsJsonMode(true);
        editorInstance.setOption('mode', { name: 'javascript', json: true });
      } catch (e) {
        console.error('Invalid JSON');
      }
    }
  }));

  const handleConverterClose = () => {
    setConverterAnchor(null);
  };

  useEffect(() => {
    if (editorInstance) {
      try {
        JSON.parse(content);
        if (!isJsonMode) {
          setIsJsonMode(true);
          editorInstance.setOption('mode', { name: 'javascript', json: true });
        }
      } catch (e) {
        if (isJsonMode) {
          setIsJsonMode(false);
          editorInstance.setOption('mode', 'markdown');
        }
      }
    }
  }, [content, editorInstance]);

  useEffect(() => {
    if (editorInstance) {
      editorInstance.setOption('lineWrapping', wordWrap);
    }
  }, [wordWrap, editorInstance]);

  const handleChange = (editor, data, value) => {
    onChange(value);
  };

  const handleConvert = async (converter) => {
    const text = editorInstance?.getSelection() || content;
    try {
      const result = await converter.convert(text);
      const newContent = content + '\n\n' + result;
      onChange(newContent);
    } catch (error) {
      console.error('Error converting text:', error);
    }
    handleConverterClose();
  };

  // Handle right-click context menu
  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleLanguageChange = (mode) => {
    setFileMode(mode);
    if (editorInstance) {
      editorInstance.setOption('mode', mode);
    }
    handleContextMenuClose();
  };

  const options = {
    mode: fileMode,
    theme: darkMode ? 'material' : 'default',
    lineNumbers: !focusMode && showLineNumbers,
    lineWrapping: wordWrap,
    autofocus: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleSelectedText: true,
    selectionPointer: true,
    dragDrop: true,
    styleActiveLine: true,
    foldGutter: true,
    gutters: !focusMode && ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    readOnly: false,
    extraKeys: {
      "Ctrl-Q": function(cm) {
        cm.foldCode(cm.getCursor());
      },
      'Enter': 'newlineAndIndentContinueMarkdownList',
      'Tab': (cm) => {
        if (cm.somethingSelected()) {
          cm.indentSelection('add');
        } else {
          cm.replaceSelection('  ');
        }
      }
    },
    foldOptions: {
      widget: '...'
    },
    indentUnit: 2,
    tabSize: 2,
    viewportMargin: Infinity,
    filename: filename
  };

  const editorComponent = (
    <Box
      className={focusMode ? 'focus-mode' : ''}
      sx={{
        height: '100%',
        position: 'relative',
        '& .CodeMirror': {
          height: '100%',
          width: '100%',
        }
      }}
    >
      {editorType === 'codemirror' ? (
        <Box sx={{ position: 'relative', height: '100%' }}>
          <CodeMirror
            value={content}
            options={options}
            onBeforeChange={handleChange}
            onContextMenu={(editor, e) => {
              e.preventDefault();
              const { left, top } = editor.getWrapperElement().getBoundingClientRect();
              const { clientX, clientY } = e;
              setContextMenu({
                mouseX: clientX - left,
                mouseY: clientY - top,
              });
            }}
            editorDidMount={editor => {
              setEditorInstance(editor);
              editor.on('cursorActivity', () => {
                if (onCursorChange) {
                  onCursorChange(editor.getCursor());
                }
              });
            }}
          />
          {/* Context Menu */}
          <Menu
            open={contextMenu !== null}
            onClose={handleContextMenuClose}
            anchorReference="anchorPosition"
            anchorPosition={
              contextMenu !== null
                ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                : undefined
            }
          >
            <MenuItem onClick={autodetectAndApplyLanguage}>
              Auto-detect Syntax
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (!editorInstance) return;
                try {
                  const currentValue = editorInstance.getValue();
                  const parsedJson = JSON.parse(currentValue);
                  const formattedJson = JSON.stringify(parsedJson, null, 2);
                  editorInstance.setValue(formattedJson);
                  setIsJsonMode(true);
                  editorInstance.setOption('mode', { name: 'javascript', json: true });
                } catch (e) {
                  console.error('Invalid JSON');
                }
                handleContextMenuClose();
              }}
            >
              Format JSON
            </MenuItem>
            {Object.entries(converters).map(([key, converter]) => (
              <MenuItem 
                key={key} 
                onClick={() => {
                  handleConvert(converter);
                  handleContextMenuClose();
                }}
              >
                {converter.name}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      ) : (
        <TipTapEditor
          content={content}
          onChange={onChange}
          darkMode={darkMode}
          cursorPosition={cursorPosition}
          onCursorChange={onCursorChange}
        />
      )}
      
      {/* Conversion Menu */}
      <Menu
        anchorEl={converterAnchor}
        open={Boolean(converterAnchor)}
        onClose={handleConverterClose}
      >
        {Object.entries(converters).map(([key, converter]) => (
          <MenuItem key={key} onClick={() => handleConvert(converter)}>
            {converter.name}
          </MenuItem>
        ))}
      </Menu>
      
    </Box>
  );

  return (
    <div className="split-view">
      <div>{editorComponent}</div>
      {showPreview && (
        <div>
          <MarkdownPreview 
            content={content} 
            darkMode={darkMode} 
            isFullScreen={isFullScreen}
            onClose={() => setIsFullScreen(false)}
          />
          <Box 
            onClick={() => setIsFullScreen(true)} 
            sx={{ 
              cursor: 'pointer',
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: '50%',
              zIndex: 1,
            }}
          />
        </div>
      )}
    </div>
  );
});

export default Editor;

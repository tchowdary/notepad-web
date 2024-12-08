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
import { Box, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import MarkdownPreview from './MarkdownPreview';
import ApiKeyInput from './ApiKeyInput';
import { improveText } from '../utils/textImprovement';
import { converters } from '../utils/converters';

const Editor = forwardRef(({ 
  content, 
  onChange, 
  wordWrap = false, 
  darkMode = false,
  showLineNumbers = true,
  showPreview,
  focusMode
}, ref) => {
  const [editorInstance, setEditorInstance] = useState(null);
  const [improving, setImproving] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [converterAnchor, setConverterAnchor] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useImperativeHandle(ref, () => ({
    setConverterMenuAnchor: (anchor) => {
      const selection = editorInstance?.getSelection();
      setSelectedText(selection || content);
      setConverterAnchor(anchor);
    },
    getSelectedText: () => {
      return editorInstance?.getSelection() || content;
    }
  }));

  const handleConverterClose = () => {
    setConverterAnchor(null);
  };

  useEffect(() => {
    if (editorInstance) {
      editorInstance.setOption('lineWrapping', wordWrap);
    }
  }, [wordWrap, editorInstance]);

  const handleChange = (editor, data, value) => {
    onChange(value);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu(
      contextMenu === null
        ? { mouseX: e.clientX - 2, mouseY: e.clientY - 4 }
        : null,
    );
  };

  const handleConvert = async (converter) => {
    const text = selectedText || content;
    try {
      const result = await converter.convert(text);
      if (editorInstance?.somethingSelected()) {
        editorInstance.replaceSelection(result);
      } else {
        onChange(result);
      }
    } catch (error) {
      console.error('Error converting text:', error);
    }
    handleConverterClose();
    setContextMenu(null);
  };

  const handleImproveText = async () => {
    if (improving) return;
    
    const text = editorInstance?.getSelection() || content;
    if (!text.trim()) return;

    setImproving(true);
    try {
      const improvedText = await improveText(text);
      if (improvedText) {
        if (editorInstance?.somethingSelected()) {
          editorInstance.replaceSelection(improvedText);
        } else {
          onChange(improvedText);
        }
      }
    } catch (error) {
      console.error('Error improving text:', error);
    } finally {
      setImproving(false);
    }
  };

  const options = {
    mode: 'markdown',
    theme: darkMode ? 'material' : 'default',
    lineNumbers: !focusMode && showLineNumbers,
    lineWrapping: wordWrap,
    autofocus: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    extraKeys: {
      'Enter': 'newlineAndIndentContinueMarkdownList',
      'Tab': (cm) => {
        if (cm.somethingSelected()) {
          cm.indentSelection('add');
        } else {
          cm.replaceSelection('  ');
        }
      }
    },
    indentUnit: 2,
    tabSize: 2,
    viewportMargin: Infinity,
  };

  const editorComponent = (
    <Box
      onContextMenu={handleContextMenu}
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
      <CodeMirror
        value={content}
        options={options}
        onBeforeChange={(editor, data, value) => {
          handleChange(editor, data, value);
        }}
        editorDidMount={editor => {
          setEditorInstance(editor);
        }}
      />
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {Object.entries(converters).map(([key, converter]) => (
          <MenuItem
            key={key}
            onClick={() => handleConvert(converter)}
          >
            {converter.name}
          </MenuItem>
        ))}
      </Menu>
      {improving && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
          }}
        >
          Improving text...
        </Box>
      )}
      <Tooltip title="Improve text with AI">
        <IconButton
          onClick={handleImproveText}
          disabled={improving}
          sx={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <AutoFixHighIcon />
        </IconButton>
      </Tooltip>
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

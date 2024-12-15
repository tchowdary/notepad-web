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
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/indent-fold';
import 'codemirror/addon/fold/comment-fold';
import 'codemirror/addon/fold/foldgutter.css';
import { Box, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import MarkdownPreview from './MarkdownPreview';
import ApiKeyInput from './ApiKeyInput';
import TipTapEditor from './TipTapEditor';
import { improveText } from '../utils/textImprovement';
import { converters } from '../utils/converters';

const Editor = forwardRef(({ 
  content, 
  onChange, 
  wordWrap = false, 
  darkMode = false,
  showLineNumbers = true,
  showPreview,
  focusMode,
  editorType = 'codemirror'
}, ref) => {
  const [editorInstance, setEditorInstance] = useState(null);
  const [improving, setImproving] = useState(false);
  const [converterAnchor, setConverterAnchor] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isJsonMode, setIsJsonMode] = useState(false);

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
    mode: isJsonMode ? { name: 'javascript', json: true } : 'markdown',
    theme: darkMode ? 'material' : 'default',
    lineNumbers: !focusMode && showLineNumbers,
    lineWrapping: wordWrap,
    autofocus: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    foldGutter: true,
    gutters:  !focusMode && ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
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
        <CodeMirror
          value={content}
          options={options}
          onBeforeChange={handleChange}
          editorDidMount={(editor) => {
            setEditorInstance(editor);
            const timeoutId = setTimeout(() => {
              editor.focus();
              editor.setCursor(editor.lineCount(), 0);
            }, 100);
            return () => clearTimeout(timeoutId);
          }}
        />
      ) : (
        <TipTapEditor
          content={content}
          onChange={onChange}
          darkMode={darkMode}
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
      {!showPreview && editorType === 'codemirror' && (
        <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
          <Tooltip title="Improve Text">
            <IconButton 
              onClick={handleImproveText}
              disabled={improving}
            >
              <AutoFixHighIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}
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

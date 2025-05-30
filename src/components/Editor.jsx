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
import 'codemirror/addon/search/search';
import 'codemirror/addon/search/searchcursor';
import 'codemirror/addon/search/jump-to-line';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/dialog/dialog.css';
import { Box, Menu, MenuItem, IconButton, Stack, TextField, Button, Paper, InputAdornment } from '@mui/material';
import MarkdownPreview from './MarkdownPreview';
import TipTapEditor from './TipTapEditor';
import { converters } from '../utils/converters';
import {
  Code as CodeIcon,
  DataObject as JsonIcon,
  FormatAlignCenter as FormatIcon,
  Search as SearchIcon,
  FindReplace as FindReplaceIcon,
  Close as CloseIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { create, all } from 'mathjs';
const math = create(all);
const scope = {};

const Editor = forwardRef((
  { 
    tabId, 
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
    initialScrollTop,
    filename = '',
    onScrollUpdate,
  }, 
  externalRef
) => {
  const [editorInstance, setEditorInstance] = useState(null);
  const [improving, setImproving] = useState(false);
  const [converterAnchor, setConverterAnchor] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [fileMode, setFileMode] = useState('markdown');
  const [contextMenu, setContextMenu] = useState(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentMatch, setCurrentMatch] = useState(null);
  const [matchCount, setMatchCount] = useState(0);
  const [charCount, setCharCount] = useState(content.length);
  const [wordCount, setWordCount] = useState(() => content.trim().split(/\s+/).filter(w => w.length > 0).length);
  const [selCharCount, setSelCharCount] = useState(0);
  const [modeAnchor, setModeAnchor] = useState(null);
  const tipTapEditorRef = React.useRef(null);
  const codeMirrorRef = React.useRef(null);

  console.log(`[Editor] Rendering with editorType: ${editorType}, tabId: ${tabId}`);

  // Restore cursor position when editor instance or cursorPosition changes
  useEffect(() => {
    if (editorInstance && cursorPosition && !editorInstance.somethingSelected()) {
      editorInstance.setCursor(cursorPosition);
    }
  }, [editorInstance, cursorPosition, editorType]);

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

  useImperativeHandle(externalRef, () => ({
    getCurrentState: () => {
      if (editorType === 'tiptap' && tipTapEditorRef.current) {
        try {
          const scrollTop = tipTapEditorRef.current.getScrollTop();
          const cursor = tipTapEditorRef.current.getCursorPosition();
          return { scrollTop, cursorPosition: cursor };
        } catch (error) {
          console.error("[Editor] Error calling TipTap ref methods:", error);
          return { scrollTop: 0, cursorPosition: null }; // Default/error state
        }
      } else {
        return null; // Or return default state { scrollTop: 0, cursorPosition: null }
      }
    }
  }), [editorType, tipTapEditorRef]);

  useEffect(() => {
    if (editorType === 'tiptap' && initialScrollTop !== undefined && tipTapEditorRef.current) {
      tipTapEditorRef.current.setScrollTop(initialScrollTop);
    } else if (editorType !== 'tiptap' && initialScrollTop !== undefined && codeMirrorRef.current) {
    }
  }, [initialScrollTop, editorType, tabId]);

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

  useEffect(() => {
    setCharCount(content.length);
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(words);
  }, [content]);

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

  const handleModeClick = (e) => setModeAnchor(e.currentTarget);
  const handleModeClose = () => setModeAnchor(null);
  const supportedModes = [
    { label: 'Markdown', mode: 'markdown' },
    { label: 'JavaScript', mode: 'javascript' },
    { label: 'JSON', mode: { name: 'javascript', json: true } },
    { label: 'CSS', mode: 'css' },
    { label: 'HTML/XML', mode: 'xml' },
    { label: 'Python', mode: 'python' },
    { label: 'SQL', mode: 'sql' },
    { label: 'YAML', mode: 'yaml' },
    { label: 'Plain Text', mode: null },
  ];
  const getModeLabel = (mode) => {
    if (!mode) return 'Plain Text';
    if (typeof mode === 'object' && mode.json) return 'JSON';
    const name = typeof mode === 'string' ? mode : mode.name;
    switch (name) {
      case 'markdown': return 'Markdown';
      case 'javascript': return 'JavaScript';
      case 'css': return 'CSS';
      case 'xml': return 'HTML/XML';
      case 'python': return 'Python';
      case 'sql': return 'SQL';
      case 'yaml': return 'YAML';
      default: return name.charAt(0).toUpperCase() + name.slice(1);
    }
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
      },
      // Add keyboard shortcuts for find and replace
      'Ctrl-F': (cm) => {
        const selection = cm.getSelection();
        if (selection) {
          setFindText(selection);
        }
        setShowFindReplace(true);
      },
      'Cmd-F': (cm) => {
        const selection = cm.getSelection();
        if (selection) {
          setFindText(selection);
        }
        setShowFindReplace(true);
      },
      'Esc': () => setShowFindReplace(false)
    },
    foldOptions: {
      widget: '...'
    },
    indentUnit: 2,
    tabSize: 2,
    viewportMargin: Infinity,
    filename: filename
  };

  // Math eval support: Alt-= to evaluate expression using mathjs
  useEffect(() => {
    if (!editorInstance) return;
    const map = {
      'Alt-=': cm => {
        const raw = cm.getSelection() || cm.getLine(cm.getCursor().line);
        const expr = raw.trim();
        let evalExpr = expr;

        // normalize unit synonyms for conversions
        if (/\bto\b/i.test(expr)) {
          // pure unit conversions without numeric operand
          if (/^\s*c\s+to\s*f\s*$/i.test(expr)) {
            evalExpr = '1 degC to degF';
          } else if (/^\s*f\s+to\s*c\s*$/i.test(expr)) {
            evalExpr = '1 degF to degC';
          } else {
            evalExpr = expr
              .replace(/\bto\s+c\b/gi, 'to degC')
              .replace(/\bto\s+f\b/gi, 'to degF')
              .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*c\b/gi, '$1 degC')
              .replace(/\b([0-9]+(?:\.[0-9]+)?)\s*f\b/gi, '$1 degF')
              .replace(/\bmiles?\b/gi, 'mile')
              .replace(/\bkm?s?\b/gi, 'km');
          }
        }
        let result;
        try {
          result = math.evaluate(evalExpr, scope);
        } catch (err) {
          // fallback manual Celsius/Fahrenheit
          const m = expr.match(/^([0-9]+(?:\.[0-9]+)?)\s*([cCfF])\s+to\s+([cCfF])$/i);
          if (m) {
            const val = parseFloat(m[1]);
            const from = m[2].toLowerCase();
            const to = m[3].toLowerCase();
            if (from === 'c' && to === 'f') {
              result = (val * 9/5 + 32) + ' degF';
            } else if (from === 'f' && to === 'c') {
              result = ((val - 32) * 5/9) + ' degC';
            }
          } else {
            console.warn('Math-eval error:', err.message);
            return;
          }
        }
        if (cm.somethingSelected()) {
          cm.replaceSelection(`${expr} = ${result}`);
        } else {
          const { line } = cm.getCursor();
          cm.replaceRange(
            `${expr} = ${result}`,
            { line, ch: 0 },
            { line, ch: expr.length }
          );
        }
      }
    };
    editorInstance.addKeyMap(map);
    return () => editorInstance.removeKeyMap(map);
  }, [editorInstance]);

  const findNext = () => {
    if (!editorInstance || !findText) return;
    
    const cursor = editorInstance.getSearchCursor(findText, currentMatch?.to || editorInstance.getCursor(), { caseFold: true });
    
    if (cursor.findNext()) {
      editorInstance.setSelection(cursor.from(), cursor.to());
      editorInstance.scrollIntoView({from: cursor.from(), to: cursor.to()}, 50);
      setCurrentMatch({ from: cursor.from(), to: cursor.to() });
    } else {
      // Wrap around to the beginning
      const cursor = editorInstance.getSearchCursor(findText, { line: 0, ch: 0 }, { caseFold: true });
      if (cursor.findNext()) {
        editorInstance.setSelection(cursor.from(), cursor.to());
        editorInstance.scrollIntoView({from: cursor.from(), to: cursor.to()}, 50);
        setCurrentMatch({ from: cursor.from(), to: cursor.to() });
      }
    }
  };

  const findPrevious = () => {
    if (!editorInstance || !findText) return;
    
    // Start from the current position or from the end if no current match
    const startPos = currentMatch?.from || editorInstance.getCursor();
    
    // Find all matches up to the current position
    const cursor = editorInstance.getSearchCursor(findText, { line: 0, ch: 0 }, { caseFold: true });
    let prev = null;
    let current = null;
    
    while (cursor.findNext()) {
      if (cursor.from().line > startPos.line || 
          (cursor.from().line === startPos.line && cursor.from().ch >= startPos.ch)) {
        break;
      }
      prev = current;
      current = { from: cursor.from(), to: cursor.to() };
    }
    
    if (prev) {
      // Use the previous match
      editorInstance.setSelection(prev.from, prev.to);
      editorInstance.scrollIntoView({from: prev.from, to: prev.to}, 50);
      setCurrentMatch(prev);
    } else {
      // Wrap around to the end
      const doc = editorInstance.getDoc();
      const lastLine = doc.lastLine();
      const lastLineLength = doc.getLine(lastLine).length;
      const cursor = editorInstance.getSearchCursor(findText, { line: lastLine, ch: lastLineLength }, { caseFold: true });
      
      let lastMatch = null;
      while (cursor.findPrevious()) {
        lastMatch = { from: cursor.from(), to: cursor.to() };
        break;
      }
      
      if (lastMatch) {
        editorInstance.setSelection(lastMatch.from, lastMatch.to);
        editorInstance.scrollIntoView({from: lastMatch.from, to: lastMatch.to}, 50);
        setCurrentMatch(lastMatch);
      }
    }
  };

  const replaceCurrentMatch = () => {
    if (!editorInstance || !currentMatch) return;
    
    try {
      // Use the editor's replaceRange method to replace the text
      editorInstance.replaceRange(replaceText, currentMatch.from, currentMatch.to);
      
      // After replacing, find the next match
      const cursor = editorInstance.getSearchCursor(findText, currentMatch.from, { caseFold: true });
      if (cursor.findNext()) {
        editorInstance.setSelection(cursor.from(), cursor.to());
        editorInstance.scrollIntoView({from: cursor.from(), to: cursor.to()}, 50);
        setCurrentMatch({ from: cursor.from(), to: cursor.to() });
      } else {
        // If no more matches, try from the beginning
        const cursor = editorInstance.getSearchCursor(findText, { line: 0, ch: 0 }, { caseFold: true });
        if (cursor.findNext()) {
          editorInstance.setSelection(cursor.from(), cursor.to());
          editorInstance.scrollIntoView({from: cursor.from(), to: cursor.to()}, 50);
          setCurrentMatch({ from: cursor.from(), to: cursor.to() });
        } else {
          // No matches left
          setCurrentMatch(null);
        }
      }
      
      // Update the match count
      updateMatchCount();
    } catch (error) {
      console.error('Error during replace:', error);
    }
  };

  const replaceAll = () => {
    if (!editorInstance || !findText) return;
    
    try {
      // Get the current document value
      const currentValue = editorInstance.getValue();
      
      // Simple string replacement for all occurrences
      // This is more efficient than using the cursor for large documents
      const newValue = currentValue.split(findText).join(replaceText);
      
      // Set the new value
      editorInstance.setValue(newValue);
      
      // Reset search state
      setCurrentMatch(null);
      setMatchCount(0);
    } catch (error) {
      console.error('Error during replaceAll:', error);
    }
  };

  const updateMatchCount = () => {
    if (!editorInstance || !findText) {
      setMatchCount(0);
      return;
    }
    
    let count = 0;
    const cursor = editorInstance.getSearchCursor(findText, { line: 0, ch: 0 }, { caseFold: true });
    while (cursor.findNext()) {
      count++;
    }
    
    setMatchCount(count);
  };

  // Update match count whenever find text changes
  useEffect(() => {
    updateMatchCount();
  }, [findText, content]);

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
                const selection = editor.getSelection();
                setSelCharCount(selection ? selection.length : 0);
              });
            }}
          />
          
          {/* Find and Replace UI */}
          {showFindReplace && (
            <Paper 
              elevation={3}
              sx={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 1000,
                padding: 2,
                width: '300px',
              }}
            >
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SearchIcon fontSize="small" sx={{ mr: 1 }} />
                    <span>Find & Replace</span>
                  </Box>
                  <IconButton size="small" onClick={() => setShowFindReplace(false)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Find"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', marginRight: '5px' }}>
                            {matchCount > 0 ? `${matchCount} matches` : ''}
                          </span>
                          <IconButton size="small" onClick={findPrevious}>
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={findNext}>
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.shiftKey ? findPrevious() : findNext();
                    }
                  }}
                />
                
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Replace"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      replaceCurrentMatch();
                    }
                  }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={replaceCurrentMatch}
                    disabled={!currentMatch}
                  >
                    Replace
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={replaceAll}
                    disabled={matchCount === 0}
                  >
                    Replace All
                  </Button>
                </Box>
              </Stack>
            </Paper>
          )}
          
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
            <MenuItem onClick={() => {
              setShowFindReplace(true);
              handleContextMenuClose();
            }}>
              Find & Replace
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
          ref={tipTapEditorRef}
          tabId={tabId}
          content={content}
          onChange={onChange}
          darkMode={darkMode}
          initialScrollTop={initialScrollTop}
          onCursorChange={onCursorChange}
          onScrollUpdate={onScrollUpdate}
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
      
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: '2px 8px',
          fontSize: '0.65rem',
          lineHeight: 1.2,
          bgcolor: 'transparent',
          borderTop: '1px solid',
          borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
          color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <Box onClick={handleModeClick} sx={{ mr: 2, cursor: 'pointer', color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
          {getModeLabel(fileMode)}
        </Box>
        {selCharCount > 0
          ? `${selCharCount} chars selected`
          : `${charCount} chars, ${wordCount} words`}
      </Box>
      <Menu anchorEl={modeAnchor} open={Boolean(modeAnchor)} onClose={handleModeClose}>
        {supportedModes.map(({label, mode}) => (
          <MenuItem key={label} onClick={() => { handleLanguageChange(mode); handleModeClose(); }}>
            {label}
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

Editor.displayName = 'Editor';

export default Editor;

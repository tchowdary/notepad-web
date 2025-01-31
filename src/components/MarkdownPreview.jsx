import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Modal, IconButton, Stack } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
  prism
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import 'github-markdown-css';
import mermaid from 'mermaid';

const MermaidWrapper = ({ children, darkMode }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef(null);

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.min(Math.max(0.1, prev + delta), 3));
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.1));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener('wheel', handleWheel, { passive: false });
      return () => wrapper.removeEventListener('wheel', handleWheel);
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <Box sx={{ position: 'relative', my: 2 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          backgroundColor: darkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)',
          padding: '4px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        <IconButton
          size="small"
          onClick={handleZoomOut}
          sx={{ 
            color: darkMode ? 'white' : 'black',
            '&:hover': {
              bgcolor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            }
          }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleReset}
          sx={{ 
            color: darkMode ? 'white' : 'black',
            '&:hover': {
              bgcolor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            }
          }}
        >
          <RestartAltIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleZoomIn}
          sx={{ 
            color: darkMode ? 'white' : 'black',
            '&:hover': {
              bgcolor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            }
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Box
        ref={wrapperRef}
        sx={{
          overflow: 'hidden',
          border: theme => `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: 1,
          p: 2,
          cursor: scale > 1 ? 'grab' : 'default',
          '&:active': {
            cursor: scale > 1 ? 'grabbing' : 'default',
          },
        }}
        onMouseDown={handleMouseDown}
      >
        <Box
          sx={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

const MarkdownPreview = ({ content, darkMode, isFullScreen = false, onClose }) => {
  const codeStyle = darkMode ? oneDark : prism;
  const mermaidRef = useRef(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: darkMode ? 'dark' : 'default',
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    const renderMermaid = () => {
      if (mermaidRef.current) {
        try {
          mermaid.contentLoaded();
        } catch (error) {
          console.error('Mermaid rendering error:', error);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(renderMermaid, 100);
    return () => clearTimeout(timeoutId);
  }, [content, darkMode, isFullScreen]);

  const MermaidComponent = ({ content }) => (
    <MermaidWrapper darkMode={darkMode}>
      <div className="mermaid" style={{ background: darkMode ? '#161D26' : '#FFFCF0' }}>
        {content}
      </div>
    </MermaidWrapper>
  );

  const MarkdownComponents = {
    code({node, inline, className, children, ...props}) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      if (language === 'mermaid') {
        return <MermaidComponent content={String(children).replace(/\n$/, '')} />;
      }

      return !inline && language ? (
        <SyntaxHighlighter
          style={codeStyle}
          language={language}
          PreTag="div"
          customStyle={{
            margin: '1em 0',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: darkMode ? '#161D26' : '#f6f8fa',
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  };
  
  const PreviewContent = () => (
    <Box
      ref={mermaidRef}
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        padding: '20px',
        bgcolor: darkMode ? '#161D26' : '#FFFCF0',
      }}
      className={`markdown-body ${darkMode ? 'markdown-dark' : ''}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );

  return isFullScreen ? (
    <Modal
      open={isFullScreen}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        ref={mermaidRef}
        sx={{
          width: '100%',
          height: '100vh',
          bgcolor: darkMode ? '#161D26' : '#FFFCF0',
          outline: 'none',
        }}
      >
        <Box
          sx={{
            height: '100%',
            overflow: 'auto',
            padding: '40px',
          }}
          className={`markdown-body ${darkMode ? 'markdown-dark' : ''}`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {content}
          </ReactMarkdown>
        </Box>
      </Box>
    </Modal>
  ) : (
    <PreviewContent />
  );
};

export default MarkdownPreview;

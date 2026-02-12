import React, { useEffect, useState, useCallback, useRef } from 'react';
import { saveDrawing, loadDrawing } from '../utils/db';

const ExcalidrawEditor = ({ darkMode, id }) => {
  const [initialData, setInitialData] = useState(null);
  const [ExcalidrawComp, setExcalidrawComp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const excalidrawAPIRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Dynamically import Excalidraw to avoid SSR/bundling issues
  useEffect(() => {
    let cancelled = false;
    import('@excalidraw/excalidraw')
      .then((mod) => {
        if (!cancelled) {
          setExcalidrawComp(() => mod.Excalidraw);
        }
      })
      .catch((err) => {
        console.error('Failed to load Excalidraw:', err);
        if (!cancelled) {
          setError('Failed to load Excalidraw. Please check that @excalidraw/excalidraw is installed.');
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Load drawing data from IndexedDB
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await loadDrawing(id);
        if (cancelled) return;
        setInitialData({
          elements: data?.elements || [],
          appState: {
            ...(data?.appState || {}),
            theme: darkMode ? 'dark' : 'light',
          },
          files: data?.files || {},
        });
      } catch (err) {
        console.error('Error loading drawing:', err);
        if (!cancelled) {
          setInitialData({
            elements: [],
            appState: { theme: darkMode ? 'dark' : 'light' },
            files: {},
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]); // Only reload when ID changes, not on darkMode change

  // Update theme on the live instance when darkMode changes (without full remount)
  useEffect(() => {
    if (excalidrawAPIRef.current) {
      excalidrawAPIRef.current.updateScene({
        appState: { theme: darkMode ? 'dark' : 'light' },
      });
    }
  }, [darkMode]);

  // Debounced save to IndexedDB
  const handleChange = useCallback((elements, appState, files) => {
    if (!elements || !appState) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveDrawing({
          id,
          elements,
          appState: {
            ...appState,
            theme: appState.theme,
          },
          files,
        });
      } catch (err) {
        console.error('Error saving drawing:', err);
      }
    }, 300);
  }, [id]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: darkMode ? '#ccc' : '#666',
        fontFamily: 'sans-serif',
      }}>
        {error}
      </div>
    );
  }

  if (loading || !ExcalidrawComp || !initialData) {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: darkMode ? '#ccc' : '#666',
        fontFamily: 'sans-serif',
        backgroundColor: darkMode ? '#121212' : '#ffffff',
      }}>
        Loading drawing...
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      width: '100%',
      position: 'relative',
      backgroundColor: darkMode ? '#121212' : '#ffffff',
    }}>
      <ExcalidrawComp
        excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
        initialData={initialData}
        onChange={handleChange}
        theme={darkMode ? 'dark' : 'light'}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
          },
        }}
      />
    </div>
  );
};

export default ExcalidrawEditor;

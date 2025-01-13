import React, { useState, useRef } from 'react';
import { IconButton, CircularProgress, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import RecordRTC from 'recordrtc';

const VoiceRecorder = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const recorder = useRef(null);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      recorder.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
      });

      recorder.current.startRecording();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
      setError(err.message || 'Error accessing microphone. Please make sure you have granted microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (recorder.current) {
      setIsProcessing(true);
      recorder.current.stopRecording(async () => {
        try {
          const blob = await recorder.current.getBlob();
          await transcribeAudio(blob);
          recorder.current.destroy();
          recorder.current = null;
        } catch (err) {
          console.error('Transcription error:', err);
          setError(err.message || 'Error transcribing audio');
        } finally {
          setIsProcessing(false);
        }
      });
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');

      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        throw new Error('OpenAI API key not found. Please set your API key in settings.');
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Transcription failed');
      }

      const data = await response.json();
      onTranscriptionComplete(data.text);
    } catch (err) {
      console.error('Transcription error:', err);
      throw new Error('Failed to transcribe audio: ' + err.message);
    }
  };

  return (
    <Tooltip title={error || (isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording')}>
      <span>
        <IconButton
          color={isRecording ? "error" : "default"}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          size="small"
        >
          {isProcessing ? (
            <CircularProgress size={24} />
          ) : isRecording ? (
            <StopIcon />
          ) : (
            <MicIcon />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default VoiceRecorder;

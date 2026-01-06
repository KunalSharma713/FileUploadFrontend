import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";

// Set the base URL for all axios requests
axios.defaults.baseURL = 'http://localhost:3000';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '0.5rem 1rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    maxWidth: '28rem',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    padding: '2rem'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.5rem'
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '0.875rem'
  },
  dropzone: {
    border: '2px dashed #d1d5db',
    borderRadius: '0.5rem',
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '1.5rem'
  },
  dropzoneActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    padding: '0.75rem 1rem',
    borderRadius: '0.375rem',
    marginTop: '1rem'
  },
  fileName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginRight: '0.5rem'
  },
  removeButton: {
    color: '#9ca3af',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem'
  },
  progressContainer: {
    marginTop: '1rem'
  },
  progressBar: {
    height: '0.5rem',
    backgroundColor: '#e5e7eb',
    borderRadius: '9999px',
    overflow: 'hidden',
    marginBottom: '0.5rem'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease'
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  uploadButton: {
    width: '100%',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadButtonDisabled: {
    backgroundColor: '#bfdbfe',
    cursor: 'not-allowed'
  },
  uploadButtonHover: {
    backgroundColor: '#2563eb'
  },
  status: {
    padding: '0.75rem',
    borderRadius: '0.375rem',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem'
  },
  statusSuccess: {
    backgroundColor: '#ecfdf5',
    color: '#065f46'
  },
  statusError: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c'
  },
  statusIcon: {
    marginRight: '0.5rem'
  },
  tips: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb'
  },
  tipsTitle: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#111827',
    marginBottom: '0.75rem'
  },
  tipItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    color: '#4b5563'
  },
  tipIcon: {
    color: '#10b981',
    marginRight: '0.5rem',
    marginTop: '0.125rem'
  }
};

export default function FileUpload({ userId }) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({
    success: false,
    error: null,
    fileName: ""
  });
  const [paused, setPaused] = useState(false);
  const [resumeRequested, setResumeRequested] = useState(false);
  const pausedRef = useRef(paused);
  const resumeRequestedRef = useRef(resumeRequested);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { resumeRequestedRef.current = resumeRequested; }, [resumeRequested]);

  const wsRef = useRef();
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop event
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle file selection
  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setUploadStatus({
      success: false,
      error: null,
      fileName: selectedFile.name
    });
  };

  useEffect(() => {
    // Connect to WebSocket for real-time progress
    // Backend runs on port 3000, frontend on 3001
    const wsUrl = window.location.hostname === 'localhost' 
      ? 'ws://localhost:3001' 
      : `wss://${window.location.hostname}`;
      
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress !== undefined) {
          setProgress(prev => Math.max(prev, data.progress));
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const uploadFile = async (file) => {
    if (!file) return;
    
    setUploading(true);
    setProgress(0);
    setUploadStatus(prev => ({ ...prev, error: null, success: false }));
    
    const fileId = `${file.name}-${Date.now()}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const MAX_RETRIES = 3;

    // Check how many bytes are already uploaded (resume support)
    let uploadedSize = 0;
    try {
      const statusRes = await axios.get(`/upload/status/${fileId}`);
      uploadedSize = statusRes.data.uploadedSize || 0;
    } catch (err) {
      console.warn("No previous upload found, starting from 0");
    }

    const startChunk = Math.floor(uploadedSize / CHUNK_SIZE);

    for (let i = startChunk; i < totalChunks; i++) {
      // Pause support (use refs to avoid stale closure)
      while (pausedRef.current && !resumeRequestedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (resumeRequestedRef.current) {
        setPaused(false);
        setResumeRequested(false);
      }
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append("chunk", chunk, file.name);
      formData.append("fileId", fileId);
      formData.append("totalSize", file.size);
      formData.append("startByte", start);
      formData.append("filename", file.name);
      formData.append("userId", userId);

      let attempts = 0;
      let chunkUploaded = false;

      while (!chunkUploaded && attempts < MAX_RETRIES) {
        try {
          await axios.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (progressEvent) => {
              const chunkProgress = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100
              );
              const chunkSize = end - start;
              const overallProgress = Math.min(
                99, // Cap at 99% until all chunks are done
                Math.floor(
                  ((i * CHUNK_SIZE) + (chunkProgress / 100) * chunkSize) / 
                  file.size * 100
                )
              );
              setProgress(overallProgress);
            },
            timeout: 30000, // 30 second timeout
          });
          
          chunkUploaded = true;
          
          // Update progress after successful chunk upload
          const newProgress = Math.floor(((i + 1) / totalChunks) * 100);
          setProgress(newProgress);
          
        } catch (err) {
          attempts++;
          console.error(`Chunk ${i} upload failed (attempt ${attempts}/${MAX_RETRIES}):`, err.message);
          
          if (attempts >= MAX_RETRIES) {
            setUploadStatus({
              success: false,
              error: `Failed to upload file after ${MAX_RETRIES} attempts. Please try again.`,
              fileName: file.name
            });
            setUploading(false);
            return;
          }
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
        }
      }
    }

    setUploading(false);
    setUploadStatus({
      success: true,
      error: null,
      fileName: file.name
    });
    
    // Reset form after successful upload
    setTimeout(() => {
      setFile(null);
      setProgress(0);
      setUploadStatus({ success: false, error: null, fileName: "" });
    }, 3000);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Upload Your Files</h2>
          <p style={styles.subtitle}>Drag and drop your file here or click to browse</p>
        </div>

        {/* Drop Zone */}
        <div 
          ref={dropZoneRef}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            ...styles.dropzone,
            ...(dragActive ? styles.dropzoneActive : {})
          }}
        >
          <div style={{ pointerEvents: 'none' }}>
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke={dragActive ? "#3b82f6" : "#9ca3af"} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ margin: '0 auto 1rem' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            
            {!file ? (
              <>
                <p style={{ color: dragActive ? '#3b82f6' : '#6b7280', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500, color: dragActive ? '#2563eb' : '#3b82f6' }}>Click to upload</span> or drag and drop
                </p>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>File size limit: 2GB</p>
              </>
            ) : (
              <div style={{ width: '100%' }}>
                <div style={styles.fileInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="#6b7280" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, marginRight: '0.5rem' }}
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span style={styles.fileName}>{file.name}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setProgress(0);
                      setUploadStatus({ success: false, error: null, fileName: "" });
                    }}
                    style={styles.removeButton}
                    aria-label="Remove file"
                  >
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                
                {/* Upload Progress */}
                {uploading &&(
                  <div style={styles.progressContainer}>
                    <div style={styles.progressBar}>
                      <div 
                        style={{ 
                          ...styles.progressFill,
                          width: `${progress}%`
                        }}
                      ></div>
                    </div>
                    <div style={styles.progressText}>
                      <span>{progress}% Complete</span>
                      <span>
                        {Math.round((file.size * progress) / (100 * 1024 * 1024) * 10) / 10}MB of {Math.round(file.size / (1024 * 1024) * 10) / 10}MB
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#3b82f6',
                      fontSize: '0.875rem',
                      marginTop: '0.5rem'
                    }}>
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className={uploading && !paused ? "animate-spin" : ""}
                        style={{ 
                          animation: uploading && !paused ? 'spin 1s linear infinite' : 'none',
                          marginRight: '0.5rem'
                        }}
                      >
                        <line x1="12" y1="2" x2="12" y2="6"></line>
                        <line x1="12" y1="18" x2="12" y2="22"></line>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                        <line x1="2" y1="12" x2="6" y2="12"></line>
                        <line x1="18" y1="12" x2="22" y2="12"></line>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                      </svg>
                      {uploading && !paused ? 'Uploading' : 'Processing'}
                      {'.'.repeat(Math.floor(Date.now() / 500 % 4))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </div>

        {/* Upload Button */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => file && uploadFile(file)}
            disabled={!file || uploading}
            style={{
              ...styles.uploadButton,
              ...(!file || uploading ? styles.uploadButtonDisabled : {}),
              ...(file && !uploading ? { ':hover': styles.uploadButtonHover } : {})
            }}
            onMouseOver={(e) => {
              if (file && !uploading) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseOut={(e) => {
              if (file && !uploading) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            {uploading ? (
              <>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className={uploading && !paused ? "animate-spin" : ""}
                  style={{ 
                    animation: uploading && !paused ? 'spin 1s linear infinite' : 'none',
                    marginRight: '0.5rem'
                  }}
                >
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                {uploading && !paused ? 'Uploading...' : 'Processing...'}
              </>
            ) : (
              'Upload File'
            )}
          </button>
          {uploading && (
            paused ? (
              <button
                style={{ ...styles.uploadButton, backgroundColor: '#10b981' }}
                onClick={() => setResumeRequested(true)}
              >Resume</button>
            ) : (
              <button
                style={{ ...styles.uploadButton, backgroundColor: '#f59e42' }}
                onClick={() => setPaused(true)}
              >Pause</button>
            )
          )}
        </div>
        
        {/* Upload Status */}
        {uploadStatus.success && (
          <div style={{ ...styles.status, ...styles.statusSuccess, marginTop: '1rem' }}>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ marginRight: '0.5rem', flexShrink: 0 }}
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>File uploaded successfully!</span>
          </div>
        )}
        
        {uploadStatus.error && (
          <div style={{ ...styles.status, ...styles.statusError, marginTop: '1rem' }}>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ marginRight: '0.5rem', flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{uploadStatus.error}</span>
          </div>
        )}
        
        {/* Upload Tips */}
        <div style={styles.tips}>
          <h3 style={styles.tipsTitle}>Upload Tips</h3>
          <div style={styles.tipItem}>
            <span style={styles.tipIcon}>✓</span>
            <span>Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP</span>
          </div>
          <div style={styles.tipItem}>
            <span style={styles.tipIcon}>✓</span>
            <span>Maximum file size: 2GB</span>
          </div>
          <div style={styles.tipItem}>
            <span style={styles.tipIcon}>✓</span>
            <span>Secure and encrypted file transfer</span>
          </div>
        </div>
      </div>
      
      {/* Add animation keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
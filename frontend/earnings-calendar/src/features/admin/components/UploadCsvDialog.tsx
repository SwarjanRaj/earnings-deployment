import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { useChunkedBulkUploadMutation } from '../../../services/adminApi';
import { useRefreshMutation } from '../../../services/authApi';
import type { EarningsRow } from '../../../services/adminApi';
import UploadSuccessDialog from './UploadSuccessDialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onParsed: (rows: EarningsRow[]) => void;
}

/* ── helpers ──────────────────────────────────────────────────── */
const norm = (k: string) =>
  k.toLowerCase().replace(/[\s,().-]/g, '');   // strip space, comma, dot, paren, hyphen

const FIELD = {
  ticker:        ['ticker', 'symbol'],
  company:       ['companyname', 'company name', 'company'],
  sector:        ['sector'],
  marketCap:     ['marketcapbusd', 'market cap (b usd)', 'marketcapb', 'mcap', 'marketcap'],
  revenue:       ['quarterlyrevenuebusd', 'quarterly revenue (b usd)', 'quarterlyrevenue', 'revenue'],
  eps:           ['epsusd', 'eps (usd)', 'eps'],
  peRatio:       ['peratio', 'p/e ratio', 'p/e', 'priceearnings', 'pe'],
  earningsDate:  ['earningsdate', 'earnings date', 'date'],
  fiscalYear:    ['fiscalyear', 'fiscal year', 'fy'],
  fiscalQuarter: ['fiscalquarter', 'fiscal quarter', 'quarter', 'fq'],
  reportTime:    ['reporttime', 'report time', 'time'],
} as const;

const pick = (row: any, key: keyof typeof FIELD) => {
  const aliases = FIELD[key];
  for (const col of Object.keys(row)) {
    const n = norm(col);
    /*  ✅ use .some() to avoid "string not assignable to never" error  */
    if (aliases.some((a) => a === n)) return row[col];
  }
  return undefined;
};

const toNum = (v: string | number) =>
  v === '' || v === undefined ? null : Number(String(v).replace(/[, ]/g, ''));

// Chunk array into smaller pieces
const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/* ── component ────────────────────────────────────────────────── */
export default function UploadCsvDialog({ open, onClose, onParsed }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<EarningsRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState(0); // 0: chunked, 1: direct
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const [chunkedBulkUpload] = useChunkedBulkUploadMutation();
  const [refresh] = useRefreshMutation();

  // Cleanup abort controller when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      if (abortController) {
        console.log('Cleaning up abort controller on unmount');
        abortController.abort();
      }
    };
  }, [abortController]);

  // Reset cancelled state when dialog opens
  useEffect(() => {
    if (open) {
      setCancelled(false);
    }
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Reset state
    setUploading(false);
    setProgress(0);
    setCurrentChunk(0);
    setTotalChunks(0);
    setError(null);
    setParsedRows([]);

    // For direct upload, we don't need to parse the file
    if (uploadMethod === 1) {
      return;
    }

    // For chunked upload, parse the file
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => {
        // Debug: log available columns from first row
        if (r.data.length > 0) {
          console.log('Available columns:', Object.keys(r.data[0] as any));
        }
        const rows: EarningsRow[] = (r.data as any[]).map((d, i) => {
          const ticker = String(pick(d,'ticker')).trim();
          const company = String(pick(d,'company')).trim();
          const sector = String(pick(d,'sector')).trim();
          
          // Debug logging for first few rows
          if (i < 3) {
            console.log(`Row ${i}:`, { ticker, company, sector });
          }
          
          return {
            id: `tmp-${Date.now()}-${i}`,
            ticker,
            companyName: company, // ✅ Fix: use companyName instead of company
            sector,
            marketCap:      toNum(pick(d,'marketCap'))?.toString() ?? null,
            revenue:        toNum(pick(d,'revenue'))?.toString()  ?? null,
            eps:            toNum(pick(d,'eps'))?.toString()      ?? null,
            peRatio:        toNum(pick(d,'peRatio'))?.toString()  ?? null,
            earningsDate:   new Date(String(pick(d,'earningsDate')).trim()).toISOString(),
            fiscalYear:     Number(pick(d,'fiscalYear')),
            fiscalQuarter:  String(pick(d,'fiscalQuarter')).trim(),
            reportTime:     /day/i.test(String(pick(d,'reportTime'))) ? 'day' : 'night',
          };
        });

        setParsedRows(rows);
        
        // If file is small (< 50 rows), upload normally
        if (rows.length <= 50) {
          onParsed(rows);
          onClose();
          return;
        }

        // For large files, show chunked upload option
        const chunks = chunkArray(rows, 50); // 50 rows per chunk for better performance
        setTotalChunks(chunks.length);
      },
    });
  };

  const handleChunkedUpload = async () => {
    if (parsedRows.length === 0) return;

    setUploading(true);
    setError(null);
    setCancelled(false);
    
    // Optimize chunk size for better performance (50 rows per chunk instead of 10)
    const chunks = chunkArray(parsedRows, 50);
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let errorCount = 0;
    let authExpired = false;

    // Increase batch size for better parallelization (5 chunks simultaneously)
    const batchSize = 5;
    const totalChunks = chunks.length;

    console.log(`Starting upload: ${totalChunks} chunks of 50 rows each`);

    for (let i = 0; i < totalChunks && !authExpired && !cancelled; i += batchSize) {
      // Check for cancellation before starting each batch
      if (cancelled) {
        console.log('Upload cancelled by user during batch processing');
        setError('Upload was cancelled by user.');
        setUploading(false);
        return;
      }
      
      const batch = chunks.slice(i, i + batchSize);
      
      // Refresh session more frequently to prevent timeout (every 2 batches = 10 chunks)
      if (i > 0 && i % (batchSize * 2) === 0) {
        // Check for cancellation before session refresh
        if (cancelled) {
          console.log('Upload cancelled by user before session refresh');
          setError('Upload was cancelled by user.');
          setUploading(false);
          return;
        }
        
        try {
          console.log('Refreshing session...');
          await refresh().unwrap();
          console.log('Session refreshed successfully');
        } catch (refreshError) {
          console.error('Session refresh failed:', refreshError);
          setError('Your session has expired. Please log in again and try uploading.');
          setUploading(false);
          return;
        }
      }
      
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const chunkIndex = i + batchIndex;
        
        // Check for cancellation before each chunk
        if (cancelled) {
          throw new Error('Upload cancelled');
        }
        
        try {
          console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks}`);
          const result = await chunkedBulkUpload(chunk).unwrap();
          return { success: true, chunkIndex, result };
        } catch (err: any) {
          console.error(`Failed to upload chunk ${chunkIndex + 1}:`, err);
          
          // Check if it's an authentication error
          if (err?.status === 401 || 
              err?.data?.message?.includes('unauthorized') ||
              err?.data?.message?.includes('Authentication') ||
              err?.data?.message?.includes('token')) {
            authExpired = true;
            throw new Error('Authentication expired. Please log in again.');
          }
          
          return { success: false, chunkIndex, error: err };
        }
      });

      try {
        // Wait for current batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Check if authentication expired during this batch
        if (authExpired) {
          setError('Your session has expired. Please log in again and try uploading.');
          setUploading(false);
          return;
        }
        
        // Check if upload was cancelled
        if (cancelled) {
          console.log('Upload cancelled by user after batch completion');
          setError('Upload was cancelled by user.');
          setUploading(false);
          return;
        }
        
        // Update progress
        setCurrentChunk(Math.min(i + batchSize, totalChunks));
        setProgress(((i + batchSize) / totalChunks) * 100);

        // Count results
        batchResults.forEach(result => {
          if (result.success) {
            // Aggregate the actual counts from the API response
            if (result.result) {
              totalInserted += result.result.inserted || 0;
              totalUpdated += result.result.updated || 0;
              totalSkipped += result.result.skipped || 0;
            }
          } else {
            errorCount++;
          }
        });
      } catch (authError: any) {
        // Handle authentication errors
        if (authError.message.includes('Authentication expired')) {
          setError('Your session has expired. Please log in again and try uploading.');
          setUploading(false);
          return;
        }
        throw authError;
      }
    }

    setUploading(false);
    
    // Don't show success if authentication expired or cancelled
    if (authExpired || cancelled) {
      return;
    }
    
    if (errorCount === 0) {
      // Show success dialog with aggregated results
      const aggregatedResult = {
        message: 'Chunked upload completed successfully',
        inserted: totalInserted,
        updated: totalUpdated,
        skipped: totalSkipped,
        total: parsedRows.length,
      };
      setSuccessResult(aggregatedResult);
      setShowSuccessDialog(true);
    } else {
      const successChunks = chunks.length - errorCount;
      setError(`Upload completed with ${errorCount} failed chunks. ${successChunks} chunks uploaded successfully.`);
    }
  };

  const handleDirectUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setProgress(0);
    setCancelled(false);
    
    // Create new AbortController for this upload
    const controller = new AbortController();
    setAbortController(controller);

    // Start progress simulation
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      if (cancelled) {
        clearInterval(progressInterval);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const estimatedTotalTime = Math.max(30000, selectedFile && typeof selectedFile.size === 'number' ? selectedFile.size / 1000 : 0); // At least 30 seconds, or based on file size
      const simulatedProgress = Math.min(85, (elapsed / estimatedTotalTime) * 100);
      
      if (simulatedProgress > progress) {
        setProgress(simulatedProgress);
      }
    }, 500);

    try {
      console.log('Starting direct upload with file:', selectedFile && selectedFile.name ? selectedFile.name : '', 'size:', selectedFile && typeof selectedFile.size === 'number' ? selectedFile.size : '');
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      console.log('FormData created, checking file in FormData:');
      for (let [key, value] of formData.entries()) {
        console.log('FormData entry:', key, value);
      }

      // Show initial progress to indicate upload has started
      setProgress(5);

      const response = await fetch('/api/stock/upload-earnings', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal, // Add abort signal
      });

      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Show progress during processing
      setProgress(90);

      const result = await response.json();
      console.log('Upload successful, result:', result);
      setProgress(100);
      
      // Clear the progress interval
      clearInterval(progressInterval);
      
      // Show success dialog
      setSuccessResult(result);
      setShowSuccessDialog(true);
      setUploading(false);

    } catch (err) {
      // Clear the progress interval
      clearInterval(progressInterval);
      
      // Check if it's an abort error
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Upload was cancelled by user');
        setError('Upload was cancelled');
      } else {
        console.error('Direct upload error:', err);
        setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      setUploading(false);
    } finally {
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    console.log('Cancelling upload...');
    
    // Abort any ongoing fetch request
    if (abortController) {
      console.log('Aborting fetch request...');
      abortController.abort();
      setAbortController(null);
    }
    
    // Set cancelled flag to stop chunked upload
    setCancelled(true);
    
    // Reset all state
    setUploading(false);
    setProgress(0);
    setCurrentChunk(0);
    setTotalChunks(0);
    setError(null);
    setParsedRows([]);
    setSelectedFile(null);
    
    // Close the dialog
    onClose();
  };

  const handleDownloadTemplate = () => {
    // CSV template with ONLY header (no records)
    const csvContent = `Ticker,Company Name,Sector,Market Cap (B USD),Quarterly Revenue (B USD),EPS (USD),P/E Ratio,Fiscal Year,Fiscal Quarter,Earnings Date,Report Time`;
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
  
    link.href = url;
    link.download = 'earnings-template.csv';
    link.style.visibility = 'hidden';
  
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  

  return (
    <>
      <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          {uploading ? 'Uploading CSV...' : 'Upload CSV'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            {!uploading && (
              <>
                <Tabs 
                  value={uploadMethod} 
                  onChange={(_, newValue) => setUploadMethod(newValue)}
                  sx={{ mb: 2 }}
                >
                  <Tab label="Chunked Upload" />
                  <Tab label="Direct Upload" />
                </Tabs>

                {uploadMethod === 0 && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography fontWeight={500}>Expected columns</Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Download size={16} />}
                        onClick={handleDownloadTemplate}
                        sx={{ 
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          py: 0.5,
                          px: 1.5
                        }}
                      >
                        Download Template
                      </Button>
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre' }}>
                      Ticker, Company Name, Sector, Market Cap (B USD){'\n'}
                      Quarterly Revenue (B USD), EPS (USD), P/E Ratio,{'\n'}
                      Fiscal Year, Fiscal Quarter, Earnings Date, Report Time
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Parses file in browser and uploads in small chunks (recommended for large files)
                    </Typography>
                  </>
                )}

                {uploadMethod === 1 && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography fontWeight={500}>Direct File Upload</Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Download size={16} />}
                        onClick={handleDownloadTemplate}
                        sx={{ 
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          py: 0.5,
                          px: 1.5
                        }}
                      >
                        Download Template
                      </Button>
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre' }}>
                      Ticker, Company Name, Sector, Market Cap (B USD){'\n'}
                      Quarterly Revenue (B USD), EPS (USD), P/E Ratio,{'\n'}
                      Fiscal Year, Fiscal Quarter, Earnings Date, Report Time
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Uploads file directly to server for processing (bypasses browser limits)
                    </Typography>
                  </>
                )}

                <Button variant="outlined" component="label" sx={{ mt: 2 }}>
                  Select file
                  <input type="file" accept=".csv" hidden onChange={handleFile} />
                </Button>

                {selectedFile && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected: {selectedFile.name} ({typeof selectedFile.size === 'number' ? (selectedFile.size / 1024 / 1024).toFixed(2) : '0.00'} MB)
                  </Typography>
                )}

                {uploadMethod === 0 && parsedRows.length > 0 && (
                  <>
                    <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
                      File Parsed Successfully!
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Found {parsedRows.length} rows
                      {totalChunks > 1 && ` (will be uploaded in ${totalChunks} chunks of 50 rows each)`}
                    </Typography>
                    
                    {totalChunks > 100 && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Large file detected!</strong> This will take a long time to upload in chunks. 
                          Consider using "Direct Upload" instead for better performance and reliability.
                        </Typography>
                      </Alert>
                    )}
                    
                    <Button 
                      variant="contained" 
                      onClick={handleChunkedUpload}
                      sx={{ mr: 1 }}
                    >
                      Upload {totalChunks > 1 ? 'in Chunks' : 'Now'}
                    </Button>
                    <Button variant="outlined" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </>
                )}

                {uploadMethod === 1 && selectedFile && (
                  <>
                    <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
                      File Selected!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      File size: {typeof selectedFile.size === 'number' ? (selectedFile.size / 1024 / 1024).toFixed(1) : '0.0'} MB
                    </Typography>
                    {typeof selectedFile.size === 'number' && selectedFile.size > 10 * 1024 * 1024 && (
                      <Typography variant="body2" color="warning.main">
                        (Large file - may take 2-5 minutes to upload and process)
                      </Typography>
                    )}
                    <Button 
                      variant="contained" 
                      onClick={handleDirectUpload}
                      sx={{ mr: 1 }}
                    >
                      Upload File
                    </Button>
                    <Button variant="outlined" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </>
                )}
              </>
            )}

            {uploading && (
              <>
                {cancelled ? (
                  <Typography variant="body2" sx={{ mb: 2, color: 'warning.main' }}>
                    Cancelling upload...
                  </Typography>
                ) : (
                  <>
                    {uploadMethod === 0 && (
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Uploading chunks {currentChunk} of {totalChunks} (parallel processing)...
                      </Typography>
                    )}
                    {uploadMethod === 1 && (
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {progress < 10 && 'Preparing upload...'}
                        {progress >= 10 && progress < 50 && `Uploading file to server (${selectedFile && typeof selectedFile.size === 'number' ? (selectedFile.size / 1024 / 1024).toFixed(1) : '0'} MB)...`}
                        {progress >= 50 && progress < 100 && 'Processing file on server...'}
                        {progress === 100 && 'Upload completed!'}
                      </Typography>
                    )}
                  </>
                )}
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {cancelled ? 'Cancelling...' : `${Math.round(progress)}% complete`}
                </Typography>
              </>
            )}

            {error && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {!uploading && parsedRows.length === 0 && !selectedFile && (
            <Button onClick={handleCancel}>Close</Button>
          )}
          {uploading && (
            <Button 
              onClick={handleCancel} 
              color="error"
              disabled={cancelled}
            >
              {cancelled ? 'Cancelling...' : 'Cancel Upload'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Success Dialog */}
      <UploadSuccessDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          setSuccessResult(null);
          onClose();
        }}
        result={successResult}
      />
    </>
  );
}

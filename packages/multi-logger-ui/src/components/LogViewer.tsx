import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent, TextField } from '@mui/material';
import { LogLevel, BrowserStorage } from '@ai-agent/core-sdk';
import { Logger } from '@ai-agent/multi-logger';

const storage = new BrowserStorage();

interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    metadata?: Record<string, unknown>;
}

interface LogViewerProps {
    logger: Logger;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logger }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [selectedTimeRange, setSelectedTimeRange] = useState<string>('recent');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [logLevel, setLogLevel] = useState<string>('all');

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            let fetchedLogs: LogEntry[] = [];
            
            if (selectedTimeRange === 'recent') {
                // Get current logs (most recent)
                fetchedLogs = await storage.getLogs();
            } else {
                // Get logs for custom time range
                fetchedLogs = await storage.getLogHistory(
                    startTime ? new Date(startTime).getTime() : undefined,
                    endTime ? new Date(endTime).getTime() : undefined
                );
            }

            // Apply log level filter
            if (logLevel !== 'all') {
                fetchedLogs = fetchedLogs.filter(log => log.level === logLevel);
            }

            // Sort logs by timestamp (newest first)
            fetchedLogs.sort((a, b) => b.timestamp - a.timestamp);
            
            setLogs(fetchedLogs);
        } catch (error) {
            logger.error('Error loading logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedTimeRange, startTime, endTime, logLevel, logger]);

    useEffect(() => {
        loadLogs();
        const interval = setInterval(loadLogs, 5000);
        return () => clearInterval(interval);
    }, [loadLogs]);

    const handleTimeRangeChange = (event: SelectChangeEvent) => {
        setSelectedTimeRange(event.target.value);
        // Reset custom time range when switching to recent
        if (event.target.value === 'recent') {
            setStartTime('');
            setEndTime('');
        }
    };

    const handleDownload = async () => {
        try {
            const logContent = logs.map(log => 
                `${new Date(log.timestamp).toISOString()} [${log.level}] ${log.message}${log.metadata ? ' ' + JSON.stringify(log.metadata) : ''}`
            ).join('\n');
            
            const blob = new Blob([logContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `logs-${new Date().toISOString()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            logger.info('Logs downloaded successfully');
        } catch (error) {
            logger.error('Error downloading logs:', error);
        }
    };

    const handleClear = async () => {
        try {
            await storage.clearLogs();
            setLogs([]);
            logger.info('Logs cleared successfully');
        } catch (error) {
            logger.error('Error clearing logs:', error);
        }
    };

    const handleCleanup = async () => {
        try {
            await storage.cleanupOldLogs(24 * 60 * 60 * 1000); // 24 hours
            loadLogs();
            logger.info('Logs cleaned up successfully');
        } catch (error) {
            logger.error('Error cleaning up logs:', error);
        }
    };

    const getLogLevelColor = (level: LogLevel) => {
        switch (level) {
            case LogLevel.DEBUG:
                return '#666';
            case LogLevel.INFO:
                return '#2196f3';
            case LogLevel.WARN:
                return '#ff9800';
            case LogLevel.ERROR:
                return '#f44336';
            default:
                return '#000';
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Time Range</InputLabel>
                    <Select
                        value={selectedTimeRange}
                        onChange={handleTimeRangeChange}
                        label="Time Range"
                    >
                        <MenuItem value="recent">Recent</MenuItem>
                        <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                </FormControl>

                {selectedTimeRange === 'custom' && (
                    <>
                        <TextField
                            type="datetime-local"
                            label="Start Time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            type="datetime-local"
                            label="End Time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </>
                )}

                <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Log Level</InputLabel>
                    <Select
                        value={logLevel}
                        onChange={(e) => setLogLevel(e.target.value)}
                        label="Log Level"
                    >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value={LogLevel.DEBUG}>Debug</MenuItem>
                        <MenuItem value={LogLevel.INFO}>Info</MenuItem>
                        <MenuItem value={LogLevel.WARN}>Warn</MenuItem>
                        <MenuItem value={LogLevel.ERROR}>Error</MenuItem>
                    </Select>
                </FormControl>

                <Button variant="contained" onClick={handleDownload}>
                    Download Logs
                </Button>
                <Button variant="outlined" onClick={handleClear}>
                    Clear Logs
                </Button>
                <Button variant="outlined" onClick={handleCleanup}>
                    Cleanup
                </Button>
            </Box>

            <Box
                sx={{
                    height: '400px',
                    overflow: 'auto',
                    border: '1px solid #ccc',
                    borderRadius: 1,
                    p: 2,
                    bgcolor: '#f5f5f5'
                }}
            >
                {isLoading ? (
                    <Box>Loading logs...</Box>
                ) : logs.length === 0 ? (
                    <Box>No logs available</Box>
                ) : (
                    logs.map((log, index) => (
                        <Box
                            key={index}
                            sx={{
                                mb: 1,
                                p: 1,
                                borderRadius: 1,
                                bgcolor: '#fff',
                                borderLeft: `4px solid ${getLogLevelColor(log.level)}`
                            }}
                        >
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Box sx={{ color: getLogLevelColor(log.level), fontWeight: 'bold' }}>
                                    [{log.level}]
                                </Box>
                                <Box>
                                    {new Date(log.timestamp).toLocaleString()}
                                </Box>
                            </Box>
                            <Box sx={{ mt: 0.5 }}>{log.message}</Box>
                            {log.metadata && (
                                <Box
                                    sx={{
                                        mt: 0.5,
                                        p: 1,
                                        bgcolor: '#f0f0f0',
                                        borderRadius: 1,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {JSON.stringify(log.metadata, null, 2)}
                                </Box>
                            )}
                        </Box>
                    ))
                )}
            </Box>
        </Box>
    );
}; 
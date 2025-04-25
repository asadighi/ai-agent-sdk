import React, { useState, useEffect } from 'react';
import { Box, Button, Select, MenuItem, TextField, Typography, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
import { LogLevel, type ILogger } from '@ai-agent/multi-logger/types';

interface LogViewerProps {
    logger: ILogger;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logger }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [timeRange, setTimeRange] = useState<string>('1h');
    const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.INFO);
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');

    useEffect(() => {
        loadLogs();
    }, [timeRange, logLevel, startTime, endTime]);

    const loadLogs = async () => {
        try {
            const logs = await logger.getLogs();
            setLogs(logs);
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    };

    const handleTimeRangeChange = (event: SelectChangeEvent<string>) => {
        setTimeRange(event.target.value);
    };

    const handleLogLevelChange = (event: SelectChangeEvent<LogLevel>) => {
        setLogLevel(event.target.value as LogLevel);
    };

    const handleDownload = async () => {
        try {
            const logs = await logger.getLogs();
            const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'logs.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading logs:', error);
        }
    };

    const handleClear = async () => {
        try {
            await logger.clear();
            setLogs([]);
        } catch (error) {
            console.error('Error clearing logs:', error);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl>
                    <InputLabel>Time Range</InputLabel>
                    <Select
                        value={timeRange}
                        onChange={handleTimeRangeChange}
                        label="Time Range"
                        inputProps={{ 'aria-label': 'Time Range' }}
                    >
                        <MenuItem value="1h">Last Hour</MenuItem>
                        <MenuItem value="24h">Last 24 Hours</MenuItem>
                        <MenuItem value="7d">Last 7 Days</MenuItem>
                        <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                </FormControl>

                {timeRange === 'custom' && (
                    <>
                        <TextField
                            type="datetime-local"
                            label="Start Time"
                            value={startTime}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            type="datetime-local"
                            label="End Time"
                            value={endTime}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </>
                )}

                <FormControl>
                    <InputLabel>Log Level</InputLabel>
                    <Select
                        value={logLevel}
                        onChange={handleLogLevelChange}
                        label="Log Level"
                        inputProps={{ 'aria-label': 'Log Level' }}
                    >
                        <MenuItem value={LogLevel.DEBUG}>Debug</MenuItem>
                        <MenuItem value={LogLevel.INFO}>Info</MenuItem>
                        <MenuItem value={LogLevel.WARN}>Warn</MenuItem>
                        <MenuItem value={LogLevel.ERROR}>Error</MenuItem>
                    </Select>
                </FormControl>

                <Button variant="contained" onClick={handleDownload} aria-label="Download Logs">
                    Download Logs
                </Button>
                <Button variant="contained" onClick={handleClear} aria-label="Clear Logs">
                    Clear Logs
                </Button>
            </Box>

            {logs.length === 0 ? (
                <Typography>No logs available</Typography>
            ) : (
                <Box sx={{ maxHeight: '500px', overflow: 'auto' }}>
                    <pre>{JSON.stringify(logs, null, 2)}</pre>
                </Box>
            )}
        </Box>
    );
}; 
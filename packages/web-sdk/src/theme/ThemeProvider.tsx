import React, { createContext, useContext } from 'react';
import { Theme } from './types';
import { defaultTheme } from './default';

const ThemeContext = createContext<Theme>(defaultTheme);

export interface ThemeProviderProps {
    theme?: Theme;
    children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    theme = defaultTheme,
    children
}) => {
    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const theme = useContext(ThemeContext);
    if (!theme) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return theme;
}; 
import React, { createContext, useContext } from 'react';
import { defaultTheme } from './default';
const ThemeContext = createContext(defaultTheme);
export const ThemeProvider = ({ theme = defaultTheme, children }) => {
    return (<ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>);
};
export const useTheme = () => {
    const theme = useContext(ThemeContext);
    if (!theme) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return theme;
};
//# sourceMappingURL=ThemeProvider.js.map
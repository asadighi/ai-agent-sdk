import React from 'react';
import { Theme } from './types';
export interface ThemeProviderProps {
    theme?: Theme;
    children: React.ReactNode;
}
export declare const ThemeProvider: React.FC<ThemeProviderProps>;
export declare const useTheme: () => Theme;
//# sourceMappingURL=ThemeProvider.d.ts.map
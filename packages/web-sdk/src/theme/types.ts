export interface ColorPalette {
    primary: string;
    secondary: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    background: string;
    surface: string;
    text: {
        primary: string;
        secondary: string;
        disabled: string;
    };
}

export interface Spacing {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
}

export interface Typography {
    fontFamily: string;
    fontSize: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    fontWeight: {
        regular: number;
        medium: number;
        bold: number;
    };
}

export interface AgentColors {
    active: string;
    offline: string;
    error: string;
    leader: string;
    follower: string;
    worker: string;
}

export interface Theme {
    colors: ColorPalette;
    spacing: Spacing;
    typography: Typography;
    agents: AgentColors;
    borderRadius: string;
    shadows: {
        sm: string;
        md: string;
        lg: string;
    };
} 
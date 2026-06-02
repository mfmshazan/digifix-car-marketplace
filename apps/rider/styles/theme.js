export const colors = {
    primary: '#0F172A',      // Sleek nearly black for premium feel
    primaryDark: '#020617',  
    primarySoft: '#F1F5F9',  
    secondary: '#3B82F6',    // Vibrant blue for accents/CTA
    secondarySoft: '#DBEAFE',
    accent: '#8B5CF6',       // Purple accent
    accentSoft: '#EDE9FE',
    danger: '#EF4444',
    dangerSoft: '#FEE2E2',
    warning: '#F59E0B',
    warningSoft: '#FEF3C7',
    info: '#0EA5E9',
    infoSoft: '#E0F2FE',
    background: '#F8FAFC',   // Crisp light gray/blue background
    backgroundAccent: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceMuted: '#F8FAFC',
    text: '#0F172A',         // Slate 900
    textSecondary: '#64748B',// Slate 500
    textMuted: '#94A3B8',    // Slate 400
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    success: '#10B981',
    successSoft: '#D1FAE5',
    disabled: '#CBD5E1',
    overlay: 'rgba(15, 23, 42, 0.4)',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
};

export const radii = {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    pill: 999,
};

export const typography = {
    hero: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.8,
    },
    h1: {
        fontSize: 30,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.6,
    },
    h2: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.4,
    },
    h3: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.2,
    },
    body: {
        fontSize: 15,
        lineHeight: 22,
        color: colors.text,
    },
    bodySmall: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.textSecondary,
    },
    caption: {
        fontSize: 12,
        lineHeight: 16,
        color: colors.textMuted,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
};

export const shadows = {
    small: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    medium: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 5,
    },
    large: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
    },
};

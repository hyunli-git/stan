// Apple Music-inspired Design System for STAN
// Based on Apple Music's visual language and interaction patterns

export const AppleMusicTheme = {
  // Colors - Apple Music Style
  colors: {
    // Primary Colors
    background: '#000000',          // Pure black background
    surface: '#1C1C1E',            // Dark surface (cards, sheets)
    surfaceSecondary: '#2C2C2E',   // Secondary surface
    
    // Text Colors
    primary: '#FFFFFF',            // Primary text (white)
    secondary: '#98989D',          // Secondary text (gray)
    tertiary: '#636366',           // Tertiary text (darker gray)
    
    // Accent Colors
    accent: '#FA2D92',             // Apple Music pink
    accentSecondary: '#FF6B35',    // Orange accent
    blue: '#007AFF',               // System blue
    green: '#34C759',              // System green
    red: '#FF3B30',                // System red
    
    // Interactive States
    separator: '#38383A',          // Separator lines
    fill: '#787880',               // Fill elements
    fillSecondary: '#787880',      // Secondary fill
    
    // Gradient overlays for cards
    gradients: {
      kpop: ['#FA2D92', '#FF6B35'],
      music: ['#FF6B35', '#FFD60A'],
      sports: ['#007AFF', '#34C759'],
      gaming: ['#BF5AF2', '#FA2D92'],
      movies: ['#FF9500', '#FA2D92'],
      default: ['#FA2D92', '#FF6B35']
    }
  },
  
  // Typography - Apple Music Style
  typography: {
    // Headlines
    largeTitle: {
      fontSize: 34,
      fontWeight: '700',
      letterSpacing: -0.4,
    },
    title1: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.4,
    },
    title2: {
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.26,
    },
    title3: {
      fontSize: 20,
      fontWeight: '600',
      letterSpacing: -0.45,
    },
    
    // Body Text
    headline: {
      fontSize: 17,
      fontWeight: '600',
      letterSpacing: -0.43,
    },
    body: {
      fontSize: 17,
      fontWeight: '400',
      letterSpacing: -0.43,
    },
    bodyEmphasized: {
      fontSize: 17,
      fontWeight: '600',
      letterSpacing: -0.43,
    },
    
    // Small Text
    callout: {
      fontSize: 16,
      fontWeight: '400',
      letterSpacing: -0.32,
    },
    subheadline: {
      fontSize: 15,
      fontWeight: '400',
      letterSpacing: -0.24,
    },
    footnote: {
      fontSize: 13,
      fontWeight: '400',
      letterSpacing: -0.08,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      letterSpacing: 0,
    },
    caption2: {
      fontSize: 11,
      fontWeight: '400',
      letterSpacing: 0.07,
    }
  },
  
  // Spacing - Apple Music Style
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    
    // Specific spacing for Apple Music patterns
    cardPadding: 16,
    sectionPadding: 20,
    screenPadding: 20,
    listItemPadding: 12,
    buttonPadding: 14,
  },
  
  // Border Radius - Apple Music Style
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    card: 12,
    button: 8,
    image: 8,
    sheet: 16,
  },
  
  // Shadows - Apple Music Style
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    }
  },
  
  // Component Styles - Apple Music Patterns
  components: {
    // Cards
    card: {
      backgroundColor: '#1C1C1E',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    
    // Buttons
    primaryButton: {
      backgroundColor: '#FA2D92',
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    
    secondaryButton: {
      backgroundColor: '#2C2C2E',
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: '#38383A',
    },
    
    // Navigation
    tabBar: {
      backgroundColor: '#1C1C1E',
      borderTopColor: '#38383A',
      borderTopWidth: 0.33,
    },
    
    header: {
      backgroundColor: '#000000',
      borderBottomColor: 'transparent',
      elevation: 0,
      shadowOpacity: 0,
    }
  }
};

// Helper functions for consistent styling
export const getGradientColors = (category: string) => {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('k-pop')) return AppleMusicTheme.colors.gradients.kpop;
  if (categoryLower.includes('music')) return AppleMusicTheme.colors.gradients.music;
  if (categoryLower.includes('sport')) return AppleMusicTheme.colors.gradients.sports;
  if (categoryLower.includes('gaming')) return AppleMusicTheme.colors.gradients.gaming;
  if (categoryLower.includes('movie') || categoryLower.includes('tv')) return AppleMusicTheme.colors.gradients.movies;
  return AppleMusicTheme.colors.gradients.default;
};

export const createTextStyle = (variant: keyof typeof AppleMusicTheme.typography, color: string = AppleMusicTheme.colors.primary) => ({
  ...AppleMusicTheme.typography[variant],
  color,
});

export const createShadowStyle = (variant: keyof typeof AppleMusicTheme.shadows) => ({
  ...AppleMusicTheme.shadows[variant],
});
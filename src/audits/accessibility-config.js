/**
 * Accessibility Audit Configuration
 * 
 * This file allows customization of accessibility audit settings
 */

export const ACCESSIBILITY_CONFIG = {
  // Custom components that handle accessibility properly
  accessibleComponents: [
    'ImageOnly',
    'AccessibleImage', 
    'ImageWithAlt',
    'ResponsiveImage',
    'OptimizedImage',
    'AccessibleImg',
    'ImgWithAlt',
    'Picture',
    'Figure',
    'AccessibleFigure'
  ],

  // Accessibility-related props that indicate proper handling
  accessibilityProps: [
    'imgSrc',
    'imgAlt', 
    'alt',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'accessibility',
    'accessible',
    'screenReaderText',
    'altText'
  ],

  // Patterns to ignore (components that are known to be accessible)
  ignorePatterns: [
    /<ImageOnly[^>]*imgSrc=[^>]*imgAlt=[^>]*>/gi,
    /<AccessibleImage[^>]*>/gi,
    /<ImageWithAlt[^>]*>/gi,
    /<ResponsiveImage[^>]*>/gi,
    /<OptimizedImage[^>]*>/gi
  ],

  // Severity levels for different issues
  severityLevels: {
    missing_alt: 'high',
    empty_alt: 'medium', 
    generic_alt: 'medium',
    multiple_h1: 'medium',
    empty_heading: 'low',
    missing_label: 'high',
    missing_aria: 'medium',
    keyboard_navigation: 'medium',
    color_contrast: 'medium',
    tab_order: 'medium'
  },

  // WCAG guidelines mapping
  wcagMapping: {
    missing_alt: '1.1.1',
    empty_alt: '1.1.1',
    generic_alt: '1.1.1',
    multiple_h1: '1.3.1',
    empty_heading: '1.3.1',
    missing_label: '3.3.2',
    missing_aria: '4.1.2',
    keyboard_navigation: '2.1.1',
    color_contrast: '1.4.3',
    tab_order: '2.4.3'
  }
};

/**
 * Get accessible components list
 */
export function getAccessibleComponents() {
  return ACCESSIBILITY_CONFIG.accessibleComponents;
}

/**
 * Get accessibility props list
 */
export function getAccessibilityProps() {
  return ACCESSIBILITY_CONFIG.accessibilityProps;
}

/**
 * Get ignore patterns
 */
export function getIgnorePatterns() {
  return ACCESSIBILITY_CONFIG.ignorePatterns;
}

/**
 * Check if a component is considered accessible
 */
export function isAccessibleComponent(componentName) {
  return ACCESSIBILITY_CONFIG.accessibleComponents.includes(componentName);
}

/**
 * Check if a line has accessibility props
 */
export function hasAccessibilityProps(line) {
  return ACCESSIBILITY_CONFIG.accessibilityProps.some(prop => 
    line.includes(`${prop}=`)
  );
}

/**
 * Check if a line should be ignored
 */
export function shouldIgnoreLine(line) {
  return ACCESSIBILITY_CONFIG.ignorePatterns.some(pattern => 
    pattern.test(line)
  );
} 
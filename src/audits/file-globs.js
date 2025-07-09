// Centralized globby file patterns for all audits

export const defaultJsFilePathPattern = [
  '**/*.{js,ts,jsx,tsx}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**',
  '!**/__dropins__/**',
  '!**/cypress/**',
  '!**/*.min.js',
];

export const defaultHtmlFilePathPattern = [
  '**/*.{html,js,ts,jsx,tsx}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**',
  '!**/__dropins__/**',
  '!**/cypress/**',
];

export const defaultScssFilePathPattern = [
  '**/*.{scss,less,css}',
  '!**/node_modules/**',
  '!**/.storybook/**',
  '!**/storybook/**',
  '!**/report/**',
  '!build/**',
  '!dist/**',
  '!coverage/**',
  '!.git/**',
  '!bin/**',
  '!**/__dropins__/**',
  '!**/cypress/**',
];

export const assetGlobs = [
  'public/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'assets/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'static/**/*.{png,jpg,jpeg,bmp,tiff,gif}',
  'src/assets/**/*.{png,jpg,jpeg,bmp,tiff,gif}'
];

// Add more as needed for CSS, JSON, etc. 
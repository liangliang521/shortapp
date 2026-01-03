// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Add extra node modules for workspace packages and React Native packages
config.resolver.extraNodeModules = {
  '@react-native/virtualized-lists': path.resolve(monorepoRoot, 'node_modules/@react-native/virtualized-lists'),
  '@vibecoding/analytics': path.resolve(monorepoRoot, 'packages/analytics'),
  '@vibecoding/api-client': path.resolve(monorepoRoot, 'packages/api-client'),
  '@vibecoding/ai-chat-core': path.resolve(monorepoRoot, 'packages/ai-chat-core'),
  '@vibecoding/web-rn-bridge': path.resolve(monorepoRoot, 'packages/bridge'),
};

// 4. Don't disable hierarchical lookup - it's needed for proper resolution
// config.resolver.disableHierarchicalLookup = true;

module.exports = config;


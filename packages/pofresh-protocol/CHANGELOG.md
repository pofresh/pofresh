# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-01-XX

### Added
- 🚀 **Complete modular refactoring** - Split monolithic code into focused modules
- 📦 **Multiple build formats** - Support for CommonJS, ES Modules, and UMD
- 🧪 **Comprehensive test suite** - Added Vitest testing framework with coverage
- 📝 **TypeScript definitions** - Full TypeScript support with detailed type definitions
- 🔧 **Modern build system** - Vite-based build pipeline with source maps
- 📚 **Enhanced documentation** - Complete API documentation with examples
- 🌐 **Cross-platform support** - Works in Node.js and browsers

### Changed
- **BREAKING**: Restructured internal module organization
- **BREAKING**: Updated build output structure
- Improved performance through optimized buffer operations
- Enhanced error handling and validation
- Modernized development workflow with ESLint and Prettier

### Technical Details

#### New Module Structure
- `lib/constants.js` - Protocol constants and type definitions
- `lib/buffer-utils.js` - Buffer manipulation utilities
- `lib/string-codec.js` - String encoding/decoding functions
- `lib/message-utils.js` - Message-specific utility functions
- `lib/package.js` - Package encoder/decoder
- `lib/message.js` - Message encoder/decoder
- `lib/protocol-core.js` - Core Protocol class
- `lib/index.js` - Main entry point

#### Build Outputs
- `dist/pofresh-protocol.cjs.js` - CommonJS format for Node.js
- `dist/pofresh-protocol.es.js` - ES Module format for modern bundlers
- `dist/pofresh-protocol.umd.js` - UMD format for browsers
- Source maps included for all formats

#### Development Tools
- Vitest for testing with watch mode and coverage
- Vite for building with optimized output
- ESLint for code quality
- Prettier for code formatting

### Migration Guide

For users upgrading from v1.x:

1. **No API changes** - All public APIs remain the same
2. **Import paths unchanged** - Continue using `require('pofresh-protocol')`
3. **New features available** - Access to individual modules if needed

```javascript
// v1.x and v2.x (unchanged)
const Protocol = require('pofresh-protocol');

// v2.x new capabilities (optional)
const { Package, Message } = require('pofresh-protocol');
const { strencode, strdecode } = require('pofresh-protocol');
```

## [1.x.x] - Previous Versions

### Legacy Features
- Basic package and message encoding/decoding
- String codec functionality
- Core protocol implementation

---

**Note**: This changelog starts from version 2.0.0. For earlier versions, please refer to the git history.
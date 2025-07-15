# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**pofresh** is a fast, scalable game server framework for Node.js based on pomelo. It provides a distributed multi-process architecture specifically designed for real-time multiplayer games and applications.

## Architecture

### Core Components
- **pofresh** (main package): Core framework with application lifecycle management
- **pofresh-cli**: Command-line interface for server management
- **pofresh-admin**: Administrative console and monitoring
- **pofresh-rpc**: Remote procedure call system with multiple transport protocols
- **pofresh-protocol**: Network protocol handling
- **pofresh-protobuf**: Protocol buffer support
- **pofresh-logger**: Logging utilities
- **pofresh-loader**: Dynamic module loading
- **pofresh-scheduler**: Job scheduling system
- **pofresh-monitor**: System and process monitoring

### Plugin Architecture
- **pofresh-http**: HTTP server integration
- **pofresh-globalchannel-plugin**: Global channel management
- **pofresh-status-plugin**: Online status management

### Server Types
- **Master**: Central coordination server
- **Connector**: Client connection handling
- **Backend**: Game logic and state management
- **Gate**: Load balancing and routing

## Development Commands

### Package Management
- `pnpm install` - Install dependencies
- `pnpm dev` - Start development mode (Turbo)
- `pnpm build` - Build all packages (Turbo)
- `pnpm clean` - Clean build artifacts

### Code Quality
- `pnpm run lint` - Lint all packages and plugins
- `pnpm run lint:fix` - Auto-fix linting issues
- `pnpm run format` - Format code with Prettier
- `pnpm run test` - Run tests (via Gulp)

### Security
- `pnpm run security:check` - Run security audit and linting
- `pnpm run audit` - Check for vulnerable dependencies

### Testing
- `npm test` - Run all tests (uses gulp + mocha + nyc)
- Test files are located in `/test/` directories within each package

## Project Structure

```
├── packages/           # Core framework packages
│   ├── pofresh/       # Main framework
│   ├── pofresh-cli/   # CLI tools
│   └── ...            # Other core packages
├── plugin/            # Optional plugins
│   ├── pofresh-http/
│   └── ...
├── template/          # Project templates (game-server, web-server)
└── turbo.json         # Turbo build configuration
```

## Key Files

- **packages/pofresh/lib/application.js:39** - Application initialization
- **packages/pofresh/lib/pofresh.js:72** - Main framework entry point
- **packages/pofresh/template/game-server/** - Template for new projects
- **gulpfile.js:21** - Test runner configuration

## Environment Requirements
- Node.js >= 16.0.0
- pnpm >= 8.0.0

## Common Development Tasks

### Starting a New Project
1. Use CLI: `pofresh init your-project`
2. Follow template structure in `template/game-server/`

### Adding Components
- Components go in `packages/pofresh/lib/components/`
- Auto-loaded by framework

### Adding Plugins
- Plugins go in `plugin/` directory
- Use existing plugins as templates
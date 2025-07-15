# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the official website and documentation system for **Pofresh**, a fast and scalable game server framework for Node.js. The website is built with **Astro 4.x** + **Vue 3.x** + **Tailwind CSS** and serves as the primary documentation hub for the framework.

## Key Architecture

- **Static Site Generator**: Astro 4.x for optimal performance
- **Frontend Framework**: Vue 3.x for interactive components
- **Styling**: Tailwind CSS with custom design tokens
- **Content**: Markdown-based with frontmatter for metadata
- **Build**: Vite for fast development and optimized production builds

## Development Commands

```bash
# Development
npm run dev                    # Start dev server at http://localhost:4321
npm run dev -- --host 0.0.0.0  # Start dev server accessible from network

# Building
npm run build                  # Build static site to dist/
npm run preview               # Preview built site
npm run type-check            # Type checking with Astro

# Code Quality
npm run lint                  # Lint all files
npm run format                # Format code with Prettier

# Content Management
npm run astro dev             # Direct Astro CLI access
npm run astro build           # Direct build command
```

## Project Structure

```
src/
├── components/           # Astro/Vue components
│   ├── BaseHead.astro  # SEO and meta tags
│   ├── Navigation.astro  # Main navigation
│   └── DocsSidebar.astro # Documentation sidebar
├── content/              # Markdown content
│   ├── docs/            # Documentation pages
│   ├── tutorials/       # Tutorial content
│   └── config.ts        # Content collection schema
├── layouts/             # Page layouts
│   └── Layout.astro     # Base layout
├── pages/               # Route pages
│   ├── index.astro      # Homepage
│   ├── docs/            # Documentation routes
│   ├── tutorials/       # Tutorial routes
│   └── blog/            # Blog routes
└── styles/              # Global styles
    └── global.css       # Tailwind base styles
```

## Content Collection Schema

Content uses frontmatter with these required fields:
- **docs**: `title`, `description`, `category`, `difficulty`
- **tutorials**: `title`, `description`, `level`, `estimatedTime`, `technologies`
- **blog**: `title`, `description`, `date`, `author`, `category`

## Development Workflow

1. **Content Creation**: Add `.md` files to appropriate `src/content/` subdirectories
2. **Component Development**: Use `.astro` for static content, `.vue` for interactive features
3. **Styling**: Use Tailwind utility classes, extend in `tailwind.config.mjs`
4. **Testing**: Build and preview locally before deployment

## Deployment

The site is configured for Vercel deployment:
- `npm run build` generates optimized static files
- `dist/` contains the production-ready site
- GitHub Actions workflow in `.github/workflows/deploy.yml`

## Key Files

- `astro.config.mjs`: Astro configuration with Vue, Tailwind, and sitemap
- `tailwind.config.mjs`: Custom theme colors and font configuration
- `src/content/config.ts`: Content collection schemas and validation
- `src/styles/global.css`: Global styles and Tailwind directives
# Web Version Documentation

## Overview

The Project Time Tracker now includes a web version that runs entirely in the browser. This version is automatically deployed to GitHub Pages and provides a demo of all features without requiring any installation.

## Live Demo

🌐 **[Try the Web Demo](https://doumdi.github.io/project-time-tracker/)**

## How It Works

### Architecture

The web version uses a different architecture than the desktop version:

1. **sql.js**: Instead of Node.js sqlite3, we use sql.js which is a JavaScript port of SQLite that runs in the browser using WebAssembly
2. **In-Memory Database**: All data is stored in browser memory (not persistent)
3. **Demo Mode**: Automatically populated with realistic sample data
4. **Browser APIs**: All Electron APIs are shimmed with browser-compatible implementations

### Key Files

- `src/web-preload.js` - Browser-compatible shim for Electron APIs
- `src/database/populate-demo-data-web.js` - Web version of demo data population
- `src/app/index-web.js` - Web-specific entry point
- `src/app/index-web.html` - Web-specific HTML template
- `webpack.web.config.js` - Webpack configuration for web build

### Building the Web Version

```bash
npm run build:web
```

This creates a `dist-web/` directory with all static files ready for deployment.

### Deployment

The web version is automatically deployed to GitHub Pages when code is pushed to the main branch. The workflow is defined in `.github/workflows/deploy_github_pages.yml`.

#### Manual Deployment

You can also trigger deployment manually from the GitHub Actions tab.

## Features in Web Version

### Supported Features

All core features work in the web version:
- ✅ Project management
- ✅ Time tracking
- ✅ Task management
- ✅ Time entries
- ✅ Calendar view
- ✅ Charts and analytics
- ✅ Reports
- ✅ Office presence tracking (with demo data)
- ✅ Settings

### Limitations

Some features are not available in the web version:
- ❌ Database backup/restore (no file system access)
- ❌ BLE device scanning (no Bluetooth API)
- ❌ MCP server (no server-side components)
- ❌ Persistent data (data is lost on page refresh)

These limitations are by design to keep the web version simple and focused on demonstrating the application's features.

## Technical Details

### Dependencies

- **sql.js**: JavaScript SQLite implementation
- **sql.js WASM**: Loaded from CDN (https://sql.js.org/dist/)

### Browser Compatibility

The web version works in all modern browsers that support:
- ES6+ JavaScript
- WebAssembly
- IndexedDB (for potential future persistence)

Tested on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

### Performance

The web version is optimized for performance:
- Code splitting for faster initial load
- Lazy loading of components
- Minified and compressed assets
- Total bundle size: ~1.3 MB (uncompressed)

### Data Privacy

All data in the web version:
- Never leaves the browser
- Is not sent to any server
- Is stored only in memory
- Is completely cleared on page refresh

## Development

### Local Testing

To test the web version locally:

```bash
# Build the web version
npm run build:web

# Serve the files (using any static server)
cd dist-web
python3 -m http.server 8080

# Open http://localhost:8080 in your browser
```

### Debugging

The web version includes console logging:
- `[WEB MODE]` - Initialization and database operations
- Check browser console for any errors

## Future Enhancements

Potential improvements for the web version:
1. **IndexedDB persistence** - Save data between sessions
2. **Service Worker** - Offline support
3. **Progressive Web App** - Install as app
4. **Export/Import** - Download/upload data as JSON
5. **URL state** - Share specific views via URL

## Troubleshooting

### Build Issues

If the build fails:
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear build cache: `rm -rf dist-web`
3. Check Node.js version: `node --version` (should be 18+)

### Runtime Issues

If the web version doesn't work:
1. Check browser console for errors
2. Ensure JavaScript is enabled
3. Try a different browser
4. Clear browser cache

### Deployment Issues

If GitHub Pages deployment fails:
1. Check GitHub Actions logs
2. Verify Pages is enabled in repository settings
3. Ensure workflow has proper permissions
4. Try manual deployment from Actions tab

## Contributing

When contributing to the web version:
1. Test both desktop and web versions
2. Ensure no Node.js-specific APIs are used in shared code
3. Update this documentation for any new features or changes
4. Test in multiple browsers before submitting PR

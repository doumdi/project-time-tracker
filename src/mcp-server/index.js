#!/usr/bin/env node

// This file is deprecated - the MCP server now runs in-process with the main Electron application
// If you need to use the MCP server as a standalone process, use one of the server classes directly

const { TimeTrackerHttpMCPServer } = require('./http-server.js');
const { TimeTrackerMCPServer } = require('./server.js');

// For backward compatibility, export the classes
module.exports = {
  TimeTrackerHttpMCPServer,
  TimeTrackerMCPServer
};

// Only run as standalone if this file is executed directly
if (require.main === module) {
  console.error('This MCP server now runs in-process with the main Electron application.');
  console.error('The standalone server mode is deprecated.');
  console.error('Please start the application normally to use the MCP server.');
  process.exit(1);
}
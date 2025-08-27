#!/usr/bin/env node

const { TimeTrackerHttpMCPServer } = require('./http-server.js');
const database = require('../database/db.js');

async function main() {
  try {
    // Get port from command line arguments or environment variable
    const port = process.argv[2] ? parseInt(process.argv[2]) : (process.env.MCP_SERVER_PORT ? parseInt(process.env.MCP_SERVER_PORT) : 3001);
    
    if (isNaN(port) || port < 1024 || port > 65535) {
      console.error('Invalid port number. Must be between 1024 and 65535.');
      process.exit(1);
    }
    
    // Initialize database first
    await database.initDatabase();
    
    // Create and run HTTP MCP server
    const server = new TimeTrackerHttpMCPServer(database, port);
    await server.run();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Run the server if this file is executed directly
if (require.main === module) {
  main();
}
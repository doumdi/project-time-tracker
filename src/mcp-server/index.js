#!/usr/bin/env node

const { TimeTrackerMCPServer } = require('./server.js');
const database = require('../database/db.js');

async function main() {
  try {
    // Initialize database first
    await database.initDatabase();
    
    // Create and run MCP server
    const server = new TimeTrackerMCPServer(database);
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
#!/usr/bin/env node

/**
 * Simple HTTP MCP Server Test Script
 * 
 * This script tests the basic functionality of the HTTP MCP server
 * without requiring the full Electron application to be running.
 */

const express = require('express');
const http = require('http');

// Mock database for testing
const mockDatabase = {
  getProjects: async () => [
    { id: 1, name: 'Test Project', description: 'A test project', color: '#4CAF50' },
    { id: 2, name: 'Another Project', description: 'Another test project', color: '#2196F3' }
  ],
  addProject: async (args) => ({ id: 3, ...args, created_at: new Date().toISOString() }),
  updateProject: async (args) => ({ ...args, updated_at: new Date().toISOString() }),
  deleteProject: async (id) => ({ success: true, deleted_id: id }),
  getTasks: async () => [],
  getTimeEntries: async () => [],
  getOfficePresence: async () => [],
  getBleDevices: async () => [],
  getTimeSummary: async () => ({ total_hours: 0, projects: [] }),
  getOfficePresenceSummary: async () => ({ total_hours: 0, days: [] })
};

// Import the HTTP MCP server
const { TimeTrackerHttpMCPServer } = require('../src/mcp-server/http-server.js');

async function runTest() {
  const port = 3002; // Use a different port for testing
  
  console.log('Starting HTTP MCP Server test...');
  
  try {
    // Create and start the server
    const server = new TimeTrackerHttpMCPServer(mockDatabase, port);
    const httpServer = await server.run();
    
    console.log(`✓ Server started on port ${port}`);
    
    // Wait a moment for the server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test health endpoint
    console.log('\nTesting health endpoint...');
    await testHealthEndpoint(port);
    
    // Test MCP endpoint
    console.log('\nTesting MCP endpoint...');
    await testMcpEndpoint(port);
    
    console.log('\n✓ All tests passed!');
    
    // Close the server
    await server.close();
    console.log('✓ Server closed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function testHealthEndpoint(port) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/health',
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Health check failed with status ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`  ✓ Health check response:`, response);
          
          if (response.status !== 'ok') {
            reject(new Error('Health check status is not ok'));
            return;
          }
          
          if (response.port !== port) {
            reject(new Error(`Health check port mismatch: expected ${port}, got ${response.port}`));
            return;
          }
          
          resolve();
        } catch (e) {
          reject(new Error(`Failed to parse health response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Health check request failed: ${err.message}`));
    });

    req.setTimeout(5000, () => {
      reject(new Error('Health check request timed out'));
    });

    req.end();
  });
}

async function testMcpEndpoint(port) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/mcp',
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
    };

    const req = http.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`MCP endpoint failed with status ${res.statusCode}`));
        return;
      }
      
      console.log(`  ✓ MCP endpoint status: ${res.statusCode}`);
      console.log(`  ✓ Content-Type: ${res.headers['content-type']}`);
      
      let receivedData = false;
      
      res.on('data', (chunk) => {
        const data = chunk.toString();
        console.log(`  ✓ Received SSE data: ${data.substring(0, 100)}...`);
        receivedData = true;
      });
      
      res.on('end', () => {
        if (receivedData) {
          console.log('  ✓ SSE stream ended normally');
          resolve();
        } else {
          reject(new Error('No data received from MCP endpoint'));
        }
      });
      
      // Close after a moment
      setTimeout(() => {
        res.destroy();
        if (receivedData) {
          resolve();
        } else {
          reject(new Error('MCP endpoint test timed out'));
        }
      }, 2000);
    });

    req.on('error', (err) => {
      reject(new Error(`MCP endpoint request failed: ${err.message}`));
    });

    req.setTimeout(5000, () => {
      reject(new Error('MCP endpoint request timed out'));
    });

    req.end();
  });
}

// Run the test if this file is executed directly
if (require.main === module) {
  runTest();
}

module.exports = { runTest };
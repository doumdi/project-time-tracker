const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');

class TimeTrackerHttpMCPServer {
  constructor(database, port = 3001) {
    this.database = database;
    this.port = port;
    this.app = express();
    this.transports = {}; // Store transports by session ID
    
    this.server = new Server(
      {
        name: 'project-time-tracker',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupExpress();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupExpress() {
    // CORS middleware for MCP clients (similar to examples)
    this.app.use((req, res, next) => {
      // Allow all origins for local development - this is standard for MCP servers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Mcp-Session-Id');
      res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
      res.header('Cache-Control', 'no-cache');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    this.app.use(express.json());
    
    // SSE endpoint for establishing the stream
    this.app.get('/mcp', async (req, res) => {
      console.log('Received GET request to /mcp (establishing SSE stream)');
      try {
        // Create a new SSE transport for the client
        const transport = new SSEServerTransport('/messages', res);
        
        // Store the transport by session ID
        const sessionId = transport.sessionId;
        this.transports[sessionId] = transport;
        
        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
          console.log(`SSE transport closed for session ${sessionId}`);
          delete this.transports[sessionId];
        };
        
        // Connect the transport to the MCP server
        await this.server.connect(transport);
        console.log(`Established SSE stream with session ID: ${sessionId}`);
      } catch (error) {
        console.error('Error establishing SSE stream:', error);
        if (!res.headersSent) {
          res.status(500).send('Error establishing SSE stream');
        }
      }
    });
    
    // Messages endpoint for receiving client JSON-RPC requests
    this.app.post('/messages', async (req, res) => {
      console.log('Received POST request to /messages');
      
      // Extract session ID from URL query parameter
      const sessionId = req.query.sessionId;
      if (!sessionId) {
        console.error('No session ID provided in request URL');
        res.status(400).send('Missing sessionId parameter');
        return;
      }
      
      const transport = this.transports[sessionId];
      if (!transport) {
        console.error(`No active transport found for session ID: ${sessionId}`);
        res.status(404).send('Session not found');
        return;
      }
      
      try {
        // Handle the POST message with the transport
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        console.error('Error handling request:', error);
        if (!res.headersSent) {
          res.status(500).send('Error handling request');
        }
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        server: 'project-time-tracker-mcp',
        version: '1.0.0',
        port: this.port,
        endpoints: {
          mcp: '/mcp',
          messages: '/messages'
        }
      });
    });
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Project tools
          {
            name: 'get_projects',
            description: 'Get all projects',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'add_project',
            description: 'Add a new project',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Project name' },
                description: { type: 'string', description: 'Project description' },
                color: { type: 'string', description: 'Project color (hex code)', default: '#4CAF50' },
              },
              required: ['name'],
            },
          },
          {
            name: 'update_project',
            description: 'Update an existing project',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Project ID' },
                name: { type: 'string', description: 'Project name' },
                description: { type: 'string', description: 'Project description' },
                color: { type: 'string', description: 'Project color (hex code)' },
              },
              required: ['id'],
            },
          },
          {
            name: 'delete_project',
            description: 'Delete a project',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Project ID' },
              },
              required: ['id'],
            },
          },

          // Task tools
          {
            name: 'get_tasks',
            description: 'Get tasks with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Filter by project ID' },
                active: { type: 'boolean', description: 'Filter by active status' },
              },
            },
          },
          {
            name: 'add_task',
            description: 'Add a new task',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Project ID' },
                name: { type: 'string', description: 'Task name' },
                description: { type: 'string', description: 'Task description' },
                priority: { type: 'string', description: 'Task priority (low, medium, high)', default: 'medium' },
                status: { type: 'string', description: 'Task status (pending, in_progress, completed)', default: 'pending' },
              },
              required: ['project_id', 'name'],
            },
          },
          {
            name: 'update_task',
            description: 'Update an existing task',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Task ID' },
                project_id: { type: 'number', description: 'Project ID' },
                name: { type: 'string', description: 'Task name' },
                description: { type: 'string', description: 'Task description' },
                priority: { type: 'string', description: 'Task priority (low, medium, high)' },
                status: { type: 'string', description: 'Task status (pending, in_progress, completed)' },
              },
              required: ['id'],
            },
          },
          {
            name: 'delete_task',
            description: 'Delete a task',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Task ID' },
              },
              required: ['id'],
            },
          },
          {
            name: 'set_active_task',
            description: 'Set the active task',
            inputSchema: {
              type: 'object',
              properties: {
                task_id: { type: 'number', description: 'Task ID to set as active' },
              },
              required: ['task_id'],
            },
          },
          {
            name: 'get_active_task',
            description: 'Get the currently active task',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },

          // Time entries tools
          {
            name: 'get_time_entries',
            description: 'Get time entries with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Filter by project ID' },
                start_date: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
                end_date: { type: 'string', description: 'End date filter (YYYY-MM-DD)' },
                limit: { type: 'number', description: 'Limit number of results' },
              },
            },
          },
          {
            name: 'add_time_entry',
            description: 'Add a new time entry',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: { type: 'number', description: 'Project ID' },
                description: { type: 'string', description: 'Entry description' },
                start_time: { type: 'string', description: 'Start time (ISO format)' },
                end_time: { type: 'string', description: 'End time (ISO format)' },
                duration: { type: 'number', description: 'Duration in minutes' },
              },
              required: ['project_id', 'start_time'],
            },
          },
          {
            name: 'update_time_entry',
            description: 'Update an existing time entry',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Time entry ID' },
                project_id: { type: 'number', description: 'Project ID' },
                description: { type: 'string', description: 'Entry description' },
                start_time: { type: 'string', description: 'Start time (ISO format)' },
                end_time: { type: 'string', description: 'End time (ISO format)' },
                duration: { type: 'number', description: 'Duration in minutes' },
              },
              required: ['id'],
            },
          },
          {
            name: 'delete_time_entry',
            description: 'Delete a time entry',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Time entry ID' },
              },
              required: ['id'],
            },
          },

          // Office presence tools
          {
            name: 'get_office_presence',
            description: 'Get office presence records with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                start_date: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
                end_date: { type: 'string', description: 'End date filter (YYYY-MM-DD)' },
                limit: { type: 'number', description: 'Limit number of results' },
              },
            },
          },
          {
            name: 'add_office_presence',
            description: 'Add a new office presence record',
            inputSchema: {
              type: 'object',
              properties: {
                start_time: { type: 'string', description: 'Start time (ISO format)' },
                end_time: { type: 'string', description: 'End time (ISO format)' },
                duration: { type: 'number', description: 'Duration in minutes' },
                device_count: { type: 'number', description: 'Number of devices detected' },
              },
              required: ['start_time'],
            },
          },
          {
            name: 'update_office_presence',
            description: 'Update an existing office presence record',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Presence record ID' },
                start_time: { type: 'string', description: 'Start time (ISO format)' },
                end_time: { type: 'string', description: 'End time (ISO format)' },
                duration: { type: 'number', description: 'Duration in minutes' },
                device_count: { type: 'number', description: 'Number of devices detected' },
              },
              required: ['id'],
            },
          },
          {
            name: 'delete_office_presence',
            description: 'Delete an office presence record',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Presence record ID' },
              },
              required: ['id'],
            },
          },

          // BLE devices tools
          {
            name: 'get_ble_devices',
            description: 'Get all BLE devices',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'add_ble_device',
            description: 'Add a new BLE device',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Device name' },
                mac_address: { type: 'string', description: 'MAC address' },
                device_type: { type: 'string', description: 'Device type' },
                monitored: { type: 'boolean', description: 'Whether device is monitored', default: true },
              },
              required: ['name', 'mac_address'],
            },
          },
          {
            name: 'update_ble_device',
            description: 'Update an existing BLE device',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Device ID' },
                name: { type: 'string', description: 'Device name' },
                mac_address: { type: 'string', description: 'MAC address' },
                device_type: { type: 'string', description: 'Device type' },
                monitored: { type: 'boolean', description: 'Whether device is monitored' },
              },
              required: ['id'],
            },
          },
          {
            name: 'delete_ble_device',
            description: 'Delete a BLE device',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Device ID' },
              },
              required: ['id'],
            },
          },

          // Reports tools
          {
            name: 'get_time_summary',
            description: 'Get time summary report',
            inputSchema: {
              type: 'object',
              properties: {
                start_date: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
                end_date: { type: 'string', description: 'End date filter (YYYY-MM-DD)' },
                project_id: { type: 'number', description: 'Filter by project ID' },
                group_by: { type: 'string', description: 'Group by (day, week, month, project)' },
              },
            },
          },
          {
            name: 'get_office_presence_summary',
            description: 'Get office presence summary report',
            inputSchema: {
              type: 'object',
              properties: {
                start_date: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
                end_date: { type: 'string', description: 'End date filter (YYYY-MM-DD)' },
                group_by: { type: 'string', description: 'Group by (day, week, month)' },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Project operations
          case 'get_projects':
            return await this.handleGetProjects();
          case 'add_project':
            return await this.handleAddProject(args);
          case 'update_project':
            return await this.handleUpdateProject(args);
          case 'delete_project':
            return await this.handleDeleteProject(args);

          // Task operations
          case 'get_tasks':
            return await this.handleGetTasks(args);
          case 'add_task':
            return await this.handleAddTask(args);
          case 'update_task':
            return await this.handleUpdateTask(args);
          case 'delete_task':
            return await this.handleDeleteTask(args);
          case 'set_active_task':
            return await this.handleSetActiveTask(args);
          case 'get_active_task':
            return await this.handleGetActiveTask();

          // Time entry operations
          case 'get_time_entries':
            return await this.handleGetTimeEntries(args);
          case 'add_time_entry':
            return await this.handleAddTimeEntry(args);
          case 'update_time_entry':
            return await this.handleUpdateTimeEntry(args);
          case 'delete_time_entry':
            return await this.handleDeleteTimeEntry(args);

          // Office presence operations
          case 'get_office_presence':
            return await this.handleGetOfficePresence(args);
          case 'add_office_presence':
            return await this.handleAddOfficePresence(args);
          case 'update_office_presence':
            return await this.handleUpdateOfficePresence(args);
          case 'delete_office_presence':
            return await this.handleDeleteOfficePresence(args);

          // BLE device operations
          case 'get_ble_devices':
            return await this.handleGetBleDevices();
          case 'add_ble_device':
            return await this.handleAddBleDevice(args);
          case 'update_ble_device':
            return await this.handleUpdateBleDevice(args);
          case 'delete_ble_device':
            return await this.handleDeleteBleDevice(args);

          // Report operations
          case 'get_time_summary':
            return await this.handleGetTimeSummary(args);
          case 'get_office_presence_summary':
            return await this.handleGetOfficePresenceSummary(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to execute tool ${name}: ${error.message}`
        );
      }
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.close();
      process.exit(0);
    });
  }

  // Project handlers
  async handleGetProjects() {
    const projects = await this.database.getProjects();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  }

  async handleAddProject(args) {
    const project = await this.database.addProject(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(project, null, 2),
        },
      ],
    };
  }

  async handleUpdateProject(args) {
    const project = await this.database.updateProject(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(project, null, 2),
        },
      ],
    };
  }

  async handleDeleteProject(args) {
    const result = await this.database.deleteProject(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  // Task handlers
  async handleGetTasks(args = {}) {
    const tasks = await this.database.getTasks(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tasks, null, 2),
        },
      ],
    };
  }

  async handleAddTask(args) {
    const task = await this.database.addTask(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  }

  async handleUpdateTask(args) {
    const task = await this.database.updateTask(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  }

  async handleDeleteTask(args) {
    const result = await this.database.deleteTask(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async handleSetActiveTask(args) {
    const result = await this.database.setActiveTask(args.task_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async handleGetActiveTask() {
    const task = await this.database.getActiveTask();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(task, null, 2),
        },
      ],
    };
  }

  // Time entry handlers
  async handleGetTimeEntries(args = {}) {
    const entries = await this.database.getTimeEntries(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(entries, null, 2),
        },
      ],
    };
  }

  async handleAddTimeEntry(args) {
    const entry = await this.database.addTimeEntry(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(entry, null, 2),
        },
      ],
    };
  }

  async handleUpdateTimeEntry(args) {
    const entry = await this.database.updateTimeEntry(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(entry, null, 2),
        },
      ],
    };
  }

  async handleDeleteTimeEntry(args) {
    const result = await this.database.deleteTimeEntry(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  // Office presence handlers
  async handleGetOfficePresence(args = {}) {
    const presence = await this.database.getOfficePresence(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(presence, null, 2),
        },
      ],
    };
  }

  async handleAddOfficePresence(args) {
    const presence = await this.database.addOfficePresence(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(presence, null, 2),
        },
      ],
    };
  }

  async handleUpdateOfficePresence(args) {
    const presence = await this.database.updateOfficePresence(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(presence, null, 2),
        },
      ],
    };
  }

  async handleDeleteOfficePresence(args) {
    const result = await this.database.deleteOfficePresence(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  // BLE device handlers
  async handleGetBleDevices() {
    const devices = await this.database.getBleDevices();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(devices, null, 2),
        },
      ],
    };
  }

  async handleAddBleDevice(args) {
    const device = await this.database.addBleDevice(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(device, null, 2),
        },
      ],
    };
  }

  async handleUpdateBleDevice(args) {
    const device = await this.database.updateBleDevice(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(device, null, 2),
        },
      ],
    };
  }

  async handleDeleteBleDevice(args) {
    const result = await this.database.deleteBleDevice(args.id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  // Report handlers
  async handleGetTimeSummary(args = {}) {
    const summary = await this.database.getTimeSummary(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  async handleGetOfficePresenceSummary(args = {}) {
    const summary = await this.database.getOfficePresenceSummary(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  async run() {
    return new Promise((resolve, reject) => {
      const httpServer = this.app.listen(this.port, 'localhost', (error) => {
        if (error) {
          console.error(`Failed to start MCP HTTP server on port ${this.port}:`, error);
          reject(error);
        } else {
          console.error(`Project Time Tracker MCP server listening on port ${this.port}`);
          console.error(`Server running on port ${this.port}`);
          console.error(`MCP endpoint: http://localhost:${this.port}/mcp`);
          console.error(`Health check: http://localhost:${this.port}/health`);
          resolve(httpServer);
        }
      });

      this.httpServer = httpServer;
    });
  }

  async close() {
    console.log('Shutting down MCP HTTP server...');
    
    // Close all active transports
    for (const sessionId in this.transports) {
      try {
        console.log(`Closing transport for session ${sessionId}`);
        await this.transports[sessionId].close();
        delete this.transports[sessionId];
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }

    // Close HTTP server
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          console.log('MCP HTTP server closed');
          resolve();
        });
      });
    }
  }
}

module.exports = { TimeTrackerHttpMCPServer };
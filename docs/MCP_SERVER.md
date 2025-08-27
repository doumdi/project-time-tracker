# Project Time Tracker - MCP Server Documentation

## Overview

The Project Time Tracker includes an optional Model Context Protocol (MCP) server that exposes all application functionalities to AI systems. This allows AI assistants to interact with your time tracking data programmatically via HTTP endpoints.

## What is MCP?

The Model Context Protocol (MCP) is a standard protocol that allows AI systems to connect to and interact with external applications and data sources. By enabling the MCP server in Project Time Tracker, you allow AI assistants to:

- Read your projects, tasks, time entries, and reports
- Create, update, and delete data
- Generate reports and analytics
- Automate time tracking workflows

## Security Considerations

⚠️ **IMPORTANT SECURITY NOTICE** ⚠️

The MCP server provides **full read and write access** to all your time tracking data via HTTP endpoints. Only enable this feature if you:

1. Understand the security implications
2. Trust the AI systems that will connect to it
3. Are comfortable with AI assistants having access to your data
4. Are running the application in a secure environment

The server runs locally on your machine (localhost only) and does not expose data over the internet by default.

## Enabling the MCP Server

1. Open Project Time Tracker
2. Navigate to Settings (⚙️ Settings)
3. Scroll down to the "MCP Server" section
4. Check the "Enable MCP Server" checkbox
5. Optionally configure the port (default: 3001)
6. The server will start automatically

## Architecture

The MCP server runs **in-process** with the main Electron application, sharing the same database connection and using Inter-Process Communication (IPC) for all database operations. This ensures:

- **Single Process**: No separate server processes are spawned
- **Shared Database**: UI and MCP server use the same SQLite database connection
- **Consistent Data**: All operations go through the same IPC layer
- **Better Performance**: Reduced overhead from process communication
- **Unified Resource Management**: Proper cleanup and shutdown handling

When enabled, the server runs on your local machine using HTTP with Server-Sent Events (SSE) transport.

**Server Endpoints:**
- Main MCP endpoint: `http://localhost:PORT/mcp`
- Health check: `http://localhost:PORT/health`
- Messages endpoint: `http://localhost:PORT/messages`

## Configuration

### Port Settings

You can configure the port number for the MCP server:

1. In Settings, find the "MCP Server Port" field
2. Enter a port number between 1024-65535 (default: 3001)
3. If the server is running, it will restart automatically with the new port

**Note:** Make sure the chosen port is not already in use by another application.

## Available Operations

The MCP server exposes the following capabilities:

### Projects
- `get_projects` - Get all projects
- `add_project` - Add a new project
- `update_project` - Update an existing project
- `delete_project` - Delete a project

### Tasks
- `get_tasks` - Get tasks with optional filters
- `add_task` - Add a new task
- `update_task` - Update an existing task
- `delete_task` - Delete a task
- `set_active_task` - Set the active task
- `get_active_task` - Get the currently active task

### Time Entries
- `get_time_entries` - Get time entries with optional filters
- `add_time_entry` - Add a new time entry
- `update_time_entry` - Update an existing time entry
- `delete_time_entry` - Delete a time entry

### Office Presence
- `get_office_presence` - Get office presence records
- `add_office_presence` - Add a new office presence record
- `update_office_presence` - Update an existing office presence record
- `delete_office_presence` - Delete an office presence record

### BLE Devices
- `get_ble_devices` - Get all BLE devices
- `add_ble_device` - Add a new BLE device
- `update_ble_device` - Update an existing BLE device
- `delete_ble_device` - Delete a BLE device

### Reports
- `get_time_summary` - Get time summary report
- `get_office_presence_summary` - Get office presence summary report

## Operation Parameters

Each operation accepts specific parameters. Here are some examples:

### Adding a Project
```json
{
  "name": "My New Project",
  "description": "Description of the project",
  "color": "#4CAF50"
}
```

### Adding a Time Entry
```json
{
  "project_id": 1,
  "description": "Working on feature X",
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": "2024-01-15T11:30:00Z",
  "duration": 150
}
```

### Getting Time Entries with Filters
```json
{
  "project_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "limit": 100
}
```

## Data Formats

### Dates and Times
- Dates: `YYYY-MM-DD` format (e.g., `2024-01-15`)
- Times: ISO 8601 format (e.g., `2024-01-15T09:00:00Z`)
- Duration: Integer in minutes

### Response Format
All operations return data in JSON format with the following structure:
```json
{
  "content": [
    {
      "type": "text",
      "text": "JSON data as string"
    }
  ]
}
```

## Example Use Cases

### AI Assistant Integration
An AI assistant could:
1. Ask "How much time did I spend on Project X last week?"
2. Automatically create time entries based on calendar events
3. Generate weekly reports with insights
4. Suggest optimal task scheduling based on historical data

### Workflow Automation
The MCP server enables:
1. Automatic time tracking based on computer activity
2. Integration with project management tools
3. Batch operations on time data
4. Custom reporting and analytics

## Troubleshooting

### MCP Server Won't Start
1. Check that the MCP SDK dependency is installed
2. Ensure no other process is using the same port
3. Check the application logs for error messages
4. Try disabling and re-enabling the server

### Connection Issues (VSCode/MCP Clients)
1. Verify the AI system supports MCP protocol
2. Check that the server is running (Settings page shows status)
3. For VSCode integration:
   - Ensure you're using the correct MCP endpoint: `http://localhost:PORT/mcp`
   - Check that no firewall is blocking the connection
   - Verify the port number matches your settings
4. The server accepts connections from any origin for local development
5. Restart the application if needed

### Data Access Issues
1. Ensure the database is accessible
2. Check for any database errors in logs
3. Verify data integrity

### Technical Details

### Server Implementation
- Built using the `@modelcontextprotocol/sdk` package
- Uses HTTP with Server-Sent Events (SSE) transport for communication
- Runs as a child process of the main application
- Directly accesses the SQLite database
- Accepts connections from any origin for local development (secure for localhost-only server)

### Performance Considerations
- All operations are performed directly on the local database
- No caching layer - data is always current
- Large datasets may take time to transfer
- Consider using filters to limit result sets

## Disabling the MCP Server

To disable the MCP server:
1. Go to Settings
2. Uncheck "Enable MCP Server"
3. The server will stop immediately

The setting is persistent and will be remembered when you restart the application.

## Privacy and Data Protection

- All data remains local on your machine
- No data is transmitted over the internet
- The MCP server only runs when explicitly enabled
- You can disable it at any time
- AI systems only have access when actively connected

## Version Compatibility

This MCP server implementation is compatible with:
- Project Time Tracker v1.0.8+
- MCP SDK v1.0.0+
- AI systems supporting MCP protocol

## Support

For issues related to the MCP server:
1. Check the application logs
2. Verify your AI system's MCP support
3. Report issues on the [GitHub repository](https://github.com/doumdi/project-time-tracker)

## License

The MCP server functionality is included under the same MIT license as the main application.
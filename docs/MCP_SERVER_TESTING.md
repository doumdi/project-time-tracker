# MCP Server Testing Guide

This document provides instructions for testing the Project Time Tracker MCP server implementation.

## Manual Testing Steps

### 1. Enable the MCP Server

1. Start Project Time Tracker
2. Navigate to Settings (⚙️ Settings)
3. Scroll down to the "MCP Server" section (blue background)
4. Check the "Enable MCP Server" checkbox
5. You should see a security warning appear
6. The server should start automatically

### 2. Verify Server Status

Check the application logs (if running in development mode) for messages like:
```
[MCP Server] Starting...
[MCP Server] Project Time Tracker MCP server running on stdio
[MCP Server] Started successfully
```

### 3. Test with MCP Client

Since the server uses stdio transport, you would need an MCP-compatible client to test it. The server exposes 24 tools:

#### Project Operations
- `get_projects`
- `add_project` 
- `update_project`
- `delete_project`

#### Task Operations  
- `get_tasks`
- `add_task`
- `update_task` 
- `delete_task`
- `set_active_task`
- `get_active_task`

#### Time Entry Operations
- `get_time_entries`
- `add_time_entry`
- `update_time_entry`
- `delete_time_entry`

#### Office Presence Operations
- `get_office_presence`
- `add_office_presence`
- `update_office_presence`
- `delete_office_presence`

#### BLE Device Operations
- `get_ble_devices`
- `add_ble_device`
- `update_ble_device`
- `delete_ble_device`

#### Report Operations
- `get_time_summary`
- `get_office_presence_summary`

### 4. Test Server Lifecycle

1. **Start**: Enable in Settings → Server should start
2. **Status**: Server should show as running
3. **Stop**: Disable in Settings → Server should stop gracefully
4. **Restart**: Re-enable → Server should start again

### 5. Settings Persistence

1. Enable MCP server
2. Close and restart the application
3. The MCP server should remain enabled
4. Check Settings to verify the checkbox is still checked

## Manual Verification

### Code Structure
- ✅ `src/mcp-server/server.js` - Main server implementation
- ✅ `src/mcp-server/index.js` - Entry point script
- ✅ Settings UI integrated with toggle
- ✅ IPC handlers in main.js
- ✅ Preload API exposed
- ✅ Translations added (EN/FR)

### Security Features
- ✅ Disabled by default
- ✅ Security warning displayed when enabled
- ✅ Setting persisted in localStorage
- ✅ Server runs as child process (isolated)

### Documentation
- ✅ Complete user documentation in `docs/MCP_SERVER.md`
- ✅ API documentation with examples
- ✅ Security considerations explained
- ✅ Troubleshooting guide included

## Expected Behavior

When properly implemented:

1. **Settings Page**: Shows MCP Server section with toggle
2. **Security Warning**: Appears when enabled
3. **Process Management**: Server starts/stops cleanly
4. **Data Access**: All database operations work through MCP
5. **Error Handling**: Graceful failures with logging
6. **Persistence**: Settings saved across restarts

## Integration Points

The MCP server integrates with:
- Database layer (`src/database/db.js`)
- Settings management (localStorage)
- IPC communication (main ↔ renderer)
- Process lifecycle (Electron main process)
- Translation system (i18n)

## Success Criteria

✅ MCP server can be enabled/disabled from Settings
✅ Server starts successfully when enabled  
✅ All 24 MCP tools are properly exposed
✅ Database operations work through MCP interface
✅ Settings persist across application restarts
✅ Proper error handling and logging
✅ Security warnings displayed appropriately
✅ Documentation is complete and accurate
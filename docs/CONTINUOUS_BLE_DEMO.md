# Continuous BLE Discovery in Demo Mode

## Overview

This document describes the enhancement to demo mode that enables continuous BLE device discovery to demonstrate the presence monitoring feature.

## Changes Made

### 1. Modified `startContinuousScanning()` Function

**File:** `src/main.js`

Added demo mode support to the continuous scanning function:

```javascript
function startContinuousScanning() {
  // Demo mode: Simulate continuous discovery
  if (isDemoMode) {
    // ... mock implementation
  }
  // ... original implementation
}
```

**Key Features:**
- Continuously discovers fake BLE devices every minute
- Devices are "discovered" with staggered 500ms delays for realism
- Random RSSI values (-50 to -80 dBm) for each discovery
- Simulates presence detection for enabled devices
- Calls `handlePresenceDeviceDiscovery()` to trigger presence tracking

### 2. Modified `stopContinuousScanning()` Function

Added demo mode support for stopping continuous scanning:

```javascript
function stopContinuousScanning() {
  // Demo mode support
  if (isDemoMode) {
    // ... cleanup mock timers and state
    return;
  }
  // ... original implementation
}
```

### 3. Modified `startPresenceMonitoring()` Function

Updated to work without noble in demo mode:

```javascript
async function startPresenceMonitoring() {
  // Demo mode support
  if (isDemoMode) {
    // ... start presence monitoring without noble
    return;
  }
  // ... original implementation
}
```

## How It Works

### Continuous Discovery Cycle

1. **Initial Discovery**: When presence monitoring starts, all 5 demo BLE devices are discovered immediately
2. **Periodic Re-discovery**: Every 60 seconds, all devices are re-discovered
3. **Presence Tracking**: For enabled devices, presence detection is triggered on each discovery
4. **Real-time Updates**: Devices are sent to the frontend for display in BLE settings

### Demo BLE Devices

The following devices are continuously discovered:

1. **Developer iPhone** (A4:83:E7:12:34:56) - smartphone, enabled
2. **Apple Watch Series 9** (B8:27:EB:78:90:AB) - smartwatch, enabled
3. **MacBook Pro Bluetooth** (DC:A6:32:CD:EF:12) - laptop, enabled
4. **AirPods Pro** (F0:18:98:34:56:78) - headphones, enabled
5. **Backup Android Phone** (E8:9F:80:AB:CD:EF) - smartphone, disabled

### Presence Monitoring Integration

The continuous discovery integrates with the existing presence monitoring system:

1. **Device Detection**: Each discovered device triggers `handlePresenceDeviceDiscovery()`
2. **Session Tracking**: Presence sessions are created and maintained
3. **Timeout Handling**: The existing 2-minute timeout still applies
4. **Database Storage**: Office presence records are saved according to configured intervals

## Benefits

- **Realistic Demonstration**: Shows how presence monitoring works in real-world scenarios
- **Continuous Feedback**: Users can see devices being detected over time
- **Feature Testing**: Allows testing of presence save intervals, session management, and UI updates
- **No Hardware Required**: Works without actual BLE devices

## Testing

The changes have been tested with:
- ✅ Unit tests (`npm run test:demo`)
- ✅ Build verification (`npm run build`)
- ✅ Syntax validation

## Usage

To see continuous BLE discovery in demo mode:

```bash
# Start in demo mode
npm run build
npm run electron-demo

# Enable office presence monitoring in Settings
# Navigate to Office Presence view to see devices being detected continuously
```

The devices will be re-discovered every minute, simulating a realistic presence monitoring scenario.

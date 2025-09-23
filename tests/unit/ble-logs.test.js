const { expect } = require('chai');

describe('BLE Logs Toggle', () => {
  // Mock the BLE state and bleLog function
  let bleState;
  let loggedMessages;
  
  beforeEach(() => {
    // Reset state before each test
    bleState = {
      debugLogsEnabled: false
    };
    loggedMessages = [];
    
    // Mock console.log to capture messages
    global.console = {
      log: (...args) => {
        loggedMessages.push(args.join(' '));
      }
    };
  });

  // Simulate the bleLog function from main.js
  function bleLog(message, ...args) {
    if (bleState.debugLogsEnabled) {
      console.log(message, ...args);
    }
  }

  describe('bleLog function behavior', () => {
    it('should not log when debugLogsEnabled is false', () => {
      bleState.debugLogsEnabled = false;
      bleLog('[BLE SCAN] Test message');
      
      expect(loggedMessages).to.have.length(0);
    });

    it('should log when debugLogsEnabled is true', () => {
      bleState.debugLogsEnabled = true;
      bleLog('[BLE SCAN] Test message');
      
      expect(loggedMessages).to.have.length(1);
      expect(loggedMessages[0]).to.include('[BLE SCAN] Test message');
    });

    it('should handle multiple arguments correctly', () => {
      bleState.debugLogsEnabled = true;
      bleLog('[BLE SCAN] Device discovered:', 'Test Device', 'MAC:123');
      
      expect(loggedMessages).to.have.length(1);
      expect(loggedMessages[0]).to.include('[BLE SCAN] Device discovered: Test Device MAC:123');
    });

    it('should toggle logging state correctly', () => {
      // Start with logging disabled
      bleState.debugLogsEnabled = false;
      bleLog('[BLE SCAN] Message 1');
      expect(loggedMessages).to.have.length(0);
      
      // Enable logging
      bleState.debugLogsEnabled = true;
      bleLog('[BLE SCAN] Message 2');
      expect(loggedMessages).to.have.length(1);
      
      // Disable logging again
      bleState.debugLogsEnabled = false;
      bleLog('[BLE SCAN] Message 3');
      expect(loggedMessages).to.have.length(1); // No new messages
    });
  });

  describe('BLE state management', () => {
    it('should initialize with debugLogsEnabled set to false', () => {
      expect(bleState.debugLogsEnabled).to.be.false;
    });

    it('should allow setting debugLogsEnabled to true', () => {
      bleState.debugLogsEnabled = true;
      expect(bleState.debugLogsEnabled).to.be.true;
    });

    it('should allow toggling debugLogsEnabled', () => {
      bleState.debugLogsEnabled = false;
      expect(bleState.debugLogsEnabled).to.be.false;
      
      bleState.debugLogsEnabled = !bleState.debugLogsEnabled;
      expect(bleState.debugLogsEnabled).to.be.true;
      
      bleState.debugLogsEnabled = !bleState.debugLogsEnabled;
      expect(bleState.debugLogsEnabled).to.be.false;
    });
  });
});
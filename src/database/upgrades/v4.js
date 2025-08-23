/**
 * Database Migration v4: Add BLE and office presence tables
 * 
 * This migration adds Bluetooth Low Energy (BLE) device tracking and
 * office presence detection functionality. This enables automatic
 * time tracking based on device proximity.
 * 
 * New tables:
 * - ble_devices: Stores registered BLE devices for monitoring
 * - office_presence: Tracks office presence sessions based on device detection
 * 
 * Features:
 * - BLE device registration and management
 * - Automatic presence detection when devices are in range
 * - Presence session tracking with start/end times
 * - Foreign key relationship between presence and devices
 * 
 * Tables created:
 * 
 * ble_devices:
 * - id: Primary key
 * - name: Human-readable device name
 * - mac_address: Bluetooth MAC address (unique)
 * - device_type: Type of device (watch, phone, etc.)
 * - is_enabled: Whether device is active for monitoring
 * - created_at, updated_at: Timestamps
 * 
 * office_presence:
 * - id: Primary key
 * - date: Date of presence session
 * - start_time: Session start timestamp
 * - end_time: Session end timestamp (nullable for ongoing sessions)
 * - duration: Session duration in minutes
 * - device_id: Reference to BLE device (nullable)
 * - created_at, updated_at: Timestamps
 * 
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise} - Resolves when migration is complete
 */
function applyV4Migration(db) {
  return new Promise((resolve, reject) => {
    console.log('Migration v4: Adding office presence and BLE devices tables');
    
    const createBleDevicesTable = `
      CREATE TABLE IF NOT EXISTS ble_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mac_address TEXT UNIQUE NOT NULL,
        device_type TEXT DEFAULT 'unknown',
        is_enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    const createOfficePresenceTable = `
      CREATE TABLE IF NOT EXISTS office_presence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER NOT NULL, -- Duration in minutes
        device_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES ble_devices (id) ON DELETE SET NULL
      );
    `;
    
    db.serialize(() => {
      db.run(createBleDevicesTable, (err) => {
        if (err) {
          console.error(`Migration v4 failed (ble_devices table):`, err);
          reject(err);
          return;
        }
        console.log('BLE devices table created successfully');
      });
      
      db.run(createOfficePresenceTable, (err) => {
        if (err) {
          console.error(`Migration v4 failed (office_presence table):`, err);
          reject(err);
          return;
        }
        console.log('Office presence table created successfully');
        console.log(`Migration v4 completed successfully`);
        resolve();
      });
    });
  });
}

module.exports = applyV4Migration;
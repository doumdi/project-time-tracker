/**
 * Demo Data Population Module (Web Version)
 * 
 * This module provides a function to populate an sql.js database
 * with sample data for demo mode in the web version.
 * 
 * This is used by the web version to populate the in-memory database.
 */

// No database module import - we receive the db instance directly

// Import data templates from populate-dev-data script
const PROJECT_TEMPLATES = [
  {
    name: 'E-commerce Platform',
    description: 'Next.js e-commerce platform with Stripe integration',
    color: '#FF6B6B',
    budget: 15000,
    start_date: '2024-09-01',
    end_date: '2024-12-31'
  },
  {
    name: 'Mobile Banking App',
    description: 'React Native banking application with biometric authentication',
    color: '#4ECDC4',
    budget: 25000,
    start_date: '2024-08-15',
    end_date: '2025-02-28'
  },
  {
    name: 'AI Chat Assistant',
    description: 'Python/FastAPI backend for AI-powered customer support',
    color: '#45B7D1',
    budget: 8000,
    start_date: '2024-10-01',
    end_date: '2024-11-30'
  },
  {
    name: 'CRM Dashboard',
    description: 'Vue.js dashboard for customer relationship management',
    color: '#96CEB4',
    budget: 12000,
    start_date: '2024-07-01',
    end_date: '2024-12-15'
  },
  {
    name: 'Inventory System',
    description: 'Full-stack inventory management with barcode scanning',
    color: '#FECA57',
    budget: 18000,
    start_date: '2024-09-15',
    end_date: '2025-01-31'
  },
  {
    name: 'DevOps Pipeline',
    description: 'CI/CD infrastructure setup with Docker and Kubernetes',
    color: '#FF9FF3',
    budget: 6000,
    start_date: '2024-10-15',
    end_date: '2024-11-15'
  },
  {
    name: 'Analytics Platform',
    description: 'Real-time data analytics with D3.js visualizations',
    color: '#54A0FF',
    budget: 20000,
    start_date: '2024-08-01',
    end_date: '2024-12-31'
  },
  {
    name: 'Content Management',
    description: 'Headless CMS with GraphQL API and React admin panel',
    color: '#5F27CD',
    budget: 10000,
    start_date: '2024-09-01',
    end_date: '2024-11-30'
  },
  {
    name: 'IoT Monitoring',
    description: 'IoT device monitoring dashboard with real-time alerts',
    color: '#00D2D3',
    budget: 14000,
    start_date: '2024-10-01',
    end_date: '2025-01-15'
  },
  {
    name: 'Learning Platform',
    description: 'Online learning platform with video streaming and quizzes',
    color: '#FF6348',
    budget: 22000,
    start_date: '2024-07-15',
    end_date: '2025-03-31'
  }
];

const BLE_DEVICE_TEMPLATES = [
  {
    name: 'Developer iPhone',
    mac_address: 'A4:83:E7:12:34:56',
    device_type: 'smartphone',
    is_enabled: true
  },
  {
    name: 'Apple Watch Series 9',
    mac_address: 'B8:27:EB:78:90:AB',
    device_type: 'smartwatch',
    is_enabled: true
  },
  {
    name: 'MacBook Pro Bluetooth',
    mac_address: 'DC:A6:32:CD:EF:12',
    device_type: 'laptop',
    is_enabled: true
  },
  {
    name: 'AirPods Pro',
    mac_address: 'F0:18:98:34:56:78',
    device_type: 'headphones',
    is_enabled: true
  },
  {
    name: 'Backup Android Phone',
    mac_address: 'E8:9F:80:AB:CD:EF',
    device_type: 'smartphone',
    is_enabled: false
  }
];

const TASK_DESCRIPTIONS = [
  'Implement user authentication',
  'Design database schema',
  'Create API endpoints',
  'Write unit tests',
  'Fix production bugs',
  'Code review and refactoring',
  'Update documentation',
  'Deploy to staging',
  'Performance optimization',
  'Security audit',
  'UI/UX improvements',
  'Integration testing'
];

const SUBTASK_DESCRIPTIONS = [
  'Research best practices',
  'Create initial implementation',
  'Write tests',
  'Update documentation',
  'Code review',
  'Fix issues',
  'Deploy changes'
];

/**
 * Generate random time entries for a given date
 */
function generateTimeEntriesForDay(date, projects, tasks) {
  const entries = [];
  const dayOfWeek = date.getDay();
  
  // Skip weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return entries;
  }
  
  // Random work hours (6-9 hours per day)
  const workHours = 6 + Math.random() * 3;
  let totalMinutes = 0;
  const targetMinutes = workHours * 60;
  
  // Start time between 8-10 AM
  let currentTime = new Date(date);
  currentTime.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0);
  
  while (totalMinutes < targetMinutes) {
    // Random session duration (30-180 minutes)
    const duration = Math.floor(30 + Math.random() * 150);
    const endTime = new Date(currentTime.getTime() + duration * 60000);
    
    // Pick random project and task
    const project = projects[Math.floor(Math.random() * projects.length)];
    const task = tasks.length > 0 ? tasks[Math.floor(Math.random() * tasks.length)] : null;
    const description = TASK_DESCRIPTIONS[Math.floor(Math.random() * TASK_DESCRIPTIONS.length)];
    
    entries.push({
      project_id: project.id,
      task_id: task ? task.id : null,
      description: description,
      start_time: currentTime.toISOString(),
      end_time: endTime.toISOString(),
      duration: duration
    });
    
    totalMinutes += duration;
    
    // Break between sessions (15-60 minutes)
    const breakTime = 15 + Math.floor(Math.random() * 45);
    currentTime = new Date(endTime.getTime() + breakTime * 60000);
    
    // Stop if we've gone past 6 PM
    if (currentTime.getHours() >= 18) {
      break;
    }
  }
  
  return entries;
}

/**
 * Generate office presence data correlated with work sessions
 */
function generateOfficePresence(date, entries, devices) {
  const presenceSessions = [];
  
  if (entries.length === 0) return presenceSessions;
  
  // Use the first and last entry times for presence
  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];
  
  const startTime = new Date(firstEntry.start_time);
  const endTime = new Date(lastEntry.end_time);
  const duration = Math.floor((endTime - startTime) / 60000);
  
  // Pick a random enabled device
  const enabledDevices = devices.filter(d => d.enabled == 1);
  if (enabledDevices.length === 0) return presenceSessions;
  
  const device = enabledDevices[Math.floor(Math.random() * enabledDevices.length)];
  
  presenceSessions.push({
    date: date.toISOString().split('T')[0],
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration: duration,
    device_id: device.id
  });
  
  return presenceSessions;
}

/**
 * Populate the database with demo data - Web Version
 * @param {Database} db - sql.js database instance
 */
export async function populateDemoData(db) {
  try {
    console.log('[WEB MODE] Starting demo data population...');
    
    // 1. Create projects
    console.log('[WEB MODE] Creating projects...');
    const projects = [];
    for (const template of PROJECT_TEMPLATES) {
      db.run(
        'INSERT INTO projects (name, description, color, budget, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
        [template.name, template.description, template.color, template.budget, template.start_date, template.end_date]
      );
      const stmt = db.prepare('SELECT * FROM projects WHERE id = last_insert_rowid()');
      stmt.step();
      const project = stmt.getAsObject();
      stmt.free();
      projects.push(project);
      console.log(`[WEB MODE]   ✓ Created project: ${template.name}`);
    }
    
    // 2. Create BLE devices
    console.log('[WEB MODE] Creating BLE devices...');
    const devices = [];
    for (const template of BLE_DEVICE_TEMPLATES) {
      db.run(
        'INSERT INTO ble_devices (name, address, enabled) VALUES (?, ?, ?)',
        [template.name, template.mac_address, template.is_enabled ? 1 : 0]
      );
      const stmt = db.prepare('SELECT * FROM ble_devices WHERE id = last_insert_rowid()');
      stmt.step();
      const device = stmt.getAsObject();
      stmt.free();
      devices.push(device);
      console.log(`[WEB MODE]   ✓ Created device: ${template.name}`);
    }
    
    // 3. Create tasks
    console.log('[WEB MODE] Creating tasks...');
    const tasks = [];
    for (const project of projects.slice(0, 5)) { // Tasks for first 5 projects
      for (let i = 0; i < 2; i++) { // 2 tasks per project
        const taskDesc = TASK_DESCRIPTIONS[Math.floor(Math.random() * TASK_DESCRIPTIONS.length)];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30));
        
        db.run(
          'INSERT INTO tasks (project_id, title, description, status, priority, due_date, estimated_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [project.id, `${taskDesc} - ${project.name}`, taskDesc, 'pending', 'medium', dueDate.toISOString().split('T')[0], Math.floor(2 + Math.random() * 6)]
        );
        const stmt = db.prepare('SELECT * FROM tasks WHERE id = last_insert_rowid()');
        stmt.step();
        const task = stmt.getAsObject();
        stmt.free();
        tasks.push(task);
      }
    }
    console.log(`[WEB MODE]   ✓ Created ${tasks.length} tasks`);
    
    // 3b. Create subtasks for tasks
    console.log('[WEB MODE] Creating subtasks...');
    let subtaskCount = 0;
    for (const task of tasks.slice(0, 3)) { // Add subtasks to first 3 tasks
      const numSubtasks = 2 + Math.floor(Math.random() * 3); // 2-4 subtasks per task
      for (let i = 0; i < numSubtasks; i++) {
        const subtaskDesc = SUBTASK_DESCRIPTIONS[Math.floor(Math.random() * SUBTASK_DESCRIPTIONS.length)];
        const status = Math.random() > 0.5 ? 'completed' : 'pending'; // 50% chance of being completed
        
        db.run(
          'INSERT INTO subtasks (parent_task_id, title, description, status) VALUES (?, ?, ?, ?)',
          [task.id, subtaskDesc, subtaskDesc, status]
        );
        subtaskCount++;
      }
    }
    console.log(`[WEB MODE]   ✓ Created ${subtaskCount} subtasks`);
    
    // 4. Generate time entries for last 3 months
    console.log('[WEB MODE] Generating time entries...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    let totalEntries = 0;
    let totalMinutes = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const entries = generateTimeEntriesForDay(new Date(d), projects, tasks);
      
      for (const entry of entries) {
        db.run(
          'INSERT INTO time_entries (project_id, task_id, description, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?, ?)',
          [entry.project_id, entry.task_id, entry.description, entry.start_time, entry.end_time, entry.duration]
        );
        totalEntries++;
        totalMinutes += entry.duration;
      }
      
      // Add office presence
      const presenceSessions = generateOfficePresence(new Date(d), entries, devices);
      for (const presence of presenceSessions) {
        db.run(
          'INSERT INTO office_presence (start_time, end_time, devices_detected) VALUES (?, ?, ?)',
          [presence.start_time, presence.end_time, 1]
        );
      }
    }
    
    console.log(`[WEB MODE]   ✓ Created ${totalEntries} time entries`);
    console.log(`[WEB MODE]   ✓ Total time tracked: ${Math.round(totalMinutes / 60)} hours`);
    
    console.log('[WEB MODE] Demo data population completed successfully!');
    console.log('[WEB MODE] Summary:');
    console.log(`[WEB MODE]   • ${projects.length} projects`);
    console.log(`[WEB MODE]   • ${tasks.length} tasks`);
    console.log(`[WEB MODE]   • ${subtaskCount} subtasks`);
    console.log(`[WEB MODE]   • ${devices.length} BLE devices`);
    console.log(`[WEB MODE]   • ${totalEntries} time entries`);
    console.log(`[WEB MODE]   • ${Math.round(totalMinutes / 60)} hours logged`);
    
    // Set version metadata
    db.run("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('db_version', '7')");
    db.run("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('app_version', '1.0.14')");
    
  } catch (error) {
    console.error('[WEB MODE] Failed to populate demo data:', error);
    throw error;
  }
}

export { BLE_DEVICE_TEMPLATES };

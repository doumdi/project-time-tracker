# Task Management Feature

The Task Management feature provides comprehensive task tracking with integrated time monitoring and progress visualization.

## Overview

Tasks are discrete work units that can be optionally associated with projects. Each task can have:
- **Name**: Descriptive title of what needs to be done
- **Due Date**: Optional deadline for task completion
- **Project Association**: Link to a specific project for categorization and time tracking
- **Allocated Time**: Estimated time needed to complete the task (in minutes)
- **Cumulated Time**: Actual time spent working on the task (automatically calculated)

## Key Features

### 1. Task Creation and Management
- Create tasks with an intuitive form interface
- Large, comfortable input fields for better usability
- Two-column layout for efficient space usage
- Edit existing tasks with pre-populated forms
- Delete tasks with confirmation dialogs

### 2. Time Tracking Integration
- **One-Click Start/Stop**: Start time tracking directly from the task list
- **Automatic Time Entry Creation**: When stopping a task, a time entry is automatically created
- **Active Task Management**: Only one task can be active at a time
- **Project Requirement**: Tasks must be associated with a project to enable time tracking
- **Timer Synchronization**: Stopping the timer deactivates the active task

### 3. Cumulated Time Calculation
The cumulated time is automatically calculated by aggregating time entries that mention the task name in their description. The system:
- Searches time entries for the associated project
- Matches entries that contain the task name in their description
- Sums up the duration of matching entries
- Updates the display in real-time

### 4. Visual Progress Tracking
Each task displays both allocated and cumulated time with visual indicators:
- **Progress Bar**: Shows time spent vs. allocated time
- **Color Coding**:
  - 🟢 **Green**: Under 80% of allocated time
  - 🟠 **Orange**: 80-100% of allocated time  
  - 🔴 **Red**: Over allocated time
- **Time Format**: Hours and minutes display (e.g., "2h 30m")

### 5. Status Indicators
Tasks have visual status indicators:
- **Active**: Currently being tracked (green badge with pulse animation)
- **Due Soon**: Due within 3 days (orange background)
- **Overdue**: Past due date (red background)
- **Normal**: No special status

## Database Schema

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  due_date DATE,
  project_id INTEGER,
  allocated_time INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
);
```

## User Interface

### Task List View
The main task list displays:
- Task name with active status indicator
- Associated project with color dot
- Due date (formatted as "MMM dd, yyyy")
- Allocated time (if set)
- Cumulated time with progress bar
- Status indicators (active, due soon, overdue)
- Action buttons (start/stop, edit, delete)

### Task Creation Form
The creation form features:
- **Full-width task name field** with 50px minimum height
- **Two-column layout** for due date and allocated time
- **Project dropdown** with all available projects
- **Large form controls** for better touch interaction
- **Enhanced visual design** with card-style formatting

### Active Task Display
When a task is active, a prominent display shows:
- Task name with timer emoji
- Associated project name
- Real-time elapsed time counter
- Large stop button for easy access

## Internationalization

Full support for English and French:
- All interface text is properly localized
- Date formatting respects locale conventions
- Time duration formatting is consistent across languages

## Integration with Time Tracking

### Starting a Task
1. Click "Start Task" button (only available for tasks with projects)
2. Task is marked as active in the database
3. Timer starts automatically in TimeTracker component
4. Timer data is saved to localStorage for persistence
5. Task description is auto-populated in timer

### Stopping a Task
1. Click "Stop Task" button from the active task display
2. Time entry is created with task name in description
3. Task is deactivated in the database
4. Timer is reset and localStorage is cleared
5. Cumulated time is updated automatically

### Timer Synchronization
- Stopping timer from TimeTracker component also deactivates tasks
- Only one task can be active at a time (enforced at database level)
- Timer state is synchronized between components

## Performance Considerations

### Efficient Queries
The cumulated time calculation uses optimized SQL:
```sql
SELECT t.*, 
       COALESCE(SUM(CASE 
         WHEN te.description LIKE '%' || t.name || '%' 
         THEN te.duration 
         ELSE 0 
       END), 0) as cumulated_time
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN time_entries te ON t.project_id = te.project_id
GROUP BY t.id, p.name, p.color
```

### Real-time Updates
- Task list refreshes when timer starts/stops
- Progress bars update automatically when new time entries are added
- Status indicators update based on current date/time

## Best Practices

### Task Organization
- Use descriptive task names that will be easily identifiable in time entries
- Associate tasks with projects to enable time tracking
- Set realistic allocated time estimates for better progress tracking
- Use due dates to prioritize work and identify overdue items

### Time Tracking Workflow
1. Create tasks with estimated time allocation
2. Associate tasks with appropriate projects
3. Start task when beginning work
4. Let timer run while working
5. Stop task when taking breaks or switching activities
6. Review cumulated time vs. allocated time for planning improvements

## Future Enhancements

Potential improvements for the task system:
- Task templates for recurring work
- Subtask support for complex tasks
- Task dependencies and scheduling
- Time estimation accuracy tracking
- Integration with external task management systems
- Bulk task operations
- Task filtering and search
- Export task reports
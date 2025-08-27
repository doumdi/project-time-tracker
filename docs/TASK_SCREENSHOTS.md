# Task Management Screenshots

This document describes the visual appearance of the enhanced Tasks View with cumulated time tracking.

## Enhanced Tasks View with Cumulated Time

### Layout Description

The tasks view displays a modern table with the following columns:

1. **Task Name**: 
   - Task title with active status badge (green "Active" pill for running tasks)
   - Large, readable text with proper typography hierarchy

2. **Project**:
   - Project name with colored dot indicator
   - Visual project association with project's assigned color
   - Shows "No project" for unassociated tasks

3. **Due Date**:
   - Formatted date display (e.g., "Dec 15, 2024")
   - Empty dash for tasks without due dates

4. **Allocated Time**:
   - Shows estimated time in minutes (e.g., "120 min")
   - Empty dash for tasks without time allocation

5. **Time Spent** (New Feature):
   - Displays cumulated time in hours and minutes (e.g., "2h 15m")
   - Includes visual progress bar showing completion percentage
   - Color-coded progress indication:
     - Green bar: Under 80% of allocated time
     - Orange bar: 80-100% of allocated time
     - Red bar: Over allocated time
   - Progress bar width represents time spent vs. allocated ratio

6. **Status**:
   - Color-coded status badges with background highlights
   - "Active" (green), "Due Soon" (orange), "Overdue" (red)

7. **Actions**:
   - Start Task button (green) for inactive tasks with projects
   - Edit button (blue) for all tasks  
   - Delete button (red) for all tasks

### Visual Examples

**Task with Progress Under Allocated Time:**
```
📋 Update Documentation    ● Web Development    Dec 20, 2024    60 min    45m [████████████░░░░░░░░] 75%    Start | Edit | Delete
```

**Task Exceeding Allocated Time:**
```
📋 Bug Fix #123          ● Mobile App        Dec 18, 2024    30 min    1h 15m [████████████████████] 250%    Start | Edit | Delete
```

**Active Task:**
```
📋 Code Review [Active]   ● Backend API       Dec 22, 2024    90 min    30m [██████░░░░░░░░░░░░░░] 33%    Edit | Delete
```

### Enhanced Active Task Display

When a task is active, a prominent card appears at the top:

```
⏱️ Currently Working On: Code Review
Backend API • 1h 23m elapsed
[Stop Task] (large red button)
```

### Empty State

When no tasks exist:
```
📋 (large clipboard icon)
No Tasks
Create your first task to get organized!
[✅ Create Task] (prominent button)
```

### Task Creation Form

Enhanced form with modern design:
- Full-width task name field (50px height minimum)
- Two-column layout for due date and allocated time
- Project dropdown with all available projects
- Large, comfortable form controls
- Card-style design with subtle shadows

## Key Visual Improvements

1. **Enhanced Typography**: Better font hierarchy and readability
2. **Progress Visualization**: Visual progress bars for time tracking
3. **Color Coding**: Intuitive color system for status and progress
4. **Modern Form Design**: Larger, more comfortable input fields
5. **Responsive Layout**: Efficient use of space with two-column sections
6. **Visual Hierarchy**: Clear separation between elements
7. **Status Indicators**: Background highlights for better visibility

## Screenshot Files Needed

The following screenshot files should be created to document the feature:

1. `docs/images/Tasks.png` - Main tasks list with various task states
2. `docs/images/TaskCreateForm.png` - Enhanced task creation form
3. `docs/images/TaskActiveDisplay.png` - Active task timer display
4. `docs/images/TaskProgressBars.png` - Close-up of progress visualization

## UI Color Scheme

- **Green (#4CAF50)**: Active tasks, under-budget progress
- **Orange (#ff9800)**: Due soon, near-budget progress  
- **Red (#f44336)**: Overdue, over-budget progress
- **Blue (#2196F3)**: Edit actions, informational elements
- **Gray (#666)**: Normal text, neutral elements
- **Light Gray (#e1e5e9)**: Borders, backgrounds, inactive elements

This enhanced visual design provides clear feedback on task progress and makes it easy to understand time allocation vs. actual time spent at a glance.
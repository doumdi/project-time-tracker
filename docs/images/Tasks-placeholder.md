# Tasks Feature Screenshot Placeholder

This file serves as a placeholder for the actual Tasks.png screenshot that would be captured from the running application.

## What the Screenshot Would Show:

### Enhanced Tasks View with Cumulated Time Display

**Main Table with Following Tasks:**

1. **Update Documentation** 
   - Project: Web Development (blue dot)
   - Due: Dec 20, 2024
   - Allocated: 60 min
   - Time Spent: 45m with green progress bar (75% complete)
   - Status: Normal
   - Actions: Start | Edit | Delete

2. **Bug Fix #123** 
   - Project: Mobile App (orange dot)
   - Due: Dec 18, 2024 
   - Allocated: 30 min
   - Time Spent: 1h 15m with red progress bar (250% over budget)
   - Status: Overdue (red background)
   - Actions: Start | Edit | Delete

3. **Code Review** [ACTIVE]
   - Project: Backend API (green dot)
   - Due: Dec 22, 2024
   - Allocated: 90 min
   - Time Spent: 30m with green progress bar (33% complete)
   - Status: Active (green "Active" badge)
   - Actions: Edit | Delete

**Active Task Display at Top:**
```
⏱️ Currently Working On: Code Review
Backend API • 1h 23m elapsed
[Stop Task] (large red button)
```

**Visual Features:**
- Modern table design with proper spacing
- Color-coded progress bars showing time vs allocation
- Project color dots for visual association
- Status badges with background highlights
- Clean typography and visual hierarchy
- Responsive design with comfortable touch targets

**Color Scheme:**
- Green progress bars for under-budget tasks
- Red progress bars for over-budget tasks
- Orange status for due soon items
- Project-specific colored dots
- Clean gray and white base colors

To create the actual screenshot:
1. Run the application with `npm run dev`
2. Navigate to the Tasks tab
3. Create sample tasks as described above
4. Take a screenshot of the enhanced tasks view
5. Save as `docs/images/Tasks.png`
# Unit Tests

This directory contains unit tests for the Project Time Tracker application, particularly for the newly implemented Tasks View feature.

## Test Files

### task-database.test.js
Tests the database layer functionality for task operations:
- Task CRUD operations (Create, Read, Update, Delete)
- Active task management
- Task filtering and sorting
- Error handling

### tasks-view.test.js
Tests the TasksView React component:
- Component rendering and UI interactions
- Task management workflows
- Time tracking integration
- Project integration
- Status display and validation

## Running Tests

To run these tests, you would typically use a testing framework like:

### With Mocha (for database tests)
```bash
npm install mocha chai --save-dev
npx mocha tests/unit/task-database.test.js
```

### With Jest (for React component tests)
```bash
npm install jest @testing-library/react @testing-library/jest-dom --save-dev
npm test
```

## Test Coverage

The tests cover the core functionality of the Tasks View feature:

1. **Database Operations**
   - Task creation with required and optional fields
   - Task retrieval with filtering and limiting
   - Task updates and validation
   - Task deletion
   - Active task management (only one active at a time)

2. **Component Functionality**
   - Form rendering and validation
   - Task list display and interaction
   - Time tracking start/stop functionality
   - Project integration and display
   - Status indicators and validation

3. **Integration Points**
   - Time tracking system integration
   - Project management integration
   - Settings configuration (task display count)
   - Database migration and versioning

## Future Enhancements

Additional tests could be added for:
- End-to-end user workflows
- Performance testing with large task lists
- Accessibility testing
- Cross-browser compatibility
- Database migration testing
- Internationalization testing

## Notes

The current test files provide a foundation for testing the Tasks View feature. For a production application, these tests would be expanded with actual test framework implementations and more comprehensive coverage.
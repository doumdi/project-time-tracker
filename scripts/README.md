# Development Scripts

This directory contains useful scripts for Project Time Tracker development.

## populate-dev-data.js

Populates the database with realistic development data for testing and screenshots.

### Features

- Creates 10 diverse software development projects with budgets and timelines
- Generates ~320 hours of time entries over the last 3 months (~27h/week average)
- Creates 5 BLE devices for presence tracking demonstration
- Includes realistic work patterns (no weekend work, normal business hours)
- Generates office presence data correlated with work sessions

### Usage

```bash
# Populate database with sample data
npm run populate-dev-data

# Clear existing data and repopulate
npm run populate-dev-data-clear

# Or run directly
node scripts/populate-dev-data.js [--clear]
```

### Generated Data

**Projects (10 total):**
- E-commerce Platform (Next.js/Stripe)
- Mobile Banking App (React Native)
- AI Chat Assistant (Python/FastAPI)
- CRM Dashboard (Vue.js)
- Inventory System (Full-stack)
- DevOps Pipeline (Docker/K8s)
- Analytics Platform (D3.js)
- Content Management (GraphQL/React)
- IoT Monitoring (Real-time)
- Learning Platform (Video streaming)

**BLE Devices (5 total):**
- Developer iPhone (smartphone)
- Apple Watch Series 9 (smartwatch)
- MacBook Pro Bluetooth (laptop)
- AirPods Pro (headphones)
- Backup Android Phone (disabled)

**Time Entries:**
- ~189 entries over 3 months
- Realistic task descriptions
- Natural work patterns
- Correlated office presence data

### Use Cases

1. **Screenshot Generation**: Run before taking documentation screenshots
2. **Feature Testing**: Test analytics, charts, and filtering with real data
3. **Demo Preparation**: Showcase the application with realistic work data
4. **BLE Testing**: Demonstrate presence tracking features

The script is safe to run multiple times and includes proper error handling and database connection management.
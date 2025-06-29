import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import TimeTracker from '../components/TimeTracker';
import ProjectManager from '../components/ProjectManager';
import TimeEntryList from '../components/TimeEntryList';
import CalendarView from '../components/CalendarView';
import ChartsView from '../components/ChartsView';
import './styles.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('timer');
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load data on component mount and refresh
  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      const [projectList, entriesList] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getTimeEntries()
      ]);
      setProjects(projectList);
      setTimeEntries(entriesList);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'timer', label: '⏱️ Time Tracker', component: TimeTracker },
    { id: 'projects', label: '📁 Projects', component: ProjectManager },
    { id: 'entries', label: '📝 Time Entries', component: TimeEntryList },
    { id: 'calendar', label: '📅 Calendar', component: CalendarView },
    { id: 'charts', label: '📊 Charts', component: ChartsView }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || TimeTracker;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Project Time Tracker</h1>
        <div className="header-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>
      
      <main className="app-main">
        <ActiveComponent 
          projects={projects} 
          timeEntries={timeEntries}
          onRefresh={handleRefresh}
        />
      </main>
    </div>
  );
};

// Initialize the React app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
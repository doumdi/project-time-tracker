import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import TimeTracker from '../components/TimeTracker';
import ProjectManager from '../components/ProjectManager';
import TasksView from '../components/TasksView';
import TimeEntryList from '../components/TimeEntryList';
import CalendarView from '../components/CalendarView';
import ChartsView from '../components/ChartsView';
import ReportsView from '../components/ReportsView';
import OfficePresenceView from '../components/OfficePresenceView';
import Settings from '../components/Settings';
import './styles.css';

const AppContent = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('timer');
  const [projects, setProjects] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load data on component mount and refresh
  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Listen for database changes from MCP server or other external operations
  useEffect(() => {
    const handleDatabaseChange = (event, data) => {
      console.log('[UI] Database changed by external operation:', data);
      // Trigger a refresh to update the UI with latest data
      handleRefresh();
    };

    // Set up event listener for database changes
    window.electronAPI.onDatabaseChanged(handleDatabaseChange);

    // Cleanup on unmount
    return () => {
      window.electronAPI.removeAllListeners('database-changed');
    };
  }, []);

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
    { id: 'timer', label: t('app.tabs.timer'), component: TimeTracker },
    { id: 'projects', label: t('app.tabs.projects'), component: ProjectManager },
    { id: 'tasks', label: t('app.tabs.tasks'), component: TasksView },
    { id: 'entries', label: t('app.tabs.entries'), component: TimeEntryList },
    { id: 'calendar', label: t('app.tabs.calendar'), component: CalendarView },
    { id: 'charts', label: t('app.tabs.charts'), component: ChartsView },
    { id: 'reports', label: t('app.tabs.reports'), component: ReportsView },
    { id: 'presence', label: t('app.tabs.presence'), component: OfficePresenceView },
    { id: 'settings', label: t('app.tabs.settings'), component: Settings }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || TimeTracker;

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('app.title')}</h1>
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

const App = () => {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </LanguageProvider>
  );
};

// Initialize the React app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
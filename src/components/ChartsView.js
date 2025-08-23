import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const ChartsView = ({ timeEntries, projects }) => {
  const { t } = useLanguage();
  const [chartType, setChartType] = useState('projects'); // 'projects', 'weekly', 'daily'
  const [dateRange, setDateRange] = useState('last4weeks'); // 'last4weeks', 'thisMonth', 'all'
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [presenceData, setPresenceData] = useState([]);
  const [filteredPresence, setFilteredPresence] = useState([]);

  useEffect(() => {
    loadPresenceData();
  }, []);

  useEffect(() => {
    filterEntriesByDateRange();
  }, [timeEntries, presenceData, dateRange]);

  const loadPresenceData = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getOfficePresence) {
        const presence = await window.electronAPI.getOfficePresence();
        setPresenceData(presence || []);
      }
    } catch (error) {
      console.error('Failed to load presence data:', error);
      setPresenceData([]);
    }
  };

  const filterEntriesByDateRange = () => {
    let filtered = [...timeEntries];
    let filteredPresenceData = [...presenceData];
    const now = new Date();

    switch (dateRange) {
      case 'last4weeks':
        const fourWeeksAgo = subWeeks(now, 4);
        filtered = filtered.filter(entry => 
          parseISO(entry.start_time) >= fourWeeksAgo
        );
        filteredPresenceData = filteredPresenceData.filter(presence => 
          parseISO(presence.start_time) >= fourWeeksAgo
        );
        break;
      case 'thisMonth':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(entry => 
          parseISO(entry.start_time) >= startOfMonth
        );
        filteredPresenceData = filteredPresenceData.filter(presence => 
          parseISO(presence.start_time) >= startOfMonth
        );
        break;
      case 'all':
        // No filtering
        break;
    }

    setFilteredEntries(filtered);
    setFilteredPresence(filteredPresenceData);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}${t('common.hours')} ${mins}${t('common.minutes')}` : `${mins}${t('common.minutes')}`;
  };

  const generateProjectChart = () => {
    const projectData = projects.map(project => {
      const projectEntries = filteredEntries.filter(entry => entry.project_id === project.id);
      const totalMinutes = projectEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
      return {
        project,
        totalMinutes,
        entryCount: projectEntries.length
      };
    }).filter(data => data.totalMinutes > 0);

    if (projectData.length === 0) {
      return null;
    }

    const data = {
      labels: projectData.map(data => data.project.name),
      datasets: [
        {
          label: 'Hours',
          data: projectData.map(data => (data.totalMinutes / 60).toFixed(1)),
          backgroundColor: projectData.map(data => data.project.color || '#4CAF50'),
          borderColor: projectData.map(data => data.project.color || '#4CAF50'),
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Time by Project',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const dataPoint = projectData[context.dataIndex];
              return `${dataPoint.project.name}: ${formatDuration(dataPoint.totalMinutes)} (${dataPoint.entryCount} entries)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Hours'
          }
        }
      }
    };

    return { data, options };
  };

  const generateWeeklyChart = () => {
    // Get last 8 weeks of data
    const weeks = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i));
      const weekEnd = endOfWeek(subWeeks(now, i));
      
      const weekEntries = filteredEntries.filter(entry => {
        const entryDate = parseISO(entry.start_time);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });

      const weekPresence = filteredPresence.filter(presence => {
        const presenceDate = parseISO(presence.start_time);
        return presenceDate >= weekStart && presenceDate <= weekEnd;
      });

      const totalMinutes = weekEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
      const presenceMinutes = weekPresence.reduce((total, presence) => total + (presence.duration || 0), 0);
      
      weeks.push({
        label: format(weekStart, 'MMM dd'),
        totalMinutes,
        presenceMinutes,
        entryCount: weekEntries.length,
        presenceCount: weekPresence.length
      });
    }

    if (weeks.every(week => week.totalMinutes === 0 && week.presenceMinutes === 0)) {
      return null;
    }

    const datasets = [
      {
        label: 'Time Tracking',
        data: weeks.map(week => (week.totalMinutes / 60).toFixed(1)),
        backgroundColor: 'rgba(102, 126, 234, 0.6)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
      }
    ];

    // Add presence dataset if there's any presence data
    if (weeks.some(week => week.presenceMinutes > 0)) {
      datasets.push({
        label: 'Office Presence',
        data: weeks.map(week => (week.presenceMinutes / 60).toFixed(1)),
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 2,
      });
    }

    const data = {
      labels: weeks.map(week => week.label),
      datasets
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Weekly Time Tracking & Office Presence',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const week = weeks[context.dataIndex];
              if (context.datasetIndex === 0) {
                return `Week of ${week.label}: ${formatDuration(week.totalMinutes)} (${week.entryCount} entries)`;
              } else {
                return `Week of ${week.label}: ${formatDuration(week.presenceMinutes)} presence (${week.presenceCount} sessions)`;
              }
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Hours'
          }
        }
      }
    };

    return { data, options };
  };

  const generateDailyChart = () => {
    // Get last 14 days
    const days = [];
    const now = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      
      const dayEntries = filteredEntries.filter(entry => {
        const entryDate = parseISO(entry.start_time);
        return entryDate.toDateString() === day.toDateString();
      });

      const dayPresence = filteredPresence.filter(presence => {
        const presenceDate = parseISO(presence.start_time);
        return presenceDate.toDateString() === day.toDateString();
      });

      const totalMinutes = dayEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
      const presenceMinutes = dayPresence.reduce((total, presence) => total + (presence.duration || 0), 0);
      
      days.push({
        label: format(day, 'MMM dd'),
        totalMinutes,
        presenceMinutes,
        entryCount: dayEntries.length,
        presenceCount: dayPresence.length
      });
    }

    if (days.every(day => day.totalMinutes === 0 && day.presenceMinutes === 0)) {
      return null;
    }

    const datasets = [
      {
        label: 'Time Tracking',
        data: days.map(day => (day.totalMinutes / 60).toFixed(1)),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        tension: 0.1,
        pointBackgroundColor: 'rgb(75, 192, 192)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      }
    ];

    // Add presence dataset if there's any presence data
    if (days.some(day => day.presenceMinutes > 0)) {
      datasets.push({
        label: 'Office Presence',
        data: days.map(day => (day.presenceMinutes / 60).toFixed(1)),
        fill: false,
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        tension: 0.1,
        pointBackgroundColor: 'rgb(255, 159, 64)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      });
    }

    const data = {
      labels: days.map(day => day.label),
      datasets
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Daily Time Tracking & Office Presence (Last 14 Days)',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const day = days[context.dataIndex];
              if (context.datasetIndex === 0) {
                return `${day.label}: ${formatDuration(day.totalMinutes)} (${day.entryCount} entries)`;
              } else {
                return `${day.label}: ${formatDuration(day.presenceMinutes)} presence (${day.presenceCount} sessions)`;
              }
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Hours'
          }
        }
      }
    };

    return { data, options };
  };

  const generateProjectPieChart = () => {
    const projectData = projects.map(project => {
      const projectEntries = filteredEntries.filter(entry => entry.project_id === project.id);
      const totalMinutes = projectEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
      return {
        project,
        totalMinutes
      };
    }).filter(data => data.totalMinutes > 0);

    if (projectData.length === 0) {
      return null;
    }

    const data = {
      labels: projectData.map(data => data.project.name),
      datasets: [
        {
          data: projectData.map(data => (data.totalMinutes / 60).toFixed(1)),
          backgroundColor: projectData.map(data => data.project.color || '#4CAF50'),
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
        },
        title: {
          display: true,
          text: 'Time Distribution by Project',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const dataPoint = projectData[context.dataIndex];
              const total = projectData.reduce((sum, data) => sum + data.totalMinutes, 0);
              const percentage = ((dataPoint.totalMinutes / total) * 100).toFixed(1);
              return `${dataPoint.project.name}: ${formatDuration(dataPoint.totalMinutes)} (${percentage}%)`;
            }
          }
        }
      }
    };

    return { data, options };
  };

  const renderChart = () => {
    let chartConfig = null;

    switch (chartType) {
      case 'projects':
        chartConfig = generateProjectChart();
        break;
      case 'projectsPie':
        chartConfig = generateProjectPieChart();
        break;
      case 'weekly':
        chartConfig = generateWeeklyChart();
        break;
      case 'daily':
        chartConfig = generateDailyChart();
        break;
    }

    if (!chartConfig) {
      return (
        <div className="empty-state">
          <h3>No Data Available</h3>
          <p>No time entries or presence data found for the selected date range.</p>
        </div>
      );
    }

    const ChartComponent = chartType === 'projectsPie' ? Pie : 
                          chartType === 'daily' ? Line : Bar;

    return (
      <div className="chart-container">
        <ChartComponent data={chartConfig.data} options={chartConfig.options} />
      </div>
    );
  };

  const getTotalStats = () => {
    const totalMinutes = filteredEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
    const totalEntries = filteredEntries.length;
    const uniqueDays = new Set(filteredEntries.map(entry => 
      format(parseISO(entry.start_time), 'yyyy-MM-dd')
    )).size;
    const averagePerDay = uniqueDays > 0 ? totalMinutes / uniqueDays : 0;

    // Presence statistics
    const totalPresenceMinutes = filteredPresence.reduce((total, presence) => total + (presence.duration || 0), 0);
    const totalPresenceSessions = filteredPresence.length;
    const uniquePresenceDays = new Set(filteredPresence.map(presence => 
      format(parseISO(presence.start_time), 'yyyy-MM-dd')
    )).size;
    const averagePresencePerDay = uniquePresenceDays > 0 ? totalPresenceMinutes / uniquePresenceDays : 0;

    return {
      totalMinutes,
      totalEntries,
      uniqueDays,
      averagePerDay,
      totalPresenceMinutes,
      totalPresenceSessions,
      uniquePresenceDays,
      averagePresencePerDay
    };
  };

  const stats = getTotalStats();

  return (
    <div className="fade-in">
      <div className="card">
        <h2>{t('charts.title')}</h2>
        
        {/* Controls */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">{t('charts.timeByProject')}</label>
            <select
              className="form-select"
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
            >
              <option value="projects">{t('charts.timeByProject')} (Bar)</option>
              <option value="projectsPie">{t('charts.timeByProject')} (Pie)</option>
              <option value="weekly">{t('charts.weeklyTrend')}</option>
              <option value="daily">{t('charts.dailyTimeTracked')}</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">{t('charts.dateRange')}</label>
            <select
              className="form-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="last4weeks">{t('charts.last30Days')}</option>
              <option value="thisMonth">{t('charts.last30Days')}</option>
              <option value="all">{t('charts.allTime')}</option>
            </select>
          </div>
        </div>

        {/* Stats Summary */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1976d2' }}>
              {formatDuration(stats.totalMinutes)}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>{t('charts.totalTime')}</div>
          </div>
          
          <div style={{ padding: '1rem', background: '#e8f5e8', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#388e3c' }}>
              {stats.totalEntries}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>{t('charts.totalEntries')}</div>
          </div>
          
          <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f57c00' }}>
              {stats.uniqueDays}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>{t('charts.activeDays')}</div>
          </div>
          
          <div style={{ padding: '1rem', background: '#fce4ec', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#c2185b' }}>
              {formatDuration(Math.round(stats.averagePerDay))}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>{t('charts.averagePerDay')}</div>
          </div>

          {/* Presence stats - only show if there's presence data */}
          {stats.totalPresenceMinutes > 0 && (
            <>
              <div style={{ padding: '1rem', background: '#fff8e1', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
                  {formatDuration(stats.totalPresenceMinutes)}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Presence Time</div>
              </div>
              
              <div style={{ padding: '1rem', background: '#f3e5f5', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9c27b0' }}>
                  {stats.totalPresenceSessions}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Presence Sessions</div>
              </div>
              
              <div style={{ padding: '1rem', background: '#e8f5e8', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
                  {stats.uniquePresenceDays}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Presence Days</div>
              </div>
              
              <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196f3' }}>
                  {formatDuration(Math.round(stats.averagePresencePerDay))}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Avg Presence/Day</div>
              </div>
            </>
          )}
        </div>

        {/* Chart */}
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartsView;
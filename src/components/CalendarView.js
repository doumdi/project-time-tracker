import React, { useState, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isSameMonth, isToday } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';

const CalendarView = ({ timeEntries, projects }) => {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'
  const [calendarData, setCalendarData] = useState([]);

  useEffect(() => {
    generateCalendarData();
  }, [currentDate, viewMode, timeEntries]);

  const generateCalendarData = () => {
    let startDate, endDate, days;

    switch (viewMode) {
      case 'month':
        startDate = startOfWeek(startOfMonth(currentDate));
        endDate = endOfWeek(endOfMonth(currentDate));
        days = eachDayOfInterval({ start: startDate, end: endDate });
        break;
      case 'week':
        startDate = startOfWeek(currentDate);
        endDate = endOfWeek(currentDate);
        days = eachDayOfInterval({ start: startDate, end: endDate });
        break;
      case 'day':
        days = [currentDate];
        break;
      default:
        days = [];
    }

    const data = days.map(day => {
      const dayEntries = timeEntries.filter(entry => 
        isSameDay(parseISO(entry.start_time), day)
      );

      const entriesByProject = dayEntries.reduce((acc, entry) => {
        const projectId = entry.project_id;
        if (!acc[projectId]) {
          const project = projects.find(p => p.id === projectId);
          acc[projectId] = {
            project: project,
            entries: [],
            totalDuration: 0
          };
        }
        acc[projectId].entries.push(entry);
        acc[projectId].totalDuration += entry.duration || 0;
        return acc;
      }, {});

      return {
        date: day,
        entries: dayEntries,
        projectGroups: Object.values(entriesByProject),
        totalDuration: dayEntries.reduce((total, entry) => total + (entry.duration || 0), 0),
        isCurrentMonth: viewMode === 'month' ? isSameMonth(day, currentDate) : true,
        isToday: isToday(day)
      };
    });

    setCalendarData(data);
  };

  const navigate = (direction) => {
    const amount = direction === 'next' ? 1 : -1;
    
    switch (viewMode) {
      case 'month':
        setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
        break;
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getDateTitle = () => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
      case 'day':
        return format(currentDate, 'EEEE, MMMM dd, yyyy');
      default:
        return '';
    }
  };

  const renderMonthView = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="calendar">
        <div className="calendar-grid">
          {weekDays.map(day => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}
          {calendarData.map((dayData, index) => {
            const dayClasses = [
              'calendar-day',
              !dayData.isCurrentMonth && 'other-month',
              dayData.isToday && 'today'
            ].filter(Boolean).join(' ');

            return (
              <div key={index} className={dayClasses}>
                <div className="calendar-day-number">
                  {format(dayData.date, 'd')}
                </div>
                <div className="calendar-entries">
                  {dayData.projectGroups.slice(0, 3).map((group, idx) => (
                    <div 
                      key={idx}
                      className="calendar-entry"
                      style={{ borderLeftColor: group.project?.color }}
                      title={`${group.project?.name}: ${formatDuration(group.totalDuration)}`}
                    >
                      {group.project?.name.substring(0, 12)}{group.project?.name.length > 12 ? '...' : ''}: {formatDuration(group.totalDuration)}
                    </div>
                  ))}
                  {dayData.projectGroups.length > 3 && (
                    <div className="calendar-entry" style={{ borderLeftColor: '#ccc', fontSize: '0.7rem', fontStyle: 'italic' }}>
                      +{dayData.projectGroups.length - 3} more...
                    </div>
                  )}
                </div>
                {dayData.totalDuration > 0 && (
                  <div className="calendar-day-total">
                    {formatDuration(dayData.totalDuration)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="calendar calendar-week-view">
        <div className="calendar-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}
          {calendarData.map((dayData, index) => {
            const dayClasses = [
              'calendar-day',
              dayData.isToday && 'today'
            ].filter(Boolean).join(' ');

            return (
              <div key={index} className={dayClasses}>
                <div className="calendar-day-number">
                  {format(dayData.date, 'MMM d')}
                </div>
                <div className="calendar-entries">
                  {dayData.entries.map((entry, idx) => (
                    <div 
                      key={idx}
                      className="calendar-entry"
                      style={{ 
                        borderLeftColor: entry.project_color,
                        marginBottom: '0.25rem',
                        padding: '0.25rem'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                        {format(parseISO(entry.start_time), 'HH:mm')} - {entry.project_name}
                      </div>
                      <div style={{ fontSize: '0.6rem' }}>
                        {formatDuration(entry.duration)}
                        {entry.description && ` • ${entry.description.substring(0, 20)}${entry.description.length > 20 ? '...' : ''}`}
                      </div>
                    </div>
                  ))}
                  {dayData.totalDuration > 0 && (
                    <div style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 'bold', 
                      marginTop: '0.5rem',
                      padding: '0.25rem',
                      background: 'rgba(102, 126, 234, 0.1)',
                      borderRadius: '3px'
                    }}>
                      Total: {formatDuration(dayData.totalDuration)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayData = calendarData[0];
    if (!dayData) return null;

    return (
      <div className="card">
        <h3>{format(dayData.date, 'EEEE, MMMM dd, yyyy')}</h3>
        
        {dayData.entries.length === 0 ? (
          <div className="empty-state">
            <h4>No time entries for this day</h4>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e3f2fd', borderRadius: '6px' }}>
              <strong>Total Time: {formatDuration(dayData.totalDuration)}</strong>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Project</th>
                    <th>Description</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {dayData.entries
                    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                    .map(entry => (
                    <tr key={entry.id}>
                      <td>{format(parseISO(entry.start_time), 'HH:mm')}</td>
                      <td>
                        <span 
                          className="project-badge"
                          style={{ backgroundColor: entry.project_color }}
                        >
                          {entry.project_name}
                        </span>
                      </td>
                      <td>{entry.description || '-'}</td>
                      <td>{formatDuration(entry.duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Project Summary */}
            <div style={{ marginTop: '1.5rem' }}>
              <h4>Project Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {dayData.projectGroups.map((group, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '1rem',
                      background: 'white',
                      border: `3px solid ${group.project?.color}`,
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {group.project?.name}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: group.project?.color }}>
                      {formatDuration(group.totalDuration)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="calendar-header">
          <div>
            <h2>{t('calendar.title')}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                className={`btn btn-small ${viewMode === 'month' ? '' : 'btn-secondary'}`}
                onClick={() => setViewMode('month')}
              >
                {t('calendar.month')}
              </button>
              <button
                className={`btn btn-small ${viewMode === 'week' ? '' : 'btn-secondary'}`}
                onClick={() => setViewMode('week')}
              >
                {t('calendar.week')}
              </button>
              <button
                className={`btn btn-small ${viewMode === 'day' ? '' : 'btn-secondary'}`}
                onClick={() => setViewMode('day')}
              >
                {t('calendar.day')}
              </button>
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{getDateTitle()}</h3>
            <div className="calendar-nav">
              <button className="btn btn-secondary btn-small" onClick={() => navigate('prev')}>
                ← {t('calendar.previous')}
              </button>
              <button 
                className="btn btn-secondary btn-small" 
                onClick={() => setCurrentDate(new Date())}
              >
                {t('calendar.today')}
              </button>
              <button className="btn btn-secondary btn-small" onClick={() => navigate('next')}>
                {t('calendar.next')} →
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
    </div>
  );
};

export default CalendarView;
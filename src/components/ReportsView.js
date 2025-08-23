import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReportsView = ({ timeEntries, projects, onRefresh }) => {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [reportStats, setReportStats] = useState({});

  // Initialize date range to last 30 days
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setStartDate(format(thirtyDaysAgo, 'yyyy-MM-dd'));
    setEndDate(format(today, 'yyyy-MM-dd'));
  }, []);

  // Filter entries based on selected criteria
  useEffect(() => {
    let filtered = timeEntries;

    if (startDate) {
      filtered = filtered.filter(entry => 
        format(parseISO(entry.start_time), 'yyyy-MM-dd') >= startDate
      );
    }

    if (endDate) {
      filtered = filtered.filter(entry => 
        format(parseISO(entry.start_time), 'yyyy-MM-dd') <= endDate
      );
    }

    if (selectedProjects.length > 0) {
      filtered = filtered.filter(entry => 
        selectedProjects.includes(entry.project_id.toString())
      );
    }

    setFilteredEntries(filtered);

    // Calculate stats
    const stats = calculateStats(filtered);
    setReportStats(stats);
  }, [timeEntries, startDate, endDate, selectedProjects]);

  const calculateStats = (entries) => {
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
    const totalEntries = entries.length;
    const uniqueDays = new Set(entries.map(entry => 
      format(parseISO(entry.start_time), 'yyyy-MM-dd')
    )).size;

    const projectStats = {};
    entries.forEach(entry => {
      if (!projectStats[entry.project_id]) {
        projectStats[entry.project_id] = {
          name: entry.project_name,
          color: entry.project_color,
          totalMinutes: 0,
          entryCount: 0
        };
      }
      projectStats[entry.project_id].totalMinutes += entry.duration;
      projectStats[entry.project_id].entryCount += 1;
    });

    return {
      totalMinutes,
      totalEntries,
      uniqueDays,
      averagePerDay: uniqueDays > 0 ? totalMinutes / uniqueDays : 0,
      projectStats: Object.values(projectStats)
    };
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}${t('common.hours')} ${mins}${t('common.minutes')}` : `${mins}${t('common.minutes')}`;
  };

  const handleProjectToggle = (projectId) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = margin;

      // Title
      pdf.setFontSize(20);
      pdf.text('Time Tracking Report', margin, yPosition);
      yPosition += 15;

      // Generation date
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${format(new Date(), 'PPP')}`, margin, yPosition);
      yPosition += 10;

      // Date range
      pdf.text(`Period: ${format(parseISO(startDate + 'T00:00:00'), 'PP')} - ${format(parseISO(endDate + 'T00:00:00'), 'PP')}`, margin, yPosition);
      yPosition += 15;

      // Summary stats
      pdf.setFontSize(16);
      pdf.text('Summary', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text(`Total Time Tracked: ${formatDuration(reportStats.totalMinutes)}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Total Entries: ${reportStats.totalEntries}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Active Days: ${reportStats.uniqueDays}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Average per Day: ${formatDuration(Math.round(reportStats.averagePerDay))}`, margin, yPosition);
      yPosition += 15;

      // Project breakdown
      if (reportStats.projectStats && reportStats.projectStats.length > 0) {
        pdf.setFontSize(16);
        pdf.text('Project Breakdown', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(12);
        reportStats.projectStats.forEach(project => {
          if (yPosition > pdf.internal.pageSize.getHeight() - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.text(`• ${project.name}: ${formatDuration(project.totalMinutes)} (${project.entryCount} entries)`, margin, yPosition);
          yPosition += 7;
        });
        yPosition += 10;
      }

      // Time entries table
      if (filteredEntries.length > 0) {
        pdf.setFontSize(16);
        pdf.text('Time Entries', margin, yPosition);
        yPosition += 10;

        // Group entries by project
        const entriesByProject = {};
        filteredEntries.forEach(entry => {
          if (!entriesByProject[entry.project_name]) {
            entriesByProject[entry.project_name] = [];
          }
          entriesByProject[entry.project_name].push(entry);
        });

        pdf.setFontSize(10);
        Object.entries(entriesByProject).forEach(([projectName, entries]) => {
          if (yPosition > pdf.internal.pageSize.getHeight() - 40) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFontSize(12);
          pdf.text(projectName, margin, yPosition);
          yPosition += 8;

          pdf.setFontSize(10);
          entries.forEach(entry => {
            if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
              pdf.addPage();
              yPosition = margin;
            }

            const date = format(parseISO(entry.start_time), 'MM/dd/yyyy');
            const time = format(parseISO(entry.start_time), 'HH:mm');
            const duration = formatDuration(entry.duration);
            const description = entry.description || 'No description';
            
            const text = `  ${date} ${time} - ${duration} - ${description}`;
            pdf.text(text, margin, yPosition);
            yPosition += 5;
          });
          yPosition += 5;
        });
      }

      // Save PDF
      const fileName = `time-report-${startDate}-to-${endDate}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>{t('reports.title')}</h2>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* Filters */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem',
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: '6px'
        }}>
          <div>
            <label className="form-label">{t('reports.startDate')}</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">{t('reports.endDate')}</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">{t('reports.selectProjects')}</label>
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedProjects.length === 0}
                    onChange={() => setSelectedProjects([])}
                  />
                  <span>{t('reports.allProjects')}</span>
                </label>
              </div>
              {projects.map(project => (
                <div key={project.id} style={{ marginBottom: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id.toString())}
                      onChange={() => handleProjectToggle(project.id.toString())}
                    />
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: project.color,
                        borderRadius: '2px'
                      }}
                    />
                    <span>{project.name}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              className="btn btn-primary"
              onClick={generatePDF}
              disabled={isGenerating || filteredEntries.length === 0}
              style={{ width: '100%' }}
            >
              {isGenerating ? t('reports.generating') : t('reports.generatePDF')}
            </button>
          </div>
        </div>

        {/* Preview stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1976d2' }}>
              {formatDuration(reportStats.totalMinutes || 0)}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>{t('charts.totalTime')}</div>
          </div>

          <div style={{ padding: '1rem', background: '#f3e5f5', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7b1fa2' }}>
              {reportStats.totalEntries || 0}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>{t('charts.totalEntries')}</div>
          </div>

          <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f57c00' }}>
              {reportStats.uniqueDays || 0}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>{t('charts.activeDays')}</div>
          </div>

          <div style={{ padding: '1rem', background: '#e8f5e8', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#388e3c' }}>
              {formatDuration(Math.round(reportStats.averagePerDay || 0))}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>{t('charts.averagePerDay')}</div>
          </div>
        </div>

        {/* Preview of entries */}
        {filteredEntries.length > 0 ? (
          <div>
            <h3>{t('reports.preview')} ({filteredEntries.length} {t('entries.entries')})</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>{t('entries.project')}</th>
                    <th>{t('entries.description')}</th>
                    <th>{t('entries.startTime')}</th>
                    <th>{t('entries.duration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.slice(0, 100).map(entry => (
                    <tr key={entry.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              backgroundColor: entry.project_color,
                              borderRadius: '2px'
                            }}
                          />
                          {entry.project_name}
                        </div>
                      </td>
                      <td>{entry.description || '-'}</td>
                      <td>{format(parseISO(entry.start_time), 'MM/dd/yyyy HH:mm')}</td>
                      <td>{formatDuration(entry.duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEntries.length > 100 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                  {t('reports.showingFirst100')} {filteredEntries.length} {t('entries.entries')}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <p>{t('reports.noEntries')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsView;
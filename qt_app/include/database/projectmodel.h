#ifndef PROJECTMODEL_H
#define PROJECTMODEL_H

#include <QObject>
#include <QString>
#include <QDateTime>
#include <QColor>

class ProjectModel : public QObject
{
    Q_OBJECT
    Q_PROPERTY(int id READ id WRITE setId NOTIFY idChanged)
    Q_PROPERTY(QString name READ name WRITE setName NOTIFY nameChanged)
    Q_PROPERTY(QString description READ description WRITE setDescription NOTIFY descriptionChanged)
    Q_PROPERTY(QColor color READ color WRITE setColor NOTIFY colorChanged)
    Q_PROPERTY(double budget READ budget WRITE setBudget NOTIFY budgetChanged)
    Q_PROPERTY(double hourlyRate READ hourlyRate WRITE setHourlyRate NOTIFY hourlyRateChanged)
    Q_PROPERTY(QString currency READ currency WRITE setCurrency NOTIFY currencyChanged)
    Q_PROPERTY(QDateTime startDate READ startDate WRITE setStartDate NOTIFY startDateChanged)
    Q_PROPERTY(QDateTime endDate READ endDate WRITE setEndDate NOTIFY endDateChanged)

public:
    explicit ProjectModel(QObject *parent = nullptr);
    
    int id() const { return m_id; }
    QString name() const { return m_name; }
    QString description() const { return m_description; }
    QColor color() const { return m_color; }
    double budget() const { return m_budget; }
    double hourlyRate() const { return m_hourlyRate; }
    QString currency() const { return m_currency; }
    QDateTime startDate() const { return m_startDate; }
    QDateTime endDate() const { return m_endDate; }
    
    void setId(int id);
    void setName(const QString &name);
    void setDescription(const QString &description);
    void setColor(const QColor &color);
    void setBudget(double budget);
    void setHourlyRate(double rate);
    void setCurrency(const QString &currency);
    void setStartDate(const QDateTime &date);
    void setEndDate(const QDateTime &date);

signals:
    void idChanged();
    void nameChanged();
    void descriptionChanged();
    void colorChanged();
    void budgetChanged();
    void hourlyRateChanged();
    void currencyChanged();
    void startDateChanged();
    void endDateChanged();

private:
    int m_id;
    QString m_name;
    QString m_description;
    QColor m_color;
    double m_budget;
    double m_hourlyRate;
    QString m_currency;
    QDateTime m_startDate;
    QDateTime m_endDate;
};

#endif // PROJECTMODEL_H

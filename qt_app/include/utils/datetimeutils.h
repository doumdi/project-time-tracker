#ifndef DATETIMEUTILS_H
#define DATETIMEUTILS_H

#include <QObject>
#include <QDateTime>
#include <QString>

class DateTimeUtils : public QObject
{
    Q_OBJECT
    
public:
    explicit DateTimeUtils(QObject *parent = nullptr);
    
    Q_INVOKABLE static QString formatDuration(int minutes);
    Q_INVOKABLE static QString formatDateTime(const QDateTime &dt, const QString &format = QString());
    Q_INVOKABLE static QString formatDate(const QDateTime &dt);
    Q_INVOKABLE static QString formatTime(const QDateTime &dt);
    Q_INVOKABLE static int minutesBetween(const QDateTime &start, const QDateTime &end);
    Q_INVOKABLE static int roundToFiveMinutes(int minutes);
    Q_INVOKABLE static QDateTime startOfDay(const QDateTime &dt);
    Q_INVOKABLE static QDateTime endOfDay(const QDateTime &dt);
    Q_INVOKABLE static QDateTime startOfWeek(const QDateTime &dt);
    Q_INVOKABLE static QDateTime endOfWeek(const QDateTime &dt);
    Q_INVOKABLE static QDateTime startOfMonth(const QDateTime &dt);
    Q_INVOKABLE static QDateTime endOfMonth(const QDateTime &dt);
};

#endif // DATETIMEUTILS_H

#include "utils/datetimeutils.h"

DateTimeUtils::DateTimeUtils(QObject *parent) : QObject(parent) {}

QString DateTimeUtils::formatDuration(int minutes)
{
    int hours = minutes / 60;
    int mins = minutes % 60;
    
    if (hours > 0) {
        return QString("%1h %2m").arg(hours).arg(mins, 2, 10, QChar('0'));
    }
    return QString("%1m").arg(mins);
}

QString DateTimeUtils::formatDateTime(const QDateTime &dt, const QString &format)
{
    if (format.isEmpty()) {
        return dt.toString("yyyy-MM-dd hh:mm:ss");
    }
    return dt.toString(format);
}

QString DateTimeUtils::formatDate(const QDateTime &dt)
{
    return dt.toString("yyyy-MM-dd");
}

QString DateTimeUtils::formatTime(const QDateTime &dt)
{
    return dt.toString("hh:mm:ss");
}

int DateTimeUtils::minutesBetween(const QDateTime &start, const QDateTime &end)
{
    return start.secsTo(end) / 60;
}

int DateTimeUtils::roundToFiveMinutes(int minutes)
{
    return ((minutes + 2) / 5) * 5;
}

QDateTime DateTimeUtils::startOfDay(const QDateTime &dt)
{
    return QDateTime(dt.date(), QTime(0, 0, 0));
}

QDateTime DateTimeUtils::endOfDay(const QDateTime &dt)
{
    return QDateTime(dt.date(), QTime(23, 59, 59));
}

QDateTime DateTimeUtils::startOfWeek(const QDateTime &dt)
{
    QDate date = dt.date();
    int dayOfWeek = date.dayOfWeek();
    date = date.addDays(-(dayOfWeek - 1));
    return QDateTime(date, QTime(0, 0, 0));
}

QDateTime DateTimeUtils::endOfWeek(const QDateTime &dt)
{
    QDate date = dt.date();
    int dayOfWeek = date.dayOfWeek();
    date = date.addDays(7 - dayOfWeek);
    return QDateTime(date, QTime(23, 59, 59));
}

QDateTime DateTimeUtils::startOfMonth(const QDateTime &dt)
{
    QDate date(dt.date().year(), dt.date().month(), 1);
    return QDateTime(date, QTime(0, 0, 0));
}

QDateTime DateTimeUtils::endOfMonth(const QDateTime &dt)
{
    QDate date = dt.date();
    date = QDate(date.year(), date.month(), date.daysInMonth());
    return QDateTime(date, QTime(23, 59, 59));
}

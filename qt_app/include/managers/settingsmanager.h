#ifndef SETTINGSMANAGER_H
#define SETTINGSMANAGER_H

#include <QObject>
#include <QSettings>
#include <QString>

class SettingsManager : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString language READ language WRITE setLanguage NOTIFY languageChanged)
    Q_PROPERTY(QString currency READ currency WRITE setCurrency NOTIFY currencyChanged)
    Q_PROPERTY(double hourlyRate READ hourlyRate WRITE setHourlyRate NOTIFY hourlyRateChanged)
    Q_PROPERTY(bool officePresenceEnabled READ officePresenceEnabled WRITE setOfficePresenceEnabled NOTIFY officePresenceEnabledChanged)
    Q_PROPERTY(int presenceSaveInterval READ presenceSaveInterval WRITE setPresenceSaveInterval NOTIFY presenceSaveIntervalChanged)
    
public:
    explicit SettingsManager(QObject *parent = nullptr);
    
    QString language() const;
    void setLanguage(const QString &language);
    
    QString currency() const;
    void setCurrency(const QString &currency);
    
    double hourlyRate() const;
    void setHourlyRate(double rate);
    
    bool officePresenceEnabled() const;
    void setOfficePresenceEnabled(bool enabled);
    
    int presenceSaveInterval() const;
    void setPresenceSaveInterval(int minutes);
    
    Q_INVOKABLE QVariant getSetting(const QString &key, const QVariant &defaultValue = QVariant());
    Q_INVOKABLE void setSetting(const QString &key, const QVariant &value);

signals:
    void languageChanged();
    void currencyChanged();
    void hourlyRateChanged();
    void officePresenceEnabledChanged();
    void presenceSaveIntervalChanged();
    void settingChanged(const QString &key);

private:
    QSettings m_settings;
};

#endif // SETTINGSMANAGER_H

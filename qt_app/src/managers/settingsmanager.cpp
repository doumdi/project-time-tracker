#include "managers/settingsmanager.h"

SettingsManager::SettingsManager(QObject *parent)
    : QObject(parent)
    , m_settings("Doumdi", "ProjectTimeTracker")
{
}

QString SettingsManager::language() const
{
    return m_settings.value("language", "en").toString();
}

void SettingsManager::setLanguage(const QString &language)
{
    if (this->language() != language) {
        m_settings.setValue("language", language);
        emit languageChanged();
        emit settingChanged("language");
    }
}

QString SettingsManager::currency() const
{
    return m_settings.value("currency", "USD").toString();
}

void SettingsManager::setCurrency(const QString &currency)
{
    if (this->currency() != currency) {
        m_settings.setValue("currency", currency);
        emit currencyChanged();
        emit settingChanged("currency");
    }
}

double SettingsManager::hourlyRate() const
{
    return m_settings.value("hourlyRate", 0.0).toDouble();
}

void SettingsManager::setHourlyRate(double rate)
{
    if (this->hourlyRate() != rate) {
        m_settings.setValue("hourlyRate", rate);
        emit hourlyRateChanged();
        emit settingChanged("hourlyRate");
    }
}

bool SettingsManager::officePresenceEnabled() const
{
    return m_settings.value("officePresenceEnabled", false).toBool();
}

void SettingsManager::setOfficePresenceEnabled(bool enabled)
{
    if (this->officePresenceEnabled() != enabled) {
        m_settings.setValue("officePresenceEnabled", enabled);
        emit officePresenceEnabledChanged();
        emit settingChanged("officePresenceEnabled");
    }
}

int SettingsManager::presenceSaveInterval() const
{
    return m_settings.value("presenceSaveInterval", 15).toInt();
}

void SettingsManager::setPresenceSaveInterval(int minutes)
{
    if (this->presenceSaveInterval() != minutes) {
        m_settings.setValue("presenceSaveInterval", minutes);
        emit presenceSaveIntervalChanged();
        emit settingChanged("presenceSaveInterval");
    }
}

QVariant SettingsManager::getSetting(const QString &key, const QVariant &defaultValue)
{
    return m_settings.value(key, defaultValue);
}

void SettingsManager::setSetting(const QString &key, const QVariant &value)
{
    m_settings.setValue(key, value);
    emit settingChanged(key);
}

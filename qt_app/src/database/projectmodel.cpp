#include "database/projectmodel.h"

ProjectModel::ProjectModel(QObject *parent)
    : QObject(parent)
    , m_id(-1)
    , m_budget(0.0)
    , m_hourlyRate(0.0)
    , m_currency("USD")
{
}

void ProjectModel::setId(int id) {
    if (m_id != id) {
        m_id = id;
        emit idChanged();
    }
}

void ProjectModel::setName(const QString &name) {
    if (m_name != name) {
        m_name = name;
        emit nameChanged();
    }
}

void ProjectModel::setDescription(const QString &description) {
    if (m_description != description) {
        m_description = description;
        emit descriptionChanged();
    }
}

void ProjectModel::setColor(const QColor &color) {
    if (m_color != color) {
        m_color = color;
        emit colorChanged();
    }
}

void ProjectModel::setBudget(double budget) {
    if (m_budget != budget) {
        m_budget = budget;
        emit budgetChanged();
    }
}

void ProjectModel::setHourlyRate(double rate) {
    if (m_hourlyRate != rate) {
        m_hourlyRate = rate;
        emit hourlyRateChanged();
    }
}

void ProjectModel::setCurrency(const QString &currency) {
    if (m_currency != currency) {
        m_currency = currency;
        emit currencyChanged();
    }
}

void ProjectModel::setStartDate(const QDateTime &date) {
    if (m_startDate != date) {
        m_startDate = date;
        emit startDateChanged();
    }
}

void ProjectModel::setEndDate(const QDateTime &date) {
    if (m_endDate != date) {
        m_endDate = date;
        emit endDateChanged();
    }
}

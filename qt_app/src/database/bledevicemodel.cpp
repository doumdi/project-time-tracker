#include "database/bledevicemodel.h"

BleDeviceModel::BleDeviceModel(QObject *parent)
    : QObject(parent), m_id(-1), m_isActive(true)
{
}

void BleDeviceModel::setId(int id) { if (m_id != id) { m_id = id; emit idChanged(); } }
void BleDeviceModel::setName(const QString &name) { if (m_name != name) { m_name = name; emit nameChanged(); } }
void BleDeviceModel::setAddress(const QString &address) { if (m_address != address) { m_address = address; emit addressChanged(); } }
void BleDeviceModel::setDeviceType(const QString &deviceType) { if (m_deviceType != deviceType) { m_deviceType = deviceType; emit deviceTypeChanged(); } }
void BleDeviceModel::setIsActive(bool isActive) { if (m_isActive != isActive) { m_isActive = isActive; emit isActiveChanged(); } }

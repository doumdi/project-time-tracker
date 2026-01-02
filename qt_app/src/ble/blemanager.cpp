#include "ble/blemanager.h"
#include <QDebug>

BleManager::BleManager(QObject *parent)
    : QObject(parent)
    , m_deviceDiscoveryAgent(new QBluetoothDeviceDiscoveryAgent(this))
    , m_scanning(false)
    , m_bluetoothAvailable(true)
{
    connect(m_deviceDiscoveryAgent, &QBluetoothDeviceDiscoveryAgent::deviceDiscovered,
            this, &BleManager::onDeviceDiscovered);
    connect(m_deviceDiscoveryAgent, &QBluetoothDeviceDiscoveryAgent::finished,
            this, &BleManager::onScanFinished);
    /*
    connect(m_deviceDiscoveryAgent, QOverload<QBluetoothDeviceDiscoveryAgent::Error>::of(&QBluetoothDeviceDiscoveryAgent::error),
            this, &BleManager::onScanError);
    */

    checkBluetoothAvailability();
}

BleManager::~BleManager()
{
    if (m_scanning) {
        m_deviceDiscoveryAgent->stop();
    }
}

void BleManager::checkBluetoothAvailability()
{
    // Check if Bluetooth is available
    // This is a simplified check
    m_bluetoothAvailable = true;
    emit bluetoothAvailableChanged();
}

void BleManager::startScan()
{
    if (m_scanning) {
        return;
    }
    
    m_discoveredDevices.clear();
    m_scanning = true;
    emit scanningChanged();
    
    m_deviceDiscoveryAgent->start(QBluetoothDeviceDiscoveryAgent::LowEnergyMethod);
    qInfo() << "[BLE] Starting device scan";
}

void BleManager::stopScan()
{
    if (!m_scanning) {
        return;
    }
    
    m_deviceDiscoveryAgent->stop();
    m_scanning = false;
    emit scanningChanged();
    qInfo() << "[BLE] Stopped device scan";
}

QVariantList BleManager::getDiscoveredDevices()
{
    QVariantList result;
    for (const auto &device : m_discoveredDevices) {
        QVariantMap deviceMap;
        deviceMap["name"] = device.name();
        deviceMap["address"] = device.address().toString();
        deviceMap["rssi"] = device.rssi();
        result.append(deviceMap);
    }
    return result;
}

bool BleManager::addMonitoredDevice(const QString &name, const QString &address, const QString &deviceType)
{
    // TODO: Add to database
    qInfo() << "[BLE] Adding monitored device:" << name << address;
    return true;
}

bool BleManager::removeMonitoredDevice(int deviceId)
{
    // TODO: Remove from database
    return true;
}

QVariantList BleManager::getMonitoredDevices()
{
    QVariantList result;
    // TODO: Load from database
    return result;
}

bool BleManager::isDeviceDetected(const QString &address)
{
    for (const auto &device : m_discoveredDevices) {
        if (device.address().toString() == address) {
            return true;
        }
    }
    return false;
}

void BleManager::onDeviceDiscovered(const QBluetoothDeviceInfo &device)
{
    m_discoveredDevices.append(device);
    
    QVariantMap deviceMap;
    deviceMap["name"] = device.name();
    deviceMap["address"] = device.address().toString();
    deviceMap["rssi"] = device.rssi();
    
    emit deviceDiscovered(deviceMap);
    emit deviceDetected(device.address().toString());
    
    qInfo() << "[BLE] Device discovered:" << device.name() << device.address().toString();
}

void BleManager::onScanFinished()
{
    m_scanning = false;
    emit scanningChanged();
    emit scanFinished();
    qInfo() << "[BLE] Scan finished, found" << m_discoveredDevices.size() << "devices";
}

void BleManager::onScanError(QBluetoothDeviceDiscoveryAgent::Error error)
{
    QString errorString = m_deviceDiscoveryAgent->errorString();
    qWarning() << "[BLE] Scan error:" << errorString;
    emit this->error(errorString);
    
    m_scanning = false;
    emit scanningChanged();
}

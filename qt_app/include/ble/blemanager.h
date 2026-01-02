#ifndef BLEMANAGER_H
#define BLEMANAGER_H

#include <QObject>
#include <QBluetoothDeviceDiscoveryAgent>
#include <QBluetoothDeviceInfo>
#include <QVariantList>
#include <QTimer>

class BleManager : public QObject
{
    Q_OBJECT
    Q_PROPERTY(bool scanning READ isScanning NOTIFY scanningChanged)
    Q_PROPERTY(bool bluetoothAvailable READ isBluetoothAvailable NOTIFY bluetoothAvailableChanged)
    
public:
    explicit BleManager(QObject *parent = nullptr);
    ~BleManager();
    
    bool isScanning() const { return m_scanning; }
    bool isBluetoothAvailable() const { return m_bluetoothAvailable; }
    
    Q_INVOKABLE void startScan();
    Q_INVOKABLE void stopScan();
    Q_INVOKABLE QVariantList getDiscoveredDevices();
    Q_INVOKABLE bool addMonitoredDevice(const QString &name, const QString &address, const QString &deviceType);
    Q_INVOKABLE bool removeMonitoredDevice(int deviceId);
    Q_INVOKABLE QVariantList getMonitoredDevices();
    Q_INVOKABLE bool isDeviceDetected(const QString &address);

signals:
    void scanningChanged();
    void bluetoothAvailableChanged();
    void deviceDiscovered(const QVariantMap &device);
    void deviceDetected(const QString &address);
    void deviceLost(const QString &address);
    void scanFinished();
    void error(const QString &message);

private slots:
    void onDeviceDiscovered(const QBluetoothDeviceInfo &device);
    void onScanFinished();
    void onScanError(QBluetoothDeviceDiscoveryAgent::Error error);

private:
    QBluetoothDeviceDiscoveryAgent *m_deviceDiscoveryAgent;
    bool m_scanning;
    bool m_bluetoothAvailable;
    QList<QBluetoothDeviceInfo> m_discoveredDevices;
    
    void checkBluetoothAvailability();
};

#endif // BLEMANAGER_H

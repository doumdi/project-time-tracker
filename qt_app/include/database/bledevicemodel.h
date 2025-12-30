#ifndef BLEDEVICEMODEL_H
#define BLEDEVICEMODEL_H

#include <QObject>
#include <QString>

class BleDeviceModel : public QObject
{
    Q_OBJECT
    Q_PROPERTY(int id READ id WRITE setId NOTIFY idChanged)
    Q_PROPERTY(QString name READ name WRITE setName NOTIFY nameChanged)
    Q_PROPERTY(QString address READ address WRITE setAddress NOTIFY addressChanged)
    Q_PROPERTY(QString deviceType READ deviceType WRITE setDeviceType NOTIFY deviceTypeChanged)
    Q_PROPERTY(bool isActive READ isActive WRITE setIsActive NOTIFY isActiveChanged)

public:
    explicit BleDeviceModel(QObject *parent = nullptr);
    
    int id() const { return m_id; }
    QString name() const { return m_name; }
    QString address() const { return m_address; }
    QString deviceType() const { return m_deviceType; }
    bool isActive() const { return m_isActive; }
    
    void setId(int id);
    void setName(const QString &name);
    void setAddress(const QString &address);
    void setDeviceType(const QString &deviceType);
    void setIsActive(bool isActive);

signals:
    void idChanged();
    void nameChanged();
    void addressChanged();
    void deviceTypeChanged();
    void isActiveChanged();

private:
    int m_id;
    QString m_name;
    QString m_address;
    QString m_deviceType;
    bool m_isActive;
};

#endif // BLEDEVICEMODEL_H

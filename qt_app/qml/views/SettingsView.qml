import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import ProjectTimeTracker 1.0

Item {
    id: root

    property bool showBleDevices: false
    property bool bleAvailable: false

    Component.onCompleted: {
        checkBleAvailability()
        loadBleDevices()
    }

    function checkBleAvailability() {
        bleAvailable = typeof BleManager !== 'undefined'
    }

    function loadBleDevices() {
        if (!bleAvailable) return
        
        monitoredDevicesModel.clear()
        var devices = BleManager.getMonitoredDevices()
        for (var i = 0; i < devices.length; i++) {
            monitoredDevicesModel.append(devices[i])
        }
    }

    StackView {
        id: stackView
        anchors.fill: parent
        initialItem: mainSettings
    }

    Component {
        id: mainSettings

        ScrollView {
            clip: true

            ColumnLayout {
                width: parent.width - 40
                anchors.margins: 20
                spacing: 10

                Label {
                    text: qsTr("Settings")
                    font.pixelSize: 24
                    font.bold: true
                }

                GroupBox {
                    title: qsTr("Language")
                    Layout.fillWidth: true

                    ComboBox {
                        model: ["English", "Français"]
                        currentIndex: SettingsManager.language === "fr" ? 1 : 0
                        onCurrentIndexChanged: {
                            SettingsManager.language = currentIndex === 1 ? "fr" : "en"
                        }
                    }
                }

                GroupBox {
                    title: qsTr("Currency & Rates")
                    Layout.fillWidth: true

                    ColumnLayout {
                        anchors.fill: parent
                        spacing: 10

                        RowLayout {
                            Label { text: qsTr("Currency:") }
                            TextField {
                                text: SettingsManager.currency
                                onEditingFinished: SettingsManager.currency = text
                                Layout.preferredWidth: 100
                            }
                        }

                        RowLayout {
                            Label { text: qsTr("Hourly Rate:") }
                            SpinBox {
                                from: 0
                                to: 10000
                                value: SettingsManager.hourlyRate
                                onValueChanged: SettingsManager.hourlyRate = value
                            }
                        }
                    }
                }

                GroupBox {
                    title: qsTr("Office Presence")
                    Layout.fillWidth: true
                    visible: bleAvailable

                    ColumnLayout {
                        anchors.fill: parent
                        spacing: 10

                        CheckBox {
                            text: qsTr("Enable Office Presence Tracking")
                            checked: SettingsManager.officePresenceEnabled
                            onCheckedChanged: SettingsManager.officePresenceEnabled = checked
                        }

                        RowLayout {
                            Label { text: qsTr("Save Interval (minutes):") }
                            SpinBox {
                                from: 1
                                to: 480
                                value: SettingsManager.presenceSaveInterval
                                onValueChanged: SettingsManager.presenceSaveInterval = value
                            }
                        }

                        Button {
                            text: qsTr("Manage BLE Devices")
                            onClicked: stackView.push(bleDevicesView)
                        }
                    }
                }

                GroupBox {
                    title: qsTr("Application Information")
                    Layout.fillWidth: true

                    ColumnLayout {
                        anchors.fill: parent
                        spacing: 5

                        Label {
                            text: qsTr("Version: ") + "1.0.15"
                            font.pixelSize: 12
                        }

                        Label {
                            text: isDemoMode ? qsTr("Running in Demo Mode") : qsTr("Production Mode")
                            font.pixelSize: 12
                            color: isDemoMode ? "orange" : "green"
                        }

                        Label {
                            text: qsTr("Qt Version: ") + "6.x"
                            font.pixelSize: 12
                        }
                    }
                }

                Item {
                    Layout.fillHeight: true
                }
            }
        }
    }

    Component {
        id: bleDevicesView

        Item {
            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 20
                spacing: 10

                RowLayout {
                    Layout.fillWidth: true
                    
                    Button {
                        text: "← " + qsTr("Back")
                        onClicked: stackView.pop()
                    }
                    
                    Label {
                        text: qsTr("BLE Devices")
                        font.pixelSize: 24
                        font.bold: true
                        Layout.fillWidth: true
                    }
                }

                // Monitored Devices
                GroupBox {
                    title: qsTr("Monitored Devices")
                    Layout.fillWidth: true
                    Layout.preferredHeight: 200

                    ColumnLayout {
                        anchors.fill: parent
                        spacing: 10

                        ListView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            model: ListModel {
                                id: monitoredDevicesModel
                            }
                            clip: true
                            
                            delegate: ItemDelegate {
                                width: ListView.view.width
                                text: model.name + " (" + model.address + ")"
                                
                                RowLayout {
                                    anchors.right: parent.right
                                    anchors.verticalCenter: parent.verticalCenter
                                    anchors.margins: 10
                                    
                                    Button {
                                        text: qsTr("Remove")
                                        onClicked: {
                                            BleManager.removeMonitoredDevice(model.id)
                                            loadBleDevices()
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Scan for devices
                GroupBox {
                    title: qsTr("Scan for Devices")
                    Layout.fillWidth: true
                    Layout.fillHeight: true

                    ColumnLayout {
                        anchors.fill: parent
                        spacing: 10

                        RowLayout {
                            Button {
                                id: scanButton
                                text: BleManager.scanning ? qsTr("Stop Scan") : qsTr("Start Scan")
                                onClicked: {
                                    if (BleManager.scanning) {
                                        BleManager.stopScan()
                                    } else {
                                        discoveredDevicesModel.clear()
                                        BleManager.startScan()
                                    }
                                }
                            }
                            
                            Label {
                                text: BleManager.scanning ? qsTr("Scanning...") : qsTr("Not scanning")
                                color: BleManager.scanning ? "green" : "gray"
                            }
                        }

                        ListView {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            model: ListModel {
                                id: discoveredDevicesModel
                            }
                            clip: true
                            
                            delegate: ItemDelegate {
                                width: ListView.view.width
                                text: model.name + " (" + model.address + ")"
                                
                                RowLayout {
                                    anchors.right: parent.right
                                    anchors.verticalCenter: parent.verticalCenter
                                    anchors.margins: 10
                                    
                                    Button {
                                        text: qsTr("Add")
                                        onClicked: {
                                            if (BleManager.addMonitoredDevice(model.name, model.address, "generic")) {
                                                loadBleDevices()
                                                // Show success message
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Connections {
                target: bleAvailable ? BleManager : null
                function onDeviceDiscovered(device) {
                    // Check if device already in list
                    var found = false
                    for (var i = 0; i < discoveredDevicesModel.count; i++) {
                        if (discoveredDevicesModel.get(i).address === device.address) {
                            found = true
                            break
                        }
                    }
                    if (!found) {
                        discoveredDevicesModel.append(device)
                    }
                }
                function onScanFinished() {
                    // Scan completed
                }
            }
        }
    }
}

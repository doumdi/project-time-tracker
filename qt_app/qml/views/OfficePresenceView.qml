import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import ProjectTimeTracker 1.0

Item {
    id: root

    property bool bleAvailable: false
    property bool monitorActive: false
    property bool inOffice: false
    property int sessionDuration: 0

    Component.onCompleted: {
        checkBleAvailability()
        loadPresenceData()
        updateStatus()
    }

    Timer {
        id: statusTimer
        interval: 30000 // 30 seconds
        running: true
        repeat: true
        onTriggered: updateStatus()
    }

    Timer {
        id: dataRefreshTimer
        interval: 60000 // 1 minute
        running: true
        repeat: true
        onTriggered: loadPresenceData()
    }

    function checkBleAvailability() {
        // Check if BLE is available (requires conditional compilation)
        bleAvailable = typeof BleManager !== 'undefined'
        if (!bleAvailable) {
            statusLabel.text = qsTr("Bluetooth is not available on this platform")
        }
    }

    function updateStatus() {
        if (!bleAvailable) return
        
        try {
            monitorActive = PresenceMonitor.active
            inOffice = PresenceMonitor.inOffice
            sessionDuration = PresenceMonitor.sessionDuration()
            
            updateStatusDisplay()
        } catch (error) {
            console.log("Error updating status:", error)
        }
    }

    function updateStatusDisplay() {
        if (monitorActive && inOffice) {
            statusLabel.text = qsTr("In Office - ") + formatDuration(sessionDuration / 60)
            statusLabel.color = "green"
        } else if (monitorActive) {
            statusLabel.text = qsTr("Monitoring Active - Not Detected")
            statusLabel.color = "orange"
        } else {
            statusLabel.text = qsTr("Monitoring Inactive")
            statusLabel.color = "gray"
        }
    }

    function loadPresenceData() {
        if (!bleAvailable) return
        
        presenceModel.clear()
        var presenceEntries = PresenceMonitor.getTodayPresence()
        for (var i = 0; i < presenceEntries.length; i++) {
            presenceModel.append(presenceEntries[i])
        }
        
        updateTotalTime()
    }

    function updateTotalTime() {
        var total = PresenceMonitor.getTotalMinutesToday()
        totalTimeLabel.text = qsTr("Total Today: ") + formatDuration(total)
    }

    function formatDuration(minutes) {
        var hours = Math.floor(minutes / 60)
        var mins = minutes % 60
        if (hours === 0) return mins + "m"
        if (mins === 0) return hours + "h"
        return hours + "h " + mins + "m"
    }

    function formatTime(dateTime) {
        return Qt.formatDateTime(new Date(dateTime), "hh:mm")
    }

    function startMonitoring() {
        if (!bleAvailable) {
            errorDialog.text = qsTr("Bluetooth is not available")
            errorDialog.open()
            return
        }
        
        try {
            PresenceMonitor.start()
            updateStatus()
        } catch (error) {
            errorDialog.text = qsTr("Failed to start monitoring: ") + error
            errorDialog.open()
        }
    }

    function stopMonitoring() {
        if (!bleAvailable) return
        
        try {
            PresenceMonitor.stop()
            updateStatus()
        } catch (error) {
            errorDialog.text = qsTr("Failed to stop monitoring: ") + error
            errorDialog.open()
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 20
        spacing: 10

        // Header
        RowLayout {
            Layout.fillWidth: true
            
            Label {
                text: qsTr("Office Presence")
                font.pixelSize: 24
                font.bold: true
                Layout.fillWidth: true
            }
            
            Button {
                text: qsTr("Manage Devices")
                visible: bleAvailable
                onClicked: {
                    // This would open BLE Devices view
                    // For now, show info dialog
                    infoDialog.text = qsTr("To manage BLE devices, please use the Settings view or add devices through the BLE interface.")
                    infoDialog.open()
                }
            }
        }

        // Current Status
        GroupBox {
            title: qsTr("Current Status")
            Layout.fillWidth: true

            ColumnLayout {
                anchors.fill: parent
                spacing: 10

                Label {
                    id: statusLabel
                    text: qsTr("Loading...")
                    font.pixelSize: 16
                    font.bold: true
                }

                RowLayout {
                    Button {
                        text: monitorActive ? qsTr("Stop Monitoring") : qsTr("Start Monitoring")
                        highlighted: !monitorActive
                        enabled: bleAvailable
                        onClicked: {
                            if (monitorActive) {
                                stopMonitoring()
                            } else {
                                startMonitoring()
                            }
                        }
                    }

                    Label {
                        id: totalTimeLabel
                        text: qsTr("Total Today: 0h 0m")
                        font.pixelSize: 14
                    }
                }

                Label {
                    visible: !bleAvailable
                    text: qsTr("Bluetooth Low Energy is required for presence monitoring.\nThis feature may not be available on all platforms.")
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                    color: "orange"
                }
            }
        }

        // Today's Sessions
        GroupBox {
            title: qsTr("Today's Presence Sessions")
            Layout.fillWidth: true
            Layout.fillHeight: true

            ScrollView {
                anchors.fill: parent
                clip: true

                ListView {
                    model: ListModel {
                        id: presenceModel
                    }
                    spacing: 5
                    delegate: Rectangle {
                        width: ListView.view ? ListView.view.width : 0
                        height: 60
                        color: index % 2 === 0 ? "#ffffff" : "#f9f9f9"
                        radius: 4
                        border.color: "#e0e0e0"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 10

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Label {
                                    text: qsTr("Session ") + (index + 1)
                                    font.bold: true
                                    font.pixelSize: 14
                                }

                                Label {
                                    text: formatTime(model.start_time) + 
                                          (model.end_time ? " - " + formatTime(model.end_time) : " - " + qsTr("Ongoing"))
                                    font.pixelSize: 12
                                    color: "gray"
                                }
                            }

                            Label {
                                text: formatDuration(model.duration || 0)
                                font.pixelSize: 14
                                font.bold: true
                            }
                        }
                    }
                }
            }
        }

        // Instructions
        GroupBox {
            title: qsTr("How It Works")
            Layout.fillWidth: true

            Label {
                text: qsTr("Office Presence uses Bluetooth Low Energy (BLE) to detect when you're in the office.\n\n" +
                          "1. Add your BLE devices (phone, smartwatch, etc.) in Settings\n" +
                          "2. Start monitoring when you arrive at the office\n" +
                          "3. The system will automatically track your presence\n" +
                          "4. Sessions are saved with timestamps and durations")
                wrapMode: Text.WordWrap
                anchors.fill: parent
            }
        }
    }

    // Info Dialog
    Dialog {
        id: infoDialog
        title: qsTr("Information")
        modal: true
        standardButtons: Dialog.Ok
        anchors.centerIn: parent

        property string text: ""

        Label {
            text: infoDialog.text
            wrapMode: Text.WordWrap
        }
    }

    // Error Dialog
    Dialog {
        id: errorDialog
        title: qsTr("Error")
        modal: true
        standardButtons: Dialog.Ok
        anchors.centerIn: parent

        property string text: ""

        Label {
            text: errorDialog.text
            wrapMode: Text.WordWrap
        }
    }

    Connections {
        target: bleAvailable ? PresenceMonitor : null
        function onActiveChanged() {
            updateStatus()
        }
        function onInOfficeChanged() {
            updateStatus()
            loadPresenceData()
        }
        function onSessionStarted() {
            loadPresenceData()
        }
        function onSessionEnded() {
            loadPresenceData()
        }
    }

    onVisibleChanged: {
        if (visible) {
            checkBleAvailability()
            updateStatus()
            loadPresenceData()
        }
    }
}

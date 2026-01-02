import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import ProjectTimeTracker 1.0

Item {
    ColumnLayout {
        anchors.fill: parent
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

                RowLayout {
                    Label { text: qsTr("Currency:") }
                    TextField {
                        text: SettingsManager.currency
                        onEditingFinished: SettingsManager.currency = text
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

            ColumnLayout {
                anchors.fill: parent

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
            }
        }

        Item {
            Layout.fillHeight: true
        }
    }
}

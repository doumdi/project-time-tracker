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
            text: qsTr("Time Tracker")
            font.pixelSize: 24
            font.bold: true
        }

        GroupBox {
            title: qsTr("Active Timer")
            Layout.fillWidth: true

            ColumnLayout {
                anchors.fill: parent
                spacing: 10

                RowLayout {
                    Label {
                        text: qsTr("Status:")
                        font.bold: true
                    }
                    Label {
                        text: TimeEntryManager.timerRunning ? qsTr("Running") : qsTr("Stopped")
                        color: TimeEntryManager.timerRunning ? "green" : "gray"
                    }
                }

                RowLayout {
                    ComboBox {
                        id: projectComboBox
                        Layout.fillWidth: true
                        model: ListModel {
                            id: projectsModel
                        }
                        textRole: "name"
                        enabled: !TimeEntryManager.timerRunning
                    }

                    Button {
                        text: TimeEntryManager.timerRunning ? qsTr("Stop Timer") : qsTr("Start Timer")
                        highlighted: true
                        enabled: projectComboBox.currentIndex >= 0
                        onClicked: {
                            if (TimeEntryManager.timerRunning) {
                                TimeEntryManager.stopTimer()
                            } else {
                                var projectId = projectsModel.get(projectComboBox.currentIndex).id
                                TimeEntryManager.startTimer(projectId, -1, "")
                            }
                        }
                    }
                }
            }
        }

        Item {
            Layout.fillHeight: true
        }
    }

    Component.onCompleted: {
        refreshProjects()
    }

    function refreshProjects() {
        projectsModel.clear()
        var projects = ProjectManager.getAllProjects()
        for (var i = 0; i < projects.length; i++) {
            projectsModel.append(projects[i])
        }
    }
}

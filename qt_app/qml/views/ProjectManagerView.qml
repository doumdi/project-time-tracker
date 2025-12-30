import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import ProjectTimeTracker 1.0

Item {
    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 20
        spacing: 10

        RowLayout {
            Label {
                text: qsTr("Projects")
                font.pixelSize: 24
                font.bold: true
                Layout.fillWidth: true
            }

            Button {
                text: qsTr("Add Project")
                onClicked: addProjectDialog.open()
            }
        }

        ListView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            model: ListModel {
                id: projectsListModel
            }
            delegate: ItemDelegate {
                width: ListView.view.width
                text: model.name
                onClicked: {
                    // TODO: Edit project
                }
            }
        }
    }

    Dialog {
        id: addProjectDialog
        title: qsTr("Add Project")
        standardButtons: Dialog.Ok | Dialog.Cancel

        ColumnLayout {
            TextField {
                id: nameField
                placeholderText: qsTr("Project Name")
                Layout.fillWidth: true
            }

            TextField {
                id: descField
                placeholderText: qsTr("Description")
                Layout.fillWidth: true
            }
        }

        onAccepted: {
            var projectData = {
                "name": nameField.text,
                "description": descField.text,
                "color": "#3498db"
            }
            ProjectManager.createProject(projectData)
            refreshProjects()
            nameField.text = ""
            descField.text = ""
        }
    }

    Component.onCompleted: {
        refreshProjects()
    }

    function refreshProjects() {
        projectsListModel.clear()
        var projects = ProjectManager.getAllProjects()
        for (var i = 0; i < projects.length; i++) {
            projectsListModel.append(projects[i])
        }
    }
}

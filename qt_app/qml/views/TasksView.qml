import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import ProjectTimeTracker 1.0

Item {
    id: root

    Component.onCompleted: {
        loadTasks()
        loadProjects()
    }

    Connections {
        target: TaskManager
        function onTasksChanged() {
            loadTasks()
        }
    }

    Connections {
        target: ProjectManager
        function onProjectsChanged() {
            loadProjects()
        }
    }

    function loadTasks() {
        tasksModel.clear()
        var tasks = TaskManager.getAllTasks()
        for (var i = 0; i < tasks.length; i++) {
            tasksModel.append(tasks[i])
        }
    }

    function loadProjects() {
        projectsModel.clear()
        var projects = ProjectManager.getAllProjects()
        for (var i = 0; i < projects.length; i++) {
            projectsModel.append(projects[i])
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
                text: qsTr("Tasks")
                font.pixelSize: 24
                font.bold: true
                Layout.fillWidth: true
            }
            Button {
                text: qsTr("Create Task")
                highlighted: true
                onClicked: {
                    taskDialog.isEditing = false
                    taskDialog.taskId = -1
                    taskDialog.taskName = ""
                    taskDialog.dueDate = ""
                    taskDialog.projectId = ""
                    taskDialog.allocatedTime = ""
                    taskDialog.open()
                }
            }
        }

        // Search Filter
        TextField {
            id: searchField
            Layout.fillWidth: true
            placeholderText: qsTr("Search tasks...")
            onTextChanged: {
                filterTasks()
            }
        }

        // Tasks List
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            ListView {
                id: tasksListView
                model: ListModel {
                    id: filteredTasksModel
                }
                spacing: 10
                
                delegate: Rectangle {
                    width: ListView.view.width
                    height: taskColumn.height + 20
                    color: "#f5f5f5"
                    radius: 8
                    border.color: "#e0e0e0"
                    border.width: 1

                    ColumnLayout {
                        id: taskColumn
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 5

                        RowLayout {
                            Layout.fillWidth: true
                            Label {
                                text: model.name
                                font.pixelSize: 16
                                font.bold: true
                                Layout.fillWidth: true
                            }
                            
                            Label {
                                visible: model.due_date
                                text: model.due_date ? qsTr("Due: ") + Qt.formatDate(new Date(model.due_date), "MMM dd, yyyy") : ""
                                font.pixelSize: 12
                                color: {
                                    if (!model.due_date) return "gray"
                                    var dueDate = new Date(model.due_date)
                                    var today = new Date()
                                    if (dueDate < today) return "#f44336"
                                    if ((dueDate - today) < 3 * 24 * 60 * 60 * 1000) return "#ff9800"
                                    return "gray"
                                }
                            }

                            Button {
                                text: qsTr("Edit")
                                onClicked: {
                                    taskDialog.isEditing = true
                                    taskDialog.taskId = model.id
                                    taskDialog.taskName = model.name
                                    taskDialog.dueDate = model.due_date || ""
                                    taskDialog.projectId = model.project_id || ""
                                    taskDialog.allocatedTime = model.allocated_time || ""
                                    taskDialog.open()
                                }
                            }
                            Button {
                                text: qsTr("Delete")
                                onClicked: {
                                    deleteDialog.taskId = model.id
                                    deleteDialog.taskName = model.name
                                    deleteDialog.open()
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            Label {
                                text: qsTr("Project: ") + (model.project_name || qsTr("None"))
                                font.pixelSize: 12
                                color: "gray"
                            }
                            Label {
                                visible: model.allocated_time > 0
                                text: qsTr("Allocated: ") + model.allocated_time + qsTr(" minutes")
                                font.pixelSize: 12
                                color: "gray"
                            }
                        }
                    }
                }
            }
        }
    }

    // Task Create/Edit Dialog
    Dialog {
        id: taskDialog
        title: isEditing ? qsTr("Edit Task") : qsTr("Create Task")
        modal: true
        standardButtons: Dialog.Ok | Dialog.Cancel
        anchors.centerIn: parent
        width: 500

        property bool isEditing: false
        property int taskId: -1
        property string taskName: ""
        property string dueDate: ""
        property var projectId: ""
        property var allocatedTime: ""

        ColumnLayout {
            anchors.fill: parent
            spacing: 10

            Label { text: qsTr("Task Name:") }
            TextField {
                id: nameField
                Layout.fillWidth: true
                text: taskDialog.taskName
                placeholderText: qsTr("Enter task name")
            }

            Label { text: qsTr("Due Date:") }
            TextField {
                id: dueDateField
                Layout.fillWidth: true
                text: taskDialog.dueDate
                placeholderText: "YYYY-MM-DD"
            }

            Label { text: qsTr("Project:") }
            ComboBox {
                id: projectComboBox
                Layout.fillWidth: true
                model: projectsModel
                textRole: "name"
                currentIndex: {
                    if (!taskDialog.projectId) return -1
                    for (var i = 0; i < projectsModel.count; i++) {
                        if (projectsModel.get(i).id === taskDialog.projectId) {
                            return i
                        }
                    }
                    return -1
                }
            }

            Label { text: qsTr("Allocated Time (minutes):") }
            SpinBox {
                id: allocatedTimeSpinBox
                Layout.fillWidth: true
                from: 0
                to: 10000
                stepSize: 15
                value: taskDialog.allocatedTime || 0
            }
        }

        onAccepted: {
            if (!nameField.text.trim()) {
                errorDialog.text = qsTr("Task name is required")
                errorDialog.open()
                return
            }

            if (projectComboBox.currentIndex < 0) {
                errorDialog.text = qsTr("Please select a project")
                errorDialog.open()
                return
            }

            var taskData = {
                "name": nameField.text.trim(),
                "due_date": dueDateField.text || null,
                "project_id": projectsModel.get(projectComboBox.currentIndex).id,
                "allocated_time": allocatedTimeSpinBox.value
            }

            if (isEditing) {
                TaskManager.updateTask(taskId, taskData)
            } else {
                TaskManager.createTask(taskData)
            }
        }
    }

    // Delete Confirmation Dialog
    Dialog {
        id: deleteDialog
        title: qsTr("Confirm Delete")
        modal: true
        standardButtons: Dialog.Yes | Dialog.No
        anchors.centerIn: parent

        property int taskId: -1
        property string taskName: ""

        Label {
            text: qsTr("Are you sure you want to delete task: ") + deleteDialog.taskName + "?"
        }

        onAccepted: {
            TaskManager.deleteTask(taskId)
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
        }
    }

    // Projects Model
    ListModel {
        id: projectsModel
    }

    // Tasks Model
    ListModel {
        id: tasksModel
    }

    function filterTasks() {
        filteredTasksModel.clear()
        var searchText = searchField.text.toLowerCase()
        
        for (var i = 0; i < tasksModel.count; i++) {
            var task = tasksModel.get(i)
            if (!searchText || task.name.toLowerCase().indexOf(searchText) >= 0) {
                filteredTasksModel.append(task)
            }
        }
    }

    onVisibleChanged: {
        if (visible) {
            loadTasks()
            filterTasks()
        }
    }
}

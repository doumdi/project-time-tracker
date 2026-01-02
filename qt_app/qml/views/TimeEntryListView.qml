import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import ProjectTimeTracker 1.0

Item {
    id: root

    Component.onCompleted: {
        loadTimeEntries()
        loadProjects()
    }

    Connections {
        target: TimeEntryManager
        function onTimeEntriesChanged() {
            loadTimeEntries()
        }
    }

    Connections {
        target: ProjectManager
        function onProjectsChanged() {
            loadProjects()
        }
    }

    function loadTimeEntries() {
        entriesModel.clear()
        var entries = TimeEntryManager.getAllTimeEntries()
        for (var i = 0; i < entries.length; i++) {
            entriesModel.append(entries[i])
        }
        filterEntries()
    }

    function loadProjects() {
        projectsModel.clear()
        var projects = ProjectManager.getAllProjects()
        for (var i = 0; i < projects.length; i++) {
            projectsModel.append(projects[i])
        }
    }

    function filterEntries() {
        filteredEntriesModel.clear()
        var totalDuration = 0
        
        for (var i = 0; i < entriesModel.count; i++) {
            var entry = entriesModel.get(i)
            var include = true
            
            // Filter by project
            if (projectFilterCombo.currentIndex > 0) {
                var selectedProject = projectsModel.get(projectFilterCombo.currentIndex - 1)
                if (entry.project_id !== selectedProject.id) {
                    include = false
                }
            }
            
            // Filter by description
            if (descriptionFilter.text && entry.description) {
                if (entry.description.toLowerCase().indexOf(descriptionFilter.text.toLowerCase()) < 0) {
                    include = false
                }
            }
            
            // Filter by start date
            if (startDateFilter.text) {
                var entryDate = Qt.formatDate(new Date(entry.start_time), "yyyy-MM-dd")
                if (entryDate < startDateFilter.text) {
                    include = false
                }
            }
            
            // Filter by end date
            if (endDateFilter.text) {
                var entryDate = Qt.formatDate(new Date(entry.start_time), "yyyy-MM-dd")
                if (entryDate > endDateFilter.text) {
                    include = false
                }
            }
            
            if (include) {
                filteredEntriesModel.append(entry)
                totalDuration += entry.duration || 0
            }
        }
        
        updateSummary(filteredEntriesModel.count, totalDuration)
    }

    function updateSummary(count, totalDuration) {
        var hours = Math.floor(totalDuration / 60)
        var minutes = totalDuration % 60
        summaryLabel.text = count + qsTr(" entries • Total: ") + hours + "h " + minutes + "m"
    }

    function clearFilters() {
        projectFilterCombo.currentIndex = 0
        startDateFilter.text = ""
        endDateFilter.text = ""
        descriptionFilter.text = ""
        filterEntries()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 20
        spacing: 10

        // Header
        Label {
            text: qsTr("Time Entries")
            font.pixelSize: 24
            font.bold: true
        }

        // Filters
        GroupBox {
            title: qsTr("Filters")
            Layout.fillWidth: true

            ColumnLayout {
                anchors.fill: parent
                spacing: 10

                // First row
                RowLayout {
                    Layout.fillWidth: true
                    
                    ColumnLayout {
                        Layout.fillWidth: true
                        Label { text: qsTr("Project:") }
                        ComboBox {
                            id: projectFilterCombo
                            Layout.fillWidth: true
                            model: ListModel {
                                id: projectFilterModel
                            }
                            textRole: "name"
                            onCurrentIndexChanged: filterEntries()
                            Component.onCompleted: {
                                projectFilterModel.append({ "name": qsTr("All Projects") })
                            }
                        }
                    }
                    
                    ColumnLayout {
                        Layout.fillWidth: true
                        Label { text: qsTr("From Date:") }
                        TextField {
                            id: startDateFilter
                            Layout.fillWidth: true
                            placeholderText: "YYYY-MM-DD"
                            onTextChanged: filterEntries()
                        }
                    }
                    
                    ColumnLayout {
                        Layout.fillWidth: true
                        Label { text: qsTr("To Date:") }
                        TextField {
                            id: endDateFilter
                            Layout.fillWidth: true
                            placeholderText: "YYYY-MM-DD"
                            onTextChanged: filterEntries()
                        }
                    }
                }

                // Second row
                RowLayout {
                    Layout.fillWidth: true
                    
                    ColumnLayout {
                        Layout.fillWidth: true
                        Label { text: qsTr("Description:") }
                        TextField {
                            id: descriptionFilter
                            Layout.fillWidth: true
                            placeholderText: qsTr("Filter by description...")
                            onTextChanged: filterEntries()
                        }
                    }
                    
                    Button {
                        text: qsTr("Clear Filters")
                        Layout.alignment: Qt.AlignBottom
                        onClicked: clearFilters()
                    }
                }
            }
        }

        // Summary
        Rectangle {
            Layout.fillWidth: true
            height: 40
            color: "#e3f2fd"
            radius: 6

            Label {
                id: summaryLabel
                anchors.centerIn: parent
                font.bold: true
            }
        }

        // Entries List
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            ListView {
                id: entriesListView
                model: ListModel {
                    id: filteredEntriesModel
                }
                spacing: 5
                
                delegate: Rectangle {
                    width: ListView.view.width
                    height: entryColumn.height + 10
                    color: index % 2 === 0 ? "#ffffff" : "#f9f9f9"
                    radius: 4
                    border.color: "#e0e0e0"
                    border.width: 1

                    RowLayout {
                        id: entryColumn
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 10

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2

                            Label {
                                text: model.project_name || qsTr("Unknown Project")
                                font.bold: true
                                font.pixelSize: 14
                            }
                            
                            Label {
                                text: model.description || qsTr("No description")
                                font.pixelSize: 12
                                color: "gray"
                            }
                            
                            Label {
                                text: Qt.formatDateTime(new Date(model.start_time), "MMM dd, yyyy hh:mm")
                                font.pixelSize: 11
                                color: "gray"
                            }
                        }

                        Label {
                            text: {
                                var hours = Math.floor(model.duration / 60)
                                var minutes = model.duration % 60
                                return hours + "h " + minutes + "m"
                            }
                            font.pixelSize: 14
                            font.bold: true
                        }

                        Button {
                            text: qsTr("Edit")
                            onClicked: {
                                editDialog.entryId = model.id
                                editDialog.projectId = model.project_id
                                editDialog.description = model.description || ""
                                editDialog.startTime = model.start_time
                                editDialog.duration = model.duration
                                editDialog.open()
                            }
                        }

                        Button {
                            text: qsTr("Delete")
                            onClicked: {
                                deleteDialog.entryId = model.id
                                deleteDialog.open()
                            }
                        }
                    }
                }
            }
        }
    }

    // Edit Dialog
    Dialog {
        id: editDialog
        title: qsTr("Edit Time Entry")
        modal: true
        standardButtons: Dialog.Ok | Dialog.Cancel
        anchors.centerIn: parent
        width: 500

        property int entryId: -1
        property var projectId: ""
        property string description: ""
        property string startTime: ""
        property int duration: 0

        ColumnLayout {
            anchors.fill: parent
            spacing: 10

            Label { text: qsTr("Project:") }
            ComboBox {
                id: editProjectCombo
                Layout.fillWidth: true
                model: projectsModel
                textRole: "name"
                currentIndex: {
                    for (var i = 0; i < projectsModel.count; i++) {
                        if (projectsModel.get(i).id === editDialog.projectId) {
                            return i
                        }
                    }
                    return 0
                }
            }

            Label { text: qsTr("Description:") }
            TextField {
                id: editDescriptionField
                Layout.fillWidth: true
                text: editDialog.description
            }

            Label { text: qsTr("Duration (minutes):") }
            SpinBox {
                id: editDurationSpinBox
                Layout.fillWidth: true
                from: 5
                to: 1440
                stepSize: 5
                value: editDialog.duration
            }
        }

        onAccepted: {
            var entryData = {
                "project_id": projectsModel.get(editProjectCombo.currentIndex).id,
                "description": editDescriptionField.text,
                "duration": editDurationSpinBox.value,
                "start_time": editDialog.startTime
            }
            TimeEntryManager.updateTimeEntry(entryId, entryData)
        }
    }

    // Delete Confirmation Dialog
    Dialog {
        id: deleteDialog
        title: qsTr("Confirm Delete")
        modal: true
        standardButtons: Dialog.Yes | Dialog.No
        anchors.centerIn: parent

        property int entryId: -1

        Label {
            text: qsTr("Are you sure you want to delete this time entry?")
        }

        onAccepted: {
            TimeEntryManager.deleteTimeEntry(entryId)
        }
    }

    // Models
    ListModel {
        id: projectsModel
    }

    ListModel {
        id: entriesModel
    }

    // Update project filter when projects change
    Connections {
        target: projectsModel
        function onCountChanged() {
            // Rebuild project filter combo
            var currentIndex = projectFilterCombo.currentIndex
            projectFilterModel.clear()
            projectFilterModel.append({ "name": qsTr("All Projects") })
            for (var i = 0; i < projectsModel.count; i++) {
                projectFilterModel.append(projectsModel.get(i))
            }
            projectFilterCombo.currentIndex = Math.min(currentIndex, projectFilterModel.count - 1)
        }
    }

    onVisibleChanged: {
        if (visible) {
            loadTimeEntries()
            loadProjects()
        }
    }
}

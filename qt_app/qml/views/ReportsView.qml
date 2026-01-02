import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import ProjectTimeTracker 1.0

Item {
    id: root

    property var timeEntries: []
    property var projects: []
    property var filteredEntries: []
    property var reportStats: ({})

    Component.onCompleted: {
        loadData()
        initializeDates()
    }

    Connections {
        target: TimeEntryManager
        function onTimeEntriesChanged() {
            loadData()
            filterEntries()
        }
    }

    Connections {
        target: ProjectManager
        function onProjectsChanged() {
            loadData()
            filterEntries()
        }
    }

    function loadData() {
        timeEntries = TimeEntryManager.getAllTimeEntries()
        projects = ProjectManager.getAllProjects()
        updateProjectsList()
    }

    function updateProjectsList() {
        projectsListModel.clear()
        for (var i = 0; i < projects.length; i++) {
            projectsListModel.append({
                "id": projects[i].id,
                "name": projects[i].name,
                "selected": true
            })
        }
    }

    function initializeDates() {
        var today = new Date()
        var thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(today.getDate() - 30)
        
        startDateField.text = Qt.formatDate(thirtyDaysAgo, "yyyy-MM-dd")
        endDateField.text = Qt.formatDate(today, "yyyy-MM-dd")
        
        filterEntries()
    }

    function filterEntries() {
        filteredEntries = []
        
        for (var i = 0; i < timeEntries.length; i++) {
            var entry = timeEntries[i]
            var include = true
            
            // Filter by date range
            if (startDateField.text) {
                var entryDate = new Date(entry.start_time)
                var startDate = new Date(startDateField.text)
                if (entryDate < startDate) {
                    include = false
                }
            }
            
            if (endDateField.text) {
                var entryDate = new Date(entry.start_time)
                var endDate = new Date(endDateField.text)
                endDate.setHours(23, 59, 59, 999)
                if (entryDate > endDate) {
                    include = false
                }
            }
            
            // Filter by selected projects
            var projectSelected = false
            for (var j = 0; j < projectsListModel.count; j++) {
                var proj = projectsListModel.get(j)
                if (proj.id === entry.project_id && proj.selected) {
                    projectSelected = true
                    break
                }
            }
            if (!projectSelected) {
                include = false
            }
            
            if (include) {
                filteredEntries.push(entry)
            }
        }
        
        calculateStats()
    }

    function calculateStats() {
        var totalMinutes = 0
        var uniqueDaysObj = {}
        var projectStats = {}
        
        for (var i = 0; i < filteredEntries.length; i++) {
            var entry = filteredEntries[i]
            totalMinutes += entry.duration || 0
            
            var dateStr = new Date(entry.start_time).toDateString()
            uniqueDaysObj[dateStr] = true
            
            var projectId = entry.project_id
            if (!projectStats[projectId]) {
                projectStats[projectId] = {
                    name: entry.project_name,
                    totalMinutes: 0,
                    entryCount: 0
                }
            }
            projectStats[projectId].totalMinutes += entry.duration || 0
            projectStats[projectId].entryCount++
        }
        
        // Count unique days
        var uniqueDaysCount = 0
        for (var day in uniqueDaysObj) {
            uniqueDaysCount++
        }
        
        var avgPerDay = uniqueDaysCount > 0 ? totalMinutes / uniqueDaysCount : 0
        
        // Convert projectStats object to array
        var projectStatsArray = []
        for (var pid in projectStats) {
            projectStatsArray.push(projectStats[pid])
        }
        
        reportStats = {
            totalMinutes: totalMinutes,
            totalEntries: filteredEntries.length,
            uniqueDays: uniqueDaysCount,
            averagePerDay: avgPerDay,
            projectStats: projectStatsArray
        }
        
        updateStatistics()
    }

    function updateStatistics() {
        statsText.text = 
            qsTr("Total Time: ") + formatDuration(reportStats.totalMinutes) + "\n" +
            qsTr("Total Entries: ") + reportStats.totalEntries + "\n" +
            qsTr("Active Days: ") + reportStats.uniqueDays + "\n" +
            qsTr("Average per Day: ") + formatDuration(Math.round(reportStats.averagePerDay))
    }

    function formatDuration(minutes) {
        var hours = Math.floor(minutes / 60)
        var mins = minutes % 60
        if (hours === 0) return mins + qsTr(" minutes")
        if (mins === 0) return hours + qsTr(" hours")
        return hours + qsTr(" hours ") + mins + qsTr(" minutes")
    }

    function exportReport() {
        // Note: PDF export is not natively supported in Qt Quick
        // This would require additional C++ code
        exportDialog.text = qsTr("Export functionality requires additional C++ implementation.\n\nReport data is available in the view.")
        exportDialog.open()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 20
        spacing: 10

        // Header
        RowLayout {
            Layout.fillWidth: true
            
            Label {
                text: qsTr("Reports")
                font.pixelSize: 24
                font.bold: true
                Layout.fillWidth: true
            }
            
            Button {
                text: qsTr("Export PDF")
                onClicked: exportReport()
            }
        }

        // Filters
        GroupBox {
            title: qsTr("Report Criteria")
            Layout.fillWidth: true

            ColumnLayout {
                anchors.fill: parent
                spacing: 10

                // Date Range
                RowLayout {
                    Layout.fillWidth: true
                    
                    Label { text: qsTr("From:") }
                    TextField {
                        id: startDateField
                        Layout.preferredWidth: 150
                        placeholderText: "YYYY-MM-DD"
                        onTextChanged: filterEntries()
                    }
                    
                    Label { text: qsTr("To:") }
                    TextField {
                        id: endDateField
                        Layout.preferredWidth: 150
                        placeholderText: "YYYY-MM-DD"
                        onTextChanged: filterEntries()
                    }
                }

                // Project Selection
                Label { 
                    text: qsTr("Select Projects:")
                    font.bold: true
                }
                
                ScrollView {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 100
                    clip: true
                    
                    ListView {
                        model: ListModel {
                            id: projectsListModel
                        }
                        spacing: 5
                        delegate: CheckBox {
                            text: model.name
                            checked: model.selected
                            onCheckedChanged: {
                                projectsListModel.setProperty(index, "selected", checked)
                                filterEntries()
                            }
                        }
                    }
                }
            }
        }

        // Statistics Summary
        GroupBox {
            title: qsTr("Summary Statistics")
            Layout.fillWidth: true

            Label {
                id: statsText
                anchors.fill: parent
                font.pixelSize: 14
            }
        }

        // Project Breakdown
        GroupBox {
            title: qsTr("Project Breakdown")
            Layout.fillWidth: true
            Layout.fillHeight: true

            ScrollView {
                anchors.fill: parent
                clip: true

                ListView {
                    model: {
                        var projectList = []
                        if (reportStats.projectStats) {
                            for (var i = 0; i < reportStats.projectStats.length; i++) {
                                projectList.push(reportStats.projectStats[i])
                            }
                        }
                        return projectList
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
                                Label {
                                    text: modelData.name
                                    font.bold: true
                                    font.pixelSize: 14
                                }
                                Label {
                                    text: formatDuration(modelData.totalMinutes)
                                    font.pixelSize: 12
                                    color: "gray"
                                }
                            }

                            Label {
                                text: modelData.entryCount + (modelData.entryCount === 1 ? qsTr(" entry") : qsTr(" entries"))
                                font.pixelSize: 12
                            }
                        }
                    }
                }
            }
        }
    }

    // Export Dialog
    Dialog {
        id: exportDialog
        title: qsTr("Export Information")
        modal: true
        standardButtons: Dialog.Ok
        anchors.centerIn: parent

        property string text: ""

        Label {
            text: exportDialog.text
            wrapMode: Text.WordWrap
        }
    }

    onVisibleChanged: {
        if (visible) {
            loadData()
            filterEntries()
        }
    }
}

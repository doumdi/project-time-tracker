import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtCharts
import ProjectTimeTracker 1.0

Item {
    id: root

    property var timeEntries: []
    property var projects: []

    Component.onCompleted: {
        loadData()
        updateCharts()
    }

    Connections {
        target: TimeEntryManager
        function onTimeEntriesChanged() {
            loadData()
            updateCharts()
        }
    }

    Connections {
        target: ProjectManager
        function onProjectsChanged() {
            loadData()
            updateCharts()
        }
    }

    function loadData() {
        timeEntries = TimeEntryManager.getAllTimeEntries()
        projects = ProjectManager.getAllProjects()
    }

    function updateCharts() {
        updateProjectChart()
        updateWeeklyChart()
    }

    function updateProjectChart() {
        projectSeries.clear()
        
        // Calculate time per project
        var projectTimes = {}
        for (var i = 0; i < timeEntries.length; i++) {
            var entry = timeEntries[i]
            var projectId = entry.project_id
            if (!projectTimes[projectId]) {
                projectTimes[projectId] = 0
            }
            projectTimes[projectId] += entry.duration || 0
        }
        
        // Add to chart
        for (var projectId in projectTimes) {
            var project = findProject(parseInt(projectId))
            if (project) {
                var hours = projectTimes[projectId] / 60.0
                projectSeries.append(project.name, hours)
            }
        }
    }

    function updateWeeklyChart() {
        // Clear any existing sets
        while (weeklySeries.count > 0) {
            weeklySeries.remove(weeklySeries.at(0))
        }
        
        // Clear axis categories
        weeklyAxisX.clear()
        
        // Get last 8 weeks
        var now = new Date()
        var weekData = []
        
        for (var i = 7; i >= 0; i--) {
            var weekStart = new Date(now)
            weekStart.setDate(now.getDate() - (i * 7) - now.getDay())
            weekStart.setHours(0, 0, 0, 0)
            
            var weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            weekEnd.setHours(23, 59, 59, 999)
            
            var weekMinutes = 0
            for (var j = 0; j < timeEntries.length; j++) {
                var entry = timeEntries[j]
                var entryDate = new Date(entry.start_time)
                if (entryDate >= weekStart && entryDate <= weekEnd) {
                    weekMinutes += entry.duration || 0
                }
            }
            
            var label = Qt.formatDate(weekStart, "MMM dd")
            weeklyAxisX.append(label)
            weekData.push(weekMinutes / 60.0)
        }
        
        // Create a BarSet and add values individually
        var barSet = weeklySeries.append("Hours", [])
        if (barSet) {
            for (var i = 0; i < weekData.length; i++) {
                barSet.append(weekData[i])
            }
        }
    }

    function findProject(projectId) {
        for (var i = 0; i < projects.length; i++) {
            if (projects[i].id === projectId) {
                return projects[i]
            }
        }
        return null
    }

    function formatDuration(minutes) {
        var hours = Math.floor(minutes / 60)
        var mins = minutes % 60
        if (hours === 0) return mins + qsTr(" minutes")
        if (mins === 0) return hours + qsTr(" hours")
        return hours + qsTr(" hours ") + mins + qsTr(" minutes")
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 20
        spacing: 10

        // Header
        RowLayout {
            Layout.fillWidth: true
            
            Label {
                text: qsTr("Charts & Analytics")
                font.pixelSize: 24
                font.bold: true
                Layout.fillWidth: true
            }
            
            ComboBox {
                id: dateRangeCombo
                model: [qsTr("Last 4 Weeks"), qsTr("This Month"), qsTr("All Time")]
                currentIndex: 0
                onCurrentIndexChanged: {
                    // TODO: Filter data by date range
                    updateCharts()
                }
            }
        }

        // Charts
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            ColumnLayout {
                width: parent.width - 20
                spacing: 20

                // Project Pie Chart
                GroupBox {
                    title: qsTr("Time by Project")
                    Layout.fillWidth: true
                    Layout.preferredHeight: 400

                    ChartView {
                        anchors.fill: parent
                        antialiasing: true
                        legend.alignment: Qt.AlignBottom

                        PieSeries {
                            id: projectSeries
                        }
                    }
                }

                // Weekly Bar Chart
                GroupBox {
                    title: qsTr("Weekly Time Tracking")
                    Layout.fillWidth: true
                    Layout.preferredHeight: 400

                    ChartView {
                        anchors.fill: parent
                        antialiasing: true
                        legend.visible: false

                        BarSeries {
                            id: weeklySeries
                            axisX: BarCategoryAxis {
                                id: weeklyAxisX
                            }
                            axisY: ValueAxis {
                                id: weeklyAxisY
                                min: 0
                                titleText: qsTr("Hours")
                            }
                        }
                    }
                }

                // Statistics
                GroupBox {
                    title: qsTr("Statistics")
                    Layout.fillWidth: true

                    GridLayout {
                        anchors.fill: parent
                        columns: 3
                        rowSpacing: 10
                        columnSpacing: 20

                        Label {
                            text: qsTr("Total Entries:")
                            font.bold: true
                        }
                        Label {
                            text: timeEntries.length
                            Layout.columnSpan: 2
                        }

                        Label {
                            text: qsTr("Total Time:")
                            font.bold: true
                        }
                        Label {
                            text: {
                                var total = 0
                                for (var i = 0; i < timeEntries.length; i++) {
                                    total += timeEntries[i].duration || 0
                                }
                                return formatDuration(total)
                            }
                            Layout.columnSpan: 2
                        }

                        Label {
                            text: qsTr("Active Projects:")
                            font.bold: true
                        }
                        Label {
                            text: {
                                var activeProjects = {}
                                for (var i = 0; i < timeEntries.length; i++) {
                                    activeProjects[timeEntries[i].project_id] = true
                                }
                                var count = 0
                                for (var pid in activeProjects) {
                                    count++
                                }
                                return count
                            }
                            Layout.columnSpan: 2
                        }

                        Label {
                            text: qsTr("Average per Day:")
                            font.bold: true
                        }
                        Label {
                            text: {
                                var uniqueDays = {}
                                var total = 0
                                for (var i = 0; i < timeEntries.length; i++) {
                                    var entry = timeEntries[i]
                                    var date = new Date(entry.start_time).toDateString()
                                    uniqueDays[date] = true
                                    total += entry.duration || 0
                                }
                                var dayCount = 0
                                for (var day in uniqueDays) {
                                    dayCount++
                                }
                                var avg = dayCount > 0 ? total / dayCount : 0
                                return formatDuration(Math.round(avg))
                            }
                            Layout.columnSpan: 2
                        }
                    }
                }
            }
        }
    }

    onVisibleChanged: {
        if (visible) {
            loadData()
            updateCharts()
        }
    }
}

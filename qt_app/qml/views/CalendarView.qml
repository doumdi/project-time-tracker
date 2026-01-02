import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import ProjectTimeTracker 1.0

Item {
    id: root

    property date currentDate: new Date()
    property string viewMode: "month" // "month", "week", "day"

    Component.onCompleted: {
        loadTimeEntries()
        generateCalendarData()
    }

    Connections {
        target: TimeEntryManager
        function onTimeEntriesChanged() {
            loadTimeEntries()
            generateCalendarData()
        }
    }

    function loadTimeEntries() {
        entriesModel.clear()
        var entries = TimeEntryManager.getAllTimeEntries()
        for (var i = 0; i < entries.length; i++) {
            entriesModel.append(entries[i])
        }
    }

    function generateCalendarData() {
        calendarModel.clear()
        
        if (viewMode === "month") {
            generateMonthView()
        } else if (viewMode === "week") {
            generateWeekView()
        } else if (viewMode === "day") {
            generateDayView()
        }
    }

    function generateMonthView() {
        // Get first day of month
        var firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        var startDay = firstDay.getDay() // 0 = Sunday
        
        // Get last day of month
        var lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        var daysInMonth = lastDay.getDate()
        
        // Add days from previous month
        var prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate()
        for (var i = startDay - 1; i >= 0; i--) {
            var day = prevMonthLastDay - i
            var date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, day)
            addDayToCalendar(date, false)
        }
        
        // Add days from current month
        for (var day = 1; day <= daysInMonth; day++) {
            var date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
            addDayToCalendar(date, true)
        }
        
        // Add days from next month to fill the grid
        var totalCells = calendarModel.count
        var cellsNeeded = Math.ceil(totalCells / 7) * 7
        for (var day = 1; day <= cellsNeeded - totalCells; day++) {
            var date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day)
            addDayToCalendar(date, false)
        }
    }

    function generateWeekView() {
        // Get start of week (Sunday)
        var startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        
        for (var i = 0; i < 7; i++) {
            var date = new Date(startOfWeek)
            date.setDate(startOfWeek.getDate() + i)
            addDayToCalendar(date, true)
        }
    }

    function generateDayView() {
        addDayToCalendar(currentDate, true)
    }

    function addDayToCalendar(date, isCurrentMonth) {
        var dayEntries = []
        var totalDuration = 0
        
        for (var i = 0; i < entriesModel.count; i++) {
            var entry = entriesModel.get(i)
            var entryDate = new Date(entry.start_time)
            
            if (entryDate.toDateString() === date.toDateString()) {
                dayEntries.push(entry)
                totalDuration += entry.duration || 0
            }
        }
        
        var isToday = date.toDateString() === new Date().toDateString()
        
        calendarModel.append({
            "date": date,
            "dayNumber": date.getDate(),
            "isCurrentMonth": isCurrentMonth,
            "isToday": isToday,
            "entryCount": dayEntries.length,
            "totalDuration": totalDuration
        })
    }

    function formatDuration(minutes) {
        var hours = Math.floor(minutes / 60)
        var mins = minutes % 60
        if (hours === 0) return mins + "m"
        if (mins === 0) return hours + "h"
        return hours + "h " + mins + "m"
    }

    function navigatePrevious() {
        if (viewMode === "month") {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
        } else if (viewMode === "week") {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7)
        } else if (viewMode === "day") {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1)
        }
        generateCalendarData()
    }

    function navigateNext() {
        if (viewMode === "month") {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
        } else if (viewMode === "week") {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7)
        } else if (viewMode === "day") {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
        }
        generateCalendarData()
    }

    function getDateTitle() {
        if (viewMode === "month") {
            return Qt.formatDate(currentDate, "MMMM yyyy")
        } else if (viewMode === "week") {
            var startOfWeek = new Date(currentDate)
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
            var endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 6)
            return Qt.formatDate(startOfWeek, "MMM dd") + " - " + Qt.formatDate(endOfWeek, "MMM dd, yyyy")
        } else {
            return Qt.formatDate(currentDate, "dddd, MMMM dd, yyyy")
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
                text: qsTr("Calendar")
                font.pixelSize: 24
                font.bold: true
                Layout.fillWidth: true
            }
            
            // View Mode Selector
            ComboBox {
                id: viewModeCombo
                model: [qsTr("Month"), qsTr("Week"), qsTr("Day")]
                currentIndex: 0
                onCurrentIndexChanged: {
                    if (currentIndex === 0) viewMode = "month"
                    else if (currentIndex === 1) viewMode = "week"
                    else viewMode = "day"
                    generateCalendarData()
                }
            }
        }

        // Navigation
        RowLayout {
            Layout.fillWidth: true
            
            Button {
                text: "◀"
                onClicked: navigatePrevious()
            }
            
            Label {
                text: getDateTitle()
                font.pixelSize: 18
                font.bold: true
                Layout.fillWidth: true
                horizontalAlignment: Text.AlignHCenter
            }
            
            Button {
                text: "▶"
                onClicked: navigateNext()
            }
            
            Button {
                text: qsTr("Today")
                onClicked: {
                    currentDate = new Date()
                    generateCalendarData()
                }
            }
        }

        // Calendar View
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            GridView {
                id: calendarGrid
                model: ListModel {
                    id: calendarModel
                }
                cellWidth: parent.width / 7
                cellHeight: viewMode === "month" ? 100 : 150
                
                // Week day headers
                header: Row {
                    width: parent.width
                    visible: viewMode === "month" || viewMode === "week"
                    Repeater {
                        model: [qsTr("Sun"), qsTr("Mon"), qsTr("Tue"), qsTr("Wed"), qsTr("Thu"), qsTr("Fri"), qsTr("Sat")]
                        Rectangle {
                            width: calendarGrid.cellWidth
                            height: 30
                            color: "#f0f0f0"
                            border.color: "#e0e0e0"
                            border.width: 1
                            Label {
                                anchors.centerIn: parent
                                text: modelData
                                font.bold: true
                            }
                        }
                    }
                }
                
                delegate: Rectangle {
                    width: calendarGrid.cellWidth
                    height: calendarGrid.cellHeight
                    color: {
                        if (model.isToday) return "#e3f2fd"
                        if (!model.isCurrentMonth) return "#fafafa"
                        return "white"
                    }
                    border.color: "#e0e0e0"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 5
                        spacing: 2

                        Label {
                            text: model.dayNumber
                            font.pixelSize: 14
                            font.bold: model.isToday
                            color: model.isCurrentMonth ? "black" : "gray"
                        }

                        Label {
                            visible: model.entryCount > 0
                            text: model.entryCount + (model.entryCount === 1 ? qsTr(" entry") : qsTr(" entries"))
                            font.pixelSize: 10
                            color: "gray"
                        }

                        Label {
                            visible: model.totalDuration > 0
                            text: formatDuration(model.totalDuration)
                            font.pixelSize: 11
                            font.bold: true
                            color: "#1976d2"
                        }
                    }
                }
            }
        }
    }

    ListModel {
        id: entriesModel
    }

    onVisibleChanged: {
        if (visible) {
            loadTimeEntries()
            generateCalendarData()
        }
    }
}

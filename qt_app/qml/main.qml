import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import ProjectTimeTracker 1.0

ApplicationWindow {
    id: root
    visible: true
    width: 1200
    height: 800
    title: isDemoMode ? "Project Time Tracker (DEMO MODE)" : "Project Time Tracker"

    property int currentTabIndex: 0

    header: ToolBar {
        RowLayout {
            anchors.fill: parent
            anchors.margins: 5

            Label {
                text: root.title
                font.pixelSize: 18
                font.bold: true
                Layout.fillWidth: true
            }

            Label {
                text: "v1.0.15"
                opacity: 0.6
            }
        }
    }

    TabBar {
        id: tabBar
        width: parent.width
        currentIndex: currentTabIndex
        
        TabButton { text: qsTr("Timer") }
        TabButton { text: qsTr("Projects") }
        TabButton { text: qsTr("Tasks") }
        TabButton { text: qsTr("Time Entries") }
        TabButton { text: qsTr("Calendar") }
        TabButton { text: qsTr("Charts") }
        TabButton { text: qsTr("Reports") }
        TabButton { text: qsTr("Office Presence") }
        TabButton { text: qsTr("Settings") }
    }

    StackLayout {
        id: stackLayout
        anchors.top: tabBar.bottom
        anchors.bottom: parent.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        currentIndex: tabBar.currentIndex

        Loader {
            source: "views/TimeTrackerView.qml"
        }

        Loader {
            source: "views/ProjectManagerView.qml"
        }

        Loader {
            source: "views/TasksView.qml"
        }

        Loader {
            source: "views/TimeEntryListView.qml"
        }

        Loader {
            source: "views/CalendarView.qml"
        }

        Loader {
            source: "views/ChartsView.qml"
        }

        Loader {
            source: "views/ReportsView.qml"
        }

        Loader {
            source: "views/OfficePresenceView.qml"
        }

        Loader {
            source: "views/SettingsView.qml"
        }
    }

    Component.onCompleted: {
        console.log("Application started")
        if (isDemoMode) {
            console.log("[DEMO MODE] Running in demo mode")
        }
    }
}

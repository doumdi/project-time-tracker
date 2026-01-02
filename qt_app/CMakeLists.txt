cmake_minimum_required(VERSION 3.16)

project(ProjectTimeTracker VERSION 1.0.15 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)


# Qt6 packages - requires Qt 6.2 or later (6.10.1+ recommended)
find_package(Qt6 REQUIRED COMPONENTS
    Core
    Gui
    Qml
    Quick
    Sql
    Concurrent
    LinguistTools    
)
# Set Qt policies (Qt 6.5+)
if(COMMAND qt_policy)
    # QTP0004: qmldir files for each extra directory
    qt_policy(SET QTP0004 NEW)
endif()

qt_standard_project_setup()

# Optional modules
find_package(Qt6 COMPONENTS Bluetooth Charts QUIET)

if(Qt6Bluetooth_FOUND)
    message(STATUS "Qt6Bluetooth found - BLE support enabled")
else()
    message(WARNING "Qt6Bluetooth not found - BLE support disabled")
endif()

if(Qt6Charts_FOUND)
    message(STATUS "Qt6Charts found - Charts support enabled")
else()
    message(WARNING "Qt6Charts not found - Charts support disabled")
endif()

# Platform-specific settings
if(WIN32)
    # Windows-specific settings
    set(CMAKE_WIN32_EXECUTABLE ON)
    # Enable console for debugging on Windows
    if(CMAKE_BUILD_TYPE STREQUAL "Debug")
        set(CMAKE_WIN32_EXECUTABLE OFF)
    endif()
endif()

if(EMSCRIPTEN)
    message(STATUS "Building for WebAssembly")
    set(CMAKE_EXECUTABLE_SUFFIX ".html")
    # WebAssembly-specific flags
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s USE_PTHREADS=0")
endif()

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)
include_directories(${CMAKE_CURRENT_BINARY_DIR})

# Source files
set(SOURCES
    src/database/database.cpp
    src/database/projectmodel.cpp
    src/database/timeentrymodel.cpp
    src/database/taskmodel.cpp
    src/database/databasemigration.cpp
    src/managers/projectmanager.cpp
    src/managers/timeentrymanager.cpp
    src/managers/taskmanager.cpp
    src/managers/settingsmanager.cpp
    src/utils/datetimeutils.cpp
)

# Add BLE sources only if Bluetooth is available
if(Qt6Bluetooth_FOUND)
    list(APPEND SOURCES
        src/database/officePresencemodel.cpp
        src/database/bledevicemodel.cpp
        src/ble/blemanager.cpp
        src/ble/presencemonitor.cpp
    )
endif()

# Header files
set(HEADERS
    include/database/database.h
    include/database/projectmodel.h
    include/database/timeentrymodel.h
    include/database/taskmodel.h
    include/database/databasemigration.h
    include/managers/projectmanager.h
    include/managers/timeentrymanager.h
    include/managers/taskmanager.h
    include/managers/settingsmanager.h
    include/utils/datetimeutils.h
)

# Add BLE headers only if Bluetooth is available
if(Qt6Bluetooth_FOUND)
    list(APPEND HEADERS
        include/database/officePresencemodel.h
        include/database/bledevicemodel.h
        include/ble/blemanager.h
        include/ble/presencemonitor.h
    )
endif()

# Add BLE headers only if Bluetooth is available
if(Qt6Bluetooth_FOUND)
    list(APPEND HEADERS
        include/database/officePresencemodel.h
        include/database/bledevicemodel.h
        include/ble/blemanager.h
        include/ble/presencemonitor.h
    )
endif()

# QML files
set(QML_FILES
    qml/main.qml
    qml/views/TimeTrackerView.qml
    qml/views/ProjectManagerView.qml
    qml/views/TasksView.qml
    qml/views/TimeEntryListView.qml
    qml/views/CalendarView.qml
    qml/views/ChartsView.qml
    qml/views/ReportsView.qml
    qml/views/OfficePresenceView.qml
    qml/views/SettingsView.qml
)

# Translation files
set(TS_FILES
    translations/app_en.ts
    translations/app_fr.ts
)

# Create translation targets (Qt 6.2+)
if(COMMAND qt6_add_translations)
    qt6_add_translations(${PROJECT_NAME}
        TS_FILES ${TS_FILES}
        RESOURCE_PREFIX "/translations"
    )
else()
    # Fallback for older Qt versions
    qt_add_translation(QM_FILES ${TS_FILES})
endif()

# Create lib that will be reused everywhere
add_library(${PROJECT_NAME}_static_lib STATIC ${SOURCES} ${HEADERS})
target_link_libraries(${PROJECT_NAME}_static_lib PUBLIC
    Qt6::Core
    Qt6::Gui
    Qt6::Qml
    Qt6::Quick
    Qt6::Sql
    Qt6::Concurrent
)
target_include_directories(${PROJECT_NAME}_static_lib PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)

# Link optional modules if found
if(Qt6Bluetooth_FOUND)
    target_link_libraries(${PROJECT_NAME}_static_lib PUBLIC Qt6::Bluetooth)
    target_compile_definitions(${PROJECT_NAME}_static_lib PUBLIC HAVE_QT_BLUETOOTH)
endif()

if(Qt6Charts_FOUND)
    target_link_libraries(${PROJECT_NAME}_static_lib PUBLIC Qt6::Charts)
    target_compile_definitions(${PROJECT_NAME}_static_lib PUBLIC HAVE_QT_CHARTS)
endif()


# Add executable
if(EMSCRIPTEN)
    add_executable(${PROJECT_NAME} src/main.cpp)
    target_link_options(${PROJECT_NAME} PRIVATE
        -sASYNCIFY
        -sALLOW_MEMORY_GROWTH=1
        -sEXIT_RUNTIME=0
        -sFORCE_FILESYSTEM=1
    )
elseif(APPLE)
    # macOS app bundle
    add_executable(${PROJECT_NAME} MACOSX_BUNDLE src/main.cpp)
    set_target_properties(${PROJECT_NAME} PROPERTIES
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.doumdi.projecttimetracker"
        MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
        MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION}
    )
else()
    add_executable(${PROJECT_NAME} src/main.cpp)
endif()

# Add QML module
qt_add_qml_module(${PROJECT_NAME}
    URI ProjectTimeTracker
    VERSION 1.0
    QML_FILES ${QML_FILES}
    RESOURCE_PREFIX /
    OUTPUT_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/qml/ProjectTimeTracker
)

# Link Qt libraries
target_link_libraries(${PROJECT_NAME} PRIVATE
    ${PROJECT_NAME}_static_lib
    Qt6::Core
    Qt6::Gui
    Qt6::Qml
    Qt6::Quick
    Qt6::Sql
    Qt6::Concurrent
)

# Install rules
install(TARGETS ${PROJECT_NAME}
    BUNDLE DESTINATION .
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

# Enable testing
enable_testing()
add_subdirectory(tests)

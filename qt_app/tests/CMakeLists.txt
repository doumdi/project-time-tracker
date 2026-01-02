cmake_minimum_required(VERSION 3.16)

find_package(Qt6 REQUIRED COMPONENTS Test Core Sql Gui)

enable_testing()

# Include parent directory for headers
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../include)

# Define source files needed for tests
set(TEST_SOURCES
    ../src/database/database.cpp
    ../src/database/projectmodel.cpp
    ../src/database/timeentrymodel.cpp
    ../src/database/taskmodel.cpp
    ../src/database/databasemigration.cpp
    ../src/managers/projectmanager.cpp
    ../src/managers/timeentrymanager.cpp
)

# Unit tests for database
add_executable(test_database test_database.cpp ../src/database/database.cpp ../src/database/databasemigration.cpp)
target_link_libraries(test_database PRIVATE
    Qt6::Test
    Qt6::Core
    Qt6::Sql
    Qt6::Gui
)
add_test(NAME test_database COMMAND test_database)

# Unit tests for project manager
add_executable(test_projectmanager 
    test_projectmanager.cpp 
    ../src/database/database.cpp
    ../src/database/databasemigration.cpp
    ../src/database/projectmodel.cpp
    ../src/managers/projectmanager.cpp
)
target_link_libraries(test_projectmanager PRIVATE
    Qt6::Test
    Qt6::Core
    Qt6::Sql
    Qt6::Gui
)
add_test(NAME test_projectmanager COMMAND test_projectmanager)

# Unit tests for time entry manager
add_executable(test_timeentrymanager 
    test_timeentrymanager.cpp
    ../src/database/database.cpp
    ../src/database/databasemigration.cpp
    ../src/database/timeentrymodel.cpp
    ../src/managers/timeentrymanager.cpp
)
target_link_libraries(test_timeentrymanager PRIVATE
    Qt6::Test
    Qt6::Core
    Qt6::Sql
    Qt6::Gui
)
add_test(NAME test_timeentrymanager COMMAND test_timeentrymanager)

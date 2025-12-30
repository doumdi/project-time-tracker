cmake_minimum_required(VERSION 3.16)

find_package(Qt6 REQUIRED COMPONENTS Test)

enable_testing()

# Unit tests for database
add_executable(test_database test_database.cpp)
target_link_libraries(test_database PRIVATE
    Qt6::Test
    Qt6::Core
    Qt6::Sql
)
add_test(NAME test_database COMMAND test_database)

# Unit tests for project manager
add_executable(test_projectmanager test_projectmanager.cpp)
target_link_libraries(test_projectmanager PRIVATE
    Qt6::Test
    Qt6::Core
)
add_test(NAME test_projectmanager COMMAND test_projectmanager)

# Unit tests for time entry manager
add_executable(test_timeentrymanager test_timeentrymanager.cpp)
target_link_libraries(test_timeentrymanager PRIVATE
    Qt6::Test
    Qt6::Core
)
add_test(NAME test_timeentrymanager COMMAND test_timeentrymanager)

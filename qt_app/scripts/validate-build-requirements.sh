#!/bin/bash

# Validate Qt App Build Requirements
# This script checks if all requirements for building the Qt app are met

echo "🔍 Validating Qt Application Build Requirements"
echo ""

# Check if we're in the right directory
if [ ! -f "qt_app/CMakeLists.txt" ]; then
    echo "❌ Error: Must be run from project root directory"
    exit 1
fi

# Check Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js found: $NODE_VERSION"
else
    echo "❌ Node.js not found - required for test database generation"
    exit 1
fi

# Check npm
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm found: $NPM_VERSION"
else
    echo "❌ npm not found - required for test database generation"
    exit 1
fi

# Check CMake
echo "🔧 Checking CMake..."
if command -v cmake &> /dev/null; then
    CMAKE_VERSION=$(cmake --version | head -n1)
    echo "✅ CMake found: $CMAKE_VERSION"
else
    echo "⚠️  CMake not found - required for building Qt app"
    echo "   Install: apt install cmake (Linux) or brew install cmake (macOS)"
fi

# Check Qt
echo ""
echo "🎨 Checking Qt..."
if command -v qmake6 &> /dev/null; then
    QMAKE_VERSION=$(qmake6 --version | grep "Using Qt version")
    echo "✅ Qt6 found: $QMAKE_VERSION"
    # Check if it's at least Qt 6.2
    QT_VER=$(qmake6 --version | grep -oP "(?<=Using Qt version )\d+\.\d+" | head -1)
    if [[ ! -z "$QT_VER" ]]; then
        echo "   Qt version: $QT_VER (requires 6.2+)"
    fi
elif command -v qmake &> /dev/null; then
    QMAKE_VERSION=$(qmake --version | grep "Using Qt version")
    echo "⚠️  Qt found but may not be Qt6: $QMAKE_VERSION"
else
    echo "⚠️  Qt not found - required for building Qt app"
    echo "   Install Qt 6.2+ from https://www.qt.io/download"
fi

# Check C++ compiler
echo "🔨 Checking C++ compiler..."
if command -v g++ &> /dev/null; then
    GCC_VERSION=$(g++ --version | head -n1)
    echo "✅ g++ found: $GCC_VERSION"
elif command -v clang++ &> /dev/null; then
    CLANG_VERSION=$(clang++ --version | head -n1)
    echo "✅ clang++ found: $CLANG_VERSION"
else
    echo "❌ No C++ compiler found"
    exit 1
fi

# Check if test database exists
echo ""
echo "🗄️  Checking test database..."
if [ -f "qt_app/tests/test_database.db" ]; then
    DB_SIZE=$(du -h qt_app/tests/test_database.db | cut -f1)
    echo "✅ Test database exists: $DB_SIZE"
else
    echo "⚠️  Test database not found"
    echo "   Create it with: npm run create-qt-test-db"
fi

# Check if dependencies are installed
echo ""
echo "📚 Checking npm dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ npm dependencies installed"
else
    echo "⚠️  npm dependencies not installed"
    echo "   Install them with: npm install"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Summary:"
echo ""
echo "To build the Qt application:"
echo "  1. npm install                    # Install dependencies"
echo "  2. npm run create-qt-test-db      # Create test database"
echo "  3. cd qt_app && mkdir build"
echo "  4. cd build && cmake .."
echo "  5. cmake --build ."
echo "  6. ./ProjectTimeTracker           # Run the app"
echo ""
echo "For detailed instructions, see: qt_app/BUILD_AND_TEST.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

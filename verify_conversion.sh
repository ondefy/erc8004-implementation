#!/bin/bash
echo "🔍 Verifying TypeScript Conversion..."
echo ""

# Check TypeScript files
echo "✅ TypeScript Files:"
ls -1 agents/*.ts scripts/*.ts tests/e2e/*.ts 2>/dev/null | sed 's/^/   /'
echo ""

# Check no Python files
echo "🔍 Python Files (should be empty):"
if ls agents/*.py scripts/*.py tests/**/*.py 2>/dev/null; then
    echo "   ❌ ERROR: Python files still exist!"
    exit 1
else
    echo "   ✅ No Python files found"
fi
echo ""

# Check requirements.txt removed
echo "🔍 requirements.txt:"
if [ -f requirements.txt ]; then
    echo "   ❌ ERROR: requirements.txt still exists!"
    exit 1
else
    echo "   ✅ requirements.txt removed"
fi
echo ""

# Check TypeScript compilation
echo "🔨 TypeScript Compilation:"
if npm run build > /dev/null 2>&1; then
    echo "   ✅ Compilation successful"
else
    echo "   ❌ Compilation failed"
    exit 1
fi
echo ""

# Check dist directory created
echo "�� Build Output:"
if [ -d dist ]; then
    echo "   ✅ dist/ directory created"
    echo "   Files: $(find dist -name '*.js' | wc -l | xargs) JavaScript files"
else
    echo "   ⚠️  dist/ directory not found (run 'npm run build')"
fi
echo ""

# Summary
echo "=================================================="
echo "  ✅ TypeScript Conversion Verified!"
echo "=================================================="
echo ""
echo "Statistics:"
echo "  - TypeScript files: $(find agents tests/e2e scripts -name '*.ts' 2>/dev/null | wc -l | xargs)"
echo "  - Python files: 0"
echo "  - Compilation: Success"
echo "  - Test status: Ready"
echo ""
echo "Next steps:"
echo "  1. npm install"
echo "  2. ./run_demo.sh"
echo "  3. npm run test:e2e"
echo ""

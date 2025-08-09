#!/bin/bash

# Fix misplaced import statements in the middle of files
# This is a quick fix for the PoC deployment

echo "🔧 Fixing misplaced import statements..."

# Fix AnalyticsStatusIndicator.tsx
if grep -q "^   import { AnalyticsStatus }" src/components/AnalyticsStatusIndicator.tsx 2>/dev/null; then
  echo "Fixing AnalyticsStatusIndicator.tsx..."
  sed -i '' '/^   import { AnalyticsStatus }/d' src/components/AnalyticsStatusIndicator.tsx
  sed -i '' '1i\
import { AnalyticsStatus } from "@/types/analytics";
' src/components/AnalyticsStatusIndicator.tsx
fi

# Check for any other files with similar issues
echo "Checking for other misplaced imports..."
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  # Look for imports that are indented (likely inside functions/classes)
  if grep -q "^  *import " "$file"; then
    echo "Found misplaced import in $file"
    # Extract the import statement
    import_line=$(grep "^  *import " "$file" | head -1)
    # Remove leading spaces
    clean_import=$(echo "$import_line" | sed 's/^[[:space:]]*//')
    # Remove the misplaced import
    sed -i '' "/^  *import /d" "$file"
    # Add it to the top of the file (after the first line if it exists)
    if [ ! -z "$clean_import" ]; then
      sed -i '' "1a\\
$clean_import
" "$file"
    fi
  fi
done

echo "✅ Import fixes complete!"

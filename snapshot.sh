#!/bin/bash
# run this from your tennoplan root
output="tennoplan_snapshot.md"

echo "# Tennoplan — Project Snapshot" > $output
echo "Generated: $(date)" >> $output
echo "" >> $output

# folder structure first so claude can see the shape of things
echo "## Structure" >> $output
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" \
  | sort >> $output

echo "" >> $output
echo "## Files" >> $output

# then actual file contents
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" \
  | sort | while read file; do
    echo -e "\n### $file" >> $output
    echo '```' >> $output
    cat "$file" >> $output
    echo '```' >> $output
done

echo "✓ snapshot ready — $(wc -l < $output) lines"
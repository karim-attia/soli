Check for tasks in Review status that need approval

```bash
# Find all tasks.md files and check for Review status tasks
find docs/delivery -name "tasks.md" -exec grep -l "Review" {} \; | while read file; do
  echo "=== $(basename $(dirname $file)) ==="
  grep "|.*|.*Review.*|" "$file"
  echo
done
```
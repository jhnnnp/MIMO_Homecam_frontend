#!/bin/bash

# Fix all import paths in the project

echo "🔧 Fixing import paths..."

# Fix component imports - remove destructuring and add correct paths
find ./src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e "s|import { \\([A-Z][a-zA-Z]*\\) } from '\\.\\./components|import \\1 from '../../../shared/components/ui|g" \
  -e "s|import { \\([A-Z][a-zA-Z]*\\) } from '\\.\\./\\.\\.\\./shared/components|import \\1 from '../../../shared/components/ui|g"

# Fix specific component paths
find ./src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e "s|import { LoadingState }|import LoadingState|g" \
  -e "s|import { ErrorState }|import ErrorState|g" \
  -e "s|import { EmptyState }|import EmptyState|g" \
  -e "s|import { Button }|import Button|g" \
  -e "s|import { TextField }|import TextField|g" \
  -e "s|import { Card }|import Card|g" \
  -e "s|import { Badge }|import Badge|g" \
  -e "s|import { AppBar }|import AppBar|g" \
  -e "s|import { ConnectionInput }|import ConnectionInput|g" \
  -e "s|import { QRCodeDisplay }|import QRCodeDisplay|g" \
  -e "s|import { RecordingList }|import RecordingList|g"

# Fix component paths to correct locations
find ./src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e "s|from '\\.\\./components/LoadingState'|from '../../../shared/components/feedback/LoadingState'|g" \
  -e "s|from '\\.\\./components/ErrorState'|from '../../../shared/components/feedback/ErrorState'|g" \
  -e "s|from '\\.\\./components/EmptyState'|from '../../../shared/components/feedback/EmptyState'|g"

echo "✅ Import paths fixed!"

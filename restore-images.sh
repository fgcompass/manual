#!/bin/bash

# Script to restore deleted image folders from git history
# Created on April 17, 2025

# Navigate to the repository root
cd /Users/ovandef/Documents/GitHub/compass-manual

echo "Restoring deleted image folders from Git..."

# Function to restore files one by one
restore_files() {
    local folder=$1
    local commit=$2
    
    # Create directory if it doesn't exist
    mkdir -p static/images/$folder
    
    # Get list of files from the commit
    files=$(git ls-tree -r --name-only $commit static/images/$folder)
    
    echo "Found files to restore in $folder:"
    echo "$files"
    
    # Restore each file individually
    for file in $files; do
        echo "Restoring $file..."
        git show $commit:$file > $file
        if [ $? -eq 0 ]; then
            echo "√ Successfully restored $file"
        else
            echo "✗ Failed to restore $file"
        fi
    done
}

# Restore each folder
echo "Restoring loc-gallop images..."
restore_files "loc-gallop" "260ad733924ad33767a328eea6fdc774f3341598"

echo "Restoring loc-hj images..."
restore_files "loc-hj" "260ad733924ad33767a328eea6fdc774f3341598"

echo "Restoring loc-vj images..."
restore_files "loc-vj" "260ad733924ad33767a328eea6fdc774f3341598"

echo "Restoring man-dribble images..."
restore_files "man-dribble" "260ad733924ad33767a328eea6fdc774f3341598"

echo "Restoring man-ot images..."
restore_files "man-ot" "260ad733924ad33767a328eea6fdc774f3341598"

echo "Restoring man-strike images..."
restore_files "man-strike" "260ad733924ad33767a328eea6fdc774f3341598"

# Restore individual file if needed
if [ ! -f "static/images/fgcompass-dt-model.png" ]; then
    echo "Restoring fgcompass-dt-model.png..."
    git show 260ad733924ad33767a328eea6fdc774f3341598:static/images/fgcompass-dt-model.png > static/images/fgcompass-dt-model.png
fi

echo "Image restoration complete!"
echo "Verifying restored directories..."
ls -la static/images/

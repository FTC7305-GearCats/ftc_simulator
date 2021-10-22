#!/bin/bash

# Force the script to fail on errors
set -euxo pipefail

# Delete any existing build directory.
rm -rf build

# Copy the official offline block editor into the build directory.
cp -av offline_blocks_editor build

# Force the http logic to always fail.
grep -rl --null "window.location.protocol" build | \
  xargs -0 perl -0777 -pi -e \
  's/(if\s*\()(window.location.protocol === '\''http.*)\)/\1false \/* \2 *\/)/g'

# Force the localhost logic to always succeed.
grep -rl --null "window.location.protocol" build | \
  xargs -0 perl -0777 -pi -e \
  's/(if\s*\()(window.location.protocol === '\''file)/\1true || \2/g'

# Remove any default blocks.
perl -0777 -pi -e 's/var BLK_FILES = \[\n.*\];\n  return BLK_FILES;/var BLK_FILES = \[\n  \];\n  return BLK_FILES;/igs' build/js/FtcOfflineBlocks.js

# Patch the html.
patch -p1 < src/html.patch

# Copy js files over.
cp src/*.js build/js/

# Copy the keyboard page over.
cp src/keyboard.html build/
mkdir build/images
cp src/keyboard_layout.jpg build/images/

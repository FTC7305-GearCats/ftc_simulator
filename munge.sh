#!/bin/sh

# Force the http logic to always fail.
rg -l0 "if\s+\(window.location.protocol === 'http" static_new | \
  xargs -0 sed -i "" \
  's/\(if[[:space:]]*(\)\(window.location.protocol === '\''http.*\))/\1false \/* \2 *\/)/g'

# Force the localhost logic to always succeed.
rg -l0 "if\s+\(window.location.protocol === 'file" static_new | \
  xargs -0 sed -i "" \
  's/\(if[[:space:]]*(\)\(window.location.protocol === '\''file\)/\1true || \2/g'

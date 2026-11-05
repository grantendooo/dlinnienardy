#!/bin/sh
# Собирает www/index.html из частей: разметка и стили, движок правил и бота, интерфейс.
set -e
cd "$(dirname "$0")"
{
  cat head.html
  cat engine.js
  echo
  cat ui.js
  printf '</script>\n</body>\n</html>\n'
} > ../www/index.html
echo "собрано: $(wc -c < ../www/index.html) байт"

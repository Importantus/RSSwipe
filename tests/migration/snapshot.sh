#!/bin/sh
# Prints "<table> <row count> <checksum over all rows and columns>" for every table except migration bookkeeping.
# Usage: MYSQL="docker compose ... exec -T db mariadb -uroot -ptest" ./snapshot.sh <database>
set -eu
DB="$1"
MYSQL="${MYSQL:?set MYSQL to the client command}"
for t in $($MYSQL "$DB" -N -B -e "SELECT table_name FROM information_schema.tables WHERE table_schema='$DB' AND table_name NOT LIKE '\\_%' ORDER BY 1"); do
  cols=$($MYSQL "$DB" -N -B -e "SELECT GROUP_CONCAT(CONCAT('IFNULL(CAST(\`', column_name, '\` AS CHAR), ''<NULL>'')') ORDER BY ordinal_position SEPARATOR ',''|'',') FROM information_schema.columns WHERE table_schema='$DB' AND table_name='$t'")
  pk=$($MYSQL "$DB" -N -B -e "SELECT GROUP_CONCAT(CONCAT('\`', column_name, '\`') ORDER BY seq_in_index) FROM information_schema.statistics WHERE table_schema='$DB' AND table_name='$t' AND index_name='PRIMARY'")
  $MYSQL "$DB" -N -B -e "SET SESSION group_concat_max_len = 1073741824; SELECT '$t', COUNT(*), IFNULL(MD5(GROUP_CONCAT(MD5(CONCAT_WS('|', $cols)) ORDER BY $pk SEPARATOR '')), 'empty') FROM \`$t\`"
done

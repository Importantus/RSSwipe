#!/bin/sh
# Migration test: Prisma database + seed data -> `rsswipe migrate` -> identical data, idempotent, same schema as a fresh install.
# Needs docker, the image `rsswipe-rust:contract` (docker build -t rsswipe-rust:contract backend) and `rsswipe-ts:contract`
# (see tests/contract/README.md). Exits non-zero on the first difference.
set -eu
cd "$(dirname "$0")"
C="docker compose -f ../contract/docker-compose.yml"
SQL="$C exec -T db mariadb --default-character-set=utf8mb4 -uroot -ptest"
NET=rsswipe-contract_default
rsswipe() { docker run --rm --network $NET -e DATABASE_URL="mysql://root:test@db:3306/$1" rsswipe-rust:contract rsswipe migrate; }
prisma()  { $C --profile ts run --rm -T -e DATABASE_URL="mysql://root:test@db:3306/$1" ts-migrate; }
export MYSQL="$SQL"
# same(a b msg): fails the whole script when the files differ
same() { if diff "$1" "$2" >/dev/null; then echo "OK: $3"; else echo "FAIL: $3"; diff "$1" "$2"; exit 1; fi; }

echo "== fresh MariaDB 10.5"
$C --profile ts --profile rust down -v >/dev/null 2>&1 || true
$C up -d db >/dev/null; sleep 12
$SQL -e "CREATE DATABASE rsswipe_prisma; CREATE DATABASE rsswipe_fresh"

echo "== 1. Prisma migrations (19) + seed data"
prisma rsswipe_prisma >/dev/null 2>&1
$SQL rsswipe_prisma < seed.sql
./snapshot.sh rsswipe_prisma > before.txt
cat before.txt
$SQL rsswipe_prisma -N -e "SELECT COUNT(*) FROM _prisma_migrations" | sed 's/^/_prisma_migrations rows: /'

echo "== 2. rsswipe migrate on the Prisma database"
rsswipe rsswipe_prisma
./snapshot.sh rsswipe_prisma > after.txt
same before.txt after.txt "all rows and checksums identical"
$SQL rsswipe_prisma -N -e "SELECT COUNT(*) FROM _prisma_migrations" | sed 's/^/_prisma_migrations rows after: /'
$SQL rsswipe_prisma -N -e "SELECT version, description, success FROM _sqlx_migrations"

echo "== 3. second run is a no-op"
$SQL rsswipe_prisma -e "SHOW CREATE TABLE Article\G SHOW CREATE TABLE Feed\G" > ddl1.txt
$SQL -N -e "SHOW GLOBAL STATUS WHERE Variable_name IN ('Com_alter_table','Com_create_index')" > ddl_counters1.txt
$SQL rsswipe_prisma -N -e "SELECT version, checksum, installed_on FROM _sqlx_migrations" > applied1.txt
rsswipe rsswipe_prisma
$SQL rsswipe_prisma -e "SHOW CREATE TABLE Article\G SHOW CREATE TABLE Feed\G" > ddl2.txt
$SQL -N -e "SHOW GLOBAL STATUS WHERE Variable_name IN ('Com_alter_table','Com_create_index')" > ddl_counters2.txt
$SQL rsswipe_prisma -N -e "SELECT version, checksum, installed_on FROM _sqlx_migrations" > applied2.txt
same ddl1.txt ddl2.txt "table definitions unchanged"
same applied1.txt applied2.txt "no migration re-recorded"
same ddl_counters1.txt ddl_counters2.txt "no ALTER TABLE / CREATE INDEX executed"
./snapshot.sh rsswipe_prisma > again.txt; same before.txt again.txt "data still identical"

echo "== 4. fresh install gives the same schema as the Prisma path"
rsswipe rsswipe_fresh
for db in rsswipe_prisma rsswipe_fresh; do
  $SQL -N -e "SELECT table_name, column_name, ordinal_position, column_type, is_nullable, IFNULL(column_default,'<NULL>'), collation_name FROM information_schema.columns WHERE table_schema='$db' AND table_name NOT LIKE '\\_%' ORDER BY 1,3" > cols_$db.txt
  $SQL -N -e "SELECT table_name, index_name, seq_in_index, column_name, IFNULL(sub_part,''), non_unique FROM information_schema.statistics WHERE table_schema='$db' AND table_name NOT LIKE '\\_%' ORDER BY 1,2,3" > idx_$db.txt
  $SQL -N -e "SELECT table_name, constraint_name, referenced_table_name, update_rule, delete_rule FROM information_schema.referential_constraints WHERE constraint_schema='$db' ORDER BY 1,2" > fk_$db.txt
done
for k in cols idx fk; do same ${k}_rsswipe_prisma.txt ${k}_rsswipe_fresh.txt "$k identical (Prisma path vs fresh install)"; done

echo "== 5. preflight refuses a database that misses Prisma migrations"
$SQL rsswipe_prisma -e "UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name LIKE '%article_content'"
if rsswipe rsswipe_prisma 2>&1 | tee preflight.txt | grep -q "missing Prisma migrations"; then echo "OK: preflight refused"; else echo "FAIL: preflight did not refuse"; exit 1; fi
rm -f again.txt ddl*.txt applied*.txt preflight.txt cols_*.txt idx_*.txt fk_*.txt before.txt after.txt
echo "ALL CHECKS PASSED"

#!/usr/bin/env bash
# Ephemeral Postgres RLS test for migrations 00031 and 00032.
# Uses a private unix socket and throwaway fixture rows. No network listen, no secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
if [[ -z "${PG_BIN}" || ! -x "${PG_BIN}/initdb" ]]; then
  echo "PostgreSQL server binaries are required (postgresql and postgresql-client)." >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
cleanup() {
  if [[ -n "${PG_PID:-}" ]] && kill -0 "${PG_PID}" 2>/dev/null; then
    kill "${PG_PID}" 2>/dev/null || true
    wait "${PG_PID}" 2>/dev/null || true
  fi
  rm -rf "${WORKDIR}"
}
trap cleanup EXIT

"${PG_BIN}/initdb" -D "${WORKDIR}/data" -U postgres --auth=trust --no-instructions >/dev/null
"${PG_BIN}/postgres" -D "${WORKDIR}/data" -k "${WORKDIR}" -c listen_addresses='' -c shared_buffers=16MB >"${WORKDIR}/server.log" 2>&1 &
PG_PID=$!

for _ in $(seq 1 50); do
  if "${PG_BIN}/pg_isready" -h "${WORKDIR}" -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done
"${PG_BIN}/pg_isready" -h "${WORKDIR}" -U postgres >/dev/null

export PGHOST="${WORKDIR}" PGUSER=postgres
PSQL=("${PG_BIN}/psql" -v ON_ERROR_STOP=1 -X -q)

"${PSQL[@]}" -d postgres -c 'CREATE DATABASE pbk_rls_main'
"${PSQL[@]}" -d postgres -c 'CREATE DATABASE pbk_rls_preflight'

echo 'Applying 00031 and 00032 twice on a database that matches the repo policies'
"${PSQL[@]}" -d pbk_rls_main -f "${ROOT}/supabase/tests/course-content-rls/01_harness.sql"
"${PSQL[@]}" -d pbk_rls_main -f "${ROOT}/supabase/migrations/00031_enrollment_access_override.sql"
"${PSQL[@]}" -d pbk_rls_main -f "${ROOT}/supabase/migrations/00032_course_content_access_rls.sql"
"${PSQL[@]}" -d pbk_rls_main -f "${ROOT}/supabase/migrations/00032_course_content_access_rls.sql"
"${PSQL[@]}" -d pbk_rls_main -f "${ROOT}/supabase/tests/course-content-rls/02_assert.sql"

echo 'Unknown policy must abort 00032 without installing the new policies'
"${PSQL[@]}" -d pbk_rls_preflight -f "${ROOT}/supabase/tests/course-content-rls/01_harness.sql"
"${PSQL[@]}" -d pbk_rls_preflight -f "${ROOT}/supabase/migrations/00031_enrollment_access_override.sql"
"${PSQL[@]}" -d pbk_rls_preflight -f "${ROOT}/supabase/tests/course-content-rls/03_rogue_policy.sql"
set +e
"${PSQL[@]}" -d pbk_rls_preflight -f "${ROOT}/supabase/migrations/00032_course_content_access_rls.sql" >"${WORKDIR}/preflight.out" 2>&1
PREFLIGHT_STATUS=$?
set -e
if [[ "${PREFLIGHT_STATUS}" -eq 0 ]]; then
  echo '00032 applied despite an unknown policy' >&2
  cat "${WORKDIR}/preflight.out" >&2
  exit 1
fi
if ! grep -q 'Refusing to change course-content RLS' "${WORKDIR}/preflight.out"; then
  echo '00032 failed for an unexpected reason' >&2
  cat "${WORKDIR}/preflight.out" >&2
  exit 1
fi
"${PSQL[@]}" -d pbk_rls_preflight -c "SELECT polname FROM pg_policy WHERE polname = 'modules_dashboard_read'" | grep -q modules_dashboard_read
"${PSQL[@]}" -d pbk_rls_preflight -c "SELECT count(*) FROM pg_policy WHERE polname = 'course_content_staff_all'" | grep -q ' 0$'

echo 'RLS fixture passed, including the unknown-policy preflight'

#!/usr/bin/env bash
usage() { cat << EOF
usage: pushservice.bash [ -t TIMEOUT] [ -help]

run push service until timeout in seconds

OPTIONS:
    -t TIMEOUT    the timeout in seconds. default is 3540 (59 minutes)

EOF
exit 1; }
while getopts :t: option
do
    case "${option}"
    in
        t) TIMEOUT=${OPTARG};;
        ?) usage;;
    esac
done
# define defaults
[ -z "$TIMEOUT" ] && TIMEOUT=3540;
# reset timer
SECONDS=0;
# determine paths
THISDIR="$(dirname "$(readlink -f "$0")")";
SERVICE="$THISDIR/pushservice";

# open thread
function openThread() {
    # delete lock if older than timeout
    find "$SERVICE.lock" -type d -mmin +$(( TIMEOUT / 60 )) -exec rm -rdf {} \; >/dev/null 2>&1;
    # lock folder
    mkdir "$SERVICE.lock";
    # return exit code
    return $?;
}

# close thread
function closeThread() { if ! rmdir "$SERVICE.lock"; then >&2 echo "failed to release lock"; fi; }

# run service in loop until timeout
function runService() { while [ $SECONDS -lt $TIMEOUT ]; do php "$SERVICE.php" 2>>"$SERVICE.err"; done; }

# run service
if openThread; then runService; closeThread; fi;

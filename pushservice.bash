#!/usr/bin/env bash

# run push service for one hour
function runservice() {
    # determine paths
    THISDIR="$(dirname "$(readlink -f "$0")")";
    SERVICE="$THISDIR/pushservice";
    # delete lock if older than 90 minutes
    # find "$SERVICE.lock" -type d -mmin +90 -exec rm -rdf {} \; >/dev/null 2>&1;
    # lock folder
    if mkdir "$SERVICE.lock";
    then
        # run push service until we reach minute 59
        while [ $(date "+%M") -lt 59 ]; do php "$SERVICE.php" 2>"$SERVICE.err"; done;
        # remove lock after service completes
        if ! rmdir "$SERVICE.lock"; then >&2 echo "failed to release lock"; fi;
    fi;
}
# call function
runservice;

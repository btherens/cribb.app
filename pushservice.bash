#!/usr/bin/env bash

# run push service for one hour
function runservice() {
    # determine paths
    THISDIR="$(dirname "$(readlink -f "$0")")";
    PUSHLOCK="$THISDIR/pushservice.lock";
    PUSHRUN="$THISDIR/pushservice.php";
    # delete lock if older than 90 minutes
    # find "$PUSHLOCK" -type d -mmin +90 -exec rm -rdf {} \; >/dev/null 2>&1;
    # lock folder
    if mkdir "$PUSHLOCK";
    then
        # run push service until we reach minute 59
        while [ $(date "+%M") -lt 59 ]; do php "$PUSHRUN"; done;
        # remove lock after service completes
        if ! rmdir "$PUSHLOCK"; then >&2 echo "failed to release lock"; fi;
    fi;
}
# call function
runservice;

<?php
    /* load application */
    $e = error_reporting( 0 );
    ob_start();
        require 'index.php';
    ob_clean();
    error_reporting( $e );

    /* call push service */
    $pushobj = new PushController( null );
    $pushobj->runPushService();

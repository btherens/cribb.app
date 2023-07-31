<?php
    /*
     * call this script from shell. output is in plaintext
     * % php _test.php > result.txt
     */

    /* override error handler with a passthru for all warnings/errors */
    function _throwWarnings(): void { set_error_handler( function ( $severity, $message, $file, $line ) { throw new ErrorException( $message, $severity, $severity, $file, $line ); } ); }
    /* restore default handling */
    function _restoreHandler(): void { restore_error_handler(); }

    $e = error_reporting( 0 );
    ob_start();
        /* load application */
        require 'index.php';

        /* load test classes */
        require 'test/_testGameController.php';
    ob_clean();
    error_reporting( $e );

    /* define tests */
    function hands(): void
    {
        /* load controller */
        $ctrl = new _testGameController( '' );

        /* run test */
        _throwWarnings();
            $ctrl->_hands();
        _restoreHandler();
    }

    /* run tests */
    hands();

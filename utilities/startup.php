<?php
    /* PHP environment config */
    date_default_timezone_set( APP_TIMEZONE );
    ini_set( 'session.cookie_httponly', 1 );

    /* create session cookie */
    session_start();

    /* establish shortID properties */
    shortID::setKey( SHORTID_SALT );
    /* minimum string length */
    shortID::setPadding( 4 );

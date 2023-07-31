<?php
/* define some simple properties to use when referencing files */
/* os-specific path separator */
define( 'DS', DIRECTORY_SEPARATOR );
/* the working directory for this site */
define( 'HOME', dirname( __FILE__ ) );
/* VERSION: the version hash to append to urls */
define( 'VERSION', rtrim( @file_get_contents( '.version' ) ) );
/* CREDITS: the credits object to read from in credits view */
define( 'CREDITS', rtrim( @file_get_contents( 'credits.json' ) ) );
/* DEDICATION: string array to render as dedication in credits */
define( 'DEDICATION', rtrim( @file_get_contents( 'dedication.json' ) ) );
/* CHANGELOG: render app changes */
define( 'CHANGELOG', rtrim( @file_get_contents( 'changelog.json' ) ) );
/* pushlock name */
define( 'PUSHLOCK', 'pushservice.lock' );

/* includes necessary script files by object name, on demand and only if class has not already been loaded */
function basic_autoload( $class )
{
    /* step through each MVC directory and include script file once we find a matching path */
    foreach ( [ 'utilities', 'model', 'controller', 'vendor' ] as $f ) { $fn = HOME . DS . $f . DS . str_replace( '\\', DS, $class ) . '.php'; if ( file_exists( $fn ) ) { require_once $fn; break; } }
}
/* register autoload function with PHP to use when loading new modules */
spl_autoload_register( 'basic_autoload' );

/* load these modules with every request */
/* environment variables */
require_once HOME . DS . 'config.php';
/* run any commands at startup */
require_once HOME . DS . 'utilities' . DS . 'startup.php';
/* route the request through bootstrap */
require_once HOME . DS . 'utilities' . DS . 'routes.php';

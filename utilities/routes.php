<?php
/* default values */
$controller = 'Apploader';
$action     = 'index';
$query      = [];
/* custom url map */
$map = [
    [ '/^i\/?$/',    'game'         ],
    [ '/^i\//',      'game/invite/' ],
    [ '/^g\//',      'game/game/'   ],
    [ '/^s\//',      'game/status/' ],
    [ '/^r\//',      'game/result/' ],
    [ '/^list\/?$/', 'game/list/'   ]
];

/* override defaults if uri provided */
if ( isset( $_GET[ 'load' ] ) ? ( $_GET[ 'load' ] ?: false ) : false )
{
    $get = $_GET[ 'load' ];
    /* pass path through replacement map */
    foreach ( $map as $a ) { $get = preg_replace( $a[ 0 ], $a[ 1 ], $get ); }

    /* collect parameters from GET object */
    $params = []; $params = explode( '/', $get );
    /* redirect default controller to base url */
    if   ( $controller == strtolower( $params[ 0 ] ) ) { header( 'Location: /' ); exit; }
    /* the first parameter from web request is the controller to use (default controller redirects to base url) */
    else { $controller = ucwords( $params[ 0 ] ); }

    /* set the second argument from GET to $action (the method being called) */
    if      ( isset( $params[ 1 ] ) && !empty( $params[ 1 ] ) ) { $action = $params[ 1 ]; }
    /* collect any remaining arguments from params in query object */
    if      ( isset( $params[ 2 ] ) && !empty( $params[ 2 ] ) ) { $query = array_slice( $params, 2 ); }
    /* decode json response */
    else if ( $_SERVER[ 'REQUEST_METHOD' ] === 'POST' && $_SERVER[ 'CONTENT_TYPE' ] === 'application/json; charset=utf-8' ) { $query = json_decode( file_get_contents( 'php://input' ), true ); }
}

/* normalize request value to controller naming convention */
$controller .= 'Controller';

/* load the class, if it exists and does not start with underscore */
if   ( class_exists( $controller ) && ( substr( $controller, 0, 1 ) != '_' ) ) { $load = new $controller( $action ); }
/* throw an error if it doesn't */
else { http_response_code( 404 ); die( 'please check your url' ); }

/* execute method and send result to output */
if   ( method_exists( $load, $action ) ) { $load->$action( $query ); }
/* throw an error if we couldn't find a method that matched request */
else { http_response_code( 404 ); die( 'invalid method. please check the url.' ); }

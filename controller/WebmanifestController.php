<?php

class WebmanifestController extends Controller
{

    /* constructor */
    public function __construct( $action = 'index' ) { parent::__construct( '', $action ); }

    /* return .webmanifest compatible document */
    public function index(): void
    {
        /* set manifest object */
        $manifest = [
            'id'          => '/',
            'lang'        => 'en',
            'dir'         => 'ltr',
            'name'        => 'cribb.app',
            'description' => 'play cribbage with friends',
            'icons'       => [ [
                'src'     => '/asset/board-icon@512x.png',
                'sizes'   => '512x512',
                'type'    => 'image/png'
            ], ],
            'scope'       => '/',
            'start_url'   => '/',
            'display'     => 'standalone',
            'orientation' => 'portrait',
        ];
        /* manifest type headers */
        header( 'Content-Type: application/manifest+json' );
        /* encode and return response */
        echo json_encode( $manifest );
    }

}

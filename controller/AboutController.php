<?php

class AboutController extends Controller
{

    /* constructor */
    public function __construct( $action )
    {
        $model = 'About';
        parent::__construct( $model, $action );
        $this->_setModel( $model );
    }

    /* /about - return application html */
    public function index(): void
    {
        $appload = new ApploaderController( 'index', 'about' );
        $appload->index();
    }

    public function changelog(): void
    {
        $appload = new ApploaderController( 'index', 'changelog' );
        $appload->index();
    }

    public function privacy(): void
    {
        $appload = new ApploaderController( 'index', 'privacy' );
        $appload->index();
    }

}

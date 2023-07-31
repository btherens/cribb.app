<?php

class TodoController extends Controller
{

    /* constructor */
    public function __construct( $action )
    {
        $model = 'todo';
        parent::__construct( $model, $action );
        //$this->_setModel( $model );
    }

    public function index(): void
    {
        $this->_createView( 'index' )->echo();
    }

}

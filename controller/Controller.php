<?php

class Controller
{
    protected $_model;
    protected $_controller;
    protected $_action;
    protected $_view;
    protected $_modelBaseName;

    /* collection for multiple views */
    protected $_views;

    public function __construct( $model, $action )
    {
        $this->_controller = ucwords( __CLASS__ );
        $this->_action = $action;
        $this->_modelBaseName = $model;
    }

    /* attach model by name */
    protected function _setModel( $modelName ): void
    {
        $modelName .= 'Model';
        $this->_model = new $modelName();
    }

    /* create a view and return reference */
    protected function _createView( $viewName ): View
    {
        /* spawn a new view if not yet set */
        isset( $this->_views[ $viewName ] ) || $this->_views[ $viewName ] = new View( HOME . DS . 'view' . DS . $this->_modelBaseName . DS . $viewName . '.php' );
        /* get view from views collection */
        $view = &$this->_views[ $viewName ];
        /* set latest view reference to _view property */
        $this->_view = &$view;
        /* return view */
        return $view;
    }
}

<?php

class ApploaderController extends Controller
{

    /* constructor */
    public function __construct( $action, $title = 'cribb.app' )
    {
        $model = 'Apploader';
        parent::__construct( $model, $action );
        $this->_setModel( $model );

        $this->title = $title;
    }

    public string $title;

    /* return basic javascript app */
    public function index( ): void
    {
        /* spawn index view */
        $index = $this->_createView( 'index' );
        /* set site title */
        $index->set( 'title', $this->title );
        /* set appview components to view */
        $index->set( 'board1', $this->board1() );
        $index->set( 'board2', $this->board2() );
        $index->set( 'board3', $this->board3() );
        $index->set( 'board4', $this->board4() );
        $index->set( 'pulldown', $this->pulldown() );
        $index->set( 'gamescreen', $this->gamescreen() );

        /* render assembled view and return */
        $this->_views[ 'index' ]->echo();
    }

    /* screen components */
    /* board layout 1 / 4 */
    protected function board1(): string { return $this->_createView( 'board1' )->output(); }
    /* board layout 2 / 4 */
    protected function board2(): string { return $this->_createView( 'board2' )->output(); }
    /* board layout 3 / 4 */
    protected function board3(): string { return $this->_createView( 'board3' )->output(); }
    /* board layout 4 / 4 */
    protected function board4(): string { return $this->_createView( 'board4' )->output(); }
    /* pulldown menu */
    protected function pulldown(): string { return $this->_createView( 'pulldown' )->output(); }
    /* gamescreen */
    protected function gamescreen(): string { return $this->_createView( 'gamescreen' )->output(); }

}

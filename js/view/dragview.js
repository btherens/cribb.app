/* imports */
import View from './view.js';

export default class DragView extends View
{
    constructor()
    {
        super();
    }

    /* name for objects that can be dragged */
    static classCanDrag = 'candrag';
    /* name for objects that are active/selected */
    static classActive  = 'active';
    /* return all active drag objects */
    static actives = document.getElementsByClassName( DragView.classActive );
    /* return all drag objects */
    static canDrags = document.getElementsByClassName( DragView.classCanDrag );

    /* move map */
    static map = document.getElementById( 'dragmap' );
    /* enable / disable dragmap display in mouse ui */
    static get mapEnable() { return DragView.map.classList.contains( 'enable' ) }
    static set mapEnable( b ) { DragView.map.classList.toggle( 'enable', !!b ) }

    /* bind mouse events to the movemap */
    static bindMoveMap = ( callback, el = DragView.map ) => callback( el );

}

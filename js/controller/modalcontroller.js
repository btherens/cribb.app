/* imports */
import Controller from './controller.js';
import _view from '../view/modalview.js';

import ListboxController from './listboxcontroller.js';
import ButtonController from './buttoncontroller.js';

export default class ModalController extends Controller
{
    constructor( model = null, view = new _view() )
    {
        super( model, view );
    }


    /* create a new modal view with configured message
     * e.g. ModalController.createModal( 'confirm?' { 'yes': () => confirm(), 'no': () => reject() } )
    */
    static createModal = (
        message,
        option = {},
        header,
        theme  = 'board'
    ) =>
    {
        /* create buttons from option object */
        const btns = Object.entries( option ).map( ( [ k, v ] ) => ButtonController.create( theme, { onclick: v }, k ) );
        /* create the modal view and include the buttons we've created */
        const view = _view.createModalView( message, btns );
        /* return view */
        return view;
    }

}

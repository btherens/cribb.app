/* imports */
import View from './view.js';

export default class ModalView extends View
{
    constructor()
    {
        super();
    }

    /* return a lobby list view */
    static createModalView( message, buttons )
    {
        /* return a DOM view */
        return ModalView.create( 'div', { class: 'flex-container column', onclick: e => e.stopPropagation() }, ModalView.create('div', { class: 'flex-container dynamic fullscreen-flex-all' }, [
            ModalView.create( 'span', { class: 'pd-header' } ),
            ModalView.create( 'div', { class: 'flex-container column width-1 fullscreen-flex-tall' }, [
                ModalView.create( 'div', { class: 'fullscreen-flex-all' } ),
                ModalView.create( 'div', { class: 'textblock large' }, ModalView.create( 'span', 0, message ) ),
                ModalView.create( 'div', { class: 'fullscreen-flex-all' } ),
                ...buttons
            ] )
        ] ) );
    }

}

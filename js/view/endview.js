/* imports */
import View from './view.js';

export default class EndView extends View
{
    constructor()
    {
        super();
    }

    /* return a lobby view */
    createEndView()
    {
        /* define header and view and return */
        this.header = this.create( 'span', { class: 'pd-header' }, 'results' );
        this.view   = this.create( 'div', { class: 'flex-container dynamic fullscreen-flex-all' } );
        return this.create( 'div', { class: 'flex-container column', onclick: e => e.stopPropagation() }, [ this.header, this.view ] );
    }

    displayEndView(
        box1,
        box2,
        button
    )
    {
        /* assign properties */
        this.button = button;
        this.box1   = box1;
        this.box2   = box2;

        /* clear view and append array */
        this._nest( this.view, [ 
            this.create( 'div', { class: 'flex-container column width-1 fullscreen-flex-tall' }, [
                this.create( 'div', { class: 'fullscreen-flex-tall' } ),
                this.box1,
                this.create( 'div', { class: 'fullscreen-flex-all' } ),
            ] ),
            this.create( 'div', { class: 'flex-container column width-1 fullscreen-flex-tall' }, [
                this.create( 'div', { class: 'fullscreen-flex-tall' } ),
                this.box2,
                this.create( 'div', { class: 'fullscreen-flex-all' } ),
                this.button
            ] )
        ], true );
    }

    /* bindings */
    bindClickButton( handler ) { this.handleClickButton = handler }

}

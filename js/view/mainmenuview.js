/* imports */
import View from './view.js';

export default class MainmenuView extends View
{
    constructor()
    {
        super();
    }

    /* create view */
    createView(
        btnNew,
        btnOpen,
        btnIdentity,
        btnAbout
    )
    {
        /* start a new game */
        this.btnNew      = btnNew;
        /* open games detail view */
        this.btnOpen     = btnOpen;
        /* open identity detail view */
        this.btnIdentity = btnIdentity;
        /* open about view */
        this.btnAbout    = btnAbout;

        this.view        = this.create( 'div', { class: 'flex-container column' } );
        return this.view;
    }

    /* create a new main menu view and return */
    displayView(
        listbox
    )
    {
        /* player info */
        this.playerbox = listbox;

        this._nest(
            this.view,
            [
                this.create( 'div', { class: 'flex-container column width-1 fullscreen-flex-tall fullscreen-show-tall' }, [
                    this.create( 'div', { class: '' } ),
                    this.playerbox
                ] ),
                this.create( 'div', { class: 'fullscreen-flex-all' } ),
                this.create( 'div', { class: 'flex-container dynamic tactile-margin' }, [
                    this.create( 'div', { class: 'flex-container column width-1' }, [
                        this.btnNew,
                        this.btnOpen
                    ] ),
                    this.create( 'div', { class: 'flex-container column width-1' }, [
                        this.btnIdentity,
                        this.btnAbout
                    ] )
                ] )
            ],
            true
        );
    }

    /* bindings */
}

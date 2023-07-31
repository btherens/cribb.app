/* imports */
import View from './view.js';

export default class GameListView extends View
{
    constructor()
    {
        super();
    }

    /* return a lobby list view */
    createListView()
    {
        this.list = this.create( 'div', { class: 'flex-container dynamic tactile-margin' } );

        /* return a DOM view */
        return this.create('div', { class: 'flex-container column scroll' }, [
            this.create( 'span', { class: 'pd-header' }, 'open games' ),
            this.create( 'div', { class: 'fullscreen-flex-all' } ),
            this.list
        ] );
    }

    /* add all list items in arr to dom */
    displayList( arr )
    {
        /* split the input evenly into two columns */
        const i = Math.floor( arr.length / 2 );
        const l = arr.slice().splice( 0, i );
        const r = arr.slice().splice( i - arr.length );

        /* clear list */
        const list = this.list;
        list.textContent = '';
        /* append both columns to list */
        if ( l.length ) { list.appendChild( this.create( 'div', { class: 'flex-container column width-1' }, l ) ) }
        if ( r.length ) { list.appendChild( this.create( 'div', { class: 'flex-container column width-1' }, r ) ) }
    }
}

/* imports */
import View from './view.js';

export default class ListboxView extends View
{
    constructor( )
    {
        super();

    }

    /* create and return a listbox with player attributes */
    static _createListBox = (
        svg,
        altcolor,
        name,
        rankcolor,
        highlight,
        datacol1,
        datacol2,
        solo,
        clickhandler,
        openoverlay
    ) => {
        /* define avatar box */
        const avdom = ListboxView.create( 'div', { class: 'avatar list' } );
        avdom.innerHTML = svg;

        const listbox = ListboxView.create( 'div', { class: 'list tactile board' + ( rankcolor ? ' rank' : '' ) }, [
            avdom,
            ListboxView.create( 'div', { class: 'listbox' }, [
                ListboxView.create( 'div', { class: 'name' }, ListboxView.create( 'span', 0, name ) ),
                ( datacol1 || datacol2 != null ) ? ListboxView.create( 'div', { class: 'headrow' }, [
                    ListboxView.create( 'span', 0, Object.keys( datacol1 )[ 0 ] ),
                    ListboxView.create( 'span', 0, Object.keys( datacol2 )[ 0 ] )
                ] ) : null,
                ( datacol1 || datacol2 != null ) ? ListboxView.create( 'div', { class: 'score' }, [
                    ListboxView.create( 'span', { }, Object.values( datacol1 )[ 0 ] ),
                    ListboxView.create( 'span', { }, Object.values( datacol2 )[ 0 ] )
                ] ) : null
            ] ),
            //openoverlay ? ListboxView.create( 'div', { class: 'overlay' } ) : null
            openoverlay || null
        ] );
        /* set conditional features */
        if      ( 1 == altcolor ) { avdom.classList.add( 'color' ) }
        else if ( 2 == altcolor ) { avdom.classList.add( 'nocolor' ) }
        if      ( highlight     ) { listbox.classList.add( 'new'  ) }
        if      ( solo          ) { listbox.classList.add( 'solo' ) }
        if      ( clickhandler || openoverlay )
        {
            let clickDelay, scrollPos;
            let clearDelay = e =>
            {
                e.stopPropagation();
                e.preventDefault();
                clearTimeout( clickDelay );
                clickDelay = null;
            }
            listbox.onpointerdown = e =>
            {
                /* track pointer event vertical position for scroll cancellatiopn */
                scrollPos  = e.clientY;
                clickDelay = setTimeout( () =>
                {
                    /* open overlay */
                    if ( e.clientY == scrollPos ) { openoverlay?.classList.toggle( 'show' ) }
                    clearDelay( e );
                }, 250 );
            }
            /* detect click cancellation: clear a pending hold if still pending and pointer has moved too much */
            listbox.onpointermove = e => ( 10 < Math.abs( e.clientY - scrollPos ) && null != clickDelay ) && clearDelay( e );
            /* execute clickhandler if click */
            listbox.onpointerup = e =>
            {
                /* detect click: if pointer has not moved much and is releasing before delay */
                if ( 10 > Math.abs( e.clientY - scrollPos ) && null != clickDelay ) { clickhandler( e ) }
                clearDelay( e );
            }
        }

        return listbox;
    }

    static _createListOverlay = (
        text,
        datacol1,
        datacol2,
        clickhandler
    ) => ListboxView.create( 'div', {
        class: 'overlay',
        onpointerdown: e => this.captureClassFocus( e, 'show' ),
        onclick: e =>
        {
            if ( typeof clickhandler == 'function' ) { clickhandler( e ) }
            e.stopPropagation();
        }
    }, [
        ListboxView.create( 'div', { class: 'info' },
            ListboxView.create( 'span', {}, '...' )
        ),
        ListboxView.create( 'div', { class: 'listbox' }, [
            //ListboxView.create( 'div', {} ),
            ListboxView.create( 'div', text ? { class: 'name' } : {}, text ? ListboxView.create( 'span', 0, text ) : null ),
            ( datacol1 || datacol2 != null ) ? ListboxView.create( 'div', { class: 'headrow' }, [
                ListboxView.create( 'span', 0, Object.keys( datacol1 )[ 0 ] ),
                ListboxView.create( 'span', 0, Object.keys( datacol2 )[ 0 ] )
            ] ) : null,
            ( datacol1 || datacol2 != null ) ? ListboxView.create( 'div', { class: 'score' }, [
                ListboxView.create( 'span', datacol1?._attr ?? null, Object.values( datacol1 )[ 0 ] ),
                ListboxView.create( 'span', datacol2?._attr ?? null, Object.values( datacol2 )[ 0 ] )
            ] ) : null
        ] )
    ] );

    static createHeader  = ( h ) => ListboxView.create( 'div', { class: 'list header tactile board' }, h );

    static createNoteBox = ( header, url, author, disclaimer, body, fitcontent ) =>
    {
        return ListboxView.create( 'div', { class: 'list tactile board' + ( fitcontent ? ' fitcontent' : '' ) },
            ListboxView.create( 'div', { class: 'notebox' }, [
                ( header || url || disclaimer || author ) ? ListboxView.create( 'div', { class: 'head' }, [
                    ListboxView.create( 'a', {
                        class:  header?.length > 16 ? 'tiny' : header?.length > 12 ? 'small' : '',
                        target:  '_blank',
                        href:    url,
                        onclick: e => e.stopPropagation()
                    }, header ),
                    ListboxView.create( 'span', { class: 'disclaimer' }, disclaimer )
                ] ) : null,
                ( header || url || disclaimer || author ) ? ListboxView.create( 'span', { class: 'author' }, author ) : null,
                ListboxView.create( 'span', { class: 'body' + ( (
                    typeof body == 'string' ? ( body.length > 95 ) : ( body?.length > 2 )
                ) ? ' small' : '' ) }, body )
            ] )
        )
    }

    static createNoteRow = ( col1, col2 ) =>
    {
        return ListboxView.create( 'div', { class: 'noterow' }, [
            ListboxView.create( 'span', 0, col1 ),
            ListboxView.create( 'span', 0, col2 )
        ] )
    }

    static createTextblock = ( text ) =>
    {
        return ListboxView.create( 'div', { class: 'textblock' },
            ( typeof text === 'string' ? [ text ] : text )?.map( s => [ ListboxView.create( 'span', 0, s ), ListboxView.create( 'br' ) ] ).flat()
        )
    }

}

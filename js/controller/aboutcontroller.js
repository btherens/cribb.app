/* imports */
import Controller from './controller.js';
import AboutModel from '../model/aboutmodel.js';
import AboutView from '../view/aboutview.js';

import ListboxController from './listboxcontroller.js';
import sfetch from '../sfetch.js';

export default class AboutController extends Controller
{
    constructor( model = new AboutModel, view = new AboutView )
    {
        super( model, view );
    }

    /* events */
    /* run updates after model changes */
    onModelChanged = (
        credits    = this.model.credits,
        dedication = this.model.dedication,
        url        = this.model.url,
        author     = this.model.author,
        privacy    = this.model.privacy,
        changelog  = this.model.changelog,
        license    = this.model.license,
        vabout     = this.view.about,
        vchangelog = this.view.changelog,
        vprivacy   = this.view.privacy,
        vlicense   = this.view.license,
        cachesize  = this.model.cachesize,
        lssize     = this.model.lssize
    ) => {
        /* update list view */
        if ( vabout )
        {
            this.view.displayAboutView(
                /* dedication */
                ListboxController.createTextblock( dedication ),
                /* credits list */
                credits?.map( l => ListboxController.createNoteBox(
                    l.title,
                    l.url,
                    l.author,
                    l.disclaimer,
                    l.body
                ) ),
                /* privacy info */
                privacy.filter( c => !c?.header ).slice( 0, 3 ).map( c => ListboxController.createNoteBox(
                    c.name,
                    null,
                    null,
                    c?.disclaimer,
                    c.text
                ) ),
                /* list of recent changes */
                changelog.slice( 0, 3 ).map( c => ListboxController.createNoteBox(
                    c.name,
                    null,
                    null,
                    c.date,
                    c.list?.map( l => this.view.create( 'li', 0, l ) )
                ) ),
                /* app size note */
                this._createSizeNote( cachesize, lssize )
            );
            this.view.displayFooter( vabout, url, author );
        }
        if ( vchangelog )
        {
            this.view.displayChangelogView(
                changelog.map( c => ListboxController.createNoteBox(
                    c.name,
                    null,
                    null,
                    c.date,
                    c.list?.map( l => this.view.create( 'li', 0, l ) )
                ) )
            );
            this.view.displayFooter( vchangelog, url, author );
        }
        if ( vprivacy )
        {
            this.view.displayPrivacyView(
                privacy.map( c =>
                {
                    if ( c.header )
                    {
                        return ListboxController.createHeader( c.header );
                    }
                    else
                    {
                        return ListboxController.createNoteBox(
                            c.name,
                            null,
                            null,
                            c?.disclaimer,
                            c.text
                        )
                    }
                } )
            );
            this.view.displayFooter( vprivacy, url, author );
        }
        if ( vlicense )
        {
            /* simple text to dom renderer */
            const text2dom = text => text?.split( /\n\n/ )
                .map( line => this.view.create( 'p', {},
                        /* test for length of line */
                        line.split( /\n/ )[ 0 ].trim().length <= 64
                            /* lines that are short enough will be parsed */
                            ? this.model.sinterleave( line.split( /\n/ ).map( line => this.view.create( 'span', {}, line.trim() ) ), this.view.create( 'br' ) )
                            /* remove any newlines and allow wrapping */
                            : line.replace( /\n/, ' ' ).trim()
                    )
                );
            this.view.displayLicenseView( license.map( l => ListboxController.createNoteBox( l.title, l.licenseurl ?? l.url, null, l?.disclaimer, text2dom( l?.fulllicense ), true ) ) );
            this.view.displayFooter( vlicense, url, author );
            /* load licenses from server if not loaded yet */
            if ( !license.filter( l => l?.fulllicense ).length ) { this.fetchLicenses() }
        }
    }

    /* return a new about view */
    createAboutView( )
    {
        /* create view */
        const view = this.view.createAboutView();
        /* fully populate view */
        this.onModelChanged();
        return view;
    }

    /* return a new changelog view */
    createChangelogView( )
    {
        /* create view */
        const view = this.view.createChangelogView();
        /* fully populate view */
        this.onModelChanged();
        return view;
    }

    createPrivacyView( )
    {
        /* create view */
        const view = this.view.createPrivacyView();
        /* fully populate view */
        this.onModelChanged();
        return view;
    }

    createLicenseView( )
    {
        /* create view */
        const view = this.view.createLicenseView();
        /* fully populate view */
        this.onModelChanged();
        return view;
    }

    _createSizeNote = ( cachesize, lssize ) =>
    {
        /* cast bytes to string in kilobytes */
        const _returnSizeString = ( byte ) => byte ? ( byte / 1024 ).toFixed( 1 ) + ' kB' : '--';
        /* create a note for app size */
        const sizenote = ListboxController.createTableNote( {
            application:   _returnSizeString( cachesize ),
            'synced data': _returnSizeString( lssize ),
            total:         _returnSizeString( cachesize + lssize )
        } );
        /* trigger storage scan if page comes into view */
        this._bindOnBecomeVisible( sizenote, () => !cachesize && !lssize && this._delay( 600 ).then( this.scanAllStorageSize ) );
        return sizenote;
    }

    /* call service worker cache scan and save to property */
    _scanSwSize = () => navigator.serviceWorker?.controller && sfetch.json( sfetch.request( '/service/cachesize' ) ).then( o  => this.model.cachesize = o?.bytes ?? null );
    /* call localstorage scan and save to property */
    _scanLsSize = () => this._promise().then( () => this.model.lssize = this.model.lsSize() )
    /* run all storage scans and trigger model change upon success */
    scanAllStorageSize = ( ) => Promise.all( [ this._scanSwSize(), this._scanLsSize() ] ).then( () => this.onModelChanged() )

    /* get text from server paths and trigger update events when promises complete */
    fetchLicenses = ( license = this.model.license ) => Promise.all( license.map(
        ( l, i, a ) => fetch( sfetch.request( l.licensepath ) ).then( response => response.text() ).then( text => a[ i ].fulllicense = text )
    ) ).then( () => this.onModelChanged() );

    /* bind a callback event on an element to run if it scrolls into view */
    _bindOnBecomeVisible = ( el, c ) =>
    {
        const callback = entries => entries.forEach( ( entry ) => { if ( entry.isIntersecting ) { c( entry ) } } );
        this._observer = new IntersectionObserver( callback, { threshold: 0.7 } );
        this._observer.observe( el );
    }

    /* bindings */
    bindRoute( handler )
    {
        this.handleRoute = handler;
        this.view.bindRoute( handler );
    }

}

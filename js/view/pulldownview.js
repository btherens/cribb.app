/* imports */
import View from './view.js';

import AnimationController from '../controller/animationcontroller.js';

/* visual logic for app pulldown menu */
export default class PulldownView extends View
{

    constructor()
    {
        super();

        /* define properties */
        this.container  = document.getElementById( 'pulldown-menu' );
        this.menubtn    = document.getElementById( 'pd-button' );
        this.hamburger  = document.getElementById( 'pd-hamburger' );
        //this.header     = document.getElementById( 'pd-header' );
        this.slide      = document.getElementById( 'pd-menuslide' );
        this.pane1      = document.getElementById( 'pd-pane1' );
        this.pane2      = document.getElementById( 'pd-pane2' );
        this.pane3      = document.getElementById( 'pd-pane3' );
        /* collection of views to display in menu */
        this.views      = [];
        /* header to use if no views have headers */
        this.baseheader = null;

        /* stop interaction event bubbling at menu container */
        this.container.addEventListener( 'pointerdown', e => this.captureClassFocus( e, 'show' ) );
    }

    /* append a view to the menu */
    appendView( view, f ) { this.views.push( [ view, f ] ); }

    /* drop a view from the menu and shift display to previous */
    removeView() { return this.views.pop() }

    get header() { return this.menubtn.getElementsByTagName( 'span' ) ? this.menubtn.getElementsByTagName( 'span' )[ 0 ] : null }
    set header( h )
    {
        /* apply animations to hamburger button container */
        const a   = new AnimationController( this.hamburger.parentElement, { y: false, s: false } );
        let run;
        /* clear text from header */
        for ( let e of this.menubtn.getElementsByTagName( 'span' ) )
        {
            /* re-hide header */
            if ( e.ogParentNode != null ) { e.ogParentNode.appendChild( e ) } else { e.parentNode.removeChild( e ) }
            run = true;
        }
        /* append new content if exists */
        if ( h )
        {
            h.ogParentNode = h.parentNode;
            this._appendChildNode( this.menubtn.children[ 0 ], h );
            run = true;
        }
        /* run animation if we moved */
        if ( run ) { a.run().then( () => h?.classList.add( 'unhide' ) ) }
    }

    /* render the views collection */
    displayViews( views )
    {
        let v1, v2, v3;
        /* case one - one view */
        if ( views.length == 1 )
        {
            v1 = views[ 0 ][ 0 ];
            this.slideMenu   = 1;
            this.showBackBtn = false;
        }
        /* case two - two views */
        else if ( views.length == 2 )
        {
            v1 = views[ views.length - 2 ][ 0 ];
            v2 = views[ views.length - 1 ][ 0 ];
            this.slideMenu   = 2;
            this.showBackBtn = true;
        }
        /* case three - three views */
        else if ( views.length > 2 )
        {
            v1 = views[ views.length - 3 ][ 0 ];
            v2 = views[ views.length - 2 ][ 0 ];
            v3 = views[ views.length - 1 ][ 0 ];
            this.slideMenu   = 3;
            this.showBackBtn = true;
        }
        /* get header */
        const mheader = ( v3 ?? v2 ?? v1 ).getElementsByClassName( 'pd-header' )[ 0 ] ?? this.baseheader;
        /* set header (after delay) */
        setTimeout( () => this.header = mheader, 350 );
        /* display views in DOM (avoid replacing to maintain scroll positions) */
        if ( v1 && v1 !== this.pane1.children[ 0 ] ) { this.pane1.replaceChildren( v1 ) }
        if ( v2 && v2 !== this.pane2.children[ 0 ] ) { this.pane2.replaceChildren( v2 ) }
        if ( v3 && v3 !== this.pane3.children[ 0 ] ) { this.pane3.replaceChildren( v3 ) }
        /* update scroll positions (after transition finishes) */
        setTimeout( () => this.setScrollEvents(), 400 );
    }

    /* observer function - call _onResize.observe( el ) to add element to list */
    _onResize = new ResizeObserver( els => els.forEach( el => el.target.dispatchEvent( new Event( 'scroll' ) ) ) );

    /* update scroll effect on any scroll elements in dom */
    setScrollEvents( els = document.getElementsByClassName( 'scroll' ) )
    {
        Array.from( els ).forEach( el =>
        {
            /* set up scroll events if necessary */
            if ( typeof el.onscroll != 'function' )
            {
                el.addEventListener( 'scroll', this._applyScrollShadows );
                this._onResize.observe( el );
            }
            /* update scroll position */
            el.dispatchEvent( new Event( 'scroll' ) ) 
        } )
    }

    /* update scroll shadow effect */
    _applyScrollShadows( e, t = e.currentTarget )
    {
        /* scroll properties */
        const s      = t.scrollTop;
        const min    = 0;
        const max    = t.scrollHeight - t.offsetHeight;

        /* update scroll effect if there is a difference between target height and target size */
        if ( max != 0 )
        {
            /* remove noshadow */
            t.classList.remove( 'noshadow' );
            /* set classes based on scroll position */
            /* we're at the top */
            if      ( s <= min ) { t.classList.add( 'bottom' ); t.classList.remove( 'top' ); }
            /* we're at the bottom */
            else if ( max <= s ) { t.classList.remove( 'bottom' ); t.classList.add( 'top' ); }
            /* somewhere in the middle */
            else    { t.classList.add( 'bottom' ); t.classList.add( 'top' ); }
        }
        /* disable scroll visibility if there is no overflow */
        else { t.classList.add( 'noshadow' ) }
    }

    /* bind the menu button event and method */
    bindClickMenuBtn( handler ) { this.menubtn.addEventListener( 'pointerdown', handler ) }

    /* getter / setter */
    /* showMenu = true / false property defines if menu is shown */
    get showMenu() { return this.container.classList.contains( 'show' ) }
    set showMenu( e ) { this.container.classList.toggle( 'show', !!e ) }
    /* isFullScreen = true / false if menu takes up entire screen */
    get isFullScreen() { return this.container.classList.contains( 'fullscreen' ) }
    set isFullScreen( e ) { this.container.classList.toggle( 'fullscreen', !!e ) }
    /* showMenuToggle - whether or not menu toggle is shown */
    get showMenuToggle() { return !this.container.classList.contains( 'notoggle' ) }
    set showMenuToggle( e ) { this.container.classList.toggle( 'notoggle', !e ) }
    /* showBackBtn - true back button is shown, false no back button */
    get showBackBtn() { return this.hamburger.classList.contains( 'back' ) }
    set showBackBtn( e ) { this.hamburger.classList.toggle( 'back', !!e ) }
    /* show menu header */
    get showMenuHeader() { return !!this.header?.classList.contains( 'unhide' ) }
    set showMenuHeader( b ) { this.header?.classList.toggle( 'unhide', !!b ) }

    /* apply menuslide effect */
    get slideMenu()
    {
        return this.slide.classList.contains( 'three' ) ? 3 : ( this.slide.classList.contains( 'two' ) ? 2 : ( this.slide.classList.contains( 'one' ) ? 1 : 0 ) )
    }
    set slideMenu( lvl )
    {
        switch ( lvl )
        {
            case 3:
                this.slide.classList.add( 'three' );
                this.slide.classList.add( 'two' );
                this.slide.classList.add( 'one' );
                break;
            case 2:
                this.slide.classList.remove( 'three' );
                this.slide.classList.add( 'two' );
                this.slide.classList.add( 'one' );
                break;
            default:
                this.slide.classList.remove( 'three' );
                this.slide.classList.remove( 'two' );
                this.slide.classList.add( 'one' );
                break;
        }
    }

}

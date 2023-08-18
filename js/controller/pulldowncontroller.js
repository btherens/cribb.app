/* imports */
import Controller from './controller.js';
import PulldownModel  from '../model/pulldownmodel.js';
import PulldownView   from '../view/pulldownview.js';

/* pulldown menu events and views */
export default class PulldownController extends Controller
{
    constructor( model = new PulldownModel, view = new PulldownView )
    {
        super( model, view );

        /* apply bindings */
        this.view.bindClickMenuBtn( this.handleClickMenuBtn );
    }

    /* open a new view over the existing one and include a handler for close event */
    appendView( html, clsHandler = null )
    {
        /* add to view */
        this.view.appendView( html, clsHandler );
        /* trigger render event */
        this.onViewsChanged();
    }

    /* remove a view from views collection and run  */
    dropView() {
        /* remove from view stack */
        const [ v, f ] = this.view.removeView();
        /* execute and clear an onclose */
        if ( f ) { f() }
        /* update ui */
        this.onViewsChanged();
    }

    /* remove all except first view from views collection */
    trimViews()
    {
        this.view.views.splice( 1 );
        /* update ui */
        this.onViewsChanged();
    }

    refreshScroll()
    {
        if ( this.view.showMenu )
        {
            this.view.setScrollEvents()
        }
    }

    /* handlers */
    handleClickMenuBtn = () => {
        /* only if the toggle is being shown and no elements are open in container */
        if ( this.view.showMenuToggle && !this.view.container.getElementsByClassName( 'show' ).length )
        {
            if   ( this.view.showBackBtn ) { this.dropView() }
            /* toggle the menu's visibility */
            else { this.view.showMenu = !this.view.showMenu }
        }
    }
    /* show / hide the pulldown menu */
    get showMenu() { return this.view.showMenu }
    set showMenu( v ) { this.view.showMenu = v }
    /* show the menu toggle button (hide a header if the toggle is disappearing) */
    get showMenuToggle() { return this.view.showMenuToggle }
    set showMenuToggle( v )
    {
        this.view.showMenuToggle = v;
        //if ( !v ) { this.hideHeader() };
    }
    /* open menu is full screen */
    get isFullScreen() { return this.view.isFullScreen }
    set isFullScreen( v ) { this.view.isFullScreen = v }
    /* menu header */
    get showMenuHeader() { return this.view.showMenuHeader }
    set showMenuHeader( v ) { this.view.showMenuHeader = v }

    /* fire events when views change */
    onViewsChanged = ( views = this.view.views ) => { this.view.displayViews( views ) }

    get header() { return this.view.header }

    set baseheader( s ) { this.view.baseheader = s }

    /* hide the menu header - can be called pre-transition */
    hideHeader = ( ) => this.view.header?.classList.remove( 'unhide' );

}
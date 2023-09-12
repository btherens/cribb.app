/* imports */
import View from './view.js';

export default class AppView extends View
{
    constructor()
    {
        super();

        /* disable default click actions (double tap to zoom and others) */
        document.onclick = e => { e.preventDefault(); e.stopPropagation(); }
        /* disable default contextual menus (disabled) */
        //document.oncontextmenu = e => e.preventDefault();
        /* disable scrolling on mobile */
        document.ontouchmove = e => { e.preventDefault() }
        /* browser navigation will force a site reload */
        window.onpopstate = e => location.reload();
        /* mainscreen is where game views are presented */
        this.mainscreen = document.getElementById( 'mainscreen' );

        this._notifybar   = document.getElementById( 'notifybar' );
        this._notifyspan  = this._notifybar.children[ 0 ];
    }

    createIntro = ( allowskip = false ) =>
    {
        const introdiv = this.create( 'div', { id: 'titleintro' }, this.create( 'div', {}, [
            this.create( 'span', {}, 'cribb.app' ),
            this.create( 'span', {}, 'play cribbage with friends!' )
        ] ) );
        document.body.appendChild( introdiv );
        /* skip intro screen early with click */
        if ( allowskip ) introdiv.onclick = () => introdiv.remove();
        /* return div for  */
        return introdiv;
    }

    hideNotify = () =>
    {
        /* remove transition class */
        this._notifybar.classList.remove( 'transition' );
        /* hide notify */
        this.showNotify = false;
        setTimeout( () => this._notifybar.classList.add( 'transition' ), 200 );
    }

    /* set the pan class to a notification and pan the text the % necessary */
    applyNotifyPan( margin = 0.2 )
    {
        const el     = this.note,
              /* measure the element and it's parent */
              dim    = el.getBoundingClientRect(),
              pdim   = el.parentNode.getBoundingClientRect(),
              /* calculate the relative width ratio (minus left and right margin) */
              wratio = 1 - ( ( dim.width - dim.height * margin * 2 ) / ( pdim.width ) ),
              /* return a pan % or null if no pan is needed */
              pct    = 0 > wratio ? wratio : null;
        if ( pct )
        {
            this._notifybar.classList.add( 'pan' );
            setTimeout( () => this._notifyspan.style.transform = `translateX(${ pct * 100 }%)`, 20 );
        }
    }

    get showNotify() { return this._notifybar.classList.contains( 'show' ) }
    set showNotify( s ) { this._notifybar.classList.toggle( 'show', !!s ) }

    get html() { return document.getElementsByTagName( 'html' )[0] }
    get showOffline() { return this.html.classList.contains( 'offline' ) }
    set showOffline( b ) { this.html.classList.toggle( 'offline', !!b ) }

    //get notePan() { return this._notifybar.classList.contains( 'pan' ) }
    //set notePan( s ) { this._notifybar.classList.toggle( 'pan', !!s ) }
    //set showNotify( s ) { s ? this._notifybar.classList.add( 'show' ) : this._notifybar.classList.remove( 'show' ) }

    get note() { return this._notifyspan }
    set note( s )
    {
        this._notifyspan.textContent = '';
        /* remove any transforms */
        this._notifyspan.removeAttribute( 'style' );
        this._nest( this._notifyspan, s );
    }

    //get screenload() { return document.body.classList.contains( 'load' ) }
    //set screenload( b ) { document.body.classList.toggle( 'load', !!b ) }

}

export default class View
{
    constructor() { }

    /* create elements quickly and easily
     * e.g.
     * view.create( 'button', { class: 'tactile' },
     *     view.create( 'span', null, 'begin new game' )
     * )
     */
    create = View.create;
    static create( tagName, props, nest )
    {
        /* create element */
        let el = document.createElement( tagName );
        /* check for any explicit properties */
        if ( props ) { View._assignEventAttr( el, props ) }
        /* evaluate and return nested objects */
        return View._nest( el, nest )
    }

    /* interpret a string as HTML and return as dom object */
    string2dom = View.string2dom;
    static string2dom( str, props )
    {
        /* interpret string as html */
        const d = View.create( 'div' );
        d.innerHTML = str;
        const el = d.children[ 0 ];
        /* assign properties */
        if ( props ) { View._assignEventAttr( el, props ) }
        return el;
    }

    /* capture an event remove class c from any children
     * class container is implicitly the event target - pass alternate target to override
     * c parameter will also define what callback will be run,
     * e.g. this.captureClassFocus( event, 'show' ) will call event.currentTarget.onshowloss()
     */
    captureClassFocus = View.captureClassFocus;
    static captureClassFocus( e, c, t = e.currentTarget, stop = true )
    {
        /* loop through classes to remove */
        ( Array.isArray( c ) ? c : [ c ] ).forEach( ( c ) =>
        {
            /* capture focus here if the target is show */
            if ( t.classList.contains( c ) )
            {
                /* halt event propagation if we found a class to remove */
                if ( stop ) { e.stopPropagation() }
                /* get any elements with class */
                const shows = t.getElementsByClassName( c );
                while ( shows[ 0 ] )
                {
                    /* trigger any on`class`loss callbacks */
                    if ( typeof shows[ 0 ][ 'on' + c + 'loss' ] === 'function' ) { shows[ 0 ][ 'on' + c + 'loss' ]() }
                    /* remove the class */
                    shows[ 0 ].classList.remove( c );
                }
            }
        } )
    }

    /* nest an object inside another object */
    _nest = View._nest;
    static _nest( el, child, clear )
    {
        /* clear element contents if clear argument */
        if ( el && clear ) { el.textContent = '' }
        /*  */
        if ( child )
        {
            /* loop through array and append each child in sequence */
            if   ( child instanceof Array ) { child.forEach( c => View._appendChildNode( el, c ) ) }
            /* otherwise append single child */
            else { View._appendChildNode( el, child ) }
        }
        return el;
    }

    /* assign object properties to an element as attributes and event listeners */
    _assignEventAttr = View._assignEventAttr;
    static _assignEventAttr( el, p )
    {
        /* step through each property */
        for ( let n in p )
        {
            /* on* properties are read as event listeners */
            if      ( n.indexOf( 'on' ) === 0 ) { el.addEventListener( n.substring( 2 ).toLowerCase(), p[ n ], false ) }
            /* remove null/undefined attributes */
            else if ( p[ n ] == null ) { el.removeAttribute( n ) }
            /* otherwise set attribute as key/value */
            else    { el.setAttribute( n, p[ n ] ) }
        }
    }

    /* append an implicitly cast textnode child to element */
    _appendChildNode = View._appendChildNode;
    static _appendChildNode( el, child ) { if ( typeof child === 'string' ) { let text = document.createTextNode( child ); el.appendChild( text ); } else if ( child instanceof Node ) { el.appendChild( child ) } }

    /* advance to next form input and capture event behavior (k:9 = tab, k:13 = return ) */
    _nextFormInput = View._nextFormInput;
    static _nextFormInput( e, k = [ 9, 13 ] )
    {
        /* if return key is pressed */
        if ( e.keyCode && k.includes( e.keyCode ) )
        {
            /* advance input focus */
            e.target.form.elements[ Array.prototype.indexOf.call( e.target.form, e.target ) + 1 ].focus();
            /* prevent default key behavior */
            e.preventDefault();
        }
    }

    /* get an element's absolute coordinates and the element's radius */
    getPosition = View.getPosition;
    static getPosition( el )
    {
        const rect = el.getBoundingClientRect();
        return { left: rect.left + window.scrollX, top: rect.top + window.scrollY, rad: ( rect.width + rect.height ) / 4 }
    }

    /* set coodinate position to object
     * absolute = false to apply relative position and scale from origin
     * this.setPosition( ...Object.values( { el: e, ...p } ) );
     */
    setPosition = View.setPosition;
    static setPosition( el, left, top, s, absolute = true )
    {
        if ( el )
        {
            /* handle as absolute window coordinates or as relative movement from dom position */
            const p = absolute ? View.getPosition( el ) : { left: 0, top: 0 }
            /* apply style position overrides */
            if ( left != null ) { el.style.left = left - p.left + 'px' }
            if ( top  != null ) { el.style.top  = top  - p.top  + 'px' }
            /* apply scalling override */
            if ( s != null && s != 1 )
            {
                /* apply scale over existing scale via numerical property numStyleTransformScale */
                if ( el.style.transform ) { s = s * el.numStyleTransformScale }
                /* set scale to custom property */
                el.numStyleTransformScale = s;
                /* set scale to inline style */
                el.style.transform = 'scale(' + s + ')';
            }
        }

    }

    static getIndex = ( el ) => { return [].indexOf.call( el.parentNode.children, el ) }

}
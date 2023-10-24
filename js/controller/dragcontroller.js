/* imports */
import Controller from './controller.js';
import _model     from '../model/dragmodel.js';
import _view      from '../view/dragview.js';

/*
 * bind drag logic to an element
 * const d = new Drag( element )
 */
export default class DragController extends Controller
{
    constructor( model = new _model, view = new _view )
    {
        super( model, view );
    }

    /* initiate environment */
    static init = () => _view.bindMoveMap( DragController._bindDragPointer );

    /* draggable screen area */
    static set screen( el ) { _view.screen = el }
    /* define a default drag target to drag cards to */
    static dragTarget   = null;
    /* allowed number of cards to hold - null is unlimited */
    static dragQuota    = null;
    /* disable drag globally */
    static isOn         = true;

    /* active drag state properties  */
    /* the start coordinates to use to determine relative offset during drag */
    static _start         = { left: 0, top: 0, rad: 0 };
    /* track an element being toggled (click to activate/deactivate) */
    static _elToggle      = null;
    /* is drag mode on (enable to allow pointer events to drag objects) */
    static _isDomMove     = false;
    /* track moved elements here for callback */
    static _moved         = [];

    /* external events */
    /* when an object is dragged in the DOM */
    static onDomChange    = ( ) => { }
    /* when a change to the actives collection occurs */
    static onActiveChange = ( ) => { }
    /* allow a dragged card to be moved to default destination */
    static isDefaultMove  = ( ev ) => true;
    /* pass a function to execute and trigger activechange event if changes occur */
    static _triggerActivesChange = ( f = () => {}, c = DragController.onActiveChange ) =>
    {
        /* track pre-execution actives object */
        const actv = Array.from( _view.actives );
        /* run active change callback code */
        f();
        /* trigger active object change events if necessary */
        if ( !_model.isArrEqual( actv, Array.from( _view.actives ) ) ) { c( _view.actives ) }
    }

    /* run domchange callback if dom change occured and */
    static _triggerDomChange = ( m = DragController._moved, c = DragController.onDomChange ) =>
    {
        /* run callback if moved elements are found */
        if ( m.length ) { c( m ) }
        /* wipe collection */
        DragController._moved = [];
    }

    /* clear active drag state */
    static clear = () =>
    {
        /* the coordinates to use for object offset */
        DragController._start     = { left: 0, top: 0 };
        /* track offset from origin as actives shift throughout the dom */
        DragController._shift     = { left: 0, top: 0, scale: 1 };
        /* track toggle functionality on single elements being clicked */
        DragController._elToggle  = null;
        /* track click / drag state */
        DragController._isDomMove = false;
    }

    /* event bindings */
    /* bind drag events to the element */
    static bind = ( el ) =>
    {
        /* bind methods differ between touch and mouse */
        /* if client supports touch interface */
        if ( 'ontouchstart' in window )
        {
            el.ontouchstart = ev => DragController._startDrag( ev ); 
            /* set drag event (touch only, mouse events assigned to dragmap) */
            DragController._bindDragTouch( el );
        }
        /* apply pointer-style events */
        el.onpointerdown = ev => ev.button === 0 && DragController._startDrag( ev );
        /* prevent clicks */
        el.onclick       = ev => { ev.preventDefault(); ev.stopPropagation(); }
        /* drag visual styles */
        el.classList.add( _view.classCanDrag );
        /* return object reference */
        return el;
    }

    /* bind a simple select target without full drag */
    static bindInactive = ( el ) =>
    {
        /* mdrag visual styles */
        el.classList.add( _view.classCanDrag );
        el.onpointerdown = DragController._toggleElement;
        return el;
    }

    /* bind a drag-and-drop target */
    static bindContainer = ( el ) =>
    {
        /* set reference to identity containers while dragging */
        el.isdragcontainer = true;
        /* establish re-order property */
        el.isdragreorder   = false;
        /* bind dragcontainer event */
        el.onpointerdown   = DragController._startDragContainer;
    }

    /* unbind an element or container */
    static unbind = ( el ) => 
    {
        el.classList.remove( _view.classCanDrag );
        if ( 'ontouchstart' in window ) { el.ontouchstart = '' }
        if ( el.isdragcontainer ) { el.isdragcontainer = false }
        el.onpointerdown = '';
    }

    /* set pointer drag events - used on drag map */
    static _bindDragPointer( el )
    {
        el.onpointermove = ev => DragController._runDrag( ev );
        el.onpointerup   = ev => DragController._endDrag( ev );
    }

    /* set touch drag events - each draggable element */
    static _bindDragTouch( el )
    {
        el.ontouchmove = ev => DragController._runDrag( ev );
        el.ontouchend  = ev => DragController._endDrag( ev );
    }

    /* remove active class from any other collections */
    static _startDragContainer = ( ev ) => [ ..._view.actives ].forEach( el => el.parentNode === ev.currentTarget || !el.parentNode?.isdragcontainer || el.classList.remove( _view.classActive ) );

    /* trim the actives collection to match dragQuota (pass subtract = 1+ to offset) */
    static trimActives = ( subtract = 0 ) => DragController.dragQuota == null || DragController.disableActives( Math.max( DragController.dragQuota - subtract, 0 ) );

    /* toggle an element and handle collection size to ensure dragQuota isn't exceeded */
    static _toggleElement = ( ev, target = ev.currentTarget, force = null ) => DragController.toggleElements( [ target ], force );

    /* generic element toggle - toggle n number of elements and pass through activeschange handler */
    static toggleElements = ( els, force = null ) => DragController._triggerActivesChange( () => Array.from( els ).forEach( target =>
    {
        /* subtract one active if the target isn't yet active */
        if ( !target.classList.contains( _view.classActive ) && force != false ) { DragController.trimActives( 1 ) }
        /* toggle target's active state */
        if ( force == null ) { target.classList.toggle( _view.classActive ) }
        else                 { target.classList.toggle( _view.classActive, !!force ) }
    } ) );

    /* return active class name from view */
    static get classActive() { return _view.classActive }
    /* return actives htmlcollection from view */
    static get actives() { return _view.actives }
    /* htmlcollection of elements that can be dragged */
    static get canDrags() { return _view.canDrags }

    static _isForceActive = false;
    /* track active drag operations */
    static get isActive() { return !!( DragController._isForceActive || _view.mapEnable ) }

    /* begin a drag operation */
    static _startDrag = ( ev, target = ev.currentTarget ) =>
    {
        /* do not run if drag is disabled at container or global level */
        if ( !ev.currentTarget.parentElement?.isdragcontainer  || !DragController.isOn ) { return }
        /* detect toggle state if click target was already active or if we're at a dragQuota 0 */
        if ( target.classList.contains( _view.classActive ) || DragController.dragQuota === 0 ) { DragController._elToggle = target }

        DragController._toggleElement( null, target, true );
        /* cache pointer and active elements start - use this event's current target for isdrag radius detection */
        DragController._cacheStart( ev, _view.getPosition( target ).rad );
        DragController._cacheElementContext( _view.actives );
        /* enable dragmap for movement tracking */
        _view.mapEnable = true;
    }

    /* execute a drag movement */
    static _runDrag = ( ev, els = _view.actives ) =>
    {
        /* do not run if drag is disabled */
        if ( !DragController.isOn ) { return }
        /* update move if we have actives */
        if ( els.length )
        {
            /* find coordinates ( mouse / touch ) */
            let c = ev.clientX !== undefined ? ev : ev.changedTouches[ 0 ];
            /* scan for draggable elements under mouse and apply any new location info to _shift */
            if ( DragController._isDomMove ) { DragController._applyDomShift( c, els ) }
            /* apply pickup offset to active objects */
            DragController._applyOffset( c );
            /* consider it a drag if element has been dragged > 1/3 of its radius away from origin */
            if ( ( Math.abs( c.clientX - DragController._start.left ) + Math.abs( c.clientY - DragController._start.top ) ) / 2 > DragController._start.rad / 3 )
            {
                /* drop any actives not in a draggable context */
                [ ...els ].filter( el => !el.parentNode?.isdragcontainer ).map( el => { el.classList.remove( DragController.classActive ); DragController._dropElements( [ el ] ); } );
                DragController._isDomMove = true;
            }
        }
    }

    /* force a drag movement of els to parent behind insert with a del between each card
     * callback functions:
     * mid:  executed once mid-drag
     * post: executed once/element after drag
     */
    static forceDrag = ( els = _view.actives, parent = null, insert = null, del = 0, mid = null, post = null ) =>
    {
        /* cast element, array, htmlcollection to array */
        els = Array.from( els.length == null ? [ els ] : els );
        /* measure expected delay for return promise */
        const rdelay = del * ( ( els?.length ?? -1 ) + 1 );
        /* update move if we have actives */
        if ( els.length )
        {
            DragController._isForceActive = true;
            /* cache element origins */
            DragController._cacheElementContext( els );
            /* activate elements */
            for ( let el of els ) { el.classList.add( _view.classActive ) }
            /* scan for draggable elements under mouse and apply any new location info to _shift */
            DragController._applyDomShift( null, els, mid, null, null, parent, insert );
            /* apply pickup offset to elements */
            DragController._applyOffset( null, els, null );

            /* loop through each el being moved */
            els.forEach( ( el, i ) =>
            {
                /* wait for given delay between each move */
                this._delay( del * ( i + 1 ) )
                .then( () =>
                {
                    /* remove active class */
                    el.classList.remove( _view.classActive );
                    /* drop card to return to dom */
                    DragController._dropElements( [ el ] );
                    /* if we're at the end of this loop, disable isforceactive flag and trigger any domchange handlers if necessary */
                    if ( els.length - 1 == i ) { DragController._isForceActive = false; DragController._triggerDomChange(); }
                } )
                .then( () => this._delay( del ) )
                .then( () => typeof post == 'function' && post( el ) );
            } );
        }
        /* return promise that fulfills after animation completes */
        return this._delay( rdelay ?? 0 );
    }

    /* end a drag operation */
    static _endDrag = ( ev ) =>
    {
        /* do not run if drag is disabled */
        if ( !DragController.isOn ) { return }
        /* disable dragmap */
        _view.mapEnable = false;
        /* drop any moved objects (return to dom) */
        DragController._dropElements();
        /* run actives altering codeblock and trigger events */
        DragController._triggerActivesChange( () =>
        {
            /* deactivate all cards if this wasn't a click */
            if      ( DragController._isDomMove ) { DragController.disableActives() }
            /* otherwise deactivate toggled objects */
            else if ( DragController._elToggle ) { DragController._elToggle.classList.remove( _view.classActive ) }
        } );
        /* trigger ondomchanged event */
        DragController._triggerDomChange();
        /* clear cache properties */
        DragController.clear();
    }

    /* cache event start, element locations, and a passthrough target radius */
    static _cacheElementContext = ( els ) =>
    {
        /* cache active target positions */
        for ( let el of els )
        {
            el.dragOrigin = { parent: el.parentNode, index: _view.getIndex( el ), pos: _view.getPosition( el ) };
            el._shift     = { left: 0, top: 0, scale: 1 };
        }
    }

    /* cache event start and a passthrough target radius */
    static _cacheStart = ( ev, dr ) =>
    {
        /* find event coordinates (mouse / touch) */
        const c = ev.clientX !== undefined ? ev : ev.touches[ 0 ];
        /* cache pointer coordinates and target radius */
        DragController._start = { left: c.clientX, top: c.clientY, rad: dr }
    }

    /* remove explicit position info from an element (return to dom, but perhaps still active/picked up) */
    static _dropElements = ( els = _view.actives ) =>
    {
        /* step through each element we're dropping */
        for ( let el of els )
        {
            /* remove offset and scale styles */
            el.removeAttribute( 'style' );
            /* track elements that have moved */
            if ( el?.dragOrigin?.parent && ( el !== el.dragOrigin.parent.children[ el.dragOrigin.index ] ) ) { DragController._moved.push( el ) }
            /* clear origin property */
            el.dragOrigin = null;
        }
    }
    /* remove active/toggle classes until collection is shorter than the included index */
    static disableActives = ( q = 0 ) => { while ( _view.actives[ q ] ) { _view.actives[ q ].classList.remove( _view.classActive ) } }

    /* update positioning with pickup point, latest event coordinates, and persistent dom shift */
    static _applyOffset = ( ev, els = _view.actives, start = DragController._start ) =>
    {
        for ( let el of els )
        {
            _view.setPosition(
                el,
                ( el._shift ? el._shift.left : 0 ) + ( ev ? ev.clientX : 0 ) - ( start ? start.left : 0 ),
                ( el._shift ? el._shift.top : 0 )  + ( ev ? ev.clientY : 0 ) - ( start ? start.top : 0 ),
                ( el._shift ? el._shift.scale : null ),
                false
            );
            /* reset the shift scale - measurement is relative */
            if ( el._shift ) { el._shift.scale = 1 }
        }
    }

    /* return objects from coordinates that match search criteria */
    static _scanDragContext = (
        ev,
        els  = _view.actives,
        scan = document.elementsFromPoint( ev.clientX, ev.clientY )
    ) => {
        /* cast to array */
        els = Array.from( els );
        /* conditions to consider containers and elements for drag */
        const isContainer = el => el.isdragcontainer;
        const isEl        = el => isContainer( el.parentNode ) && !els.find( a => a === el );
        return {
            /* an object to insert behind  - an inactive element inside a drag-enabled collection */
            el:         scan.find( el => isEl( el ) ) ?? null,
            /* a collection to insert into - a list with drag property */
            collection: scan.find( el => isContainer( el ) ) ?? null,
            /* returns a drag aware space - if this is null we're outside the screen */
            screen:     scan.find( el => el === _view.screen ) || null
        }
    }

    /* shift a held object throughout the dom and compensate for jumps */
    static _applyDomShift = (
        /* drag event (required for dragcontext) */
        ev,
        /* elements being moved */
        els         = _view.actives,
        /* callback to be run mid-move */
        c           = null,
        /* allow default dom move */
        moveDefault = DragController.isDefaultMove( ev, els ),
        /* two separate methods of passing new location info */
        /* 1: the location of user pointer will be scanned for relevant drags and executed */
        dc          = DragController._scanDragContext( ev, els ),
        /* 2: force - move the els to new parent and insert */
        fp          = null,
        fi          = null
    ) => {
        /* get index of element in dom */
        const getIndex = _view.getIndex;
        /* return the next child that is not active after given index */
        const getNextInactiveChild = ( el, index ) => { return ( [ ...el.children ].find( ( n, i ) => i > index && !n.classList.contains( _view.classActive ) ) ) }

        /* element is appended to parent behind insert if parent is defined */
        let parent, insert;
        /* loop index */
        let i = 0;
        /* track any position movement for postprocessing */
        let pos = [];
        /* determine any dom shifts for each element in els */
        for ( let el of els )
        {
            /* each element is considered for insert separately - pass fp / fi to force a move */
            [ parent, insert ] = [ fp, fi ];
            /* use dragcontext to set domshift if one was passed */
            if ( dc )
            {
                /* drag is over another draggable object */
                if ( dc.el )
                {
                    /* insert active element behind the element we're dragging over if not there already */
                    if ( dc.el != el.parentNode.children[ getIndex( el ) - i - 1 ] ) { [ parent, insert ] = [ dc.el.parentNode, getNextInactiveChild( dc.el.parentNode, getIndex( dc.el ) ) ] }
                }
                /* drag is over an active collection */
                else if ( dc.collection )
                {
                    /* insert this element at top of collection if we aren't there or at the end of the collection already */
                    if ( el !== dc.collection.children[ 0 + i ] && el !== dc.collection.children[ dc.collection.children.length - els.length + i ] ) { [ parent, insert ] = [ dc.collection, dc.collection.children[ 0 + i ] ] }
                }
                /* drag is somewhere over the game screen (but not an active element or collection) */
                else if ( moveDefault && dc.screen )
                {
                    /* send element to its explicitly set drag target (by default drags complete to the default target) */
                    if ( DragController.dragTarget?.isdragcontainer && el.parentNode !== DragController.dragTarget ) { [ parent, insert ] = [ DragController.dragTarget, null ] }
                }
                /* return element to its origin if not there already and drag is outside draggable space */
                else if ( el !== el.dragOrigin.parent.children[ el.dragOrigin.index ] ) { [ parent, insert ] = [ el.dragOrigin.parent, el.dragOrigin.parent.children[ el.dragOrigin.index ] ] }
                /* resolve operation with container rules */
                /* if the insert operation is on a parent without drag reorder */
                if ( parent && !parent.isdragreorder )
                {
                    /* if drag started in parent but we're not at origin currently */
                    if      ( parent === el.dragOrigin.parent && ( el !== parent.children[ el.dragOrigin.index ] ) ) { insert = parent.children[ el.dragOrigin.index ] }
                    /* if drag started elsewhere but we're not at end of parent yet */
                    else if ( parent !== el.dragOrigin.parent && ( parent !== el.parentNode || el !== parent.children[ parent.children.length - els.length + i ] ) ) { insert = parent.children[ parent.children.length - els.length + i + 1 ] }
                    /* otherwise cancel the move */
                    else    { parent = null }
                }
            }
            /* move object if necessary */
            if ( parent )
            {
                /* cache position of all objects pre-shift */
                if ( !pos.length ) for ( let el0 of els ) { pos.push( { ..._view.getPosition( el0 ), ...{ el: el0 } } ) }
                /* move the object */
                parent.insertBefore( el, insert );
            }
            i++;
        }
        /* execute callback between start and finish, if included */
        typeof c == 'function' && c();
        /* measure any changes that occured */
        pos.forEach( p1 =>
        {
            /* get new position */
            const p2 = _view.getPosition( p1.el );
            /* get element's current shift property */
            const s  = p1.el._shift;
            /* update shift properties with new offsets */
            [ s.left, s.top, s.scale ] = [
                s.left + p1.left - p2.left + p1.rad - p2.rad,
                s.top  + p1.top  - p2.top  + p1.rad - p2.rad,
                p1.rad / p2.rad
            ];
        } );
    }

}

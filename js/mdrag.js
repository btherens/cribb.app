/* halt click events at a given target */
const stopEvent = e => { e.preventDefault(); e.stopPropagation(); }

/* disable default click actions (double tap to zoom) */
document.onclick = e => stopEvent(e);
/* disable scrolling on mobile */
document.ontouchmove = e => e.preventDefault();
/* disable default contextual menus */
//document.oncontextmenu = e => e.preventDefault();

/* mDrag - manage drag and drop objects
 * example:
 * const uiDrag = new mDrag();
 * uiDrag.setDragEvents( document.getElementById( 'draggable_object' ) )
 */
export default class mDrag {

    /* get index of element in dom */
    static getIndex(el) { return [].indexOf.call(el.parentNode.children, el) }
    /* return the next child that is not active after given index */
    static getNextInactiveChild(el, index) { return ( [...el.children].find((n,i)=> i > index && !n.classList.contains('active')) ) }

    /* mDrag constructor */
    constructor(
        dragmap      = document.getElementById('dragmap'),
        pulldownbtn  = document.getElementById('pd-button'),
        pulldownmenu = document.getElementById('pulldown-menu'),
        mainscreen   = document.getElementById('mainscreen'),
        collectiontargets = document.getElementsByTagName('ul')
    ) {
        /* bind private to public methods with `this` object
         * ensures class is accessible from event callbacks
         */
        this.dragStart = this._dragStart.bind(this);
        this.dragMove = this._dragMove.bind(this);
        this.dragEnd = this._dragEnd.bind(this);

        /* set properties */
        /* detect touch-capable interface */
        this._istouch = ('ontouchstart' in window);
        /* access dragmap element to show/hide during mouse events */
        this._dragmap = dragmap;
        /* access mainscreen element here for bindings */
        this._mainscreen = mainscreen;

        /* set container events on all collection layers */
        for (let ul of collectiontargets) { this.setContainerEvents(ul); }
        /* set up event handling at screen layer */
        this.setScreenEvents(this._mainscreen);
        /* set up event handling at menu layer */
        this.setMenuEvents(pulldownmenu,pulldownbtn);

        /* default drag target */
        this.defaultdrag = new mTargets();

        /* use live-updating htmlcollection to return active objects */
        this.actives = document.getElementsByClassName('active');

        /* set/clear cache properties */
        this.clearCache();
        /* set mouse events to dragmap */
        this._setDragMouse(this._dragmap);

    }

    /* remove active/toggle classes */
    _activeDisable() { while ( this.actives[0]) { this.actives[0].classList.remove('active') } }
    /* deselect all actives */
    _activeDrop() { for (let el of this.actives) { el.removeAttribute('style'); el.mProp.clearCache(); } }

    /* set mouse drag events - the dragmap by default */
    _setDragMouse(el) {
        /* only bind mouse events if we're not in a touch ui */
        if (!this._istouch) {
            /* set mouse events to dragmap */
            el.onmousemove = e => this.dragMove(e);
            el.onmouseup = e => this.dragEnd(e);
        }
    }

    /* set touch drag events - each draggable element */
    _setDragTouch(el) {
        /* only bind touch events if we're in a touch ui */
        if (this._istouch) {
            /* drag active element */
            el.ontouchmove = e => this.dragMove(e);
            /* drop an active */
            el.ontouchend = e => this.dragEnd(e);
        }
    }

    /* enable / disable dragmap display in mouse ui */
    set showDragmap(enable) { if (!this._istouch) { enable ? this._dragmap.classList.add('enable') : this._dragmap.classList.remove('enable') } }
    get showMenu() { return this._menunav.classList.contains( 'show' ) }
    set showMenu(enable) { if ( enable ) { this._menunav.classList.add( 'show' ) } else { this._menunav.classList.remove( 'show' ) } }

    /* clear the coordinates cache */
    clearCache() {
        /* the coordinates to use for object offset */
        this._coord = { left: 0, top: 0 };
        /* track offset from origin as actives shift throughout the dom */
        this._shift = { left: 0, top: 0, scale: 1 };
        /* track toggle functionality on single elements being clicked */
        this._toggle = null;
        /* track click / drag state */
        this._isdrag = false;
    }
    /* de-select all active elements - drop them into DOM by removing inline styles, and remove them from the active class */
    deSelect() {
        this._activeDrop(); this._activeDisable(); //this.showMenu = false;
    }

    /* connect an element to mDrag */
    setDragEvents(el) {
        /* activate a draggable element (touch and mouse left click) */
        if (this._istouch) { el.ontouchstart = e => this.dragStart(e) } else { el.onmousedown = e => e.button === 0 && this.dragStart(e); }
        /* prevent clicks */
        el.onclick = e => stopEvent(e);
        /* set touch events to element */
        this._setDragTouch(el);
        /* mdrag visual styles */
        el.classList.add('candrag');
    }
    /* bind pickup fallback method to object */
    setContainerEvents(el) {
        if (this._istouch) { el.ontouchstart = e => this._dragStartContext(e) } else { el.onmousedown = e => this._dragStartContext(e); }
    }
    setScreenEvents(el) {
        if (this._istouch) { el.ontouchstart = e => this._dragStartPost(e) } else { el.onmousedown = e => this._dragStartPost(e); }
    }
    /* connect mDrag object to menu elements */
    setMenuEvents(menu, btn) {
        /* save reference to menu property */
        this._menunav = menu;
        if (this._istouch) {
            menu.ontouchstart = e => stopEvent(e);
            btn.ontouchstart = e => this._toggleMenu(e);
        } else {
            menu.onmousedown = e => stopEvent(e);
            btn.onmousedown = e => this._toggleMenu(e);
        }
    }

    /* disconnect an element from mDrag */
    removeEvents(el) {
        console.log(el);
    }

    /* set mDrag metadata cache to element */
    _setmdCache(el) {
        /* initiate mDrag property on object if necessary */
        new mProp(el,this.defaultdrag);
        /* set location cache */
        el.mProp.setlocCache();
    }

    /* pickup object */
    _dragStart(e) {
        /* get event target */
        let target = e.currentTarget;
        /* detect toggle state if click target was already active */
        if (target.classList.contains('active')) { this._toggle = target; }
        /* activate target */
        target.classList.add('active');

        /* find event coordinates (mouse / touch) */
        const c = e.clientX !== undefined ? e : e.touches[0];
        /* cache coordinates */
        this._coord.left = c.clientX - (parseInt(target.style.left) || 0);
        this._coord.top = c.clientY - (parseInt(target.style.top) || 0);
        /* cache target positions */
        for (let el of this.actives) { this._setmdCache(el) }
        /* enable dragmap for movement tracking */
        this.showDragmap = true;
    }
    /* manage active state based on what collection has been fired */
    /* remove active class from any other collections */
    _dragStartContext(e) { [...this.actives].forEach( el => el.parentNode === e.currentTarget || el.classList.remove('active')) }


    _dragStartPost(e) {
        /* drop everything if we didn't tap anything real */
        if (!e.target.classList.contains('candrag')) { this._activeDrop(); this._activeDisable(); }
        /* disable the menu */
        this.showMenu = false;
        /* end the event here */
        stopEvent(e);
    }

    /* activate / deactivate menu */
    _toggleMenu(e) { this.showMenu = !this.showMenu; }

    /* get the current offset of actives (using first one) */
    get activeOffset() { return this.actives[0].mProp.offset }
    /* update position of actives with an event object */
    set activeOffset(obj) {
        for (let el of this.actives) {
            el.mProp.offset = { left: this._shift.left + obj.clientX - this._coord.left, top: this._shift.top + obj.clientY - this._coord.top }
            el.mProp.scale = el.mProp.scale * this._shift.scale
        }
    }
    
    /* get the current shift of the actives in real space */
    get activeShift() { return [this._shift.left, this._shift.top] }
    /* set a drag layer object to actives and handle any motion that occurs */
    set activeShift(over) {
        let parent, insert;
        let i = 0;
        /* track any offset that occurs during this move */
        const offset1 = this.activeOffset;
        for (let el of this.actives) { [parent, insert] = [null, null];
            /* 1: insert after another object in container if we're hovering above it and aren't already in position */
            if (over.obj) { if ( over.obj !== el.parentNode.children[mDrag.getIndex(el) - 1 - i] ) { [parent,insert] = [over.obj.parentNode,mDrag.getNextInactiveChild(over.obj.parentNode, mDrag.getIndex(over.obj))] } } else {
                /* 2: if we aren't over any active element but we do see an active collection while also not being at the start or end of the collection, shift to start of a collection if we aren't over a card and aren't already in place or last */
                if (over.collection) { if (el !== over.collection.children[0 + i] && el !== over.collection.children[over.collection.children.length - this.actives.length + i]) { [parent,insert] = [over.collection, over.collection.children[0 + i]] } }
                /* 3: if we are over an interactive screen element and not in the target yet, send to default target */
                else if (over.screen) { if (el.parentNode !== el.mProp.defaultdrag.target) { [parent,insert] = [el.mProp.defaultdrag.target, null] } }
                /* 4: if we aren't over any live elements and the object isn't currently where it was picked up, return object to its original location in DOM */
                else if (el.nextSibling !== el.mProp.loc.nextSibling || ( el.parentNode !== el.mProp.loc.parent )) { [parent, insert] = [el.mProp.loc.parent, el.mProp.loc.nextSibling] }
            }
            /* move object */
            parent && parent.mProp.validMove(el, insert);
            i++;
        }
        /* detect offset post drag */
        const offset2 = this.activeOffset;
        /* apply change in shift to persistent properties */
        [this._shift.left, this._shift.top, this._shift.scale] = [
            this._shift.left + offset1.left - offset2.left + offset1.rad - offset2.rad,
            this._shift.top + offset1.top - offset2.top + offset1.rad - offset2.rad,
            offset1.rad / offset2.rad
        ];
    }

    /* return most relevant element beneath pointer from event */
    _getDragLayer(e) {
        /* array of all elements under pointer */
        const over = document.elementsFromPoint(e.clientX, e.clientY);
        /* search for matches */
        /* an object to insert behind - an inactive element inside an mDrag-enabled collection */
        const obj = over.find(el => !!el.parentNode.mProp && !el.classList.contains('active'));
        /* a collection to insert into - a list with mDrag property */
        const collection = over.find(el => !!el.mProp && el.tagName === 'UL');
        /* check if we're in a draggable space */
        const screen = over.find(el => el === this._mainscreen);

        return {
            obj: obj,
            collection: !obj ? collection : null,
            screen: !collection ? screen : null
        }
    }

    /* move object */
    _dragMove(e) {
        /* update move if we have actives */
        if (this.actives.length) {
            /* find coordinates (mouse / touch) */
            let c = e.clientX !== undefined ? e : e.changedTouches[0];

            /* scan for draggable elements under mouse and apply any new location info to activeShift */
            if (this._isdrag) { this.activeShift = this._getDragLayer(c) }

            /* apply pickup offset to active objects */
            this.activeOffset = c;
            /* consider it a drag if element has been dragged > 1/3 of its radius away from origin */
            if ( ( Math.abs(c.clientX - this._coord.left) + Math.abs(c.clientY - this._coord.top) ) / 2 > this.activeOffset.rad / 3) { this._isdrag = true }
        }
    }

    /* end drag events on object */
    _dragEnd(e) {
        /* drop any moved objects (return to dom) */
        this._activeDrop();
        /* deactivate all cards if this wasn't a click */
        if (this._isdrag) { this._activeDisable(); }
        /* otherwise deactivate toggled objects */
        else if (this._toggle) { this._toggle.classList.remove('active') };
        /* clear cache properties */
        this.clearCache();
        /* disable dragmap */
        this.showDragmap = false;
    }

}

/* track global / local drag targets */
class mTargets {
    constructor(target = null, home = null) {
        this._target = null; if (target) { this.target = target };
        this._home = null; if (home) { this.home = home };
        this.invert = false;
    }
    /* declare draggable target and set to default property if not already assigned */
    set target(el) { new mProp(el); this._target = el; }
    set home(el) { new mProp(el); this._home = el; }

    get target() { return !this.invert ? this._target : this._home }
    get home() { return !this.invert ? this._home : this._target }
}

/* common properties used by mDrag-enabled objects */
class mProp {

    /* mProp constructor */
    constructor(el,mTargetObj = null) {
        /* continue if it doesn't have an mProp class already */
        if (!el.mProp) {
            /* save this object to element's mProp property and vice versa */
            el.mProp = this; this._el = el;
            /* set loc object */
            this.clearCache();
            /* save origin of object */
            this._origin = el.parentNode;
            /* establish quota property */
            this._quota = { total: 0, current: 0 };

            /* determine drag targets based on defaults if available */
            this.defaultdrag = mTargetObj ? new mTargets(mTargetObj.target, mTargetObj.home) : new mTargets();
        }
    }

    /* return location cache */
    get loc() { return this._loc }
    /* return object's original parent */
    get origin() { return this._origin }
    /* return the remaining quota */
    get quota() { return this._quota.total - this._quota.current }
    /* set a new quota */
    set quota(v) { this._quota.total = v }

    /* get an element's absolute coordinates and the element's radius */
    get offset() { const rect = this._el.getBoundingClientRect(); return { left: rect.left + window.scrollX, top: rect.top + window.scrollY, rad: (rect.width + rect.height) / 4 }; }
    set offset(o) { this._el.style.left = o.left + 'px'; this._el.style.top = o.top + 'px'; }
    /* return scale value or 1 if it is null/undefined */
    get scale() { return this._scale ?? 1 }
    set scale(n) {
        /* set scale property and cast 1 to null */
        this._scale = n == 1 ? null : n;
        /* set scale to inline style or remove if necessary */
        if ( n !== null ) { this._el.style.transform = 'scale(' + this._scale + ')' } else { this._el.style.removeProperty('transform') }
    }

    /* clear/initiate the object's location cache and scaling property */
    clearCache() { this._loc = { parent: null, nextSibling: null }; this._scale = null; }
    /* set new values to the location cache */
    setlocCache() {
        /* save parent and nextsibling properties */
        this._loc.parent = this._el.parentNode;
        this._loc.nextSibling = this._el.nextSibling;
        /* invert drag origin and target if we're already at target */
        this.defaultdrag.invert = this.defaultdrag._target === this._el.parentNode;
    }

    /* check ruleset and move a game piece */
    validMove(el, insert = null)
    {
        /* (check game rules here) */
        /* perform insert */
        this._el.insertBefore(el, insert);
    }

    add() { this._quota.current++ }
    subtract() { this._quota.current-- }
}

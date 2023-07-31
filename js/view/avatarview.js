/* imports */
import View from './view.js';

export default class AvatarView extends View
{
    constructor()
    {
        super();
    }

    /* display the avatar if it exists in dom */
    displayAvatar( avatar ) { if ( this.avatar ) { this.avatar.innerHTML = avatar } }

    /* enable/disable toggles based on activeMap */
    applyActiveMap( map )
    {
        /* apply rule to every toggle in view */
        const setState = ( obj, enable = true ) => enable ? obj.classList.remove( 'disabled' ) : obj.classList.add( 'disabled' );
        if ( this.radialmenu )
        {
            setState( this.toggleHairColor, map.colorHair );
            setState( this.toggleHairType, map.typeHair );
            setState( this.toggleHatColor, map.colorHat );
            setState( this.toggleFacialHairColor, map.colorFacialHair );
            setState( this.toggleGlassesColor, map.colorGlasses );
            setState( this.toggleClothingGraphic, map.typeClothingGraphic );
        }
    }

    /* return avatar view */
    createLiveAvatar( configMap )
    {
        /* spawn new live-avatar div */
        this.avatar = this.create( 'div', { class: 'live-avatar' } );
        /* save dropdown to property */
        this.rddropdown = this.createAvatarInputs( configMap );
        /* create new radial menu object */
        this.radialmenu = this.create( 'nav', { class: 'radial-menu' }, [
            this.avatar,
            this.createRadialItems()
        ] );

        /* add avatar click event */
        this.avatar.addEventListener( 'pointerdown', e => { this.handleClickAvatar( e ); this.captureClassFocus( e, 'show', this.radialmenu ); }, false );
        /* return avatar dom objects */
        return [ this.radialmenu, this.rddropdown ];
    }

    createAvatarInputs( map )
    {
        /* initiate new property to collect inputs */
        this.liveinputs = { };
        /* cri - create range inputs with given properties and save to liveinputs */
        const cri = ( name, cat, [ min, max ], key ) =>
        {
            this.liveinputs[ key ] = this.create( 'label', {
                class: 'tactile board' + ' rd-' + cat,
                /* toggle range+ by clicking on label */
                onpointerdown: e =>
                {
                    e.stopPropagation();
                    /* toggle input value++ */
                    const input = e.currentTarget.children[ 0 ];
                    input.value = +input.value + +input.step <= input.max ? +input.value + +input.step : input.min;
                    /* trigger oninput */
                    input.dispatchEvent( new Event( 'input' ) );
                }
            }, [
                this.create( 'input', { type: 'range', min: min, max: max, step: '1',
                    onpointerdown: e => e.stopPropagation(),
                    /*  */
                    oninput: ( e ) => this.handleChangeLiveConfig( e, key )
                } ),
                /* create label div and decrease font size on longer labels */
                this.create( 'div', name.length > 5 ? { class: 'small' } : 0, name )
            ] )
            return this.liveinputs[ key ];
        }
        /* return the dropdown */
        return this.create( 'div', { class: 'radial-dropdown' },
        [
            this.create( 'label', { class: 'tactile' } ),
            /* add character to trigger small styles */
            cri( 'color', 'blank', map.colorBackground, 'colorBackground' ),

            cri( 'skin', 'skin', map.colorSkin, 'colorSkin' ),

            cri( 'beard', 'facehair', map.typeFacialHair, 'typeFacialHair' ),
            cri( 'color', 'facehair', map.colorFacialHair, 'colorFacialHair' ),

            cri( 'hat', 'hair', map.typeHat, 'typeHat' ),
            cri( 'color', 'hair', map.colorHat, 'colorHat' ),
            cri( 'cut', 'hair', map.typeHair, 'typeHair' ),
            cri( 'color', 'hair', map.colorHair, 'colorHair' ),

            cri( 'eye', 'face', map.typeEyes, 'typeEyes' ),
            cri( 'brow', 'face', map.typeEyebrows, 'typeEyebrows' ),
            cri( 'lip', 'face', map.typeMouth, 'typeMouth' ),

            cri( 'shirt', 'clothing', map.typeClothing, 'typeClothing' ),
            cri( 'color', 'clothing', map.colorClothing, 'colorClothing' ),
            cri( 'logo', 'clothing', map.typeClothingGraphic, 'typeClothingGraphic' ),

            cri( 'glasses', 'acc', map.typeGlasses, 'typeGlasses' ),
            cri( 'color', 'acc', map.colorGlasses, 'colorGlasses' )
        ] );
    }

    displayInputs( values, svalues, enable, inputs = this.liveinputs )
    {
        if ( values && inputs )
        {
            for ( const [ k, v ] of Object.entries( inputs ) )
            {
                let i = v.children[ 0 ];
                let e = enable ? enable[ k ] : null;
                /* set svalues if no value has been set yet */
                if ( !( svalues == null ) && i.svalue == null ) { i.svalue = svalues[ k ] }
                i.value = values[ k ];
                /* disable / enable active inputs */
                if ( !( e == null ) )
                {
                    e ? v.classList.remove( 'disabled' ) : v.classList.add( 'disabled' );
                }
            }
        }
    }

    createRadialItems()
    {
        /* create a radial menu item with inner html */
        const cmi = ( c, nest ) =>
        {
            return this.create( 'li', { class: 'menu-item', onpointerdown: e => this.clickRadialMenuItem( e, c ) }, this.create( 'span', 0, nest ) )
        }
        return this.create( 'ul', { class: '' }, [
            cmi( 'face', '🤨' ),
            cmi( 'facehair', '🧔' ),
            cmi( 'skin', '🎨' ),
            cmi( 'clothing', '👕' ),
            cmi( 'acc','🤓' ),
            cmi( 'hair', '💇' )
        ] );
    }

    /* bindings */
    /* bind the handler for avatar interaction */
    bindChangeLiveConfig( callback ) { this.handleChangeLiveConfig = ( e, k ) => callback( k, +e.target.value ) }
    bindClickAvatar( callback )      { this.handleClickAvatar = callback }
    bindSetPulldownState( handler )  { this.setPulldownState = handler }

    /* open a menu item on click and manage dropdown state */
    clickRadialMenuItem( e, rdclass )
    {
        /* definitions */
        const c = 'show';
        const dd = this.rddropdown;
        /* drop other menu-items and then pick up this one */
        for ( let el of e.currentTarget.parentNode.getElementsByClassName( c ) ) { el.classList.remove( c ) }
        e.currentTarget.classList.add( c );
        /* clear old rd- classes and apply new one */
        dd.className = dd.className.split( ' ' ).filter( c => !c.startsWith( 'rd-' ) ).join( ' ' ).trim() + ' rd-' + rdclass;
        /* remove this class if menu item is popped */
        e.currentTarget.onshowloss = ( ) => dd.classList.remove( 'rd-' + rdclass );
        /* capture focus */
        this.captureClassFocus( e, c );
    }


    /* getter / setter */
    /* showMenu = true / false property defines if menu is shown */
    get showRadialMenu() { return this.radialmenu.classList.contains( 'show' ) }
    set showRadialMenu( enable )
    {
        if ( enable )
        {
            const pdstate = this.setPulldownState( null, false );
            this.radialmenu.classList.add( 'show' );
            this.rddropdown.classList.add( 'show' );
            this.radialmenu.onshowloss = () => { this.setPulldownState( ...pdstate ) }
        }
        else
        {
            this.radialmenu.classList.remove( 'show' );
            this.rddropdown.classList.remove( 'show' );
        }
    }

    /* return whether a radial menu item is active */
    get showRadialMenuActive() { return !!this.radialmenu.getElementsByClassName( 'show' ).length }

}

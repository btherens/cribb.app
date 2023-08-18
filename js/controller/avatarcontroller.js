/* imports */
import Controller from './controller.js';
import AvatarModel from '../model/avatarmodel.js';
import AvatarView from '../view/avatarview.js';

import sfetch from '../sfetch.js';
import avataaars from '../vendor/avataaars.js';


export default class AvatarController extends Controller
{
    constructor( hashKey, model = new AvatarModel( hashKey ), view = new AvatarView )
    {
        super( model, view );

        /* set avataaars library property */
        this.avataaars = avataaars;

        /* apply bindings */
        this.model.bindAvataaars( this.avataaars );
        this.model.bindOnModelChanged( this.onModelChanged );
        this.view.bindClickAvatar( this.handleClickAvatar );
        this.view.bindChangeLiveConfig( this.handleChangeLiveConfig );

        /* import live values from hash */
        if      ( this.model.hashAvatar ) { this.model.liveAvatar = this.model.hashAvatar }
        /* create a random avatar if we dont have one saved */
        else if ( this.model.storeAvatar == null ) { this.model.liveAvatar = this.model.createRandomAvatar(); this.model.hashAvatar = null; }
    }

    /* handlers */
    onModelChanged = (
        /* a saved avatar config */
        storeAvatar = this.model.storeAvatar,
        /* the live avatar config */
        liveAvatar  = this.model.liveAvatar
    ) => {
        /* choose a new config to render */
        const cfg = liveAvatar ?? storeAvatar;
        if ( cfg )
        {
            /* update the controls */
            if ( this.view.liveinputs )
            {
                /* generate an activemap of the rendered config */
                const map = this.model.createActiveMap( cfg );
                /* loop through inputs collection */
                for ( const [ k, v ] of Object.entries( this.view.liveinputs ) )
                {
                    let i = v.children[ 0 ];
                    let e = map ? map[ k ] : null;
                    /* set saved avatar values to view for change detection */
                    if ( !( storeAvatar == null ) ) { i.svalue = storeAvatar[ k ] }
                    /* set the value */
                    i.value = cfg[ k ];
                    /* disable / enable active inputs */
                    if ( !( e == null ) )
                    {
                        e ? v.classList.remove( 'disabled' ) : v.classList.add( 'disabled' );
                    }
                }
                /* call an assigned change handler */
                this.onFormChanged();
            }
            /* update the avatar */
            this.view.displayAvatar( this.avataaars.create( this.createAvataaarSetting( cfg ) ) );
        }
    }

    bindOnFormChanged( handler )
    {
        this.onFormChanged = handler
    }

    createAvataaarSetting( cfg )
    {
        if ( cfg )
        {
            const returnobj = {
                style:            'circle',
                background:       Object.values( this.avataaars.colors.palette )[ cfg.colorBackground - 1 ],
                skin:             Object.keys( this.avataaars.colors.skin )[ cfg.colorSkin - 1 ],
                top:              cfg.typeHat - 1 ?  Object.keys( this.avataaars.paths.top )[ cfg.typeHat - 2 ] : Object.keys( this.avataaars.paths.top )[ cfg.typeHair + 7 ],
                hairColor:        Object.keys( this.avataaars.colors.hair )[ cfg.colorHair - 1 ],
                facialHairColor:  Object.keys( this.avataaars.colors.hair )[ cfg.colorFacialHair - 1 ],
                hatColor:         Object.keys( this.avataaars.colors.palette )[ cfg.colorHat - 1 ],
                eyebrows:         Object.keys( this.avataaars.paths.eyebrows )[ cfg.typeEyebrows - 1 ],
                eyes:             Object.keys( this.avataaars.paths.eyes )[ cfg.typeEyes - 1 ],
                mouth:            Object.keys( this.avataaars.paths.mouth )[ cfg.typeMouth - 1 ],
                accessories:      Object.keys( this.avataaars.paths.accessories )[ cfg.typeGlasses - 1 ],
                accessoriesColor: Object.keys( this.avataaars.colors.palette )[ cfg.colorGlasses - 1 ],
                clothing:         Object.keys( this.avataaars.paths.clothing )[ cfg.typeClothing - 1 ],
                clothingColor:    Object.keys( this.avataaars.colors.palette )[ cfg.colorClothing - 1 ],
                clothingGraphic:  Object.keys( this.avataaars.paths.clothingGraphic )[ cfg.typeClothingGraphic - 1 ],
                facialHair:       Object.keys( this.avataaars.paths.facialHair )[ cfg.typeFacialHair - 1 ],
            }
            return returnobj;
        }
    }

    handleClickAvatar = ( e ) =>
    {
        /* only click actions if a radial item is not selected */
        if ( !this.view.showRadialMenuActive )
        {
            /* toggle radial menu */
            const toggle = !this.view.showRadialMenu;
            this.view.showRadialMenu = toggle;
            /* run showloss handler if we're disabling */
            if ( !toggle ) { this.view.radialmenu.onshowloss() }
        }
    }

    /* alter the live config by setting a new value to key */
    handleChangeLiveConfig = ( key, value ) =>
    {
        this.model.setLiveAvatarValue( key, value )
    }


    /* return an avatar dom object and avatar dropdown */
    createLiveAvatar = ( map = this.model.mapAvatarMap ) =>
    {
        const [ av, dd ] = this.view.createLiveAvatar( map );
        this.onModelChanged();
        return [ av, dd ];
    }

    /* create a static avatar object (accepts arbitrary avatar configs) */
    createStaticAvatar = ( cfg = this.model.storeAvatar ) =>
    {
        /* map a stripped array to avatar keys */
        if     ( cfg && typeof cfg.colorBackground === 'undefined' ) { cfg = this.model.createKeyValueObject( Object.keys( this.model.mapAvatarMap ), cfg ) }
        /* return a static avatar object */
        return ( cfg ? this.avataaars.create( this.createAvataaarSetting( cfg ) ) : null );
    }

    /* attempt to get avatar information from server */
    fetchAvatar( )
    {
        return sfetch.json( sfetch.request( '/avatar/getAvatar' ) ).then( j =>
        {
            /* save name from result */
            if ( j )
            {
                this.model.storeAvatar = this.model.createKeyValueObject( Object.keys( this.model.mapAvatarMap ), j.avatarConfig );
            }
            /* redirect app to identity create screen if we can't download a credential */
            else
            {
                this.model.storeAvatar = null;
            }
        } )
    }

    /* save a liveAvatar to store */
    saveLiveAvatar( cfg = this.model.liveAvatar )
    {
        if ( cfg )
        {
            /* save on server */
            sfetch.json( sfetch.request( '/avatar/setAvatar', { avatar: Object.values( cfg ) }, 'post' ) ).then( j =>
            {
                if ( j.success )
                {
                    this.model.storeAvatar = cfg;
                }
            } ).catch( e => console.log( e ) )
        }
    }

    clear()
    {
        this.model.liveAvatar = null;
    }

    sync()
    {
        return this.fetchAvatar();
    }

}
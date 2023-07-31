/* imports */
import Model from './model.js';

export default class AvatarModel extends Model
{
    constructor( hash )
    {
        super();
        /* config definition */
        this.mapAvatarMap = {
            colorBackground: [ 1, 16 ],
            colorSkin: [ 1, 7 ],
            colorHair: [ 1, 10 ],
            colorFacialHair: [ 1, 10 ],
            colorHat: [ 1, 16 ],
            colorGlasses: [ 1, 16 ],
            colorClothing: [ 1, 16 ],
            typeHair: [ 1, 27 ],
            typeFacialHair: [ 1, 6 ],
            typeHat: [ 1, 9 ],
            typeGlasses: [ 1, 7 ],
            typeClothing: [ 1, 9 ],
            typeClothingGraphic: [ 1, 10 ],
            typeEyebrows: [ 1, 13 ],
            typeEyes: [ 1, 12 ],
            typeMouth: [ 1, 12 ]
        };
        /* config defaults */
        this._mapAvatarDefaultMap = {
            colorBackground: 2,
            colorHat: 7,
            typeGlasses: 1,
            typeEyes: 1,
            typeEyebrows: 11,
            typeMouth: 2,
            typeFacialHair: 1,
            typeHat: 1
        }

        /* establish properties */
        this._liveAvatar  = null;
        this._storeAvatar = null;
        /* set keys for hash urls and local storage */
        if ( hash )
        {
            this.setHashState( hash );
            this.setStoreScope( hash );
            /* load storage into memory */
            this._storeAvatar = this.store?.avatar ?? null;
        }
    }

    /* return an object with show/hide booleans for frontend to disable non/applicable buttons */
    createActiveMap( config = this.liveConfig )
    {
        if ( config )
        {
            const returnObj = {
                /* hair toggles if hat is off */
                colorHair: !!( config.typeHat == 1 ),
                typeHair: !!( config.typeHat == 1 ),
                /* hat color toggle if hat is on */
                colorHat: !( config.typeHat == 1 || config.typeHat == 2 ),
                /* facial hair color if facial hair is on */
                colorFacialHair: !( config.typeFacialHair == 1 ),
                /* glasses color if glasses are on */
                colorGlasses: !( config.typeGlasses == 1 ),
                /* graphic toggle if graphic tee on */
                typeClothingGraphic: !!( config.typeClothing == 4 )
            }
            return returnObj;
        }
    }

    /*
     * return a sanitized config object
     * obj: the input object to sanitize
     * mdl: an input model object to use as base
     * map: the map to use for validation
     */
    _sanitizeModel( obj, mdl = {}, map = this.mapAvatarMap )
    {
        /* step through config map */
        for ( const [ k, v ] of Object.entries( map ) )
        {
            /* assign sanitized properties */
            if (
                obj?.hasOwnProperty( k ) && Number.isInteger( obj[ k ] ) &&
                ( v[ 0 ] == null || v[ 0 ] <= obj[ k ] ) &&
                ( v[ 1 ] == null || v[ 1 ] >= obj[ k ] )
            ) { mdl[ k ] =  obj[ k ] }
        }
        return mdl;
    }

    /* create and return a random avatar config */
    createRandomAvatar( m = this.mapAvatarMap, d = this._mapAvatarDefaultMap )
    {
        /* output object */
        const output = {};
        /* step through config map */
        for ( const [ k, v ] of Object.entries( m ) )
        {
            /* assign default if available and fallback to random integer */
            output[ k ] = d.hasOwnProperty( k ) ? d[ k ] : this.randomInt( v[ 0 ], v[ 1 ] );
        }
        /* patch - avoid shirt - background clash */
        while ( output.colorBackground === output.colorClothing ) { output.colorClothing = this.randomInt( m.colorClothing[ 0 ], m.colorClothing[ 1 ] ) }
        return output;
    }

    /*  */
    onConfigChanged( config = this.liveConfig )
    {
        if ( this?.hash ) { this.hash.state = this.createValueArray( config ) }
    }

    /* clear the hash state */
    clearHashState() { if ( this?.hash ) { this.hash.state = null } }


    get storeAvatar() { return this._storeAvatar }
    set storeAvatar( cfg )
    {
        /* save to live property */
        this._storeAvatar = cfg;
        /* write to localstorage */
        this.store = { avatar: this._storeAvatar };
        this.onModelChanged();
    }

    /* return a model object from hash */
    get hashAvatar()
    {
        return this.hash?.state?.length ? this._sanitizeModel( this.createKeyValueObject( Object.keys( this.mapAvatarMap ), this.hash.state ), this.createRandomAvatar() ) : null
    }
    set hashAvatar( c )
    {
        if ( this.hash != null ) { this.hash.state = c == null ? null : this.createValueArray( c ) }
    }

    get liveAvatar() { return this._liveAvatar }
    set liveAvatar( o )
    {
        /* update property */
        this._liveAvatar = o;
        /* save live changes to hash */
        this.hashAvatar = o ?? null;
        this.onModelChanged();
    }

    /* change an avatar config value by a set amount or set to an explicit value if value provided */
    setLiveAvatarValue( key, value )
    {
        /* use the stored avatar config if liveAvatar is empty */
        if ( this.liveAvatar == null ) { this._liveAvatar = structuredClone( this.storeAvatar ) }

        /* set value to model */
        this.liveAvatar[ key ] = Number.isInteger( value ) ? value : 1;
        /* resolve redundancies */
        if ( this.isObjEqual( this.storeAvatar, this.liveAvatar ) ) { this.liveAvatar = null }
        this.hashAvatar = this.liveAvatar ?? null;

        /* fire bound change event with new avatar property */
        this.onModelChanged();
    }

    /* bindings */
    bindAvataaars( service ) { this.avataaars = service }
    //bindAvatarChanged( callback ) { this.onAvatarChanged = callback }
    bindOnModelChanged( callback ) { this.onModelChanged = callback }

}

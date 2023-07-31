/* imports */
import Model from './model.js';

export default class GameListModel extends Model
{
    constructor( hash = 'gl' )
    {
        super();

        this.setStoreScope( hash );

        /* load gamelist into memory */
        this._list          = this.store?.list ?? null;
        this._pushAvailable = false;
    }

    get list() { return this._list?.sort( ( a, b ) => b.t - a.t ) }
    set list( l )
    {
        /* update background property */
        this._list = l;
        /* save to localstorage */
        this.store = { list: this._list };
        this.onModelChanged();
    }

    get pushAvailable() { return this._pushAvailable }
    set pushAvailable( b )
    {
        this._pushAvailable = !!b;
    }

    /* bindings */
    bindOnModelChanged( callback ) { this.onModelChanged = callback }
}

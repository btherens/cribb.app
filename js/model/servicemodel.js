/* imports */
import Model from './model.js';

export default class ServiceModel extends Model
{
    constructor( )
    {
        super();
        /* load env properties into memory */
        this.vapidkey = env?.vapidkey ?? null;
        this._isPushSubscribe = false;
        this.scanPushSubscribe();
    }

    /* detect a working push subscription and update property */
    scanPushSubscribe = () => new Promise( r => r() )
        .then( () => navigator.serviceWorker.ready )
        .then( service => service.pushManager.getSubscription() )
        .then( sub => this._isPushSubscribe = !!sub );

    get isPushSubscribe() { return this._isPushSubscribe }

}

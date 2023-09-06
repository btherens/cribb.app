/* imports */
import Controller from './controller.js';
import _model     from '../model/servicemodel.js';

import sfetch from '../sfetch.js';

/* service worker management/interface */
export default class ServiceController extends Controller
{
    constructor( model = new _model(), view = null )
    {
        super( model, view );
        /* call service worker installer */
        this.installService();
    }

    /* is push subscription active */
    get isPushSubscribe() { return this.model.isPushSubscribe }

    /* install service worker (if necessary) */
    installService = () =>
    {
        /* confirm a service worker is already available */
        if ( navigator.serviceWorker?.controller ) { console.log( 'service worker detected' ) }
        /* attempt to install service worker */
        else
        {
            try   { navigator.serviceWorker.register( '/js/service.js', { scope: '/' } ).then( sub => console.log( 'service worker installed' ) ) }
            catch { console.log( 'service worker not supported' ) }
        }
    }

    /* create subscription to push service */
    pnSubscribe = ( vapidkey = this.model.vapidkey ) => new Promise( r => r() )
        /* check for push permissions - requests if necessary */
        .then( () => this._pnCheckPermission() )
        /* service worker resolves when service worker is in place */
        .then( () => navigator.serviceWorker?.ready )
        /* register push service using public key if we don't have one yet */
        .then( service => service?.pushManager.getSubscription()
            /* attempt to register new sub if no active subscription was returned */
            .then( sub => sub || service?.pushManager.subscribe( { userVisibleOnly: true, applicationServerKey: this._urlBase64ToUint8Array( vapidkey ) } ) ) )
        /* save the subscription to service */
        .then( sub => sub && this._pnSetSubscription( sub ) );

    /* resolves when permission permission is granted */
    _pnCheckPermission = () => new Promise( resolve =>
    {
        /* exit now if push is not possible in this environment */
        if      ( !navigator.serviceWorker?.controller || !( 'PushManager' in window ) || !( 'Notification' in window ) ) return;
        /* resolve promise when an active notification permission is returned */
        if      ( 'granted' === Notification.permission ) { return resolve() }
        else if ( 'default' === Notification.permission ) { return Notification.requestPermission().then( result => 'granted' === result && resolve() ) }
    } );

    /* register push subscription with server */
    _pnSetSubscription = ( sub ) => sfetch.json( sfetch.request( '/push/setSubscription', {
            /* supported text encoding (not necessary) */
            //e: ( PushManager.supportedContentEncodings || [ 'aesgcm' ] )[ 0 ],
            /* endpoint url */
            u: sub.endpoint,
            /* public key */
            k: btoa( String.fromCharCode.apply( null, new Uint8Array( sub.getKey( 'p256dh' ) ) ) ),
            /* auth token */
            t: btoa( String.fromCharCode.apply( null, new Uint8Array( sub.getKey( 'auth'   ) ) ) )
        }, 'POST' ) )
        .then( response => { if ( response ) { return this.model.scanPushSubscribe() } } )

    /* decode base64 string */
    _urlBase64ToUint8Array = ( base64String ) =>
    {
        const padding     = '='.repeat( ( 4 - ( base64String.length % 4 ) ) % 4 );
        const base64      = ( base64String + padding ).replace( /\-/g, '+' ).replace( /_/g, '/' );
        const rawData     = atob( base64 );
        const outputArray = new Uint8Array( rawData.length );
        for ( let i = 0; i < rawData.length; ++i ) { outputArray[ i ] = rawData.charCodeAt( i ) }
        return outputArray;
    }

    /* clear all notifications for a given tag */
    removeNotifications = ( tag ) => navigator.serviceWorker?.ready
        .then( service => service.getNotifications() )
        .then( notifications =>
        {
            for ( let notification of notifications ) if ( notification.tag == tag ) { notification.close() }
        } );

    /* set app badge count */
    setAppBadge = ( n ) => navigator.serviceWorker?.ready
        .then( service => service.active.postMessage( { badge: n } ) );

}

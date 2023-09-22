/* advance version to invalidate cache */
const cacheVersion = 1;
/* app cache */
const cacheApp     = 'localcache' + cacheVersion;
/* cached gamestate */
const cacheGames   = 'gamecache'  + cacheVersion;

/* cached paths */
const app_urls     = [
    /* basic application */
    /* html */
    '/',
    /* stylesheets */
    '/css/style.css',
    /* javascript */
    '/js/app.js',
    /* images */
    '/asset/board-icon@180x.png',
    '/asset/board-icon@512x.png',
    '/asset/action-icon.svg',
    '/asset/delete.svg',
    /* fonts */
    '/asset/card.woff2',
    '/asset/text.woff2'
];

/* install service worker */
const installApp = event => event.waitUntil( caches.open( cacheApp )
    /* install app resources from server to local cache */
    .then( cache => cache.addAll( app_urls ) )
    /* service worker activates as soon as it's finished installing */
    .then( self.skipWaiting() )
);

/* activate service - runs when service installation completes */
const activateService = event => event.waitUntil(
    caches.keys().then( keyList => Promise.all( keyList.map( key => [ cacheApp, cacheGames ].includes( key ) || caches.delete( key ) ) ) )
);

/* route fetch requests */
const routeFetch = event =>
{
    let response = () =>
    {
        /* return app components from cache if responding to a navigate request */
        if ( event.request.mode === 'navigate' )
        {
            return caches.match( '/' )
        }
        /* respond to cache size requests */
        else if ( event.request.url.endsWith( '/service/cachesize' ) )
        {
            return createCachesizeResponse()
        }
        /* respond with cached asset, ignoring any cache invalidating querystrings */
        else
        {
            return caches.match( event.request, { ignoreSearch: true } )
        }
    }
    /* route response with final fallback to network */
    event.respondWith( response().then( response => response || fetch( event.request ) ) )
}

/* generates a new response with argument as JSON object */
const jsonResponse = ( o ) => new Response( JSON.stringify( o ), { headers: { 'Content-Type' : 'application/json' } } );

/* use CacheSize class to calculate the size of all cache and respond with json object */
const createCachesizeResponse = () => CacheSize.caches().then( n => jsonResponse( { bytes: n } ) );
/* detect the size of caches in bytes */
class CacheSize
{
    /* return size of a single cache */
    static cache = ( c ) => c.keys()
        .then( a => Promise.all( a.map( req => c.match( req ).then( res => res.clone().blob().then( b => b.size ) ) ) ) )
        .then( a => a.reduce( ( acc, n ) => acc + n, 0 ) );

    /* return size of all caches */
    static caches = () => caches.keys()
        .then( a => Promise.all( a.map( n => caches.open( n ).then( c => CacheSize.cache( c ) ) ) ) )
        .then( a => a.reduce( ( acc, n ) => acc + n, 0 ) );
}

/* show a notification to user */
const showNotification = ( event ) =>
{
    /* proceed if data object exists */
    if ( event.data )
    {
        /* load data and options */
        const data    = event.data.json();
        const options = {
            body:     data.m,
            //icon:     '/asset/board-icon@512x.png',
            tag:      data.u,
            renotify: true
        };
        event.waitUntil( clients.matchAll( { type: 'window' } ).then( windowClients =>
        {
            /* don't show notification if the game is visible */
            for ( let client of windowClients ) if ( client.focused && new URL( client.url ).pathname == '/' + data.u ) return;
            /* show notification */
            event.waitUntil( Promise.all( [ self.registration.showNotification( data.s, options ), setAppBadge( data.b ) ] ) );
        } ) );
    }
};

/* set an app badge if method is available */
const setAppBadge = ( n ) => new Promise( r => 'setAppBadge' in self.navigator && r() ).then( () => self.navigator.setAppBadge( n ) );

/* open a notification */
const clickNotification = ( event ) => {
    /* use notification tag as url */
    const url = event.notification.tag;
    /* close notification */
    event.notification.close();
    /* open page */
    event.waitUntil( clients.openWindow( '/' + url ) );
    /* collect all active app windows (disabled for now) */
    //event.waitUntil( clients.matchAll( { type: 'window' } ).then( windowClients =>
    //{
    //    /* 1) focus window if game is already open */
    //    for ( let client of windowClients ) if ( new URL( client.url ).pathname == '/' + url ) { return client.focus() }
    //    /* 2) navigate an existing window to game */
    //    for ( let client of windowClients ) { return client.navigate( '/' + url ) }
    //    /* 3) open a new window */
    //    return clients.openWindow( '/' + url );
    //} ) );
};

/* process objects sent from app */
const processMessage = ( event ) =>
{
    /* update message */
    if ( event.data?.badge != null ) { return event.waitUntil( setAppBadge( event.data.badge ) ) }
}

/* event bindings */
self.addEventListener( 'install', installApp );
self.addEventListener( 'fetch', routeFetch );
self.addEventListener( 'activate', activateService );
self.addEventListener( 'push', showNotification );
self.addEventListener( 'notificationclick', clickNotification );
self.addEventListener( 'message', processMessage );

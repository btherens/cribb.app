/* simple fetch interface
 * example:
 * sfetch.json( sfetch.request( 'get/url', { param: 'value' } ) ).then( j => console.log( j.data ) )
 */
export default class sfetch
{
    /* request factory */
    static request( url, params = null, method = 'GET' )
    {
        /* set request type and headers */
        const options = { method, headers: new Headers() };
        options.headers.append( 'cache-control', 'no-store' );

        /* attach parameters */
        if ( params !== null )
        {
            /* cast params to query string for GET requests */
            if   ( method === 'GET' ) { url += '?' + new URLSearchParams( params ) }
            /* send parameters in request body for POST, PUT, DELETE */
            else
            {
                options.headers.append( 'Content-Type', 'application/json; charset=utf-8' );
                options.body = JSON.stringify( params );
            }
        }
        /* return request object */
        return new Request( url, options )
    }
    /* returns a json promise */
    static json( request )
    {
        /* production - simple json promise */
        return fetch( request ).then( r => { if ( !r.ok ) { throw r.status } else { return r.json() } } );
        /* dev - parse a text promise for json and throw text response upon parse error (catch uncaught server exceptions) */
        //return fetch( request ).then( r => r.text() ).then( r => { try { return JSON.parse( r ) } catch { console.log( request ); throw Error( r ); } } )
    }
}
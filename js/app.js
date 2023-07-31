/* import classes */
import AppController from './controller/appcontroller.js';

/* test environment support and notify */
const testEnv = () =>
{
    /* has selector support */
    let has = true;
    try { const s = document.querySelector( 'a:has(> a)' ) } catch ( e ) { has = false }

    /* fido support */
    let web = false;
    if ( window.PublicKeyCredential ) { web = true }

    /* passkey support (disabled - prevents browsers with platform support via mobile device) */
    //let pass = false;
    //if ( web ) { PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then( a =>
    //{
    //    if ( a ) { pass = true }
    //    alertRun( has, web, pass, callback )
    //} ).catch( () => alertRun( has, web, pass, callback ) ) } else { alertRun( has, web, pass, callback ) }

    /* execute function if environment looks good */
    if ( has && web ) { return true }
    else
    {
        /* basic error message message */
        let msg = 'this site uses new standards not yet available in your browser.\n';
        if ( !has )  { msg = msg + '\ncss :has selector support is required' }
        if ( !web )  { msg = msg + '\nWebAuthn is required' }
        //if ( !pass ) { msg = msg + '\nWebAuthn Passkeys are required' }
        setTimeout( () => alert( msg ), 0 );
        return false;
    }
}

/* run app in a supported environment */
if ( testEnv() )
{
    /* launch application */
    let app = new AppController();
    /* route to proper place in application */
    app.launch();
}

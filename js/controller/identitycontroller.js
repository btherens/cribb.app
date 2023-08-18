/* imports */
import Controller from './controller.js';
import IdentityModel from '../model/identitymodel.js';
import IdentityView from '../view/identityview.js';

import sfetch from '../sfetch.js';
import AvatarController from './avatarcontroller.js';
import ButtonController from './buttoncontroller.js';

export default class IdentityController extends Controller
{
    constructor( model = new IdentityModel, view = new IdentityView )
    {
        super( model, view );

        /* set avataaars library property */
        this.liveavatar = new AvatarController( 'la' );

        /* apply bindings */
        this.liveavatar.bindOnFormChanged( this.onFormChanged );
        this.view.bindUpdateLiveName( this.handleUpdateLiveName );
        this.view.bindSubmitRestoreIdentity( this.handleSubmitRestoreIdentity );
        this.view.bindSubmitForgetIdentity( this.handleSubmitForgetIdentity );
        this.model.bindOnModelChanged( this.onModelChanged );

        /* import live values from hash */
        if ( this.model.hashName ) { this.model.liveName = this.model.hashName }
    }

    /* events */
    /* run updates after model changes */
    onModelChanged = (
        storeName = this.model.storeName,
        liveName = this.model.liveName
    ) => {
        /* update view */
        if ( this.view.inputName )
        {
            /* get input from property */
            const el = this.view.inputName.childNodes[ 0 ];
            /* set the new value */
            el.value = liveName ?? storeName;
            /* set store value */
            el.svalue = storeName;
            /* override: clear input now if the value is invalid */
            if ( !el.checkValidity() ) { el.value = '' }
            /* update form submission state */
            if ( el.form ) { this.onFormChanged( el.form ) }
        }
    }

    /* call onFormChanged method in parent class */
    onFormChanged = ( form = this.view.inputName?.childNodes[ 0 ]?.form ) => super.onFormChanged( form );

    /* bindings */
    bindRoute( handler ) { this.handleRoute = handler }
    bindPopMenu( handler ) { this.handlePopMenu = handler }
    bindServicesConnect( h ) { this.handleServicesConnect = h }

    /* handlers */
    handleUpdateLiveName = ( e ) =>
    {
        //if ( e.target.checkValidity() ) { this.model.setLiveName( e.target.value ) }
        if ( e.target.checkValidity() ) { this.model.liveName = e.target.value }
        /* reset form state if everything is null */
        if ( e.target.value == '' && this.model.storeName === null ) { this.model.liveName = null }
    }

    handleClickCreateIdentity = ( form ) =>
    {
        /* get name field */
        const name = Array.from( form.elements ).filter( el => el.tagName === 'INPUT' && el.type === 'text' )[ 0 ].value;
        if ( form.checkValidity() ) { this.submitCreateIdentity( name ) } else { return form.reportValidity() }
    }

    handleClickUpdateIdentity = ( form ) =>
    {
        /* get name field */
        const name = Array.from( form.elements ).filter( el => el.tagName === 'INPUT' && el.type === 'text' )[ 0 ].value;
        if ( form.checkValidity() ) { this.submitUpdateIdentity( name ) } else { return form.reportValidity() }
    }

    submitCreateIdentity = ( name ) =>
    {
        /* get passkey create object from server */
        sfetch.json( sfetch.request( '/identity/createAttestation', { name: name }, 'post' ) ).then( j => {
            /* decode random bytes */
            j.challenge = Uint8Array.from( atob( j.challenge ), c => c.charCodeAt( 0 ) ).buffer;
            j.user.id   = Uint8Array.from( atob( j.user.id   ), c => c.charCodeAt( 0 ) ).buffer;
            /* create credentials in client */
            return navigator.credentials.create( { publicKey: j } );
        } ).then( creds => {
            /* b64 encode utf-8 bytes for transmission */
            const [ b64AttestationObj, b64ClientDataJSON ] = [ creds.response.attestationObject, creds.response.clientDataJSON ].map( b => b ? btoa( [ ...new Uint8Array( b ) ].map( c => String.fromCharCode( c ) ).join( '' ) ) : null );
            /* save keys to new identity */
            return sfetch.json( sfetch.request( '/identity/attestIdentity', { attestationObject: b64AttestationObj, clientDataJSON: b64ClientDataJSON }, 'post' ) );
        } ).then( j => {
            if ( j.success )
            {
                /* save avatar config */
                this.liveavatar.saveLiveAvatar();
                /* finish */
                return this._loginAndClose( j.name );
            }
        } ).catch( e => { console.log( e ); alert( 'failed to create passkey!\n\nyou will need a signed passkey to play' ); location.reload(); } )
    }

    /* save identity name to local model, reconnect to sync service, dismiss an open identity screen, and route to next place in application */
    _loginAndClose( n )
    {
        /* update livename with final result from server */
        this.model.liveName = n;
        /* set name to model */
        this.model.storeName = n;
        /* reconnect to services using new identity */
        this.handleServicesConnect( true );
        /* leave menu view */
        this.handlePopMenu();
        /* reroute app now that we're in a new location */
        this.handleRoute();
    }

    /* attempt to restore identity using a passkey */
    handleSubmitRestoreIdentity = ( ) =>
    {
        /* get passkey create object from server */
        sfetch.json( sfetch.request( '/identity/createAssertion', null, 'get' ) ).then( j => {
            /* decode random bytes */
            j.challenge = Uint8Array.from( atob( j.challenge ), c => c.charCodeAt( 0 ) ).buffer;
            /* create credentials in client */
            return navigator.credentials.get( { publicKey: j } );
        } ).then( creds => {
            /* encode objects for transmission */
            const [
                b64RawId,
                b64ClientDataJSON,
                b64AuthenticatorData,
                b64Signature,
                b64UserHandle
            ] = [
                creds.rawId,
                creds.response.clientDataJSON,
                creds.response.authenticatorData,
                creds.response.signature,
                creds.response.userHandle
            /* pass each value through b64 encoding */
            ].map( b => b ? btoa( [ ...new Uint8Array( b ) ].map( c => String.fromCharCode( c ) ).join( '' ) ) : null );
            /* send signed objects to server for validation */
            return sfetch.json( sfetch.request( '/identity/assertIdentity', {
                rawId: b64RawId,
                clientDataJSON: b64ClientDataJSON,
                authenticatorData: b64AuthenticatorData,
                signature: b64Signature,
                userHandle: b64UserHandle
            }, 'post' ) );
        } ).then( j => {
            /* check response object for success of identity restore */
            if ( j.success )
            {
                /* get the identity's avatar config */
                this.liveavatar.fetchAvatar();
                /* finish login */
                return this._loginAndClose( j.name );
            }
            else { console.log( 'restore identity failed: ' + j.message ) }
        /* print error to console and reload */
        } ).catch( e => { console.log( e ); location.reload(); } )
    }

    /* update an identity on server */
    submitUpdateIdentity = ( name ) =>
    {
        /* save avatar config (if changes exist) */
        this.liveavatar.saveLiveAvatar();
        /* update the identity name on server and process result */
        sfetch.json( sfetch.request( '/identity/updateIdentity', { name: name }, 'post' ) ).then( j =>
        {
            if ( j.success )
            {
                /* update livename with final result from server */
                this.model.liveName = j.name;
                /* set name to model */
                this.model.storeName = j.name;
                /* leave menu view */
                this.handlePopMenu();
            }
        } ).catch( e => console.log( e ) )
    }

    handleSubmitForgetIdentity = ( ) =>
    {
        if ( window.confirm( 'forget identity on this device?\n\nrestore at any time using your passkey' ) )
        {
            /* tell server to destroy connection */
            sfetch.json( sfetch.request( '/identity/forgetIdentity' ) ).then( j => {
                if ( j.success )
                {
                    /* clear out any persistence */
                    localStorage.clear();
                    history.pushState( '', document.title, '/' );
                    location.reload();
                }
            } ).catch( e => console.log( e ) )
        }
    }

    /* attempt to get identity information from server / new session redirection  */
    fetchIdentityDetail( )
    {
        return sfetch.json( sfetch.request( '/identity/getIdentity' ) ).then( j =>
        {
            /* save name from result */
            if ( j )
            {
                this.model.storeName = j.name;
                this.model.stat      = j.stat;
            }
            /* redirect app to identity create screen if we can't download a credential */
            else
            {
                this.model.storeName = null;
                this.model.stat      = null;
                this.handleRoute( '/identity/create' );
            }
        } )
    }

    /* return the identity name */
    get name()   { return this.model.storeName }
    get avatar() { return this.liveavatar.createStaticAvatar(); }
    get stat()   { return this.model.stat }

    /* return a new 'create identity' view */
    createCreateView()
    {
        /* create the live avatar */
        const [ elAv, elAvDd ] = this.liveavatar.createLiveAvatar();
        /* create view */
        const view = this.view.createCreateView(
            elAv,
            elAvDd,
            ButtonController.create(
                'board topmargin',
                {
                    class: 'submit',
                    tabindex: '0',
                    onclick: e => this.handleClickCreateIdentity( e.target.form )
                },
                'create'
            )
            
        );
        /* update live fields */
        this.onModelChanged();
        /* return the view to calling function */
        return view;
    }
    /* update identity view */
    createUpdateView( )
    {
        /* create the live avatar */
        const [ elAv, elAvDd ] = this.liveavatar.createLiveAvatar();
        /* create view */
        const view = this.view.createUpdateView(
            elAv,
            elAvDd,
            ButtonController.create(
                'board topmargin',
                {
                    class: 'submit',
                    tabindex: '0',
                    onclick: e => this.handleClickUpdateIdentity( e.target.form )
                },
                'update'
            )
        );
        /* update live fields */
        this.onModelChanged();
        /* return the view to calling function */
        return view;
    }

    /* clear any temporary model state */
    clear()
    {
        this.model.liveName = null;
        this.liveavatar.clear();
    }

    /* call dependent sync functions */
    sync = () => Promise.all( [
        /* sync identity name */
        this.fetchIdentityDetail(),
        /* sync avatar config */
        this.liveavatar.sync()
    ] );
}
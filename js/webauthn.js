/* create a new credentials object using server public key and prepare response for transmission to server */
export const createAttestation = key =>
{
    /* decode random bytes */
    key.challenge = decodeBinary( key.challenge );
    key.user.id   = decodeBinary( key.user.id );
    /* create credentials in client */
    return navigator.credentials.create( { publicKey: key } )
        /* return params object */
        .then( creds => { return { attestationObject: encodeB64( creds.response.attestationObject ), clientDataJSON: encodeB64( creds.response.clientDataJSON ) } } );
}

/* create a new credentials object using server public key and prepare response for transmission to server */
export const createAssertion = key =>
{
    /* decode random bytes */
    key.challenge = decodeBinary( key.challenge );
    /* sign server key with private key */
    return navigator.credentials.get( { publicKey: key } )
        /* send credential signature to server */
        .then( creds =>
        {
            return {
                rawId:             encodeB64( creds.rawId ),
                clientDataJSON:    encodeB64( creds.response.clientDataJSON ),
                authenticatorData: encodeB64( creds.response.authenticatorData ),
                signature:         encodeB64( creds.response.signature ),
                userHandle:        encodeB64( creds.response.userHandle )
            };
        } )
}

/* decode binary bytes */
const decodeBinary = binary => Uint8Array.from( atob( binary ), c => c.charCodeAt( 0 ) ).buffer;
/* encode bytes in base64 */
const encodeB64    = bytes  => btoa( [ ...new Uint8Array( bytes ) ].map( c => String.fromCharCode( c ) ).join( '' ) );

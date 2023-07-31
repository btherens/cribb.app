/* imports */
import View from './view.js';

export default class IdentityView extends View
{
    constructor()
    {
        super();
    }

    /* return an identity/create view */
    createCreateView( elAv, elAvDd, button )
    {
        this.identityForm = this.create( 'div', { class: 'flex-container column width-1 reverse-show' },
        [
            this.create( 'div', { class: 'flex-wide' } ),
            elAvDd,
            this.create( 'div', { class: '' },
            [
                this.createNameInput(),
                button,
                this.create( 'a', {
                    class: 'boardlink',
                    onclick: e => this.submitRestoreIdentity( )
                }, 'restore existing...' )
            ] )
        ] )

        /* return a DOM view */
        return this.create( 'div', { class: 'flex-container column' },
        [
            this.create( 'span', { class: 'pd-header' }, 'create identity' ),
            /* fill display here */
            this.create( 'div', { class: 'fullscreen-flex-wide' } ),
            this.create('form', { class: 'flex-container dynamic fullscreen-flex-tall', autocomplete: 'off' },
            [
                this.create( 'div', { class: 'flex-container column width-1 fullscreen-flex-tall' },
                [
                    this.create( 'div', { class: 'fullscreen-flex-tall' } ),
                    elAv,
                    this.create( 'div', { class: 'fullscreen-flex-tall' } )
                ] ),
                /* open identity detail view */
                this.identityForm
            ] )
        ] )
    }

    /* return an identity/update view */
    createUpdateView( elAv, elAvDd, button )
    {
        this.identityForm = this.create( 'div', { class: 'flex-container column width-1 reverse-show' },
        [
            this.create( 'div', { class: 'flex-wide' } ),
            elAvDd,
            this.create( 'div', { class: '' },
            [
                this.createNameInput(),
                button,
                this.create( 'a', {
                    class: 'boardlink',
                    onclick: e => this.submitForgetIdentity()
                }, 'forget identity...' )
            ] )
        ] )

        /* return a DOM view */
        return this.create( 'div', { class: 'flex-container column' }, [
            this.create( 'span', { class: 'pd-header' }, 'update identity' ),
            /* fill display here */
            this.create( 'div', { class: 'fullscreen-flex-wide' } ),
            this.create('form', { class: 'flex-container dynamic fullscreen-flex-tall' }, [
                this.create( 'div', { class: 'flex-container column width-1 fullscreen-flex-tall' }, [
                    this.create( 'div', { class: 'fullscreen-flex-tall' } ),
                    elAv,
                    this.create( 'div', { class: 'fullscreen-flex-tall' } )
                ] ),
                this.identityForm
            ] )
        ] )
    }

    createNameInput()
    {
        this.inputName = this.create( 'label', { class: 'tactile board', onclick: e => e.currentTarget.children[ 0 ].focus() }, [
            this.create( 'input', {
                /* input properties - pattern validates input for printable utf-8 characters*/
                id: 'notASearch', type: 'text', placeholder: 'your name', autocomplete: 'off', pattern: '[ -~]{1,14}', required: 'required', spellcheck: 'false', tabindex: '0', enterkeyhint: 'done',

                /* attempt to select any existing content upon focus (delayed to help ensure event fires late enough in safari) */
                onfocus: e => e.target.value && setTimeout( e => { e.target.select() }, 10, e ),
                /* trigger model update on input event */
                oninput: e => this.handleUpdateLiveName( e ), 
                /* trim string whitespace and trigger input change events */
                onfocusout: e => ( e.target.value = e.target.value.trim() ) && e.target.dispatchEvent( new Event( 'input' ) ),
                /* capture return key and advance to next form input */
                onkeydown: e => this._nextFormInput( e )
            } ),
            this.create( 'div', 0, 'name' )
        ] );

        return this.inputName;
    }

    /* bindings */
    //bindCreateAvatar(handler) { this.createAvatar = handler }
    bindUpdateLiveName( handler ) { this.handleUpdateLiveName = handler }
    //bindFilterLiveName( handler ) { this.handleFilterLiveName = handler }
    bindFilterName( handler ) { this.filterName =  handler }
    bindSubmitCreateIdentity( handler )
    {
        this.submitCreateIdentity = ( form ) =>
        {
            /* get name field */
            const name = Array.from( form.elements ).filter( el => el.tagName === 'INPUT' && el.type === 'text' )[ 0 ].value;
            if ( form.checkValidity() ) { handler( name ) } else { return form.reportValidity() }
        }
    }
    bindSubmitUpdateIdentity( handler )
    {
        this.submitUpdateIdentity = ( form ) =>
        {
            /* get name field */
            const name = Array.from( form.elements ).filter( el => el.tagName === 'INPUT' && el.type === 'text' )[ 0 ].value;
            if ( form.checkValidity() ) { handler( name ) } else { return form.reportValidity() }
        }
    }
    bindSubmitRestoreIdentity( handler ) { this.submitRestoreIdentity = handler }
    bindSubmitForgetIdentity( handler ) { this.submitForgetIdentity = handler }

}

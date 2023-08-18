/* imports */
import View from './view.js';

export default class AboutView extends View
{
    constructor()
    {
        super();
    }

    /* return a lobby list view */
    _createBlankViewWrapper( view, header )
    {
        /* return a DOM view */
        return this.create( 'div', { class: 'flex-container column scroll' }, [
            this.create( 'span', { class: 'pd-header' }, header ),
            //this.create( 'div', { class: 'fullscreen-flex-all' } ),
            this.create( 'div', { class: 'flex-container dynamic tactile-margin' }, view ),
            //this.create( 'div', { class: 'fullscreen-flex-all' } ),

            //this.create( 'div', { class: 'fullscreen-flex-all' } )
        ] );
    }

    createAboutView()
    {
        this.about = this.create( 'div', { class: 'flex-container column width-1' } );
        /* return a DOM view */
        return this._createBlankViewWrapper( this.about, 'about' );
    }

    createChangelogView()
    {
        this.changelog = this.create( 'div', { class: 'flex-container column width-1' } );
        /* return a DOM view */
        return this._createBlankViewWrapper( this.changelog, 'changelog' );
    }

    createPrivacyView()
    {
        this.privacy = this.create( 'div', { class: 'flex-container column width-1' } );
        /* return a DOM view */
        return this._createBlankViewWrapper( this.privacy, 'privacy' );
    }

    createLicenseView()
    {
        this.license = this.create( 'div', { class: 'flex-container column width-1' } );
        /* return a DOM view */
        return this._createBlankViewWrapper( this.license, 'license' );
    }

    displayAboutView( dedication, credits, privacy, changelog, sizeobj )
    {
        this.about.textContent = ''
        /* dedication */
        this.about.appendChild( dedication );

        /* credits */
        this.displayTextblock();
        this.displayList( this.about, [
            /* header */
            this.create( 'div', { id: 'credits', class: 'list header tactile board' }, 'credits' ),
            /* list */
            ...credits,
            /* licenses */
            this.create( 'div', {
                class: 'list header tactile board',
                onclick: () => this.handleRoute( `/about/license` )
            }, 'license >' )
        ] );

        /* display privacy info */
        this.displayTextblock();
        this.displayList( this.about, [
            /* header */
            this.create( 'div', { id: 'changelog', class: 'list header tactile board' }, 'privacy' ),
            /* list */
            ...privacy,
            /* link to more privacy info */
            this.create( 'div', {
                class: 'list header tactile board',
                onclick: () => this.handleRoute( `/about/privacy` )
            }, 'view all >' )
        ] );

        /* changelog */
        this.displayTextblock();
        this.displayList( this.about, [
            /* header */
            this.create( 'div', { id: 'changelog', class: 'list header tactile board' }, 'changelog' ),
            /* list */
            ...changelog,
            /* link to full changelog if necessary */
            ...[ this.create( 'div', {
                    class: 'list header tactile board',
                    onclick: () => this.handleRoute( `/about/changelog` )
                }, 'view all >' ) ]
        ] );

        /* display sizes */
        this.displayTextblock();
        this.displayList( this.about, [
            /* header */
            this.create( 'div', { id: 'changelog', class: 'list header tactile board' }, 'data' ),
            /* list */
            this.create( 'div', { class: 'list tactile board' }, sizeobj )
        ] );

    }

    displayChangelogView( changelog )
    {
        this.changelog.textContent = ''
        this.displayList( this.changelog, [
            /* list */
            ...changelog
        ] );
    }

    displayPrivacyView( privacy )
    {
        /* clear privacy view content */
        this.privacy.textContent = '';
        /* append privacy dom content to privacy view */
        this.displayList( this.privacy, [
            /* list */
            ...privacy
        ] );
    }

    displayLicenseView( license )
    {
        /* clear license view content */
        this.license.textContent = '';
        /* append license dom content to privacy view */
        this.displayList( this.license, [ ...license ] );
    }

    /* add a list dom object to view */
    displayList( view, arr )
    {
        view.appendChild( this.create( 'div', 0, this.create( 'div', 0, arr ) ) )
    }

    /* append a textblock with optional nest content */
    displayTextblock( nest )
    {
        this.about.appendChild( this.create( 'div', { class: 'textblock' }, nest ?? null ) );
    }

    /* append a footer to list */
    displayFooter( view, sUrl, cname )
    {
        this._nest( view, [
            this.create( 'div', { class: 'fullscreen-flex-all' } ),
            this.create( 'div', { class: 'textblock' }, [
                sUrl != null ? this.create( 'a', { target: '_blank', href: sUrl, onclick: e => e.stopPropagation() }, 'source code' ) : null,
                this.create( 'span', 0, ( ( sUrl != null ? ' | ' : '' ) + '© ' + new Date().getFullYear() + ( cname != null ? ' ' + cname : '' ) ) )
            ] )
        ] )
        //view.appendChild( this.create( 'div', { class: 'fullscreen-flex-all' } ) );
        //view.appendChild(
        //    this.create( 'div', { class: 'textblock' }, [
        //        sUrl != null ? this.create( 'a', { target: '_blank', href: sUrl, onclick: e => e.stopPropagation() }, 'source code' ) : null,
        //        this.create( 'span', 0, ( ( sUrl != null ? ' | ' : '' ) + '© ' + new Date().getFullYear() + ( cname != null ? ' ' + cname : '' ) ) )
        //    ] )
        //)
    }

    /* bindings */
    bindRoute( handler ) { this.handleRoute = handler }

}

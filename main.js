/* eslint-disable no-alert, no-jquery/no-global-selector */

$( () => {

	let lastRequest, lastHtml, lastWikitext;
	const restBaseUri = 'https://www.mediawiki.org/api/rest_v1/',
		mwCSS = '//www.mediawiki.org/w/load.php?modules=mediawiki.legacy.commonPrint,shared|mediawiki.skinning.elements|mediawiki.skinning.content|mediawiki.skinning.interface|skins.vector.styles|site|mediawiki.skinning.content.parsoid|mediawiki.page.gallery.styles|ext.cite.style&only=styles&skin=vector',
		$boxes = $( '.boxes' ),
		$wikitext = $( '.wikitext' ),
		$domWrapper = $( '.domWrapper' ),
		$dom = $( '<div>' )
			.addClass( 'mw-body-content mediawiki mw-content-ltr mw-parser-output' )
			.prop( 'contentEditable', 'true' ),
		$html = $( '.html' ),
		$restBaseIds = $( '.restBaseIds' ),
		$renderDom = $( '.renderDom' ),
		$formatHtml = $( '.formatHtml' ),
		$clear = $( '.clear' ),
		$save = $( '.save' ),
		currentWikitextKey = 'current-wikitext',
		savedStatesKey = 'parsoid-saved-states';

	function debounce( func, wait, immediate ) {
		let timeout;
		return () => {
			const context = this,
				args = arguments,
				later = () => {
					timeout = null;
					if ( !immediate ) {
						func.apply( context, args );
					}
				};
			if ( immediate && !timeout ) {
				func.apply( context, args );
			}
			clearTimeout( timeout );
			timeout = setTimeout( later, wait );
		};
	}

	function store() {
		localStorage.setItem( currentWikitextKey, $wikitext.val() );
	}

	function updateWikitext( wikitext ) {
		$wikitext.val( wikitext ).trigger( 'input' );
	}

	function setObject( key, value ) {
		return localStorage.setItem( key, JSON.stringify( value ) );
	}

	function getObject( key ) {
		return JSON.parse( localStorage.getItem( key ) || 'null' );
	}

	function loadSavedStates() {
		return getObject( savedStatesKey ) || {};
	}

	function listSavedStates() {
		const $savedStates = $( '.savedStates' );

		let count = 0;
		const savedStates = loadSavedStates();
		const $ul = $( '<ul>' );

		for ( const name in savedStates ) {
			$ul.append(
				$( '<li>' ).append(
					'[',
					$( '<a>' )
						.attr( 'href', '#' )
						.text( 'x' )
						.on( 'click', onDeleteClick ),
					'] ',
					$( '<a>' )
						.attr( 'href', '#' )
						.text( name )
						.on( 'click', onLoadClick ),
					' ',
					$( '<code>' ).text( savedStates[ name ].wikitext.slice( 0, 40 ) + '...' )
				).data( 'name', name )
			);
			count++;
		}
		if ( count ) {
			$savedStates.html( $ul );
		} else {
			$savedStates.html( $( '<em>' ).text( 'No saved states' ) );
		}
	}

	function onLoadClick() {
		const name = $( this ).closest( 'li' ).data( 'name' ),
			savedStates = loadSavedStates();

		if ( savedStates[ name ] ) {
			updateWikitext( savedStates[ name ].wikitext );
		}
	}

	function onDeleteClick() {
		const name = $( this ).closest( 'li' ).data( 'name' ),
			savedStates = loadSavedStates();

		delete savedStates[ name ];
		setObject( savedStatesKey, savedStates );
		listSavedStates();
	}

	function updateDom() {
		if ( $renderDom.prop( 'checked' ) ) {
			$dom.html( $html.val() );
		}
	}

	function updateHtml( html ) {
		$html.val(
			$formatHtml.prop( 'checked' ) ?
				html_beautify( html ) : html
		);
	}

	const shadow = $domWrapper[ 0 ].attachShadow( { mode: 'open' } );
	const style = shadow.ownerDocument.createElement( 'style' );
	style.innerHTML = `
		@import '${ mwCSS }';
		.mw-body { margin: 0; border: 0; padding: 0; }
		:focus { outline: 0; }
	`;
	shadow.appendChild( style );
	shadow.appendChild( $dom[ 0 ] );

	$wikitext.on( 'input keyup', debounce( () => {
		const wikitext = $wikitext.val();
		if ( wikitext === lastWikitext ) {
			return;
		}
		lastWikitext = wikitext;
		if ( lastRequest ) {
			lastRequest.abort();
		}
		$html.addClass( 'loading' );
		lastRequest = $.ajax( restBaseUri + 'transform/wikitext/to/html', {
			method: 'POST',
			data: {
				wikitext: wikitext,
				// eslint-disable-next-line camelcase
				body_only: true
			}
		} ).then( ( html ) => {
			if ( $restBaseIds.prop( 'checked' ) ) {
				const doc = new DOMParser().parseFromString( html, 'text/html' );
				$( doc.body ).find( '[id^=mw]' ).each( function () {
					const $this = $( this );
					if ( $this.attr( 'id' ).match( /^mw[a-zA-Z0-9\-_]{2,6}$/ ) ) {
						$this.removeAttr( 'id' );
					}
				} );
				html = doc.body.innerHTML;
			}
			updateHtml( html );
			updateDom();
			store();
		} ).always( function () {
			$html.removeClass( 'loading' );
		} );
	}, 500 ) );

	$html.on( 'input keyup', debounce( () => {
		const html = $html.val();
		if ( html === lastHtml ) {
			return;
		}
		lastHtml = html;
		if ( $dom.html() !== html ) {
			updateDom();
		}
		if ( lastRequest ) {
			lastRequest.abort();
		}
		$wikitext.addClass( 'loading' );
		lastRequest = $.ajax( restBaseUri + 'transform/html/to/wikitext', {
			method: 'POST',
			data: {
				html: html
			}
		} ).then( ( wikitext ) => {
			$wikitext.val( wikitext );
			store();
		} ).always( () => {
			$wikitext.removeClass( 'loading' );
		} );
	}, 500 ) );

	$dom.on( 'input keyup', () => {
		updateHtml( $dom.html() );
		$html.trigger( 'input' );
	} );

	function persistCheckbox( key, $checkbox ) {
		const val = getObject( key );
		$checkbox.on( 'change', () => {
			const checked = $checkbox.prop( 'checked' );
			setObject( key, checked );
		} );
		if ( val !== null ) {
			$checkbox.prop( 'checked', val ).trigger( 'change' );
		}
	}

	persistCheckbox( 'restbase-ids', $restBaseIds );
	persistCheckbox( 'render-dom', $renderDom );
	persistCheckbox( 'format-html', $formatHtml );

	$restBaseIds.on( 'change', () => {
		lastWikitext = null;
		$wikitext.trigger( 'input' );
	} );

	$renderDom.on( 'change', () => {
		$boxes.toggleClass( 'showDom', $renderDom.prop( 'checked' ) );
		updateDom( $html.val() );
	} ).trigger( 'change' );

	$formatHtml.on( 'change', () => {
		updateHtml( $html.val() );
	} );

	$clear.on( 'click', () => {
		updateWikitext( '' );
		store();
	} );

	$save.on( 'click', () => {
		const savedStates = loadSavedStates(),
			name = prompt( 'Name this saved state' );

		if (
			name !== null &&
			( savedStates[ name ] === undefined || confirm( 'Overwrite existing state with this name?' ) )
		) {
			savedStates[ name ] = {
				wikitext: $wikitext.val()
			};
			setObject( savedStatesKey, savedStates );
			listSavedStates();
		}
	} );

	const currentWikitext = localStorage.getItem( currentWikitextKey );
	if ( currentWikitext !== null ) {
		updateWikitext( currentWikitext );
	}
	listSavedStates();

} );

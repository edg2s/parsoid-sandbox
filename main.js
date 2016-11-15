$( function () {

	var currentWikitext, lastRequest, lastHtml, lastWikitext,
		restBaseUri = 'https://www.mediawiki.org/api/rest_v1/',
		hasLocalStorage = !!window.localStorage,
		currentWikitextKey = 'current-wikitext',
		savedStatesKey = 'parsoid-saved-states',
		mwIdKey = 'mw-id',
		renderDomKey = 'render-dom';

	function debounce( func, wait, immediate ) {
		var timeout;
		return function () {
			var context = this,
				args = arguments,
				later = function () {
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
		if ( hasLocalStorage ) {
			localStorage.setItem( currentWikitextKey, $( '.wikitext' ).val() );
		}
	}

	function updateWikitext( wikitext ) {
		$( '.wikitext' ).val( wikitext ).trigger( 'input' );
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
		var name, count, savedStates, $ul;

		if ( hasLocalStorage ) {
			count = 0;
			savedStates = loadSavedStates();
			$ul = $( '<ul>' );

			for ( name in savedStates ) {
				$ul.append(
					$( '<li>' ).append(
						'[',
						$( '<a>' )
							.attr( 'href', '#' )
							.text( 'x' )
							.click( onDeleteClick ),
						'] ',
						$( '<a>' )
							.attr( 'href', '#' )
							.text( name )
							.click( onLoadClick ),
						' ',
						$( '<code>' ).text( savedStates[ name ].wikitext.substr( 0, 40 ) + '...' )
					).data( 'name', name )
				);
				count++;
			}
			if ( count ) {
				$( '.savedStates' ).html( $ul );
			} else {
				$( '.savedStates' ).html( '<em>No saved states</em>' );
			}
		}
	}

	function onLoadClick() {
		var name = $( this ).closest( 'li' ).data( 'name' ),
			savedStates = loadSavedStates();

		if ( savedStates[ name ] ) {
			updateWikitext( savedStates[ name ].wikitext );
		}
	}

	function onDeleteClick() {
		var name = $( this ).closest( 'li' ).data( 'name' ),
			savedStates = loadSavedStates();

		delete savedStates[ name ];
		setObject( savedStatesKey, savedStates );
		listSavedStates();
	}

	function updateDom() {
		if ( $( '.renderDom' ).prop( 'checked' ) ) {
			$( '.dom' ).html( $( '.html' ).val() );
		}
	}

	$( '.wikitext' ).on( 'input keyup', debounce( function () {
		var wikitext = $( '.wikitext' ).val();
		if ( wikitext === lastWikitext ) {
			return;
		}
		lastWikitext = wikitext;
		if ( lastRequest ) {
			lastRequest.abort();
		}
		$( '.html' ).addClass( 'loading' );
		lastRequest = $.ajax( restBaseUri + 'transform/wikitext/to/html', {
			method: 'POST',
			data: {
				wikitext: wikitext,
				// eslint-disable-next-line camelcase
				body_only: true,
				// eslint-disable-next-line camelcase
				scrub_wikitext: true
			}
		} ).done( function ( html ) {
			var doc;
			if ( $( '.mw-id' ).prop( 'checked' ) ) {
				doc = new DOMParser().parseFromString( html, 'text/html' );
				$( doc.body ).find( '[id^=mw]' ).each( function () {
					var $this = $( this );
					if ( $this.attr( 'id' ).match( /^mw[a-zA-Z0-9\-_]{2,6}$/ ) ) {
						$this.removeAttr( 'id' );
					}
				} );
				html = doc.body.innerHTML;
			}
			$( '.html' ).val( html );
			updateDom();
			store();
		} ).always( function () {
			$( '.html' ).removeClass( 'loading' );
		} );
	}, 500 ) );

	$( '.html' ).on( 'input keyup', debounce( function () {
		var html = $( '.html' ).val();
		if ( html === lastHtml ) {
			return;
		}
		lastHtml = html;
		updateDom();
		if ( lastRequest ) {
			lastRequest.abort();
		}
		$( '.wikitext' ).addClass( 'loading' );
		lastRequest = $.ajax( restBaseUri + 'transform/html/to/wikitext', {
			method: 'POST',
			data: {
				html: html
			}
		} ).done( function ( wikitext ) {
			$( '.wikitext' ).val( wikitext );
			store();
		} ).always( function () {
			$( '.wikitext' ).removeClass( 'loading' );
		} );
	}, 500 ) );

	$( '.dom' ).on( 'input keyup', function () {
		$( '.html' ).val( $( '.dom' ).html() ).trigger( 'input' );
	} );

	$( '.mw-id' ).change( function () {
		var checked = $( this ).prop( 'checked' );
		lastWikitext = null;
		$( '.wikitext' ).trigger( 'input' );
		if ( hasLocalStorage ) {
			setObject( mwIdKey, checked );
		}
	} );

	$( '.renderDom' ).change( function () {
		var checked = $( this ).prop( 'checked' );
		$( '.boxes' ).toggleClass( 'showDom', checked );
		if ( hasLocalStorage ) {
			setObject( renderDomKey, checked );
		}
		updateDom( $( '.html' ).val() );
	} );

	if ( getObject( mwIdKey ) !== null ) {
		$( '.mw-id' ).prop( 'checked', getObject( mwIdKey ) ).trigger( 'change' );
	}

	if ( getObject( renderDomKey ) !== null ) {
		$( '.renderDom' ).prop( 'checked', getObject( renderDomKey ) ).trigger( 'change' );
	}

	$( '.clear' ).click( function () {
		updateWikitext( '' );
		store();
	} );

	$( '.save' ).click( function () {
		var savedStates = loadSavedStates(),
			name = window.prompt( 'Name this saved state' );

		if (
			name !== null &&
			( savedStates[ name ] === undefined || window.confirm( 'Overwrite existing state with this name?' ) )
		) {
			savedStates[ name ] = {
				wikitext: $( '.wikitext' ).val()
			};
			setObject( savedStatesKey, savedStates );
			listSavedStates();
		}
	} );

	if ( hasLocalStorage ) {
		currentWikitext = localStorage.getItem( currentWikitextKey );
		if ( currentWikitext !== null ) {
			updateWikitext( currentWikitext );
		}
		listSavedStates();
	} else {
		$( '.save, .saved' ).hide();
	}

} );

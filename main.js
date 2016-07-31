$( function () {

	var currentWikitext, lastRequest,
		restBaseUri = 'https://www.mediawiki.org/api/rest_v1/',
		hasLocalStorage = !!window.localStorage,
		currentWikitextKey = 'current-wikitext',
		savedStatesKey = 'parsoid-saved-states',
		mwIdKey = 'mw-id';

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

	$( '.wikitext' ).on( 'input keyup', function () {
		if ( lastRequest ) {
			lastRequest.abort();
		}
		$( '.html' ).addClass( 'loading' );
		lastRequest = $.ajax( restBaseUri + 'transform/wikitext/to/html', {
			method: 'POST',
			data: {
				wikitext: $( '.wikitext' ).val()
			}
		} ).done( function ( html ) {
			var doc = new DOMParser().parseFromString( html, 'text/html' );
			if ( $( '.mw-id' ).prop( 'checked' ) ) {
				$( doc.body ).find( '[id^=mw]' ).removeAttr( 'id' );
			}
			$( '.html' ).val( doc.body.innerHTML );
			store();
		} ).always( function () {
			$( '.html' ).removeClass( 'loading' );
		} );
	} );

	$( '.html' ).on( 'input keyup', function () {
		if ( lastRequest ) {
			lastRequest.abort();
		}
		$( '.wikitext' ).addClass( 'loading' );
		lastRequest = $.ajax( restBaseUri + 'transform/html/to/wikitext', {
			method: 'POST',
			data: {
				html: $( '.html' ).val()
			}
		} ).done( function ( wikitext ) {
			$( '.wikitext' ).val( wikitext );
			store();
		} ).always( function () {
			$( '.wikitext' ).removeClass( 'loading' );
		} );
	} );

	$( '.mw-id' ).change( function () {
		var checked = $( this ).prop( 'checked' );
		$( '.wikitext' ).trigger( 'input' );
		if ( hasLocalStorage ) {
			setObject( mwIdKey, checked );
		}
	} );

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

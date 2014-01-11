$( function () {

	var html,
		hasLocalStorage = !!window.localStorage,
		currentHtmlKey = 'current-html', savedHtmlKey = 'saved-html';

	function store() {
		if ( hasLocalStorage ) {
			localStorage.setItem( currentHtmlKey, $( '.ce' ).html() );
		}
	}

	function update( html ) {
		$( '.html' ).val( html );
		$( '.ce' ).html( html );
	}

	function setObject( key, value ) {
		return localStorage.setItem( key, JSON.stringify( value ) );
	}

	function getObject( key, value ) {
		return JSON.parse( localStorage.getItem( key ) || 'null' );
	}

	function loadSavedHtml() {
		return getObject( savedHtmlKey ) || {};
	}

	function listSavedHtml() {
		if ( hasLocalStorage ) {
			var name,
				count = 0,
				savedHtml = loadSavedHtml(),
				$ul = $( '<ul>' );

			for ( name in savedHtml ) {
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
						$( '<code>' ).text( savedHtml[name].substr( 0, 40 ) + '...' )
					).data( 'name', name )
				);
				count++;
			}
			if ( count ) {
				$( '.savedHtml' ).html( $ul );
			} else {
				$( '.savedHtml' ).html( '<em>No saved states</em>' );
			}
		}
	}

	function onLoadClick() {
		var name = $( this ).closest( 'li' ).data( 'name' ),
			savedHtml = loadSavedHtml();

		if ( savedHtml[name] ) {
			update( savedHtml[name] );
		}
	}

	function onDeleteClick() {
		var name = $( this ).closest( 'li' ).data( 'name' ),
			savedHtml = loadSavedHtml();

		delete savedHtml[name];
		setObject( savedHtmlKey, savedHtml );
		listSavedHtml();
	}

	$( '.ce' ).keyup( function () {
		$( '.html' ).val( $( '.ce' ).html() );
		store();
	} );

	$( '.html' ).keyup( function () {
		$( '.ce' ).html( $( '.html' ).val() );
		store();
	} );

	$( '.outline' ).change( function () {
		$( '.ce' ).toggleClass( 'outline', $( this ).prop( 'checked' ) );
	} );

	$( '.clear' ).click( function () {
		update( '' );
		store();
	} );

	$( '.save' ).click( function () {
		var savedHtml = loadSavedHtml(),
			name = prompt( 'Name this saved state' );

		if (
			name !== null &&
			( savedHtml[name] === undefined || confirm( 'Overwrite existing state with this name?' ) )
		) {
			savedHtml[name] = $( '.ce' ).html();
			setObject( savedHtmlKey, savedHtml );
			listSavedHtml();
		}
	} );

	if ( hasLocalStorage ) {
		currentHtml = localStorage.getItem( currentHtmlKey );
		if ( currentHtml !== null ) {
			update( currentHtml );
		}
		listSavedHtml();
	} else {
		$( '.save, .saved' ).hide();
	}

});

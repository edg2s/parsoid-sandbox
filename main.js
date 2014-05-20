$( function () {

	var currentHtml, currentCss,
		hasLocalStorage = !!window.localStorage,
		currentHtmlKey = 'current-html', savedStatesKey = 'saved-states',
		currentCssKey = 'current-css', savedCssKey = 'saved-css',
		outlineKey = 'show-outline', editCssKey = 'edit-css';

	function store() {
		if ( hasLocalStorage ) {
			localStorage.setItem( currentHtmlKey, $( '.ce' ).html() );
			localStorage.setItem( currentCssKey, $( '.css' ).val() );
		}
	}

	function updateHtml( html ) {
		$( '.html' ).val( html );
		$( '.ce' ).html( html );
	}

	function updateCss( css ) {
		$( '.css' ).val( css );
		$( '.style' ).html( $( '.editCss' ).prop( 'checked' ) ? css : '' );
	}

	function setObject( key, value ) {
		return localStorage.setItem( key, JSON.stringify( value ) );
	}

	function getObject( key, value ) {
		return JSON.parse( localStorage.getItem( key ) || 'null' );
	}

	function loadSavedStates() {
		return getObject( savedStatesKey ) || {};
	}

	function listSavedStates() {
		if ( hasLocalStorage ) {
			var name,
				count = 0,
				savedStates = loadSavedStates(),
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
						$( '<code>' ).text( savedStates[name].html.substr( 0, 40 ) + '...' ),
						' ',
						savedStates[name].css ?
							$( '<code>' ).text( savedStates[name].css.substr( 0, 40 ) + '...' ) : ''
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

		if ( savedStates[name] ) {
			updateHtml( savedStates[name].html );
			updateCss( savedStates[name].css );
		}
	}

	function onDeleteClick() {
		var name = $( this ).closest( 'li' ).data( 'name' ),
			savedStates = loadSavedStates();

		delete savedStates[name];
		setObject( savedStatesKey, savedStates );
		listSavedStates();
	}

	$( '.ce' ).keyup( function () {
		$( '.html' ).val( $( '.ce' ).html() );
		store();
	} );

	$( '.html' ).keyup( function () {
		$( '.ce' ).html( $( '.html' ).val() );
		store();
	} );

	$( '.css' ).keyup( function () {
		$( '.style' ).html( $( '.css' ).val() );
		store();
	} );

	$( '.outline' ).change( function () {
		var checked = $( this ).prop( 'checked' );
		$( '.ce' ).toggleClass( 'outlined', checked );
		if ( hasLocalStorage ) {
			setObject( outlineKey, checked );
		}
	} );

	$( '.editCss' ).change( function () {
		var checked = $( this ).prop( 'checked' );
		$( '.boxes' ).toggleClass( 'showCss', checked );
		if ( hasLocalStorage ) {
			setObject( editCssKey, checked );
		}
		updateCss( $( '.css' ).val() );
	} );

	if ( getObject( outlineKey ) !== null ) {
		$( '.outline' ).prop( 'checked', getObject( outlineKey ) ).trigger( 'change' );
	}

	if ( getObject( editCssKey ) !== null ) {
		$( '.editCss' ).prop( 'checked', getObject( editCssKey ) ).trigger( 'change' );
	}

	$( '.clear' ).click( function () {
		updateHtml( '' );
		updateCss( '' );
		store();
	} );

	$( '.save' ).click( function () {
		var savedStates = loadSavedStates(),
			name = prompt( 'Name this saved state' );

		if (
			name !== null &&
			( savedStates[name] === undefined || confirm( 'Overwrite existing state with this name?' ) )
		) {
			savedStates[name] = {
				'html': $( '.ce' ).html(),
				'css': $( '.css' ).val()
			};
			setObject( savedStatesKey, savedStates );
			listSavedStates();
		}
	} );

	if ( hasLocalStorage ) {
		currentHtml = localStorage.getItem( currentHtmlKey );
		if ( currentHtml !== null ) {
			updateHtml( currentHtml );
		}
		currentCss = localStorage.getItem( currentCssKey );
		if ( currentCss !== null ) {
			updateCss( currentCss );
		}
		listSavedStates();
	} else {
		$( '.save, .saved' ).hide();
	}

} );

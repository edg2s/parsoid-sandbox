$( function () {

	var html, saveItem = 'cehtml';

	function store() {
		if ( localStorage ) {
			localStorage.setItem( saveItem, $( '.ce' ).html() );
		}
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

	if ( localStorage ) {
		html = localStorage.getItem( saveItem );
		if ( html !== null ) {
			$( '.html' ).text( html );
			$( '.ce' ).html( html );
		}
	}

});

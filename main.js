/* eslint-disable no-alert */

$( function () {

	var currentWikitext, lastRequest, lastHtml, lastWikitext,
		restBaseUri = 'https://www.mediawiki.org/api/rest_v1/',
		hasLocalStorage = !!window.localStorage,
		$boxes = $( '.boxes' ),
		$wikitext = $( '.wikitext' ),
		$dom = $( '.dom' ),
		$html = $( '.html' ),
		$restBaseIds = $( '.restBaseIds' ),
		$scrubWikitext = $( '.scrubWikitext' ),
		$renderDom = $( '.renderDom' ),
		$formatHtml = $( '.formatHtml' ),
		$clear = $( '.clear' ),
		$save = $( '.save' ),
		currentWikitextKey = 'current-wikitext',
		savedStatesKey = 'parsoid-saved-states',
		restBaseIdsKey = 'restbase-ids',
		scrubWikitextKey = 'scrub-wikitext',
		renderDomKey = 'render-dom',
		formatHtmlKey = 'format-html';

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
			localStorage.setItem( currentWikitextKey, $wikitext.val() );
		}
	}

	function updateWikitext( wikitext ) {
		$wikitext.val( wikitext ).trigger( 'input' );
	}

	function setObject( key, value ) {
		return hasLocalStorage ? localStorage.setItem( key, JSON.stringify( value ) ) : null;
	}

	function getObject( key ) {
		return JSON.parse( localStorage.getItem( key ) || 'null' );
	}

	function loadSavedStates() {
		return getObject( savedStatesKey ) || {};
	}

	function listSavedStates() {
		var name, count, savedStates, $ul,
			$savedStates = $( '.savedStates' );

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
							// eslint-disable-next-line no-use-before-define
							.click( onDeleteClick ),
						'] ',
						$( '<a>' )
							.attr( 'href', '#' )
							.text( name )
							// eslint-disable-next-line no-use-before-define
							.click( onLoadClick ),
						' ',
						$( '<code>' ).text( savedStates[ name ].wikitext.substr( 0, 40 ) + '...' )
					).data( 'name', name )
				);
				count++;
			}
			if ( count ) {
				$savedStates.html( $ul );
			} else {
				$savedStates.html( '<em>No saved states</em>' );
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

	$wikitext.on( 'input keyup', debounce( function () {
		var wikitext = $wikitext.val();
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
		} ).done( function ( html ) {
			var doc;
			if ( $restBaseIds.prop( 'checked' ) ) {
				doc = new DOMParser().parseFromString( html, 'text/html' );
				$( doc.body ).find( '[id^=mw]' ).each( function () {
					var $this = $( this );
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

	$html.on( 'input keyup', debounce( function () {
		var html = $html.val();
		if ( html === lastHtml ) {
			return;
		}
		lastHtml = html;
		updateDom();
		if ( lastRequest ) {
			lastRequest.abort();
		}
		$wikitext.addClass( 'loading' );
		lastRequest = $.ajax( restBaseUri + 'transform/html/to/wikitext', {
			method: 'POST',
			data: {
				html: html,
				// eslint-disable-next-line camelcase
				scrub_wikitext: $scrubWikitext.prop( 'checked' )
			}
		} ).done( function ( wikitext ) {
			$wikitext.val( wikitext );
			store();
		} ).always( function () {
			$wikitext.removeClass( 'loading' );
		} );
	}, 500 ) );

	$dom.on( 'input keyup', function () {
		updateHtml( $dom.html() );
		$html.trigger( 'input' );
	} );

	$restBaseIds.change( function () {
		var checked = $( this ).prop( 'checked' );
		lastWikitext = null;
		$wikitext.trigger( 'input' );
		setObject( restBaseIdsKey, checked );
	} );

	$scrubWikitext.change( function () {
		var checked = $( this ).prop( 'checked' );
		lastHtml = null;
		$html.trigger( 'input' );
		setObject( scrubWikitextKey, checked );
	} );

	$renderDom.change( function () {
		var checked = $( this ).prop( 'checked' );
		$boxes.toggleClass( 'showDom', checked );
		setObject( renderDomKey, checked );
		updateDom( $html.val() );
	} );

	$formatHtml.change( function () {
		var checked = $( this ).prop( 'checked' );
		setObject( formatHtmlKey, checked );
		updateHtml( $dom.html() );
	} );

	if ( getObject( restBaseIdsKey ) !== null ) {
		$restBaseIds.prop( 'checked', getObject( restBaseIdsKey ) ).trigger( 'change' );
	}

	if ( getObject( scrubWikitextKey ) !== null ) {
		$scrubWikitext.prop( 'checked', getObject( scrubWikitextKey ) ).trigger( 'change' );
	}

	if ( getObject( renderDomKey ) !== null ) {
		$renderDom.prop( 'checked', getObject( renderDomKey ) ).trigger( 'change' );
	}

	if ( getObject( formatHtmlKey ) !== null ) {
		$formatHtml.prop( 'checked', getObject( formatHtmlKey ) ).trigger( 'change' );
	}

	$clear.click( function () {
		updateWikitext( '' );
		store();
	} );

	$save.click( function () {
		var savedStates = loadSavedStates(),
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

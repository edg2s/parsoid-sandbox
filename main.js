/* eslint-disable no-alert, no-jquery/no-global-selector */

$( function () {

	var lastRequest, lastHtml, lastWikitext,
		restBaseUri = 'https://www.mediawiki.org/api/rest_v1/',
		mwCSS = '//www.mediawiki.org/w/load.php?modules=mediawiki.legacy.commonPrint,shared|mediawiki.skinning.elements|mediawiki.skinning.content|mediawiki.skinning.interface|skins.vector.styles|site|mediawiki.skinning.content.parsoid|mediawiki.page.gallery.styles|ext.cite.style&only=styles&skin=vector',
		hasLocalStorage = !!window.localStorage,
		$boxes = $( '.boxes' ),
		$wikitext = $( '.wikitext' ),
		$domWrapper = $( '.domWrapper' ),
		$dom = $( '<div>' )
			.addClass( 'mw-body mw-body-content mediawiki mw-content-ltr mw-parser-output' )
			.prop( 'contentEditable', 'true' ),
		$html = $( '.html' ),
		$restBaseIds = $( '.restBaseIds' ),
		$scrubWikitext = $( '.scrubWikitext' ),
		$renderDom = $( '.renderDom' ),
		$formatHtml = $( '.formatHtml' ),
		$clear = $( '.clear' ),
		$save = $( '.save' ),
		currentWikitextKey = 'current-wikitext',
		savedStatesKey = 'parsoid-saved-states';

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
		var $savedStates = $( '.savedStates' );

		if ( hasLocalStorage ) {
			var count = 0;
			var savedStates = loadSavedStates();
			var $ul = $( '<ul>' );

			for ( var name in savedStates ) {
				$ul.append(
					$( '<li>' ).append(
						'[',
						$( '<a>' )
							.attr( 'href', '#' )
							.text( 'x' )
							// eslint-disable-next-line no-use-before-define
							.on( 'click', onDeleteClick ),
						'] ',
						$( '<a>' )
							.attr( 'href', '#' )
							.text( name )
							// eslint-disable-next-line no-use-before-define
							.on( 'click', onLoadClick ),
						' ',
						$( '<code>' ).text( savedStates[ name ].wikitext.substr( 0, 40 ) + '...' )
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

	( function () {
		if ( $domWrapper[ 0 ].attachShadow ) {
			var shadow = $domWrapper[ 0 ].attachShadow( { mode: 'open' } );
			var style = shadow.ownerDocument.createElement( 'style' );
			style.innerHTML = '@import "' + mwCSS + '";\n' +
				'.mw-body { margin: 0; border: 0; padding: 0; }\n' +
				':focus { outline: 0; }';
			shadow.appendChild( style );
			shadow.appendChild( $dom[ 0 ] );
		} else {
			$domWrapper.append( $dom );
		}
	}() );

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
			if ( $restBaseIds.prop( 'checked' ) ) {
				var doc = new DOMParser().parseFromString( html, 'text/html' );
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

	function persistCheckbox( key, $checkbox ) {
		var val = getObject( key );
		$checkbox.on( 'change', function () {
			var checked = $checkbox.prop( 'checked' );
			setObject( key, checked );
		} );
		if ( val !== null ) {
			$checkbox.prop( 'checked', val ).trigger( 'change' );
		}
	}

	persistCheckbox( 'restbase-ids', $restBaseIds );
	persistCheckbox( 'scrub-wikitext', $scrubWikitext );
	persistCheckbox( 'render-dom', $renderDom );
	persistCheckbox( 'format-html', $formatHtml );

	$restBaseIds.on( 'change', function () {
		lastWikitext = null;
		$wikitext.trigger( 'input' );
	} );

	$scrubWikitext.on( 'change', function () {
		lastHtml = null;
		$html.trigger( 'input' );
	} );

	$renderDom.on( 'change', function () {
		$boxes.toggleClass( 'showDom', $renderDom.prop( 'checked' ) );
		updateDom( $html.val() );
	} ).trigger( 'change' );

	$formatHtml.on( 'change', function () {
		updateHtml( $html.val() );
	} );

	$clear.on( 'click', function () {
		updateWikitext( '' );
		store();
	} );

	$save.on( 'click', function () {
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
		var currentWikitext = localStorage.getItem( currentWikitextKey );
		if ( currentWikitext !== null ) {
			updateWikitext( currentWikitext );
		}
		listSavedStates();
	} else {
		$( '.save, .saved' ).hide();
	}

} );

/*!
 * Grunt file
 */

/* eslint-env node, es6 */

module.exports = function ( grunt ) {
	grunt.loadNpmTasks( 'grunt-eslint' );
	grunt.loadNpmTasks( 'grunt-stylelint' );

	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),
		eslint: {
			options: {
				reportUnusedDisableDirectives: true,
				extensions: [ '.js', '.json' ],
				cache: true
			},
			dev: [
				'*.{js,json}'
			]
		},
		stylelint: {
			dev: [
				'*.css'
			]
		},
		watch: {
			files: [
				'.{eslint.json}',
				'<%= eslint.dev %>'
			],
			tasks: '_test'
		}
	} );

	grunt.registerTask( 'lint', [ 'eslint', 'stylelint' ] );
	grunt.registerTask( 'default', 'lint' );
};

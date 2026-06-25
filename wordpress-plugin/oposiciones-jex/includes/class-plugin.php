<?php
/**
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

require_once OJEX_PLUGIN_DIR . 'includes/class-database.php';
require_once OJEX_PLUGIN_DIR . 'includes/class-import-parser.php';
require_once OJEX_PLUGIN_DIR . 'includes/class-import-backup.php';
require_once OJEX_PLUGIN_DIR . 'includes/class-exam-utils.php';
require_once OJEX_PLUGIN_DIR . 'includes/repositories/class-materia-repository.php';
require_once OJEX_PLUGIN_DIR . 'includes/repositories/class-banco-repository.php';
require_once OJEX_PLUGIN_DIR . 'includes/repositories/class-pregunta-repository.php';
require_once OJEX_PLUGIN_DIR . 'includes/repositories/class-progress-repository.php';
require_once OJEX_PLUGIN_DIR . 'includes/class-rest-api.php';
require_once OJEX_PLUGIN_DIR . 'admin/class-admin.php';
require_once OJEX_PLUGIN_DIR . 'public/class-public.php';

final class OJEX_Plugin {

	private static ?self $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'init', array( $this, 'load_textdomain' ) );
		new OJEX_Admin();
		new OJEX_Public();
		new OJEX_Rest_Api();
	}

	public function load_textdomain(): void {
		load_plugin_textdomain(
			'oposiciones-jex',
			false,
			dirname( plugin_basename( OJEX_PLUGIN_FILE ) ) . '/languages'
		);
	}
}

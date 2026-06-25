<?php
/**
 * Plugin Name:       Oposiciones JEX
 * Plugin URI:        https://github.com/vivirdelseo/oposiciones-jex
 * Description:       Tests de oposición jurídica JEX — bancos, simulacros, repaso y estadísticas.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            Oposiciones JEX
 * Text Domain:       oposiciones-jex
 * Domain Path:       /languages
 *
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

define( 'OJEX_VERSION', '1.0.0' );
define( 'OJEX_PLUGIN_FILE', __FILE__ );
define( 'OJEX_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'OJEX_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once OJEX_PLUGIN_DIR . 'includes/class-activator.php';
require_once OJEX_PLUGIN_DIR . 'includes/class-deactivator.php';
require_once OJEX_PLUGIN_DIR . 'includes/class-plugin.php';

register_activation_hook( __FILE__, array( 'OJEX_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'OJEX_Deactivator', 'deactivate' ) );

OJEX_Plugin::instance();

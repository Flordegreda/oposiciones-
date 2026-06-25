<?php
/**
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Public {

	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ) );
		add_shortcode( 'ojex_practicar', array( $this, 'shortcode_practicar' ) );
		add_shortcode( 'ojex_test', array( $this, 'shortcode_test' ) );
		add_shortcode( 'ojex_simulacro', array( $this, 'shortcode_simulacro' ) );
		add_shortcode( 'ojex_estadisticas', array( $this, 'shortcode_estadisticas' ) );
		add_shortcode( 'ojex_repaso', array( $this, 'shortcode_repaso' ) );
	}

	public function enqueue(): void {
		if ( ! $this->should_enqueue() ) {
			return;
		}
		wp_enqueue_style(
			'ojex-public',
			OJEX_PLUGIN_URL . 'assets/css/public.css',
			array(),
			OJEX_VERSION
		);
		wp_enqueue_script(
			'ojex-app',
			OJEX_PLUGIN_URL . 'assets/js/ojex-app.js',
			array(),
			OJEX_VERSION,
			true
		);
		wp_localize_script(
			'ojex-app',
			'OJEX',
			array(
				'restUrl' => esc_url_raw( rest_url( 'ojex/v1/' ) ),
				'nonce'   => wp_create_nonce( 'wp_rest' ),
				'userId'  => get_current_user_id(),
			)
		);
	}

	private function should_enqueue(): bool {
		if ( is_admin() ) {
			return false;
		}
		global $post;
		if ( ! $post instanceof WP_Post ) {
			return false;
		}
		$tags = array( 'ojex_practicar', 'ojex_test', 'ojex_simulacro', 'ojex_estadisticas', 'ojex_repaso' );
		foreach ( $tags as $tag ) {
			if ( has_shortcode( $post->post_content, $tag ) ) {
				return true;
			}
		}
		return false;
	}

	public function shortcode_practicar(): string {
		$sections = OJEX_Banco_Repository::for_practicar();
		ob_start();
		include OJEX_PLUGIN_DIR . 'public/views/practicar.php';
		return (string) ob_get_clean();
	}

	public function shortcode_test( array $atts ): string {
		$atts = shortcode_atts( array( 'banco_id' => '' ), $atts, 'ojex_test' );
		$banco_id = sanitize_text_field( $atts['banco_id'] );
		if ( ! $banco_id && isset( $_GET['banco'] ) ) {
			$banco_id = sanitize_text_field( wp_unslash( $_GET['banco'] ) );
		}
		ob_start();
		include OJEX_PLUGIN_DIR . 'public/views/test.php';
		return (string) ob_get_clean();
	}

	public function shortcode_simulacro(): string {
		$sections = OJEX_Banco_Repository::for_practicar();
		$materias = array_map(
			static fn( $s ) => array( 'id' => $s['id'], 'nombre' => $s['nombre'] ),
			$sections
		);
		$pool = OJEX_Banco_Repository::simulacro_pool();
		ob_start();
		include OJEX_PLUGIN_DIR . 'public/views/simulacro.php';
		return (string) ob_get_clean();
	}

	public function shortcode_estadisticas(): string {
		$resultados = OJEX_Progress_Repository::list_resultados( 30 );
		ob_start();
		include OJEX_PLUGIN_DIR . 'public/views/estadisticas.php';
		return (string) ob_get_clean();
	}

	public function shortcode_repaso(): string {
		ob_start();
		include OJEX_PLUGIN_DIR . 'public/views/repaso.php';
		return (string) ob_get_clean();
	}
}

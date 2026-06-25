<?php
/**
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Admin {

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
		add_action( 'admin_post_ojex_import_text', array( $this, 'handle_import_text' ) );
		add_action( 'admin_post_ojex_import_backup', array( $this, 'handle_import_backup' ) );
		add_action( 'admin_post_ojex_create_materia', array( $this, 'handle_create_materia' ) );
	}

	public function register_menu(): void {
		add_menu_page(
			__( 'Oposiciones JEX', 'oposiciones-jex' ),
			__( 'Oposiciones JEX', 'oposiciones-jex' ),
			'manage_options',
			'ojex',
			array( $this, 'render_dashboard' ),
			'dashicons-welcome-learn-more',
			58
		);

		add_submenu_page(
			'ojex',
			__( 'Material', 'oposiciones-jex' ),
			__( 'Material', 'oposiciones-jex' ),
			'manage_options',
			'ojex',
			array( $this, 'render_dashboard' )
		);

		add_submenu_page(
			'ojex',
			__( 'Importar texto', 'oposiciones-jex' ),
			__( 'Importar texto', 'oposiciones-jex' ),
			'manage_options',
			'ojex-import-text',
			array( $this, 'render_import_text' )
		);

		add_submenu_page(
			'ojex',
			__( 'Copia de seguridad', 'oposiciones-jex' ),
			__( 'Copia de seguridad', 'oposiciones-jex' ),
			'manage_options',
			'ojex-backup',
			array( $this, 'render_backup' )
		);
	}

	public function enqueue( string $hook ): void {
		if ( ! str_starts_with( $hook, 'toplevel_page_ojex' ) && ! str_contains( $hook, 'ojex' ) ) {
			return;
		}
		wp_enqueue_style(
			'ojex-admin',
			OJEX_PLUGIN_URL . 'assets/css/admin.css',
			array(),
			OJEX_VERSION
		);
	}

	public function render_dashboard(): void {
		$sections = OJEX_Banco_Repository::for_practicar();
		$materias = OJEX_Materia_Repository::all_with_counts();
		include OJEX_PLUGIN_DIR . 'admin/views/dashboard.php';
	}

	public function render_import_text(): void {
		include OJEX_PLUGIN_DIR . 'admin/views/import-text.php';
	}

	public function render_backup(): void {
		include OJEX_PLUGIN_DIR . 'admin/views/backup.php';
	}

	public function handle_import_text(): void {
		check_admin_referer( 'ojex_import_text' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Sin permiso', 'oposiciones-jex' ) );
		}

		$materia_id = sanitize_text_field( wp_unslash( $_POST['materia_id'] ?? '' ) );
		$banco_nombre = sanitize_text_field( wp_unslash( $_POST['banco_nombre'] ?? '' ) );
		$tipo = sanitize_text_field( wp_unslash( $_POST['tipo'] ?? 'teorico' ) );
		$texto = wp_unslash( $_POST['texto'] ?? '' );

		if ( ! $materia_id || ! $banco_nombre || ! $texto ) {
			wp_safe_redirect( add_query_arg( 'ojex_err', 'missing', admin_url( 'admin.php?page=ojex-import-text' ) ) );
			exit;
		}

		$preguntas = OJEX_Import_Parser::parse( $texto );
		if ( ! $preguntas ) {
			wp_safe_redirect( add_query_arg( 'ojex_err', 'parse', admin_url( 'admin.php?page=ojex-import-text' ) ) );
			exit;
		}

		$banco_id = OJEX_Banco_Repository::create(
			array(
				'materia_id' => $materia_id,
				'nombre'     => $banco_nombre,
				'tipo'       => $tipo,
			)
		);
		$n = OJEX_Pregunta_Repository::insert_batch( $banco_id, $preguntas );

		wp_safe_redirect(
			add_query_arg(
				array(
					'ojex_ok' => 1,
					'n'       => $n,
				),
				admin_url( 'admin.php?page=ojex-import-text' )
			)
		);
		exit;
	}

	public function handle_import_backup(): void {
		check_admin_referer( 'ojex_import_backup' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Sin permiso', 'oposiciones-jex' ) );
		}

		$mode = sanitize_text_field( wp_unslash( $_POST['mode'] ?? 'append' ) );
		$raw  = wp_unslash( $_POST['backup_json'] ?? '' );
		$body = json_decode( $raw, true );
		if ( ! is_array( $body ) ) {
			wp_safe_redirect( add_query_arg( 'ojex_err', 'json', admin_url( 'admin.php?page=ojex-backup' ) ) );
			exit;
		}

		try {
			$stats = OJEX_Import_Backup::import( $body, $mode );
		} catch ( Exception $e ) {
			wp_safe_redirect(
				add_query_arg( 'ojex_err', rawurlencode( $e->getMessage() ), admin_url( 'admin.php?page=ojex-backup' ) )
			);
			exit;
		}

		wp_safe_redirect(
			add_query_arg(
				array(
					'ojex_ok' => 1,
					'stats'   => rawurlencode( wp_json_encode( $stats ) ),
				),
				admin_url( 'admin.php?page=ojex-backup' )
			)
		);
		exit;
	}

	public function handle_export_backup(): void {
		check_admin_referer( 'ojex_export_backup' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Sin permiso', 'oposiciones-jex' ) );
		}

		$data = OJEX_Import_Backup::export_all();
		$filename = 'oposiciones-jex-backup-' . gmdate( 'Y-m-d' ) . '.json';

		header( 'Content-Type: application/json; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
		echo wp_json_encode( $data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE );
		exit;
	}

	public function handle_create_materia(): void {
		check_admin_referer( 'ojex_create_materia' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Sin permiso', 'oposiciones-jex' ) );
		}
		$nombre = sanitize_text_field( wp_unslash( $_POST['materia_nombre'] ?? '' ) );
		if ( $nombre ) {
			OJEX_Materia_Repository::create( $nombre );
		}
		wp_safe_redirect( admin_url( 'admin.php?page=ojex&ojex_ok=1' ) );
		exit;
	}
}

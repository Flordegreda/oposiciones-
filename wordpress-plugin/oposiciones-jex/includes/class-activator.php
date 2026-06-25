<?php
/**
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Activator {

	public static function activate(): void {
		self::create_tables();
		self::maybe_create_pages();
		flush_rewrite_rules();
	}

	private static function create_tables(): void {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset = $wpdb->get_charset_collate();
		$m       = $wpdb->prefix . 'ojex_materias';
		$b       = $wpdb->prefix . 'ojex_bancos';
		$p       = $wpdb->prefix . 'ojex_preguntas';
		$i       = $wpdb->prefix . 'ojex_intentos';
		$r       = $wpdb->prefix . 'ojex_resultados';
		$f       = $wpdb->prefix . 'ojex_favoritos';

		dbDelta(
			"CREATE TABLE $m (
				id char(36) NOT NULL,
				nombre varchar(255) NOT NULL,
				created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY  (id),
				KEY nombre (nombre)
			) $charset;"
		);

		dbDelta(
			"CREATE TABLE $b (
				id char(36) NOT NULL,
				materia_id char(36) NOT NULL,
				nombre varchar(255) NOT NULL,
				tipo varchar(20) NOT NULL DEFAULT 'teorico',
				active tinyint(1) NOT NULL DEFAULT 1,
				linea_id varchar(64) DEFAULT NULL,
				created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY  (id),
				KEY materia_id (materia_id),
				KEY active (active)
			) $charset;"
		);

		dbDelta(
			"CREATE TABLE $p (
				id char(36) NOT NULL,
				banco_id char(36) NOT NULL,
				enunciado longtext NOT NULL,
				opciones longtext NOT NULL,
				respuesta smallint NOT NULL DEFAULT 0,
				explicacion longtext NULL,
				orden int NOT NULL DEFAULT 0,
				created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY  (id),
				KEY banco_id (banco_id),
				KEY banco_orden (banco_id, orden)
			) $charset;"
		);

		dbDelta(
			"CREATE TABLE $i (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				user_id bigint(20) unsigned NOT NULL DEFAULT 0,
				banco_id char(36) NOT NULL,
				pregunta_id char(36) NOT NULL,
				correcta tinyint(1) NOT NULL,
				dudosa tinyint(1) NOT NULL DEFAULT 0,
				created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY  (id),
				KEY user_pregunta (user_id, pregunta_id),
				KEY created_at (created_at)
			) $charset;"
		);

		dbDelta(
			"CREATE TABLE $r (
				id char(36) NOT NULL,
				user_id bigint(20) unsigned NOT NULL DEFAULT 0,
				tipo varchar(20) NOT NULL,
				titulo varchar(255) NOT NULL,
				banco_id char(36) DEFAULT NULL,
				total int NOT NULL,
				respondidas int NOT NULL,
				correctas int NOT NULL,
				incorrectas int NOT NULL,
				sin_responder int NOT NULL,
				nota decimal(8,2) NOT NULL,
				porcentaje int NOT NULL,
				tiempo_segundos int DEFAULT NULL,
				exam_mode tinyint(1) NOT NULL DEFAULT 0,
				detalle longtext NOT NULL,
				created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY  (id),
				KEY user_created (user_id, created_at)
			) $charset;"
		);

		dbDelta(
			"CREATE TABLE $f (
				user_id bigint(20) unsigned NOT NULL DEFAULT 0,
				banco_id char(36) NOT NULL,
				pregunta_id char(36) NOT NULL,
				created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY  (user_id, banco_id, pregunta_id)
			) $charset;"
		);

		update_option( 'ojex_db_version', OJEX_VERSION );
	}

	private static function maybe_create_pages(): void {
		$pages = array(
			'practicar'    => array(
				'title'   => 'Practicar tests',
				'content' => '[ojex_practicar]',
			),
			'test'         => array(
				'title'   => 'Test',
				'content' => '[ojex_test]',
			),
			'simulacro'    => array(
				'title'   => 'Simulacro',
				'content' => '[ojex_simulacro]',
			),
			'estadisticas' => array(
				'title'   => 'Estadísticas',
				'content' => '[ojex_estadisticas]',
			),
			'repaso'       => array(
				'title'   => 'Repaso de fallos',
				'content' => '[ojex_repaso]',
			),
		);

		$created = get_option( 'ojex_page_ids', array() );
		if ( ! is_array( $created ) ) {
			$created = array();
		}

		foreach ( $pages as $slug => $def ) {
			if ( ! empty( $created[ $slug ] ) && get_post( $created[ $slug ] ) ) {
				continue;
			}
			$existing = get_page_by_path( $slug );
			if ( $existing ) {
				$created[ $slug ] = $existing->ID;
				continue;
			}
			$id = wp_insert_post(
				array(
					'post_title'   => $def['title'],
					'post_name'    => $slug,
					'post_content' => $def['content'],
					'post_status'  => 'publish',
					'post_type'    => 'page',
				)
			);
			if ( ! is_wp_error( $id ) ) {
				$created[ $slug ] = $id;
			}
		}

		update_option( 'ojex_page_ids', $created );
	}
}

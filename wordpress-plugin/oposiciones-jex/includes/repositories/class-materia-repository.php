<?php
/**
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Materia_Repository {

	public static function all_with_counts(): array {
		global $wpdb;
		$m = OJEX_Database::table( 'materias' );
		$b = OJEX_Database::table( 'bancos' );
		$p = OJEX_Database::table( 'preguntas' );

		$sql = "
			SELECT m.id, m.nombre,
				COUNT(DISTINCT b.id) AS bancos,
				COUNT(p.id) AS preguntas
			FROM $m m
			LEFT JOIN $b b ON b.materia_id = m.id AND b.active = 1
			LEFT JOIN $p p ON p.banco_id = b.id
			GROUP BY m.id, m.nombre
			ORDER BY m.nombre ASC
		";

		return $wpdb->get_results( $sql, ARRAY_A ) ?: array();
	}

	public static function find( string $id ): ?array {
		global $wpdb;
		$m = OJEX_Database::table( 'materias' );
		$row = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM $m WHERE id = %s", $id ),
			ARRAY_A
		);
		return $row ?: null;
	}

	public static function create( string $nombre, ?string $id = null ): string {
		global $wpdb;
		$m   = OJEX_Database::table( 'materias' );
		$id  = $id ?: OJEX_Database::uuid();
		$wpdb->insert(
			$m,
			array(
				'id'     => $id,
				'nombre' => sanitize_text_field( $nombre ),
			),
			array( '%s', '%s' )
		);
		return $id;
	}

	public static function update( string $id, string $nombre ): bool {
		global $wpdb;
		$m = OJEX_Database::table( 'materias' );
		return (bool) $wpdb->update(
			$m,
			array( 'nombre' => sanitize_text_field( $nombre ) ),
			array( 'id' => $id ),
			array( '%s' ),
			array( '%s' )
		);
	}

	public static function delete( string $id ): bool {
		global $wpdb;
		$b = OJEX_Database::table( 'bancos' );
		$m = OJEX_Database::table( 'materias' );
		$wpdb->delete( $b, array( 'materia_id' => $id ), array( '%s' ) );
		return (bool) $wpdb->delete( $m, array( 'id' => $id ), array( '%s' ) );
	}
}

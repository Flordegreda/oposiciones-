<?php
/**
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Banco_Repository {

	public static function for_practicar(): array {
		global $wpdb;
		$m = OJEX_Database::table( 'materias' );
		$b = OJEX_Database::table( 'bancos' );
		$p = OJEX_Database::table( 'preguntas' );

		$sql = "
			SELECT m.id AS materia_id, m.nombre AS materia_nombre,
				b.id, b.nombre, b.tipo,
				COUNT(p.id) AS num_preguntas
			FROM $m m
			INNER JOIN $b b ON b.materia_id = m.id AND b.active = 1
			LEFT JOIN $p p ON p.banco_id = b.id
			GROUP BY m.id, m.nombre, b.id, b.nombre, b.tipo
			HAVING num_preguntas > 0
			ORDER BY m.nombre ASC, b.nombre ASC
		";

		$rows = $wpdb->get_results( $sql, ARRAY_A ) ?: array();
		$sections = array();

		foreach ( $rows as $row ) {
			$mid = $row['materia_id'];
			if ( ! isset( $sections[ $mid ] ) ) {
				$sections[ $mid ] = array(
					'id'     => $mid,
					'nombre' => $row['materia_nombre'],
					'bancos' => array(),
				);
			}
			$sections[ $mid ]['bancos'][] = array(
				'id'           => $row['id'],
				'nombre'       => $row['nombre'],
				'tipo'         => $row['tipo'],
				'numPreguntas' => (int) $row['num_preguntas'],
			);
		}

		return array_values( $sections );
	}

	public static function find( string $id ): ?array {
		global $wpdb;
		$b = OJEX_Database::table( 'bancos' );
		$row = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM $b WHERE id = %s", $id ),
			ARRAY_A
		);
		return $row ?: null;
	}

	public static function create( array $data ): string {
		global $wpdb;
		$b  = OJEX_Database::table( 'bancos' );
		$id = ! empty( $data['id'] ) ? $data['id'] : OJEX_Database::uuid();
		$wpdb->insert(
			$b,
			array(
				'id'         => $id,
				'materia_id' => $data['materia_id'],
				'nombre'     => sanitize_text_field( $data['nombre'] ),
				'tipo'       => in_array( $data['tipo'] ?? '', array( 'teorico', 'practico' ), true )
					? $data['tipo']
					: 'teorico',
				'active'     => isset( $data['active'] ) ? (int) (bool) $data['active'] : 1,
				'linea_id'   => $data['linea_id'] ?? null,
			),
			array( '%s', '%s', '%s', '%s', '%d', '%s' )
		);
		return $id;
	}

	public static function delete( string $id ): bool {
		global $wpdb;
		$p = OJEX_Database::table( 'preguntas' );
		$b = OJEX_Database::table( 'bancos' );
		$wpdb->delete( $p, array( 'banco_id' => $id ), array( '%s' ) );
		return (bool) $wpdb->delete( $b, array( 'id' => $id ), array( '%s' ) );
	}

	public static function simulacro_pool( ?string $materia_id = null ): array {
		global $wpdb;
		$b = OJEX_Database::table( 'bancos' );
		$p = OJEX_Database::table( 'preguntas' );

		$where = 'b.active = 1';
		$args  = array();
		if ( $materia_id ) {
			$where  .= ' AND b.materia_id = %s';
			$args[] = $materia_id;
		}

		$sql = "
			SELECT b.id, b.tipo, b.materia_id, COUNT(p.id) AS n
			FROM $b b
			INNER JOIN $p p ON p.banco_id = b.id
			WHERE $where
			GROUP BY b.id, b.tipo, b.materia_id
		";

		$rows = $args
			? $wpdb->get_results( $wpdb->prepare( $sql, ...$args ), ARRAY_A )
			: $wpdb->get_results( $sql, ARRAY_A );

		$pool = array( 'teorico' => 0, 'practico' => 0 );
		foreach ( $rows ?: array() as $row ) {
			$key = ( 'practico' === $row['tipo'] ) ? 'practico' : 'teorico';
			$pool[ $key ] += (int) $row['n'];
		}
		return $pool;
	}
}

<?php
/**
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Pregunta_Repository {

	public static function for_banco_public( string $banco_id ): array {
		global $wpdb;
		$p = OJEX_Database::table( 'preguntas' );
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, banco_id, enunciado, opciones, orden FROM $p WHERE banco_id = %s ORDER BY orden ASC, created_at ASC",
				$banco_id
			),
			ARRAY_A
		) ?: array();

		return array_map(
			static function ( array $row ): array {
				$row['opciones'] = json_decode( $row['opciones'], true ) ?: array();
				return $row;
			},
			$rows
		);
	}

	public static function for_banco_admin( string $banco_id ): array {
		global $wpdb;
		$p = OJEX_Database::table( 'preguntas' );
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM $p WHERE banco_id = %s ORDER BY orden ASC, created_at ASC",
				$banco_id
			),
			ARRAY_A
		) ?: array();

		return array_map(
			static function ( array $row ): array {
				$row['opciones'] = json_decode( $row['opciones'], true ) ?: array();
				return $row;
			},
			$rows
		);
	}

	public static function find( string $id ): ?array {
		global $wpdb;
		$p = OJEX_Database::table( 'preguntas' );
		$row = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM $p WHERE id = %s", $id ),
			ARRAY_A
		);
		if ( ! $row ) {
			return null;
		}
		$row['opciones'] = json_decode( $row['opciones'], true ) ?: array();
		return $row;
	}

	public static function find_many( array $ids ): array {
		if ( ! $ids ) {
			return array();
		}
		global $wpdb;
		$p       = OJEX_Database::table( 'preguntas' );
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%s' ) );
		$rows    = $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM $p WHERE id IN ($placeholders)", ...$ids ),
			ARRAY_A
		) ?: array();
		$by_id = array();
		foreach ( $rows as $row ) {
			$row['opciones'] = json_decode( $row['opciones'], true ) ?: array();
			$by_id[ $row['id'] ] = $row;
		}
		return $by_id;
	}

	public static function for_simulacro( array $banco_ids, ?string $materia_id = null ): array {
		if ( ! $banco_ids ) {
			return array();
		}
		global $wpdb;
		$b = OJEX_Database::table( 'bancos' );
		$p = OJEX_Database::table( 'preguntas' );
		$m = OJEX_Database::table( 'materias' );

		$placeholders = implode( ',', array_fill( 0, count( $banco_ids ), '%s' ) );
		$sql          = "
			SELECT p.id, p.banco_id, p.enunciado, p.opciones, p.respuesta, p.explicacion,
				b.tipo, b.materia_id, mat.nombre AS materia_nombre
			FROM $p p
			INNER JOIN $b b ON b.id = p.banco_id
			INNER JOIN $m mat ON mat.id = b.materia_id
			WHERE p.banco_id IN ($placeholders) AND b.active = 1
		";
		$args = $banco_ids;
		if ( $materia_id ) {
			$sql   .= ' AND b.materia_id = %s';
			$args[] = $materia_id;
		}

		$rows = $wpdb->get_results( $wpdb->prepare( $sql, ...$args ), ARRAY_A ) ?: array();
		return array_map(
			static function ( array $row ): array {
				return array(
					'id'            => $row['id'],
					'bancoId'       => $row['banco_id'],
					'tipo'          => ( 'practico' === $row['tipo'] ) ? 'practico' : 'teorico',
					'materiaId'     => $row['materia_id'],
					'materiaNombre' => $row['materia_nombre'],
					'enunciado'     => $row['enunciado'],
					'opciones'      => json_decode( $row['opciones'], true ) ?: array(),
					'respuesta'     => (int) $row['respuesta'],
					'explicacion'   => $row['explicacion'] ?: null,
				);
			},
			$rows
		);
	}

	public static function insert_batch( string $banco_id, array $preguntas, bool $replace = false ): int {
		global $wpdb;
		$p = OJEX_Database::table( 'preguntas' );
		if ( $replace ) {
			$wpdb->delete( $p, array( 'banco_id' => $banco_id ), array( '%s' ) );
		}
		$n = 0;
		foreach ( $preguntas as $i => $q ) {
			$wpdb->insert(
				$p,
				array(
					'id'          => ! empty( $q['id'] ) ? $q['id'] : OJEX_Database::uuid(),
					'banco_id'    => $banco_id,
					'enunciado'   => wp_kses_post( $q['enunciado'] ),
					'opciones'    => wp_json_encode( $q['opciones'] ?? array() ),
					'respuesta'   => (int) ( $q['respuesta'] ?? 0 ),
					'explicacion' => isset( $q['explicacion'] ) ? wp_kses_post( (string) $q['explicacion'] ) : null,
					'orden'       => isset( $q['orden'] ) ? (int) $q['orden'] : $i,
				),
				array( '%s', '%s', '%s', '%s', '%d', '%s', '%d' )
			);
			++$n;
		}
		return $n;
	}

	public static function strip_public( array $pregunta ): array {
		unset( $pregunta['respuesta'], $pregunta['explicacion'] );
		return $pregunta;
	}
}

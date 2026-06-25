<?php
/**
 * JSON backup import (compatible with Next.js export format).
 *
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Import_Backup {

	public static function import( array $body, string $mode = 'append' ): array {
		$materias = $body['materias'] ?? array();
		if ( ! is_array( $materias ) || ! $materias ) {
			throw new InvalidArgumentException( 'JSON inválido: falta array materias' );
		}

		$stats = array(
			'materias'  => 0,
			'bancos'    => 0,
			'preguntas' => 0,
		);

		foreach ( $materias as $materia ) {
			$materia_id = self::resolve_materia( $materia );
			++$stats['materias'];
			foreach ( $materia['bancos'] ?? array() as $banco ) {
				$banco_id = self::resolve_banco( $banco, $materia_id, 'overwrite' === $mode );
				++$stats['bancos'];
				$preguntas = $banco['preguntas'] ?? array();
				if ( $preguntas ) {
					$stats['preguntas'] += OJEX_Pregunta_Repository::insert_batch(
						$banco_id,
						$preguntas,
						'overwrite' === $mode
					);
				}
			}
		}

		return $stats;
	}

	private static function resolve_materia( array $materia ): string {
		if ( ! empty( $materia['id'] ) ) {
			$found = OJEX_Materia_Repository::find( $materia['id'] );
			if ( $found ) {
				return $found['id'];
			}
		}
		global $wpdb;
		$m = OJEX_Database::table( 'materias' );
		$by_name = $wpdb->get_row(
			$wpdb->prepare( "SELECT id FROM $m WHERE nombre = %s LIMIT 1", trim( $materia['nombre'] ?? '' ) ),
			ARRAY_A
		);
		if ( $by_name ) {
			return $by_name['id'];
		}
		return OJEX_Materia_Repository::create(
			$materia['nombre'] ?? 'Sin nombre',
			$materia['id'] ?? null
		);
	}

	private static function resolve_banco( array $banco, string $materia_id, bool $overwrite ): string {
		global $wpdb;
		$b = OJEX_Database::table( 'bancos' );

		if ( ! empty( $banco['id'] ) ) {
			$found = OJEX_Banco_Repository::find( $banco['id'] );
			if ( $found ) {
				if ( $overwrite && ! empty( $banco['preguntas'] ) ) {
					OJEX_Pregunta_Repository::insert_batch( $found['id'], $banco['preguntas'], true );
				}
				return $found['id'];
			}
		}

		$existing = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT id FROM $b WHERE materia_id = %s AND nombre = %s LIMIT 1",
				$materia_id,
				trim( $banco['nombre'] ?? '' )
			),
			ARRAY_A
		);
		if ( $existing ) {
			if ( $overwrite && ! empty( $banco['preguntas'] ) ) {
				OJEX_Pregunta_Repository::insert_batch( $existing['id'], $banco['preguntas'], true );
			}
			return $existing['id'];
		}

		return OJEX_Banco_Repository::create(
			array(
				'id'         => $banco['id'] ?? null,
				'materia_id' => $materia_id,
				'nombre'     => $banco['nombre'] ?? 'Banco',
				'tipo'       => $banco['tipo'] ?? 'teorico',
				'active'     => $banco['active'] ?? true,
				'linea_id'   => $banco['linea_id'] ?? null,
			)
		);
	}

	public static function export_all(): array {
		global $wpdb;
		$m = OJEX_Database::table( 'materias' );
		$materias_rows = $wpdb->get_results( "SELECT * FROM $m ORDER BY nombre ASC", ARRAY_A ) ?: array();
		$out = array(
			'format'     => 'oposiciones-jex-backup',
			'exportedAt' => gmdate( 'c' ),
			'materias'   => array(),
		);

		foreach ( $materias_rows as $mat ) {
			$bancos = array();
			$b = OJEX_Database::table( 'bancos' );
			$banco_rows = $wpdb->get_results(
				$wpdb->prepare( "SELECT * FROM $b WHERE materia_id = %s ORDER BY nombre ASC", $mat['id'] ),
				ARRAY_A
			) ?: array();
			foreach ( $banco_rows as $banco ) {
				$preguntas = OJEX_Pregunta_Repository::for_banco_admin( $banco['id'] );
				$bancos[]  = array(
					'id'        => $banco['id'],
					'nombre'    => $banco['nombre'],
					'tipo'      => $banco['tipo'],
					'active'    => (bool) $banco['active'],
					'linea_id'  => $banco['linea_id'],
					'materia_id'=> $banco['materia_id'],
					'preguntas' => array_map(
						static function ( array $p ): array {
							return array(
								'enunciado'   => $p['enunciado'],
								'opciones'    => $p['opciones'],
								'respuesta'   => (int) $p['respuesta'],
								'explicacion' => $p['explicacion'],
								'orden'       => (int) $p['orden'],
							);
						},
						$preguntas
					),
				);
			}
			$out['materias'][] = array(
				'id'     => $mat['id'],
				'nombre' => $mat['nombre'],
				'bancos' => $bancos,
			);
		}

		return $out;
	}
}

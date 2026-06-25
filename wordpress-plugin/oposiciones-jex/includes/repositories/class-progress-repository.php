<?php
/**
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Progress_Repository {

	public static function record_intento( string $banco_id, string $pregunta_id, bool $correcta, bool $dudosa = false ): void {
		global $wpdb;
		$i = OJEX_Database::table( 'intentos' );
		$wpdb->insert(
			$i,
			array(
				'user_id'     => OJEX_Database::current_user_id(),
				'banco_id'    => $banco_id,
				'pregunta_id' => $pregunta_id,
				'correcta'    => $correcta ? 1 : 0,
				'dudosa'      => $dudosa ? 1 : 0,
			),
			array( '%d', '%s', '%s', '%d', '%d' )
		);
	}

	public static function pending_fallos(): array {
		global $wpdb;
		$i = OJEX_Database::table( 'intentos' );
		$uid = OJEX_Database::current_user_id();
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT pregunta_id, banco_id, correcta, created_at FROM $i WHERE user_id = %d ORDER BY created_at DESC LIMIT 5000",
				$uid
			),
			ARRAY_A
		) ?: array();

		$latest = array();
		foreach ( $rows as $row ) {
			if ( isset( $latest[ $row['pregunta_id'] ] ) ) {
				continue;
			}
			$latest[ $row['pregunta_id'] ] = $row;
		}

		$fallos = array();
		foreach ( $latest as $row ) {
			if ( ! (int) $row['correcta'] ) {
				$fallos[] = array(
					'preguntaId' => $row['pregunta_id'],
					'bancoId'    => $row['banco_id'],
				);
			}
		}
		return $fallos;
	}

	public static function fallo_preguntas_public(): array {
		$fallos = self::pending_fallos();
		if ( ! $fallos ) {
			return array();
		}
		$ids = array_column( $fallos, 'preguntaId' );
		$by_id = OJEX_Pregunta_Repository::find_many( $ids );
		$out = array();
		foreach ( $fallos as $f ) {
			$p = $by_id[ $f['preguntaId'] ] ?? null;
			if ( ! $p ) {
				continue;
			}
			$out[] = array(
				'id'        => $p['id'],
				'bancoId'   => $p['banco_id'],
				'enunciado' => $p['enunciado'],
				'opciones'  => $p['opciones'],
			);
		}
		return $out;
	}

	public static function save_resultado( array $input ): ?string {
		global $wpdb;
		$r  = OJEX_Database::table( 'resultados' );
		$id = OJEX_Database::uuid();
		$ok = $wpdb->insert(
			$r,
			array(
				'id'              => $id,
				'user_id'         => OJEX_Database::current_user_id(),
				'tipo'            => sanitize_text_field( $input['tipo'] ?? 'banco' ),
				'titulo'          => sanitize_text_field( $input['titulo'] ?? '' ),
				'banco_id'        => $input['bancoId'] ?? null,
				'total'           => (int) ( $input['total'] ?? 0 ),
				'respondidas'     => (int) ( $input['respondidas'] ?? 0 ),
				'correctas'       => (int) ( $input['correctas'] ?? 0 ),
				'incorrectas'     => (int) ( $input['incorrectas'] ?? 0 ),
				'sin_responder'   => (int) ( $input['sinResponder'] ?? 0 ),
				'nota'            => (float) ( $input['nota'] ?? 0 ),
				'porcentaje'      => (int) ( $input['porcentaje'] ?? 0 ),
				'tiempo_segundos' => isset( $input['tiempoSegundos'] ) ? (int) $input['tiempoSegundos'] : null,
				'exam_mode'       => ! empty( $input['examMode'] ) ? 1 : 0,
				'detalle'         => wp_json_encode( $input['detalle'] ?? array() ),
			),
			array( '%s', '%d', '%s', '%s', '%s', '%d', '%d', '%d', '%d', '%d', '%f', '%d', '%d', '%d', '%s' )
		);
		return $ok ? $id : null;
	}

	public static function list_resultados( int $limit = 30 ): array {
		global $wpdb;
		$r   = OJEX_Database::table( 'resultados' );
		$uid = OJEX_Database::current_user_id();
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM $r WHERE user_id = %d ORDER BY created_at DESC LIMIT %d",
				$uid,
				$limit
			),
			ARRAY_A
		) ?: array();
		foreach ( $rows as &$row ) {
			$row['detalle'] = json_decode( $row['detalle'], true ) ?: array();
		}
		return $rows;
	}

	public static function toggle_favorito( string $banco_id, string $pregunta_id ): bool {
		global $wpdb;
		$f   = OJEX_Database::table( 'favoritos' );
		$uid = OJEX_Database::current_user_id();
		$exists = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT 1 FROM $f WHERE user_id = %d AND banco_id = %s AND pregunta_id = %s",
				$uid,
				$banco_id,
				$pregunta_id
			)
		);
		if ( $exists ) {
			$wpdb->delete(
				$f,
				array(
					'user_id'     => $uid,
					'banco_id'    => $banco_id,
					'pregunta_id' => $pregunta_id,
				),
				array( '%d', '%s', '%s' )
			);
			return false;
		}
		$wpdb->insert(
			$f,
			array(
				'user_id'     => $uid,
				'banco_id'    => $banco_id,
				'pregunta_id' => $pregunta_id,
			),
			array( '%d', '%s', '%s' )
		);
		return true;
	}

	public static function list_favoritos(): array {
		global $wpdb;
		$f   = OJEX_Database::table( 'favoritos' );
		$uid = OJEX_Database::current_user_id();
		return $wpdb->get_results(
			$wpdb->prepare( "SELECT banco_id, pregunta_id FROM $f WHERE user_id = %d", $uid ),
			ARRAY_A
		) ?: array();
	}
}

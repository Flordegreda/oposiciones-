<?php
/**
 * Port of exam-utils.ts (simulacro presets and scoring).
 *
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Exam_Utils {

	public const PRESETS = array(
		'oficial' => array(
			'label'    => 'Simulacro oficial',
			'teorico'  => 88,
			'practico' => 22,
			'minutes'  => 120,
		),
		'mini'    => array(
			'label'    => 'Mini simulacro',
			'teorico'  => 16,
			'practico' => 4,
			'minutes'  => 25,
		),
	);

	public static function shuffle( array $items ): array {
		$arr = $items;
		shuffle( $arr );
		return $arr;
	}

	public static function pick_simulacro( array $all, string $preset_id ): array {
		$preset = self::PRESETS[ $preset_id ] ?? self::PRESETS['oficial'];
		$teoricas  = self::shuffle(
			array_values(
				array_filter(
					$all,
					static fn( $p ) => ( $p['tipo'] ?? 'teorico' ) !== 'practico'
				)
			)
		);
		$practicas = self::shuffle(
			array_values(
				array_filter(
					$all,
					static fn( $p ) => ( $p['tipo'] ?? 'teorico' ) === 'practico'
				)
			)
		);

		$teorico_used  = min( $preset['teorico'], count( $teoricas ) );
		$practico_used = min( $preset['practico'], count( $practicas ) );
		$list          = self::shuffle(
			array_merge(
				array_slice( $teoricas, 0, $teorico_used ),
				array_slice( $practicas, 0, $practico_used )
			)
		);

		return array(
			'list'            => $list,
			'teoricoUsed'     => $teorico_used,
			'practicoUsed'    => $practico_used,
			'teoricoTarget'   => $preset['teorico'],
			'practicoTarget'  => $preset['practico'],
		);
	}

	public static function timer_seconds( string $preset_id, int $total_picked ): int {
		$preset       = self::PRESETS[ $preset_id ] ?? self::PRESETS['oficial'];
		$target_total = $preset['teorico'] + $preset['practico'];
		$base         = $preset['minutes'] * 60;
		if ( $total_picked >= $target_total ) {
			return $base;
		}
		return max( 120, (int) ceil( $base * ( $total_picked / max( 1, $target_total ) ) ) );
	}

	public static function exam_score( int $ok, int $fail ): string {
		return number_format( $ok - ( $fail * 0.25 ), 2, '.', '' );
	}

	public static function strip_answers( array $list ): array {
		return array_map(
			static function ( array $p ): array {
				unset( $p['respuesta'], $p['explicacion'] );
				return $p;
			},
			$list
		);
	}

	public static function grade_answers( array $items ): array {
		$ids = array_column( $items, 'id' );
		$by_id = OJEX_Pregunta_Repository::find_many( $ids );
		$results = array();
		foreach ( $items as $item ) {
			$row = $by_id[ $item['id'] ] ?? null;
			if ( ! $row ) {
				continue;
			}
			$selected = isset( $item['selected'] ) && is_numeric( $item['selected'] )
				? (int) $item['selected']
				: null;
			$correct  = null !== $selected && $selected === (int) $row['respuesta'];
			$results[] = array(
				'id'          => $row['id'],
				'bancoId'     => $row['banco_id'],
				'respuesta'   => (int) $row['respuesta'],
				'explicacion' => $row['explicacion'] ?: null,
				'correct'     => $correct,
			);
		}
		return $results;
	}
}

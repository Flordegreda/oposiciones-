<?php
/**
 * Text import parser (port of parse-import-text.ts).
 *
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Import_Parser {

	public static function parse( string $texto ): array {
		$texto = self::normalize( $texto );
		$parsed = self::parse_numbered_blocks( $texto );
		if ( $parsed ) {
			return $parsed;
		}
		return self::parse_line_blocks( $texto );
	}

	private static function normalize( string $texto ): string {
		$texto = str_replace( array( "\r\n", "\r" ), "\n", $texto );
		$texto = str_replace( "\u{00a0}", ' ', $texto );
		return trim( str_replace( "\t", ' ', $texto ) );
	}

	private static function is_intro_line( string $line ): bool {
		$l = strtolower( $line );
		return str_contains( $l, 'aquí tienes' )
			|| str_contains( $l, 'aqui tienes' )
			|| str_contains( $l, 'archivo unificado' )
			|| str_starts_with( $l, '—' )
			|| str_starts_with( $l, '--' );
	}

	private static function parse_numbered_blocks( string $texto ): array {
		$parts = preg_split( '/\n(?=\d+[\.\)]\s+|P:\s)/i', $texto );
		$preguntas = array();
		foreach ( $parts ?: array() as $block ) {
			$block = trim( $block );
			if ( ! $block ) {
				continue;
			}
			$lines = array_values(
				array_filter(
					array_map( 'trim', explode( "\n", $block ) ),
					static fn( $l ) => '' !== $l && ! self::is_intro_line( $l )
				)
			);
			if ( count( $lines ) < 3 ) {
				continue;
			}
			$head = preg_replace( '/^\d+[\.\)]\s+|^P:\s*/i', '', $lines[0] );
			$opciones = array();
			$respuesta = -1;
			$explicacion = null;
			foreach ( array_slice( $lines, 1 ) as $line ) {
				if ( preg_match( '/^([A-Da-d])[\.\)\]:\-]\s*(.+)$/', $line, $m ) ) {
					$opciones[] = trim( $m[2] );
					continue;
				}
				if ( preg_match( '/^(?:Respuesta|R|Soluci[oó]n|Correcta|Clave)\s*:?\s*([A-Da-d])\s*$/iu', $line, $m ) ) {
					$respuesta = ord( strtoupper( $m[1] ) ) - 65;
					continue;
				}
				if ( preg_match( '/^(?:Explicaci[oó]n|E)\s*:?\s*(.+)$/iu', $line, $m ) ) {
					$explicacion = trim( $m[1] );
				}
			}
			if ( count( $opciones ) >= 2 && $respuesta >= 0 && $respuesta < count( $opciones ) ) {
				$preguntas[] = array(
					'enunciado'   => $head,
					'opciones'    => $opciones,
					'respuesta'   => $respuesta,
					'explicacion' => $explicacion,
				);
			}
		}
		return $preguntas;
	}

	private static function parse_line_blocks( string $texto ): array {
		$lines = array_values(
			array_filter(
				array_map( 'trim', explode( "\n", $texto ) ),
				static fn( $l ) => '' !== $l && ! self::is_intro_line( $l )
			)
		);
		$preguntas = array();
		$i = 0;
		while ( $i < count( $lines ) ) {
			$enunciado = $lines[ $i ];
			++$i;
			$opciones = array();
			while ( $i < count( $lines ) && preg_match( '/^[A-Da-d][\.\)\]:\-]/', $lines[ $i ] ) ) {
				if ( preg_match( '/^([A-Da-d])[\.\)\]:\-]\s*(.+)$/', $lines[ $i ], $m ) ) {
					$opciones[] = trim( $m[2] );
				}
				++$i;
			}
			$respuesta = -1;
			$explicacion = null;
			while ( $i < count( $lines ) && ! preg_match( '/^\d+[\.\)]\s+|^P:\s/i', $lines[ $i ] ) ) {
				if ( preg_match( '/^(?:Respuesta|R|Soluci[oó]n|Correcta|Clave)\s*:?\s*([A-Da-d])\s*$/iu', $lines[ $i ], $m ) ) {
					$respuesta = ord( strtoupper( $m[1] ) ) - 65;
				} elseif ( preg_match( '/^(?:Explicaci[oó]n|E)\s*:?\s*(.+)$/iu', $lines[ $i ], $m ) ) {
					$explicacion = trim( $m[1] );
				}
				++$i;
			}
			if ( count( $opciones ) >= 2 && $respuesta >= 0 && $respuesta < count( $opciones ) ) {
				$preguntas[] = array(
					'enunciado'   => $enunciado,
					'opciones'    => $opciones,
					'respuesta'   => $respuesta,
					'explicacion' => $explicacion,
				);
			}
		}
		return $preguntas;
	}
}

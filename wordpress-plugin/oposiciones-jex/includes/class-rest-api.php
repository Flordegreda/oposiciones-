<?php
/**
 * @package OposicionesJEX
 */

defined( 'ABSPATH' ) || exit;

class OJEX_Rest_Api {

	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		$ns = 'ojex/v1';

		register_rest_route(
			$ns,
			'/exam/check',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'exam_check' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/exam/grade',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'exam_grade' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/simulacro/start',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'simulacro_start' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/banco/(?P<id>[a-f0-9\-]+)/preguntas',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'banco_preguntas' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/progreso/resultados',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'save_resultado' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/progreso/resultados',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'list_resultados' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/progreso/fallos',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'list_fallos' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/progreso/intento',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'record_intento' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			$ns,
			'/progreso/favoritos',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'toggle_favorito' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function exam_check( WP_REST_Request $request ): WP_REST_Response {
		$id       = sanitize_text_field( $request->get_param( 'id' ) ?? '' );
		$selected = $request->get_param( 'selected' );
		if ( ! $id || ! is_numeric( $selected ) ) {
			return new WP_REST_Response( array( 'error' => 'Faltan id y selected' ), 400 );
		}
		$results = OJEX_Exam_Utils::grade_answers(
			array(
				array(
					'id'       => $id,
					'selected' => (int) $selected,
				),
			)
		);
		if ( ! $results ) {
			return new WP_REST_Response( array( 'error' => 'Pregunta no encontrada' ), 404 );
		}
		return new WP_REST_Response( $results[0] );
	}

	public function exam_grade( WP_REST_Request $request ): WP_REST_Response {
		$answers = $request->get_param( 'answers' );
		if ( ! is_array( $answers ) || ! $answers ) {
			return new WP_REST_Response( array( 'error' => 'Falta array answers' ), 400 );
		}
		$items = array();
		foreach ( $answers as $a ) {
			$items[] = array(
				'id'       => sanitize_text_field( $a['id'] ?? '' ),
				'selected' => isset( $a['selected'] ) && is_numeric( $a['selected'] ) ? (int) $a['selected'] : null,
			);
		}
		return new WP_REST_Response( array( 'results' => OJEX_Exam_Utils::grade_answers( $items ) ) );
	}

	public function simulacro_start( WP_REST_Request $request ): WP_REST_Response {
		$preset_id  = sanitize_text_field( $request->get_param( 'presetId' ) ?? 'oficial' );
		$materia_id = sanitize_text_field( $request->get_param( 'materiaId' ) ?? '' ) ?: null;

		if ( ! isset( OJEX_Exam_Utils::PRESETS[ $preset_id ] ) ) {
			return new WP_REST_Response( array( 'error' => 'presetId inválido' ), 400 );
		}

		global $wpdb;
		$b = OJEX_Database::table( 'bancos' );
		$where = 'active = 1';
		$args  = array();
		if ( $materia_id ) {
			$where  .= ' AND materia_id = %s';
			$args[] = $materia_id;
		}
		$banco_ids = $args
			? $wpdb->get_col( $wpdb->prepare( "SELECT id FROM $b WHERE $where", ...$args ) )
			: $wpdb->get_col( "SELECT id FROM $b WHERE $where" );

		if ( ! $banco_ids ) {
			return new WP_REST_Response( array( 'error' => 'No hay preguntas disponibles' ), 400 );
		}

		$all  = OJEX_Pregunta_Repository::for_simulacro( $banco_ids, $materia_id );
		$pick = OJEX_Exam_Utils::pick_simulacro( $all, $preset_id );
		if ( ! $pick['list'] ) {
			return new WP_REST_Response( array( 'error' => 'No hay suficientes preguntas' ), 400 );
		}

		return new WP_REST_Response(
			array(
				'list'         => OJEX_Exam_Utils::strip_answers( $pick['list'] ),
				'timerSeconds' => OJEX_Exam_Utils::timer_seconds( $preset_id, count( $pick['list'] ) ),
				'pick'         => $pick,
			)
		);
	}

	public function banco_preguntas( WP_REST_Request $request ): WP_REST_Response {
		$id = sanitize_text_field( $request['id'] ?? '' );
		if ( ! OJEX_Banco_Repository::find( $id ) ) {
			return new WP_REST_Response( array( 'error' => 'Banco no encontrado' ), 404 );
		}
		$rows = OJEX_Pregunta_Repository::for_banco_public( $id );
		$banco = OJEX_Banco_Repository::find( $id );
		return new WP_REST_Response(
			array(
				'banco'     => array(
					'id'     => $banco['id'],
					'nombre' => $banco['nombre'],
					'tipo'   => $banco['tipo'],
				),
				'preguntas' => array_map(
					static function ( array $p ): array {
						return array(
							'id'        => $p['id'],
							'bancoId'   => $p['banco_id'],
							'enunciado' => $p['enunciado'],
							'opciones'  => $p['opciones'],
						);
					},
					$rows
				),
			)
		);
	}

	public function save_resultado( WP_REST_Request $request ): WP_REST_Response {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new WP_REST_Response( array( 'error' => 'JSON inválido' ), 400 );
		}
		$id = OJEX_Progress_Repository::save_resultado( $body );
		if ( ! $id ) {
			return new WP_REST_Response( array( 'ok' => false ), 500 );
		}
		return new WP_REST_Response( array( 'ok' => true, 'id' => $id ) );
	}

	public function list_resultados(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'resultados' => OJEX_Progress_Repository::list_resultados(),
			)
		);
	}

	public function list_fallos(): WP_REST_Response {
		$preguntas = OJEX_Progress_Repository::fallo_preguntas_public();
		return new WP_REST_Response(
			array(
				'ready'      => true,
				'count'      => count( $preguntas ),
				'preguntas'  => $preguntas,
			)
		);
	}

	public function record_intento( WP_REST_Request $request ): WP_REST_Response {
		$banco_id    = sanitize_text_field( $request->get_param( 'bancoId' ) ?? '' );
		$pregunta_id = sanitize_text_field( $request->get_param( 'preguntaId' ) ?? '' );
		$correcta    = (bool) $request->get_param( 'correcta' );
		if ( ! $banco_id || ! $pregunta_id ) {
			return new WP_REST_Response( array( 'error' => 'Datos incompletos' ), 400 );
		}
		OJEX_Progress_Repository::record_intento( $banco_id, $pregunta_id, $correcta );
		return new WP_REST_Response( array( 'ok' => true ) );
	}

	public function toggle_favorito( WP_REST_Request $request ): WP_REST_Response {
		$banco_id    = sanitize_text_field( $request->get_param( 'bancoId' ) ?? '' );
		$pregunta_id = sanitize_text_field( $request->get_param( 'preguntaId' ) ?? '' );
		if ( ! $banco_id || ! $pregunta_id ) {
			return new WP_REST_Response( array( 'error' => 'Datos incompletos' ), 400 );
		}
		$active = OJEX_Progress_Repository::toggle_favorito( $banco_id, $pregunta_id );
		return new WP_REST_Response( array( 'ok' => true, 'active' => $active ) );
	}
}

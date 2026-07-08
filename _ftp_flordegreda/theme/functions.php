<?php
/**
 * GeneratePress.
 *
 * Please do not make any edits to this file. All edits should be done in a child theme.
 *
 * @package GeneratePress
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// Set our theme version.
define( 'GENERATE_VERSION', '3.6.1' );

if ( ! function_exists( 'generate_setup' ) ) {
	add_action( 'after_setup_theme', 'generate_setup' );
	/**
	 * Sets up theme defaults and registers support for various WordPress features.
	 *
	 * @since 0.1
	 */
	function generate_setup() {
		// Make theme available for translation.
		load_theme_textdomain( 'generatepress' );

		// Add theme support for various features.
		add_theme_support( 'automatic-feed-links' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'post-formats', array( 'aside', 'image', 'video', 'quote', 'link', 'status' ) );
		add_theme_support( 'woocommerce' );
		add_theme_support( 'title-tag' );
		add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'script', 'style' ) );
		add_theme_support( 'customize-selective-refresh-widgets' );
		add_theme_support( 'align-wide' );
		add_theme_support( 'responsive-embeds' );

		$color_palette = generate_get_editor_color_palette();

		if ( ! empty( $color_palette ) ) {
			add_theme_support( 'editor-color-palette', $color_palette );
		}

		add_theme_support(
			'custom-logo',
			array(
				'height' => 70,
				'width' => 350,
				'flex-height' => true,
				'flex-width' => true,
			)
		);

		// Register primary menu.
		register_nav_menus(
			array(
				'primary' => __( 'Primary Menu', 'generatepress' ),
			)
		);

		/**
		 * Set the content width to something large
		 * We set a more accurate width in generate_smart_content_width()
		 */
		global $content_width;
		if ( ! isset( $content_width ) ) {
			$content_width = 1200; /* pixels */
		}

		// Add editor styles to the block editor.
		add_theme_support( 'editor-styles' );

		$editor_styles = apply_filters(
			'generate_editor_styles',
			array(
				'assets/css/admin/block-editor.css',
			)
		);

		add_editor_style( $editor_styles );
	}
}

/**
 * Get all necessary theme files
 */
$theme_dir = get_template_directory();

require $theme_dir . '/inc/theme-functions.php';
require $theme_dir . '/inc/defaults.php';
require $theme_dir . '/inc/class-css.php';
require $theme_dir . '/inc/css-output.php';
require $theme_dir . '/inc/general.php';
require $theme_dir . '/inc/customizer.php';
require $theme_dir . '/inc/markup.php';
require $theme_dir . '/inc/typography.php';
require $theme_dir . '/inc/plugin-compat.php';
require $theme_dir . '/inc/block-editor.php';
require $theme_dir . '/inc/class-typography.php';
require $theme_dir . '/inc/class-typography-migration.php';
require $theme_dir . '/inc/class-html-attributes.php';
require $theme_dir . '/inc/class-theme-update.php';
require $theme_dir . '/inc/class-rest.php';
require $theme_dir . '/inc/deprecated.php';

if ( is_admin() ) {
	require $theme_dir . '/inc/meta-box.php';
	require $theme_dir . '/inc/class-dashboard.php';
}

/**
 * Load our theme structure
 */
require $theme_dir . '/inc/structure/archives.php';
require $theme_dir . '/inc/structure/comments.php';
require $theme_dir . '/inc/structure/featured-images.php';
require $theme_dir . '/inc/structure/footer.php';
require $theme_dir . '/inc/structure/header.php';
require $theme_dir . '/inc/structure/navigation.php';
require $theme_dir . '/inc/structure/post-meta.php';
require $theme_dir . '/inc/structure/sidebars.php';
require $theme_dir . '/inc/structure/search-modal.php';
add_action( 'acf/init', 'set_acf_settings' );
function set_acf_settings() {
    acf_update_setting( 'enable_shortcode', true );
}

// Añadir campo especie_protegida al grupo ACF de plantas
add_action( 'acf/init', 'fdg_campo_protegida_plantas', 20 );
function fdg_campo_protegida_plantas() {
    if ( ! function_exists('acf_add_local_field') ) return;
    acf_add_local_field( array(
        'key'           => 'field_protegida_plantas',
        'label'         => 'Especie protegida',
        'name'          => 'especie_protegida',
        'type'          => 'select',
        'parent'        => 'group_57',
        'choices'       => array(
            ''           => 'No catalogada',
            'peligro'    => 'En peligro de extincion',
            'sensible'   => 'Sensible a la alteracion del habitat',
            'vulnerable' => 'Vulnerable',
            'interes'    => 'De interes especial',
        ),
        'default_value' => '',
        'allow_null'    => 1,
        'instructions'  => 'Catalogo Regional de Especies Amenazadas de Extremadura',
        'menu_order'    => 99,
    ) );
}

// Grupo de campos ACF para insectos (local field group)
add_action( 'acf/init', 'fdg_registrar_campos_insectos' );
function fdg_registrar_campos_insectos() {
    if ( ! function_exists('acf_add_local_field_group') ) return;

    acf_add_local_field_group(array(
        'key'   => 'group_insectos',
        'title' => 'Ficha entomológica',
        'fields' => array(

            array( 'key'=>'field_ins_tab1', 'label'=>'Identificación', 'name'=>'', 'type'=>'tab' ),
            array( 'key'=>'field_ins_nc',      'label'=>'Nombre científico', 'name'=>'nombre_cientifico_ins', 'type'=>'text' ),
            array( 'key'=>'field_ins_comun',   'label'=>'Nombre común',      'name'=>'nombre_comun_ins',      'type'=>'text' ),
            array( 'key'=>'field_ins_fam',     'label'=>'Familia',           'name'=>'familia_ins',           'type'=>'text' ),
            array( 'key'=>'field_ins_enver',   'label'=>'Envergadura',       'name'=>'envergadura',           'type'=>'text', 'instructions'=>'Ej: 65–86 mm' ),
            array( 'key'=>'field_ins_plantas', 'label'=>'Plantas asociadas', 'name'=>'plantas_asociadas',     'type'=>'text' ),
            array( 'key'=>'field_ins_galeria',   'label'=>'Galería de fotos',  'name'=>'galeria_ins',    'type'=>'gallery' ),
            array(
                'key'     => 'field_ins_protegida',
                'label'   => 'Especie protegida',
                'name'    => 'especie_protegida',
                'type'    => 'select',
                'choices' => array(
                    ''          => 'No catalogada',
                    'peligro'   => 'En peligro de extincion',
                    'sensible'  => 'Sensible a la alteracion del habitat',
                    'vulnerable'=> 'Vulnerable',
                    'interes'   => 'De interes especial',
                ),
                'default_value' => '',
                'instructions'  => 'Catalogo Regional de Especies Amenazadas de Extremadura',
                'allow_null'    => 1,
            ),
            array(
                'key'     => 'field_ins_venenoso',
                'label'   => '¿Es venenoso?',
                'name'    => 'venenoso',
                'type'    => 'select',
                'choices' => array(
                    'no'       => 'No',
                    'leve'     => 'Levemente irritante',
                    'moderado' => 'Moderadamente tóxico',
                    'si'       => 'Sí, venenoso',
                ),
                'default_value' => 'no',
                'instructions'  => 'Indica si el insecto puede ser peligroso para las personas',
            ),

            array( 'key'=>'field_ins_tab2', 'label'=>'Período de vuelo', 'name'=>'', 'type'=>'tab' ),
            array(
                'key'      => 'field_ins_vuelo',
                'label'    => 'Meses de vuelo',
                'name'     => 'vuelo',
                'type'     => 'checkbox',
                'choices'  => array(
                    'Enero'=>'Enero','Febrero'=>'Febrero','Marzo'=>'Marzo',
                    'Abril'=>'Abril','Mayo'=>'Mayo','Junio'=>'Junio',
                    'Julio'=>'Julio','Agosto'=>'Agosto','Septiembre'=>'Septiembre',
                    'Octubre'=>'Octubre','Noviembre'=>'Noviembre','Diciembre'=>'Diciembre',
                ),
                'layout'   => 'horizontal',
            ),

            array( 'key'=>'field_ins_tab3', 'label'=>'Ubicación', 'name'=>'', 'type'=>'tab' ),
            array( 'key'=>'field_ins_coords', 'label'=>'Coordenadas', 'name'=>'coordenadas_ins', 'type'=>'text', 'instructions'=>'Ej: 38.5312, -6.6489' ),
            array(
                'key'           => 'field_ins_habitat',
                'label'         => 'Hábitat',
                'name'          => 'habitat_ins_tax',
                'type'          => 'taxonomy',
                'taxonomy'      => 'habitat_insecto',
                'field_type'    => 'checkbox',
                'add_term'      => 0,
                'save_terms'    => 1,
                'load_terms'    => 1,
                'return_format' => 'id',
            ),
            array(
                'key'           => 'field_ins_zona',
                'label'         => 'Zona',
                'name'          => 'zona_ins_tax',
                'type'          => 'taxonomy',
                'taxonomy'      => 'zona',
                'field_type'    => 'checkbox',
                'add_term'      => 0,
                'save_terms'    => 1,
                'load_terms'    => 1,
                'return_format' => 'id',
                'instructions'  => 'Las zonas se gestionan en Plantas → Zonas.',
            ),
        ),
        'location' => array(array(array(
            'param'    => 'post_type',
            'operator' => '==',
            'value'    => 'insectos',
        ))),
        'position'        => 'normal',
        'style'           => 'default',
        'label_placement' => 'top',
        'active'          => true,
    ));
}







// Grupo de campos ACF para avistamientos
add_action( 'acf/init', 'fdg_registrar_campos_avistamientos' );
function fdg_registrar_campos_avistamientos() {
    if ( ! function_exists('acf_add_local_field_group') ) return;

    acf_add_local_field_group(array(
        'key'   => 'group_avistamientos',
        'title' => 'Datos del avistamiento',
        'fields' => array(

            array( 'key'=>'field_avis_tab1', 'label'=>'Especie', 'name'=>'', 'type'=>'tab' ),
            array(
                'key'           => 'field_avis_especie_id',
                'label'         => 'Especie catalogada',
                'name'          => 'especie_id',
                'type'          => 'relationship',
                'instructions'  => 'Enlaza con la ficha de planta o insecto. Déjalo vacío si aún no está identificado.',
                'post_type'     => array( 'plantas', 'insectos' ),
                'filters'       => array( 'search' ),
                'return_format' => 'id',
                'max'           => 1,
                'allow_null'    => 1,
            ),
            array(
                'key'          => 'field_avis_nombre_prov',
                'label'        => 'Nombre provisional',
                'name'         => 'nombre_provisional',
                'type'         => 'text',
                'instructions' => 'Si no está en el catálogo, escribe una descripción provisional',
                'placeholder'  => 'Ej: orquídea rosa pequeña, mariposa azul...',
            ),
            array(
                'key'     => 'field_avis_tipo',
                'label'   => 'Tipo de especie',
                'name'    => 'tipo_especie',
                'type'    => 'select',
                'choices' => array(
                    'planta'  => 'Planta',
                    'insecto' => 'Insecto',
                    'otro'    => 'Otro',
                ),
                'default_value' => 'planta',
            ),
            array(
                'key'     => 'field_avis_sin_id',
                'label'   => 'Sin identificar',
                'name'    => 'sin_identificar',
                'type'    => 'true_false',
                'message' => 'Foto tomada en campo, especie pendiente de identificar',
                'default_value' => 0,
                'ui'      => 1,
            ),

            array( 'key'=>'field_avis_tab2', 'label'=>'Fecha y lugar', 'name'=>'', 'type'=>'tab' ),
            array(
                'key'            => 'field_avis_fecha',
                'label'          => 'Fecha',
                'name'           => 'fecha_avistamiento',
                'type'           => 'date_picker',
                'display_format' => 'd/m/Y',
                'return_format'  => 'Y-m-d',
            ),
            array(
                'key'   => 'field_avis_hora',
                'label' => 'Hora',
                'name'  => 'hora_avistamiento',
                'type'  => 'time_picker',
                'display_format' => 'H:i',
                'return_format'  => 'H:i',
            ),
            array(
                'key'          => 'field_avis_coords',
                'label'        => 'Coordenadas GPS',
                'name'         => 'coordenadas_avis',
                'type'         => 'text',
                'instructions' => 'Latitud, Longitud — Ej: 38.4915, -6.6832',
                'placeholder'  => '38.4915, -6.6832',
            ),
            array(
                'key'     => 'field_avis_habitat',
                'label'   => 'Hábitat / Zona',
                'name'    => 'habitat_avis',
                'type'    => 'select',
                'choices' => array(
                    ''          => '— Sin especificar —',
                    'Sierra'    => 'Sierra',
                    'Castañar'  => 'Castañar / helechal',
                    'Dehesa'    => 'Dehesa',
                    'Ribera'    => 'Ribera',
                    'Matorral'  => 'Matorral',
                    'Cultivos'  => 'Bordes de cultivos',
                    'Pueblo'    => 'Entorno del pueblo',
                ),
                'allow_null' => 1,
            ),

            array( 'key'=>'field_avis_tab3', 'label'=>'Observación', 'name'=>'', 'type'=>'tab' ),
            array(
                'key'     => 'field_avis_estado',
                'label'   => 'Estado fenológico',
                'name'    => 'estado_avis',
                'type'    => 'select',
                'choices' => array(
                    ''           => '— Sin especificar —',
                    'En flor'    => 'En flor',
                    'En fruto'   => 'En fruto',
                    'Vegetativo' => 'Solo hojas (vegetativo)',
                    'Seco'       => 'Seco / marchito',
                    'Adulto'     => 'Adulto en vuelo',
                    'Larva'      => 'Larva / oruga',
                    'Pupa'       => 'Pupa / crisálida',
                    'Cópula'     => 'En cópula',
                    'Posado'     => 'Posado',
                ),
                'allow_null' => 1,
            ),
            array(
                'key'     => 'field_avis_ejemplares',
                'label'   => 'Número de ejemplares',
                'name'    => 'ejemplares_avis',
                'type'    => 'select',
                'choices' => array(
                    ''          => '— Sin especificar —',
                    '1'         => '1 ejemplar',
                    '2-5'       => '2–5 ejemplares',
                    '6-20'      => '6–20 ejemplares',
                    '+20'       => 'Más de 20',
                    'Abundante' => 'Abundante (colonia / masa)',
                ),
                'allow_null' => 1,
            ),
            array(
                'key'          => 'field_avis_notas',
                'label'        => 'Notas de campo',
                'name'         => 'notas_avis',
                'type'         => 'textarea',
                'rows'         => 4,
                'instructions' => 'Condiciones, comportamiento, contexto, dudas...',
                'placeholder'  => 'Ej: varios ejemplares en ladera norte, junto a jaras...',
            ),
        ),
        'location' => array(array(array(
            'param'    => 'post_type',
            'operator' => '==',
            'value'    => 'avistamiento',
        ))),
        'position'        => 'normal',
        'style'           => 'default',
        'label_placement' => 'top',
        'active'          => true,
    ));
}

// AJAX — iNaturalist Computer Vision (proxy)
add_action( 'wp_ajax_fdg_inat_identificar',        'fdg_inat_identificar' );
add_action( 'wp_ajax_nopriv_fdg_inat_identificar', 'fdg_inat_identificar' );
function fdg_inat_identificar() {
    if ( ! isset($_POST['fdg_nonce']) || ! wp_verify_nonce($_POST['fdg_nonce'], 'fdg_inat') ) {
        wp_send_json_error('Nonce invalido');
    }
    $datos = json_decode( stripslashes($_POST['datos']), true );
    if ( ! $datos || empty($datos['imagen']) ) {
        wp_send_json_error('Sin imagen');
    }

    $img_data = base64_decode( $datos['imagen'] );
    $boundary = 'FDGBoundary' . md5( uniqid() );
    $crlf     = "
";

    $body  = '--' . $boundary . $crlf;
    $body .= 'Content-Disposition: form-data; name="image"; filename="foto.jpg"' . $crlf;
    $body .= 'Content-Type: image/jpeg' . $crlf . $crlf;
    $body .= $img_data . $crlf;

    if ( ! empty($datos['lat']) && ! empty($datos['lng']) ) {
        $body .= '--' . $boundary . $crlf;
        $body .= 'Content-Disposition: form-data; name="lat"' . $crlf . $crlf;
        $body .= floatval($datos['lat']) . $crlf;
        $body .= '--' . $boundary . $crlf;
        $body .= 'Content-Disposition: form-data; name="lng"' . $crlf . $crlf;
        $body .= floatval($datos['lng']) . $crlf;
    }
    $body .= '--' . $boundary . '--' . $crlf;

    $response = wp_remote_post( 'https://api.inaturalist.org/v1/computervision/score_image', array(
        'timeout' => 30,
        'headers' => array(
            'Content-Type' => 'multipart/form-data; boundary=' . $boundary,
            'Accept'       => 'application/json',
        ),
        'body' => $body,
    ) );

    if ( is_wp_error($response) ) {
        wp_send_json_error( 'Error: ' . $response->get_error_message() );
    }
    $code = wp_remote_retrieve_response_code($response);
    if ( $code !== 200 ) {
        wp_send_json_error( 'iNaturalist error ' . $code . ': ' . wp_remote_retrieve_body($response) );
    }

    $json = json_decode( wp_remote_retrieve_body($response), true );
    if ( empty($json['results']) ) {
        wp_send_json_success( array() );
    }

    $sugerencias = array();
    $total = min( 4, count($json['results']) );
    for ( $i = 0; $i < $total; $i++ ) {
        $res   = $json['results'][$i];
        $taxon = isset($res['taxon']) ? $res['taxon'] : array();
        $nc    = isset($taxon['name']) ? $taxon['name'] : '';
        $comun = isset($taxon['preferred_common_name']) ? ucfirst($taxon['preferred_common_name']) : '';
        $grupo = isset($taxon['iconic_taxon_name']) ? $taxon['iconic_taxon_name'] : '';
        $foto  = isset($taxon['default_photo']['square_url']) ? $taxon['default_photo']['square_url'] : '';
        $score = isset($res['combined_score']) ? floatval($res['combined_score']) : 0;
        $sugerencias[] = array(
            'nc'       => $nc,
            'comun'    => $comun,
            'grupo'    => $grupo,
            'foto'     => $foto,
            'confianza'=> $score,
        );
    }
    wp_send_json_success( $sugerencias );
}

// AJAX — guardar avistamiento desde el panel de campo
add_action( 'wp_ajax_fdg_guardar_avistamiento',        'fdg_guardar_avistamiento' );
add_action( 'wp_ajax_nopriv_fdg_guardar_avistamiento', 'fdg_guardar_avistamiento' );
function fdg_guardar_avistamiento() {
    // Verificar nonce
    if ( ! isset($_POST['fdg_nonce']) || ! wp_verify_nonce($_POST['fdg_nonce'], 'fdg_nuevo_avistamiento') ) {
        wp_send_json_error('Nonce invalido');
    }

    $especie_id  = isset($_POST['especie_id'])   ? intval($_POST['especie_id'])             : 0;
    $fecha       = isset($_POST['fecha'])         ? sanitize_text_field($_POST['fecha'])     : date('Y-m-d');
    $coordenadas = isset($_POST['coordenadas'])   ? sanitize_text_field($_POST['coordenadas']) : '';
    $notas       = isset($_POST['notas'])         ? sanitize_textarea_field($_POST['notas']) : '';

    // Campos adicionales
    $hora              = isset($_POST['hora'])              ? sanitize_text_field($_POST['hora'])              : '';
    $habitat           = isset($_POST['habitat'])           ? sanitize_text_field($_POST['habitat'])           : '';
    $estado            = isset($_POST['estado'])            ? sanitize_text_field($_POST['estado'])            : '';
    $ejemplares        = isset($_POST['ejemplares'])        ? sanitize_text_field($_POST['ejemplares'])        : '';
    $nombre_provisional= isset($_POST['nombre_provisional'])? sanitize_text_field($_POST['nombre_provisional']): '';
    $tipo_campo        = isset($_POST['tipo_especie'])      ? sanitize_text_field($_POST['tipo_especie'])      : 'planta';

    $sin_identificar = isset($_POST['sin_identificar']) ? 1 : 0;

    // Si es foto rápida, las coordenadas son opcionales
    if ( ! $sin_identificar && ! $coordenadas ) {
        wp_send_json_error('Las coordenadas son obligatorias');
    }

    // Determinar nombre y tipo
    $nc   = '';
    $tipo = $tipo_campo;
    if ( $especie_id ) {
        $post_type = get_post_type($especie_id);
        $tipo = $post_type === 'insectos' ? 'insecto' : 'planta';
        $nc   = $tipo === 'insecto'
            ? get_post_meta($especie_id,'nombre_cientifico_ins',true)
            : get_post_meta($especie_id,'nombre_cientifico',true);
        if (!$nc) $nc = get_the_title($especie_id);
    }
    if (!$nc && $nombre_provisional) $nc = $nombre_provisional;
    if (!$nc) $nc = 'Especie sin identificar';

    $titulo = $nc . ' — ' . ($fecha ? date('d/m/Y', strtotime($fecha)) : date('d/m/Y'));

    // Crear el avistamiento
    $post_id = wp_insert_post( array(
        'post_type'   => 'avistamiento',
        'post_status' => 'publish',
        'post_title'  => $titulo,
    ) );

    if ( is_wp_error($post_id) ) {
        wp_send_json_error('Error al crear el post: ' . $post_id->get_error_message());
    }

    // Guardar todos los metadatos
    update_post_meta( $post_id, 'especie_id',            (string)$especie_id );
    update_post_meta( $post_id, 'tipo_especie',           $tipo );
    update_post_meta( $post_id, 'nombre_provisional',     $nombre_provisional );
    update_post_meta( $post_id, 'fecha_avistamiento',     $fecha );
    update_post_meta( $post_id, 'hora_avistamiento',      $hora );
    update_post_meta( $post_id, 'coordenadas_avis',       $coordenadas );
    update_post_meta( $post_id, 'habitat_avis',           $habitat );
    update_post_meta( $post_id, 'estado_avis',            $estado );
    update_post_meta( $post_id, 'ejemplares_avis',        $ejemplares );
    update_post_meta( $post_id, 'notas_avis',          $notas );
    update_post_meta( $post_id, 'sin_identificar',     $sin_identificar ? '1' : '0' );

    // Subir foto si viene
    if ( ! empty($_FILES['foto']['name']) ) {
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        $attachment_id = media_handle_upload('foto', $post_id);
        if ( ! is_wp_error($attachment_id) ) {
            set_post_thumbnail($post_id, $attachment_id);
        }
    }

    wp_send_json_success( array(
        'id'      => $post_id,
        'mensaje' => 'Avistamiento guardado',
        'especie' => $nc,
        'fecha'   => $fecha,
    ) );
}

// Encolar CSS del panel de campo
add_action( 'wp_enqueue_scripts', 'fdg_encolar_campo' );
function fdg_encolar_campo() {
    if ( is_page_template('page-campo.php') || is_page('campo') || is_page(496) ) {
        wp_enqueue_style( 'fdg-campo', get_template_directory_uri() . '/fdg-campo.css', array(), '2.0.' . filemtime( get_template_directory() . '/fdg-campo.css' ) );
    }
}

// Servir manifest.json y sw.js desde la raíz del dominio
add_action( 'init', 'fdg_pwa_rewrite' );
function fdg_pwa_rewrite() {
	add_rewrite_rule( '^manifest\.json$', 'index.php?fdg_pwa_file=manifest', 'top' );
	add_rewrite_rule( '^sw\.js$', 'index.php?fdg_pwa_file=sw', 'top' );
}

add_action( 'init', 'fdg_pwa_maybe_flush_rewrite', 99 );
function fdg_pwa_maybe_flush_rewrite() {
	if ( get_option( 'fdg_pwa_rewrite_v2' ) ) {
		return;
	}
	if ( ! file_exists( get_template_directory() . '/manifest.json' ) ) {
		return;
	}
	flush_rewrite_rules( false );
	update_option( 'fdg_pwa_rewrite_v2', 1, false );
}

// /instalar/ — guía para fijar la PWA
add_action( 'init', 'fdg_instalar_rewrite' );
function fdg_instalar_rewrite() {
	add_rewrite_rule( '^instalar/?$', 'index.php?fdg_instalar=1', 'top' );
}

add_action( 'init', 'fdg_instalar_maybe_flush_rewrite', 99 );
function fdg_instalar_maybe_flush_rewrite() {
	if ( get_option( 'fdg_instalar_rewrite_v1' ) ) {
		return;
	}
	flush_rewrite_rules( false );
	update_option( 'fdg_instalar_rewrite_v1', 1, false );
}

add_filter(
	'query_vars',
	function ( $vars ) {
		$vars[] = 'fdg_pwa_file';
		$vars[] = 'fdg_instalar';
		return $vars;
	}
);

add_action( 'template_redirect', 'fdg_pwa_serve_file' );
function fdg_pwa_serve_file() {
	$file = get_query_var( 'fdg_pwa_file' );
	if ( ! $file ) {
		return;
	}
	$theme = get_template_directory();
	if ( 'manifest' === $file && file_exists( $theme . '/manifest.json' ) ) {
		header( 'Content-Type: application/manifest+json; charset=utf-8' );
		header( 'Cache-Control: public, max-age=86400' );
		readfile( $theme . '/manifest.json' );
		exit;
	}
	if ( 'sw' === $file && file_exists( $theme . '/sw.js' ) ) {
		header( 'Content-Type: application/javascript; charset=utf-8' );
		header( 'Service-Worker-Allowed: /' );
		header( 'Cache-Control: no-cache' );
		readfile( $theme . '/sw.js' );
		exit;
	}
}

add_action( 'template_redirect', 'fdg_render_instalar_page', 5 );
function fdg_render_instalar_page() {
	if ( ! get_query_var( 'fdg_instalar' ) ) {
		return;
	}

	add_filter(
		'body_class',
		function ( $classes ) {
			$classes[] = 'fdg-instalar-page';
			return $classes;
		}
	);

	status_header( 200 );
	get_header();
	include get_template_directory() . '/fdg-instalar.php';
	get_footer();
	exit;
}

// PWA — manifest, iconos e instalación
add_action( 'wp_head', 'fdg_pwa_head' );
function fdg_pwa_head() {
	$icon = 'https://flordegreda.es/wp-content/uploads/2026/05/cropped-LOGO.png';
	echo '<link rel="manifest" href="' . esc_url( home_url( '/manifest.json' ) ) . '">' . "\n";
	echo '<meta name="theme-color" content="#2d4a1e">' . "\n";
	echo '<meta name="mobile-web-app-capable" content="yes">' . "\n";
	echo '<meta name="apple-mobile-web-app-capable" content="yes">' . "\n";
	echo '<meta name="apple-mobile-web-app-title" content="Flor de Greda">' . "\n";
	echo '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">' . "\n";
	echo '<link rel="apple-touch-icon" href="' . esc_url( $icon ) . '">' . "\n";
}

add_action( 'wp_enqueue_scripts', 'fdg_pwa_enqueue_install' );
function fdg_pwa_enqueue_install() {
	if ( is_admin() ) {
		return;
	}
	wp_enqueue_style(
		'fdg-pwa',
		get_template_directory_uri() . '/fdg-pwa.css',
		array(),
		'1.0.0'
	);
	wp_enqueue_script(
		'fdg-pwa-install',
		get_template_directory_uri() . '/fdg-pwa-install.js',
		array(),
		'1.0.1',
		true
	);
	if ( get_query_var( 'fdg_instalar' ) ) {
		wp_enqueue_style(
			'fdg-instalar',
			get_template_directory_uri() . '/fdg-instalar.css',
			array(),
			'1.0.0'
		);
	}
}

add_action( 'wp_footer', 'fdg_pwa_sw' );
function fdg_pwa_sw() {
	if ( is_admin() ) {
		return;
	}
	$sw = esc_url( home_url( '/sw.js' ) );
	echo '<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("' . $sw . '", { scope: "/" })
      .catch(function () {});
  });
}
</script>' . "\n";
}

add_action( 'wp_footer', 'fdg_pwa_install_banner', 5 );
function fdg_pwa_install_banner() {
	if ( is_admin() ) {
		return;
	}
	?>
	<div class="fdg-pwa-install" id="fdg-pwa-install" hidden>
		<div class="fdg-pwa-install__inner">
			<p class="fdg-pwa-install__text">
				<strong>Instalar Flor de Greda</strong>
				<span class="fdg-pwa-install__sub">Acceso rápido desde la pantalla de inicio, ideal en el monte.</span>
				<span class="fdg-pwa-install__ios" id="fdg-pwa-install-ios" hidden>iPhone/iPad: Compartir → Añadir a pantalla de inicio</span>
			</p>
			<div class="fdg-pwa-install__actions">
				<button type="button" class="fdg-pwa-install__btn" id="fdg-pwa-install-btn">Instalar</button>
				<button type="button" class="fdg-pwa-install__dismiss" id="fdg-pwa-install-dismiss" aria-label="Cerrar">×</button>
			</div>
		</div>
	</div>
	<?php
}



// Endpoint REST para pendientes de identificar
add_action( 'rest_api_init', 'fdg_endpoint_pendientes' );
function fdg_endpoint_pendientes() {
    register_rest_route( 'fdg/v1', '/pendientes', array(
        'methods'             => 'GET',
        'callback'            => 'fdg_datos_pendientes',
        'permission_callback' => '__return_true',
    ) );
}
function fdg_datos_pendientes() {
    $posts = get_posts(array(
        'post_type'   => 'avistamiento',
        'post_status' => 'publish',
        'numberposts' => -1,
        'orderby'     => 'date',
        'order'       => 'DESC',
        'meta_query'  => array(array(
            'key'   => 'sin_identificar',
            'value' => '1',
        )),
    ));
    $datos = array();
    foreach ($posts as $p) {
        $thumb_id = get_post_thumbnail_id($p->ID);
        $datos[] = array(
            'id'      => $p->ID,
            'titulo'  => $p->post_title,
            'fecha'   => get_post_meta($p->ID,'fecha_avistamiento',true),
            'hora'    => get_post_meta($p->ID,'hora_avistamiento',true),
            'coords'  => get_post_meta($p->ID,'coordenadas_avis',true),
            'habitat' => get_post_meta($p->ID,'habitat_avis',true),
            'notas'   => get_post_meta($p->ID,'notas_avis',true),
            'img'     => $thumb_id ? wp_get_attachment_image_url($thumb_id,'medium') : '',
            'img_full'=> $thumb_id ? wp_get_attachment_image_url($thumb_id,'full') : '',
            'edit_url'=> admin_url('post.php?post='.$p->ID.'&action=edit'),
        );
    }
    return rest_ensure_response($datos);
}

// CPT Avistamientos
add_action( 'init', 'fdg_registrar_avistamientos' );
function fdg_registrar_avistamientos() {
    register_post_type( 'avistamiento', array(
        'labels' => array(
            'name'          => 'Avistamientos',
            'singular_name' => 'Avistamiento',
            'add_new_item'  => 'Añadir avistamiento',
            'edit_item'     => 'Editar avistamiento',
            'all_items'     => 'Todos los avistamientos',
            'menu_name'     => 'Avistamientos',
        ),
        'public'             => false,
        'publicly_queryable' => false,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'show_in_rest'       => true,
        'rest_base'          => 'avistamientos',
        'has_archive'        => false,
        'rewrite'            => false,
        'supports'           => array( 'title', 'thumbnail', 'custom-fields' ),
        'menu_icon'          => 'dashicons-location-alt',
        'menu_position'      => 6,
        'capability_type'    => 'post',
    ) );
}

// Endpoint REST: cruce cuaderno de campo + avistamientos reales
add_action( 'rest_api_init', 'fdg_endpoint_cruce_cuaderno' );
function fdg_endpoint_cruce_cuaderno() {
    register_rest_route( 'fdg/v1', '/cuaderno/avistamientos', array(
        'methods'             => 'GET',
        'callback'            => 'fdg_cruce_cuaderno_avistamientos',
        'permission_callback' => '__return_true',
    ) );
}
function fdg_cruce_cuaderno_avistamientos() {
    // Para cada especie catalogada (plantas + insectos), contar sus avistamientos
    $plantas  = get_posts(array('post_type'=>'plantas','numberposts'=>-1,'post_status'=>'publish'));
    $insectos = get_posts(array('post_type'=>'insectos','numberposts'=>-1,'post_status'=>'publish'));
    $datos = array();
    foreach ( array_merge($plantas, $insectos) as $p ) {
        $tipo  = $p->post_type === 'insectos' ? 'insecto' : 'planta';
        $nc    = get_post_meta($p->ID, $tipo==='insecto'?'nombre_cientifico_ins':'nombre_cientifico', true) ?: $p->post_title;
        $avis  = get_posts(array(
            'post_type'   => 'avistamiento',
            'post_status' => 'publish',
            'numberposts' => -1,
            'meta_query'  => array(array('key'=>'especie_id','value'=>(string)$p->ID)),
        ));
        $ultimo = '';
        if ( !empty($avis) ) {
            $ultimo_fecha = get_post_meta($avis[0]->ID, 'fecha_avistamiento', true);
            $ultimo = $ultimo_fecha ? date('d/m/Y', strtotime($ultimo_fecha)) : '';
        }
        $datos[] = array(
            'id'            => $p->ID,
            'nc'            => $nc,
            'tipo'          => $tipo,
            'n_avistamientos' => count($avis),
            'ultimo'        => $ultimo,
            'campo_url'     => home_url('/campo/?especie=' . $p->ID),
            'ficha_url'     => get_permalink($p->ID),
        );
    }
    usort($datos, function($a,$b){ return strcmp($a['nc'],$b['nc']); });
    return rest_ensure_response($datos);
}

// Endpoint REST avistamientos
add_action( 'rest_api_init', 'fdg_endpoint_avistamientos' );
function fdg_endpoint_avistamientos() {
    register_rest_route( 'fdg/v1', '/avistamientos', array(
        'methods'             => 'GET',
        'callback'            => 'fdg_datos_avistamientos',
        'permission_callback' => '__return_true',
    ) );
}
function fdg_datos_avistamientos( $request ) {
    $especie_id = $request->get_param('especie_id');
    $args = array( 'post_type'=>'avistamiento', 'post_status'=>'publish', 'numberposts'=>-1, 'orderby'=>'date', 'order'=>'DESC' );
    if ( $especie_id ) {
        $args['meta_query'] = array(array( 'key'=>'especie_id', 'value'=>$especie_id ));
    }
    $posts = get_posts($args);
    $datos = array();
    foreach ( $posts as $p ) {
        $coords = get_post_meta( $p->ID, 'coordenadas_avis', true );
        if ( ! $coords ) continue;
        $partes = array_map('trim', explode(',', $coords));
        if ( count($partes) < 2 ) continue;
        $eid   = get_post_meta( $p->ID, 'especie_id', true );
        $tipo  = get_post_meta( $p->ID, 'tipo_especie', true );
        $fecha = get_post_meta( $p->ID, 'fecha_avistamiento', true );
        $notas = get_post_meta( $p->ID, 'notas_avis', true );
        $nc = '';
        if ( $eid ) {
            $nc = get_post_meta( (int)$eid, $tipo==='insecto' ? 'nombre_cientifico_ins' : 'nombre_cientifico', true );
            if (!$nc) $nc = get_the_title($eid);
        }
        if (!$nc) $nc = $p->post_title;
        $thumb_id = get_post_thumbnail_id( $p->ID );
        $img_url  = $thumb_id ? wp_get_attachment_image_url($thumb_id, 'medium') : '';
        $datos[] = array(
            'id'         => $p->ID,
            'especie_id' => (int)$eid,
            'nc'         => $nc,
            'tipo'       => $tipo,
            'fecha'      => $fecha ? date('d/m/Y', strtotime($fecha)) : '',
            'coords'     => $coords,
            'lat'        => (float)$partes[0],
            'lng'        => (float)$partes[1],
            'notas'      => $notas,
            'img'        => $img_url,
        );
    }
    return rest_ensure_response($datos);
}

// Logo únicamente en la cabecera del sitio
add_filter( 'generate_show_logo', '__return_false' );
add_filter( 'generate_show_title', '__return_false' );
add_filter( 'generate_show_tagline', '__return_false' );
add_action( 'generate_before_header_content', 'fdg_render_header_logo', 5 );
function fdg_render_header_logo() {
	$url = '';
	if ( function_exists( 'fdg_seo_logo_url' ) ) {
		$url = fdg_seo_logo_url();
	}
	if ( ! $url ) {
		$url = content_url( 'uploads/2026/05/cropped-LOGO.png' );
	}
	$name = get_bloginfo( 'name' );
	printf(
		'<div class="site-logo fdg-header-logo"><a href="%1$s" rel="home" aria-label="%2$s"><img src="%3$s" class="header-image is-logo-image" alt="%2$s" width="220" height="auto" decoding="async"></a></div>',
		esc_url( home_url( '/' ) ),
		esc_attr( $name ),
		esc_url( $url )
	);
}

// Footer personalizado
add_action( 'generate_before_footer_content', 'fdg_footer_personalizado' );
function fdg_footer_personalizado() {
    $year = date('Y');
    ?>
    <div class="fdg-footer">
        <div class="fdg-footer__inner">

            <div class="fdg-footer__logo">
                <a href="<?php echo esc_url( home_url('/') ); ?>" class="fdg-footer__nombre">Flor de Greda</a>
                <p class="fdg-footer__tagline">Cuaderno de campo · Salvatierra de los Barros</p>
            </div>

            <div class="fdg-footer__copy">
                <p>© <?php echo $year; ?> Tomás Mesa · Flor de Greda</p>
                <p>Fotografías propias realizadas en Salvatierra de los Barros.</p>
            </div>

        </div>
    </div>
    <?php
}

// Ocultar el footer por defecto de GeneratePress
add_filter( 'generate_copyright', '__return_empty_string' );

// Activar archive del CPT plantas
add_action( 'init', 'fdg_fix_plantas_archive', 99 );
function fdg_fix_plantas_archive() {
    global $wp_post_types;
    if ( isset( $wp_post_types['plantas'] ) ) {
        $wp_post_types['plantas']->has_archive = true;
    }
}

// Registrar CPT Insectos
add_action( 'init', 'fdg_registrar_insectos' );
function fdg_registrar_insectos() {
    register_post_type( 'insectos', array(
        'labels' => array(
            'name'               => 'Insectos',
            'singular_name'      => 'Insecto',
            'add_new'            => 'Añadir nuevo',
            'add_new_item'       => 'Añadir nuevo insecto',
            'edit_item'          => 'Editar insecto',
            'view_item'          => 'Ver insecto',
            'all_items'          => 'Todos los insectos',
            'search_items'       => 'Buscar insectos',
            'not_found'          => 'No se encontraron insectos',
        ),
        'public'              => true,
        'publicly_queryable'  => true,
        'show_ui'             => true,
        'show_in_rest'        => true,
        'rest_base'           => 'insectos',
        'has_archive'         => true,
        'rewrite'             => array( 'slug' => 'insectos' ),
        'supports'            => array( 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ),
        'menu_icon'           => 'dashicons-buddicons-buddy',
        'taxonomies'          => array( 'orden_insecto' ),
    ) );
}

// Registrar taxonomía Orden para insectos
add_action( 'init', 'fdg_registrar_orden_insecto' );
function fdg_registrar_orden_insecto() {
    register_taxonomy( 'orden_insecto', 'insectos', array(
        'labels' => array(
            'name'          => 'Órdenes',
            'singular_name' => 'Orden',
            'all_items'     => 'Todos los órdenes',
        ),
        'public'       => true,
        'show_in_rest' => true,
        'hierarchical' => true,
        'rewrite'      => array( 'slug' => 'orden' ),
    ) );
}

// Registrar taxonomía de hábitat para insectos (zona: ver fdg-zonas.php)
add_action( 'init', 'fdg_registrar_taxonomias_insectos' );
function fdg_registrar_taxonomias_insectos() {
    register_taxonomy( 'habitat_insecto', 'insectos', array(
        'labels'       => array( 'name' => 'Hábitat', 'singular_name' => 'Hábitat' ),
        'public'       => true,
        'show_in_rest' => true,
        'hierarchical' => false,
    ) );
}

// Encolar CSS + JS — global, home y fichas
add_action( 'wp_enqueue_scripts', 'fdg_encolar_estilos' );
function fdg_encolar_estilos() {

    // CSS global
    wp_enqueue_style( 'fdg-global', get_template_directory_uri() . '/fdg-global.css', array(), '1.0.7' );

    if ( is_singular( 'plantas' ) ) {
        wp_enqueue_style( 'fdg-fichas-plantas', get_template_directory_uri() . '/fdg-plantas.css', array(), '1.2.0' );
        wp_enqueue_style(  'glightbox-css', 'https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css', array(), '3.3.0' );
        wp_enqueue_script( 'glightbox-js',  'https://cdn.jsdelivr.net/npm/glightbox/dist/js/glightbox.min.js',  array(), '3.3.0', true );
        wp_add_inline_script(
            'glightbox-js',
            "document.addEventListener('DOMContentLoaded',function(){if(typeof GLightbox==='undefined')return;GLightbox({selector:'a.fdg-galeria__item',touchNavigation:true,loop:true,autoplayVideos:false,slideEffect:'fade',closeButton:true});});"
        );
    }
    if ( is_singular( 'insectos' ) ) {
        wp_enqueue_style( 'fdg-fichas-plantas', get_template_directory_uri() . '/fdg-plantas.css', array(), '1.2.0' );
        wp_enqueue_style(  'glightbox-css', 'https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css', array(), '3.3.0' );
        wp_enqueue_script( 'glightbox-js',  'https://cdn.jsdelivr.net/npm/glightbox/dist/js/glightbox.min.js',  array(), '3.3.0', true );
        wp_add_inline_script(
            'glightbox-js',
            "document.addEventListener('DOMContentLoaded',function(){if(typeof GLightbox==='undefined')return;GLightbox({selector:'a.fdg-galeria__item',touchNavigation:true,loop:true,autoplayVideos:true,slideEffect:'fade',closeButton:true});});"
        );
    }
    if ( is_page( 'insectos' ) || is_page( 'catalogo-insectos' ) ) {
        wp_enqueue_style( 'fdg-archivo',  get_template_directory_uri() . '/fdg-archivo.css',  array(), '1.1.0' );
        wp_enqueue_style( 'fdg-home',     get_template_directory_uri() . '/fdg-home.css',      array(), '1.0.5' );
    }

    if ( is_front_page() || is_page(485) || is_page(248) ) {
        wp_enqueue_style( 'fdg-home', get_template_directory_uri() . '/fdg-home.css', array(), '1.1.1' );
    }
    if ( is_post_type_archive( 'plantas' ) || is_page( 'catalogo' ) ) {
        wp_enqueue_style( 'fdg-archivo', get_template_directory_uri() . '/fdg-archivo.css', array(), '1.1.0' );
        wp_enqueue_style( 'fdg-home',    get_template_directory_uri() . '/fdg-home.css',    array(), '1.0.4' );
    }
    if ( is_page( 'sobre' ) ) {
        wp_enqueue_style( 'fdg-sobre', get_template_directory_uri() . '/fdg-sobre.css', array(), '1.0.0' );
    }
    if ( is_home() || is_single() ) {
        wp_enqueue_style( 'fdg-blog', get_template_directory_uri() . '/fdg-blog.css', array(), '1.0.1' );
    }
    if ( is_single() ) {
        wp_enqueue_style(  'glightbox-css', 'https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css', array(), '3.3.0' );
        wp_enqueue_script( 'glightbox-js',  'https://cdn.jsdelivr.net/npm/glightbox/dist/js/glightbox.min.js',  array(), '3.3.0', true );
    }
    if ( is_singular( 'plantas' ) ) {
        wp_enqueue_style(  'glightbox-css', 'https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css', array(), '3.3.0' );
        wp_enqueue_script( 'glightbox-js',  'https://cdn.jsdelivr.net/npm/glightbox/dist/js/glightbox.min.js',  array(), '3.3.0', true );
    }
}

add_action( 'wp_head', 'fdg_galeria_css_override', 99999 );
function fdg_galeria_css_override() {
    if ( ! is_singular( array( 'plantas', 'insectos' ) ) ) {
        return;
    }
    ?>
<style id="fdg-galeria-override">
.fdg-galeria__grid--multi { grid-auto-rows: 140px !important; grid-template-rows: none !important; }
.fdg-galeria__grid--multi .fdg-galeria__item--principal { grid-row: 1 / span 3 !important; min-height: 420px !important; height: auto !important; }
.fdg-galeria__item img,
.fdg-galeria__item--video img,
.fdg-galeria__item--video video {
  height: 200px !important;
}
.fdg-galeria__item--principal img,
.fdg-galeria__item--principal.fdg-galeria__item--video img,
.fdg-galeria__item--principal.fdg-galeria__item--video video {
  height: 280px !important;
}
.fdg-galeria__grid--multi .fdg-galeria__item--principal img,
.fdg-galeria__grid--multi .fdg-galeria__item--principal.fdg-galeria__item--video img,
.fdg-galeria__grid--multi .fdg-galeria__item--principal.fdg-galeria__item--video video {
  height: 420px !important;
}
.fdg-galeria__grid--multi .fdg-galeria__item:not(.fdg-galeria__item--principal) img,
.fdg-galeria__grid--multi .fdg-galeria__item--video:not(.fdg-galeria__item--principal) img,
.fdg-galeria__grid--multi .fdg-galeria__item--video:not(.fdg-galeria__item--principal) video {
  height: 140px !important;
}
</style>
    <?php
}



// Enriquecer el cuaderno de campo del plugin con datos de avistamientos reales
add_action( 'admin_footer', 'fdg_cuaderno_enriquecido' );
function fdg_cuaderno_enriquecido() {
    $screen = get_current_screen();
    if ( ! $screen || strpos($screen->id, 'cuaderno-campo') === false ) return;
    ?>
    <script>
    (function() {
      var CAMPO_URL  = '<?php echo esc_url( home_url('/campo/') ); ?>';
      var API_BASE   = '<?php echo esc_url( rest_url('fdg/v1/') ); ?>';
      var NONCE      = '<?php echo wp_create_nonce('wp_rest'); ?>';

      // Cargar datos de avistamientos por especie
      fetch(API_BASE + 'cuaderno/avistamientos', {
        headers: { 'X-WP-Nonce': NONCE }
      })
      .then(function(r){ return r.json(); })
      .then(function(especies) {
        if (!Array.isArray(especies)) return;

        // Mapa nc (normalizado) → datos
        var mapaEspecies = {};
        especies.forEach(function(e) {
          var clave = (e.nc || '').toLowerCase().trim();
          mapaEspecies[clave] = e;
        });

        // Añadir contador de avistamientos y botón a cada especie del cuaderno
        // El plugin muestra las especies en elementos con clase o estructura específica
        // Buscamos por el texto del nombre científico
        var items = document.querySelectorAll('.especie-nombre, .nc, em, i');
        items.forEach(function(el) {
          var nc = (el.textContent || '').toLowerCase().trim();
          var datos = mapaEspecies[nc];
          if (!datos) return;
          if (el.dataset.fdgEnriquecido) return;
          el.dataset.fdgEnriquecido = '1';

          var wrap = el.closest('.especie-item, .fdg-especie, li, tr, div[class*="especie"]') || el.parentElement;
          if (!wrap || wrap.dataset.fdgEnriquecido) return;
          wrap.dataset.fdgEnriquecido = '1';

          // Badge de avistamientos
          var badge = document.createElement('span');
          badge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;margin-left:6px;cursor:pointer;' +
            (datos.n_avistamientos > 0
              ? 'background:#eaf3de;color:#2d4a1e;'
              : 'background:#f5f3ee;color:#888;');
          badge.title = datos.n_avistamientos > 0
            ? 'Último: ' + datos.ultimo + ' — Ver en wp-admin'
            : 'Sin avistamientos registrados';
          badge.innerHTML = '&#128205; ' + datos.n_avistamientos;
          if (datos.n_avistamientos > 0) {
            badge.onclick = function(ev) {
              ev.stopPropagation();
              window.open('<?php echo esc_url( admin_url('edit.php?post_type=avistamiento') ); ?>&s=' + encodeURIComponent(datos.nc), '_blank');
            };
          }
          el.after(badge);

          // Botón "Registrar avistamiento"
          var btn = document.createElement('a');
          btn.href = CAMPO_URL + '?especie=' + datos.id;
          btn.target = '_blank';
          btn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#2d4a1e;color:#fff;text-decoration:none;margin-left:6px;white-space:nowrap';
          btn.innerHTML = '+ Registrar avistamiento';
          btn.title = 'Abrir panel de campo con esta especie preseleccionada';
          el.after(btn);
        });

        // También actualizar los contadores generales si existen
        var totalAvis = especies.reduce(function(s,e){ return s + e.n_avistamientos; }, 0);
        var countEls = document.querySelectorAll('[data-fdg-total-avis]');
        countEls.forEach(function(el){ el.textContent = totalAvis; });
      })
      .catch(function(e){ console.log('FDG: error cargando avistamientos', e); });
    })();
    </script>
    <?php
}

// Ocultar sidebar en fichas de plantas
add_filter( 'generate_sidebar_layout', 'fdg_sin_sidebar_plantas' );
function fdg_sin_sidebar_plantas( $layout ) {
    if ( is_singular( 'plantas' ) ) {
        return 'no-sidebar';
    }
    return $layout;
}






require get_template_directory() . '/fdg-seo-fixes.php';
require get_template_directory() . '/fdg-home-functions.php';

/**
 * Zonas públicas — listas por zona en /zonas/ (sin mapas).
 */
if ( ! defined( 'FDG_ZONAS_PUBLICAS' ) ) {
	define( 'FDG_ZONAS_PUBLICAS', true );
}

if ( FDG_ZONAS_PUBLICAS ) {
	require get_template_directory() . '/fdg-zonas-storage.php';
	require get_template_directory() . '/fdg-zonas-import.php';
	require get_template_directory() . '/fdg-zonas-rest.php';
	require get_template_directory() . '/fdg-zonas-geometry.php';
	require get_template_directory() . '/fdg-zonas-estatico.php';
	require get_template_directory() . '/fdg-zonas-admin.php';
	require get_template_directory() . '/fdg-zonas.php';
	require get_template_directory() . '/fdg-publish-rest.php';
	require get_template_directory() . '/fdg-sync-rest.php';

	add_action(
		'template_redirect',
		function () {
			if ( is_page( 'mapa' ) ) {
				wp_safe_redirect( home_url( '/zonas/' ), 301 );
				exit;
			}
			if ( is_page( 'sierra-de-maria-andres' ) ) {
				wp_safe_redirect( home_url( '/zonas/sierra/' ), 301 );
				exit;
			}
		},
		5
	);

	add_action(
		'init',
		function () {
			if ( get_option( 'fdg_zonas_simple_v3' ) ) {
				return;
			}
			flush_rewrite_rules( false );
			update_option( 'fdg_zonas_simple_v3', 1, false );
		},
		999
	);
} else {
	// Zonas solo en el admin mientras se prepara el mapa.
	add_action( 'init', 'fdg_register_zona_admin_only', 5 );
	function fdg_register_zona_admin_only() {
		register_taxonomy(
			'zona',
			array( 'plantas', 'insectos' ),
			array(
				'labels'             => array(
					'name'          => 'Zonas',
					'singular_name' => 'Zona',
					'menu_name'     => 'Zonas',
				),
				'public'             => false,
				'publicly_queryable' => false,
				'show_ui'            => true,
				'show_in_rest'       => true,
				'hierarchical'       => true,
				'rewrite'            => false,
				'show_admin_column'  => true,
			)
		);
	}

	add_action(
		'init',
		function () {
			if ( get_option( 'fdg_zonas_public_off_v1' ) ) {
				return;
			}
			flush_rewrite_rules( false );
			update_option( 'fdg_zonas_public_off_v1', 1, false );
		},
		999
	);

	add_action( 'template_redirect', 'fdg_redirect_zonas_mapa_off', 1 );
	function fdg_redirect_zonas_mapa_off() {
		if ( is_page( 'mapa' ) || is_page( 'sierra-de-maria-andres' ) || is_page_template( 'page-sierra.php' ) ) {
			wp_safe_redirect( home_url( '/' ), 302 );
			exit;
		}

		$uri = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '';
		if ( preg_match( '#^/zonas(/|$)#', $uri )
			|| preg_match( '#^/zona(/|$)#', $uri )
			|| preg_match( '#^/zona_insecto(/|$)#', $uri )
			|| preg_match( '#^/sierra-de-maria-andres(/|$)#', $uri ) ) {
			wp_safe_redirect( home_url( '/' ), 302 );
			exit;
		}

		if ( is_tax( 'zona' ) || is_tax( 'zona_insecto' ) ) {
			wp_safe_redirect( home_url( '/' ), 302 );
			exit;
		}
	}
}

function fdg_cuaderno_render_v2_ELIMINADA_INICIO___BORRAR_HASTA_CIERRE() {
    // eliminada — este bloque se puede borrar manualmente
    $meses   = array('','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre');
    $mes_nom = $meses[$mes];
    $mes_sig = $mes === 12 ? 1 : $mes + 1;
    $mes_sig_nom = $meses[$mes_sig];

    $n_plantas  = wp_count_posts('plantas')->publish ?? 0;
    $n_insectos = wp_count_posts('insectos')->publish ?? 0;
    $n_avis     = wp_count_posts('avistamiento')->publish ?? 0;
    $n_sin_id   = count( get_posts(array(
        'post_type'=>'avistamiento','numberposts'=>-1,'post_status'=>'publish',
        'meta_query'=>array(array('key'=>'sin_identificar','value'=>'1')),
    )));
    $lista       = get_option( 'fdg_cuaderno_lista', array() );
    $n_pendientes = count( array_filter($lista, function($e){ return empty($e['hecho']); }) );

    // Proximamente
    $prox = get_posts(array(
        'post_type'  => array('plantas','insectos'), 'numberposts'=>-1, 'post_status'=>'publish',
        'meta_query' => array('relation'=>'OR',
            array('key'=>'floracion','value'=>$mes_sig_nom,'compare'=>'LIKE'),
            array('key'=>'vuelo','value'=>$mes_sig_nom,'compare'=>'LIKE'),
        ),
    ));
    $prox_nombres = array_map(function($p){
        $nc    = get_post_meta($p->ID,'nombre_cientifico',true) ?: get_post_meta($p->ID,'nombre_cientifico_ins',true) ?: $p->post_title;
        $comun = get_post_meta($p->ID,'nombre_comun',true) ?: get_post_meta($p->ID,'nombre_comun_ins',true);
        return esc_html($comun ?: $nc);
    }, array_slice($prox, 0, 5));

    $habitats = array(
        'Sierra'   => 'Ruta del castillo · Peña Utrera · Ruta de Santa María',
        'Castañar' => 'Juan Demás · Ruta de los castaños · Arroyo de Santa María',
        'Ribera'   => 'La Romana · Arroyo de Santa María · Baños del Moral',
        'Dehesa'   => 'Dehesas al sur del pueblo · Caminos de Juan Demás',
        'Matorral' => 'Laderas de la sierra · Caminos al castillo',
        'Cultivos' => 'Bordes de caminos · Linderos de fincas',
    );
    $habitat_colores = array(
        'Sierra'=>'#854f0b','Castañar'=>'#3b6d11','Ribera'=>'#185fa5',
        'Dehesa'=>'#639922','Matorral'=>'#b35c00','Cultivos'=>'#888',
    );
    ?>
    <div class="fdg-cc" id="fdg-cc">

        <div class="fdg-cc__header">
            <div>
                <h1>&#127807; Flor de Greda &middot; cuaderno de campo</h1>
                <p>Salvatierra de los Barros &middot; 75 km&sup2; &middot; Flora &middot; Insectos &middot; Hongos</p>
            </div>
            <div class="fdg-cc__stats">
                <?php foreach ([
                    [$n_plantas + $n_insectos, 'fichas', false],
                    [$n_avis,                  'avist.',  false],
                    [$n_sin_id,               'sin id',   $n_sin_id > 0],
                    [$n_pendientes,           'pend.',    false],
                ] as [$n, $lbl, $warn]) : ?>
                <div class="fdg-cc__stat<?php echo $warn ? ' fdg-cc__stat--warn' : ''; ?>">
                    <span class="fdg-cc__stat-n"><?php echo $n; ?></span>
                    <span class="fdg-cc__stat-l"><?php echo $lbl; ?></span>
                </div>
                <?php endforeach; ?>
            </div>
        </div>

        <?php if (!empty($prox_nombres)) : ?>
        <div class="fdg-cc__recordatorio">
            <span>&#128276;</span>
            <span><strong>Recordatorio estacional:</strong> En los próximos 15 días podrías encontrar: <?php echo implode(', ', $prox_nombres); ?>. ¡Prepara la salida!</span>
        </div>
        <?php endif; ?>

        <?php if ($n_sin_id > 0) : ?>
        <div class="fdg-cc__alerta">
            <span>&#9888; <?php echo $n_sin_id; ?> foto<?php echo $n_sin_id > 1 ? 's' : ''; ?> sin identificar en el campo.</span>
            <a href="<?php echo admin_url('edit.php?post_type=avistamiento'); ?>">Identificar ahora &rarr;</a>
        </div>
        <?php endif; ?>

        <div class="fdg-cc__tabs">
            <button class="fdg-cc__tab fdg-cc__tab--activo" onclick="fdgTab('lista',this)">&#128203; Lista de especies</button>
            <button class="fdg-cc__tab" onclick="fdgTab('planificador',this)">&#128197; Planificador</button>
            <button class="fdg-cc__tab" onclick="fdgTab('rutas',this)">&#127956; Rutas por hábitat</button>
            <button class="fdg-cc__tab" onclick="fdgTab('catalogo',this)">&#128218; Catálogo web</button>
        </div>

        <!-- LISTA DE ESPECIES PENDIENTES -->
        <div id="fdg-panel-lista" class="fdg-cc__panel">
            <div class="fdg-cc__toolbar">
                <input type="text" id="fdg-buscar" placeholder="&#128269; Buscar..." class="fdg-cc__search" oninput="fdgFiltrar()">
                <div class="fdg-cc__filtros">
                    <?php foreach ([
                        ['todas','Todas'],['planta','Plantas'],['insecto','Insectos'],
                        ['pendientes','Pendientes'],['catalogadas','&#10003; Catalogadas'],['urgentes','&#128293; Urgentes'],
                    ] as [$v,$l]) : ?>
                    <button class="fdg-cc__btn<?php echo $v==='todas'?' fdg-cc__btn--activo':''; ?>" onclick="fdgSetFiltro('<?php echo $v; ?>',this)"><?php echo $l; ?></button>
                    <?php endforeach; ?>
                    <button class="fdg-cc__btn fdg-cc__btn--primary" onclick="fdgAbrirModal()">+ Añadir</button>
                </div>
            </div>
            <div class="fdg-cc__acciones">
                <button class="fdg-cc__btn fdg-cc__btn--sm" onclick="fdgExportarCSV()">&#128190; Exportar CSV</button>
                <label class="fdg-cc__btn fdg-cc__btn--sm fdg-cc__btn--import">&#128229; Importar CSV<input type="file" id="fdg-importar-csv" accept=".csv" style="display:none" onchange="fdgImportarCSV(this)"></label>
                <button class="fdg-cc__btn fdg-cc__btn--sm" onclick="fdgImprimirPDF()">&#128196; Informe PDF</button>
                <span id="fdg-contador" class="fdg-cc__contador"></span>
            </div>
            <div id="fdg-lista-container"></div>
        </div>

        <!-- PLANIFICADOR POR MES -->
        <div id="fdg-panel-planificador" class="fdg-cc__panel" style="display:none">
            <div class="fdg-cc__meses-grid" id="fdg-meses-grid">
                <?php foreach ($meses as $i => $m) :
                    if ($i === 0) continue;
                    $activo = $i === $mes ? 'fdg-cc__mes--activo' : '';
                ?>
                <button class="fdg-cc__mes <?php echo $activo; ?>" onclick="fdgSelMes(<?php echo $i; ?>,this)" id="fdg-mes-btn-<?php echo $i; ?>">
                    <?php echo substr($m, 0, 3); ?><span class="fdg-cc__mes-cnt" id="fdg-mes-cnt-<?php echo $i; ?>"></span>
                </button>
                <?php endforeach; ?>
            </div>
            <div id="fdg-planif-contenido"></div>
        </div>

        <!-- RUTAS POR HABITAT -->
        <div id="fdg-panel-rutas" class="fdg-cc__panel" style="display:none">
            <?php foreach ($habitats as $hab => $ruta) :
                $color = $habitat_colores[$hab] ?? '#888';
            ?>
            <div class="fdg-cc__ruta-card" style="border-left:4px solid <?php echo $color; ?>">
                <div class="fdg-cc__ruta-header">
                    <strong><?php echo $hab; ?></strong>
                    <span class="fdg-cc__ruta-ruta"><?php echo esc_html($ruta); ?></span>
                </div>
                <div class="fdg-cc__ruta-especies" id="fdg-hab-<?php echo sanitize_title($hab); ?>">
                    <em>Cargando...</em>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- CATALOGO WEB -->
        <div id="fdg-panel-catalogo" class="fdg-cc__panel" style="display:none">
            <div class="fdg-cc__cat-header">
                <span id="fdg-cat-total"></span>
                <div class="fdg-cc__cat-actions">
                    <a href="<?php echo admin_url('post-new.php?post_type=plantas'); ?>" class="fdg-cc__btn fdg-cc__btn--sm">+ Nueva planta</a>
                    <a href="<?php echo admin_url('post-new.php?post_type=insectos'); ?>" class="fdg-cc__btn fdg-cc__btn--sm">+ Nuevo insecto</a>
                    <a href="<?php echo admin_url('edit.php?post_type=avistamiento'); ?>" class="fdg-cc__btn fdg-cc__btn--sm fdg-cc__btn--warn">Avistamientos</a>
                    <a href="<?php echo home_url('/campo/'); ?>" target="_blank" class="fdg-cc__btn fdg-cc__btn--sm fdg-cc__btn--campo">&#128205; Panel de campo</a>
                </div>
            </div>
            <div id="fdg-cat-lista"></div>
        </div>

    </div>

    <!-- MODAL AÑADIR/EDITAR -->
    <div id="fdg-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:none;align-items:center;justify-content:center">
        <div class="fdg-cc__modal">
            <div class="fdg-cc__modal-header">
                <h2 id="fdg-modal-titulo">Nueva especie pendiente</h2>
                <button onclick="fdgCerrarModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888">&times;</button>
            </div>
            <div class="fdg-cc__modal-body">
                <input type="hidden" id="fdg-edit-id" value="">
                <div class="fdg-cc__field"><label>Nombre científico *</label><input type="text" id="fdg-nc" placeholder="Ej: Orchis italica"></div>
                <div class="fdg-cc__field"><label>Nombre común</label><input type="text" id="fdg-comun" placeholder="Ej: Orquídea italiana"></div>
                <div class="fdg-cc__field-row">
                    <div class="fdg-cc__field"><label>Tipo</label>
                        <select id="fdg-tipo"><option value="planta">Planta</option><option value="insecto">Insecto</option><option value="hongo">Hongo</option><option value="otro">Otro</option></select>
                    </div>
                    <div class="fdg-cc__field"><label>Hábitat</label>
                        <select id="fdg-habitat"><option>Sierra</option><option>Castañar</option><option>Dehesa</option><option>Ribera</option><option>Matorral</option><option>Cultivos</option><option>Pueblo</option></select>
                    </div>
                </div>
                <div class="fdg-cc__field"><label>Categoría de protección</label>
                    <select id="fdg-protegida">
                        <option value="">No catalogada</option>
                        <option value="peligro">En peligro de extinción</option>
                        <option value="sensible">Sensible a la alteración del hábitat</option>
                        <option value="vulnerable">Vulnerable</option>
                        <option value="interes">De interés especial</option>
                    </select>
                </div>
                <div class="fdg-cc__field"><label>Meses de interés</label>
                    <div class="fdg-cc__meses-check" id="fdg-meses-check"></div>
                </div>
                <div class="fdg-cc__field"><label>Notas</label><textarea id="fdg-notas" rows="3" placeholder="Dónde buscarla, referencias..."></textarea></div>
                <div class="fdg-cc__field"><label>Etiquetas</label><input type="text" id="fdg-etiquetas" placeholder="protegida, orquídea, primavera..."></div>
            </div>
            <div class="fdg-cc__modal-footer">
                <button class="fdg-cc__btn fdg-cc__btn--primary fdg-cc__btn--lg" onclick="fdgGuardar()">Guardar especie</button>
                <button class="fdg-cc__btn" onclick="fdgCerrarModal()">Cancelar</button>
            </div>
        </div>
    </div>
    <?php
}

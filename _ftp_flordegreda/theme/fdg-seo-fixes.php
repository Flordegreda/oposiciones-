<?php
/**
 * Flor de Greda — SEO y meta sociales
 * Subir a: wp-content/themes/generatepress/fdg-seo-fixes.php
 * Añadir al final de functions.php: require get_template_directory() . '/fdg-seo-fixes.php';
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter(
	'wp_sitemaps_add_provider',
	function ( $provider, $name ) {
		return ( 'users' === $name ) ? false : $provider;
	},
	10,
	2
);

add_action(
	'wp_head',
	function () {
		ob_start( 'fdg_seo_clean_head' );
	},
	0
);
add_action(
	'wp_head',
	function () {
		if ( ob_get_level() ) {
			ob_end_flush();
		}
	},
	9999
);

function fdg_seo_clean_head( $html ) {
	$patterns = array(
		'/<meta property="og:[^"]+" content="[^"]*\?\?[^"]*"[^>]*>\s*/i',
		'/<meta name="twitter:[^"]+" content="[^"]*\?\?[^"]*"[^>]*>\s*/i',
		'/<meta property="og:description" content="[^"]*Array[^"]*"[^>]*>\s*/i',
		'/<meta name="twitter:description" content="[^"]*Array[^"]*"[^>]*>\s*/i',
		'/<meta property="og:description" content="(Planta|Insecto)"[^>]*>\s*/i',
		'/<meta name="twitter:description" content="(Planta|Insecto)"[^>]*>\s*/i',
	);
	return preg_replace( $patterns, '', $html );
}

add_action( 'wp_head', 'fdg_output_social_meta', 10000 );

function fdg_output_social_meta() {
	if ( is_admin() ) {
		return;
	}

	$site_name = get_bloginfo( 'name' );
	$sep       = '·';

	if ( is_front_page() || is_home() ) {
		$title = $site_name . ' ' . $sep . ' Plantas e insectos de Salvatierra de los Barros';
		$desc  = 'Catálogo de flora e insectos del bosque encantado de Salvatierra de los Barros (Extremadura). Fichas por zona y cuaderno de campo.';
		echo '<meta name="description" content="' . esc_attr( $desc ) . '" />' . "\n";
		fdg_print_social_tags( $title, $desc, home_url( '/' ), fdg_seo_logo_url() );
		return;
	}

	if ( is_page( 'sierra-de-maria-andres' ) || is_page_template( 'page-sierra.php' ) ) {
		$title = 'Sierra de María Andrés ' . $sep . ' ZEC ES4310066';
		$desc  = '4.009 ha de Red Natura 2000 en los Barros: sierra caliza, endemismos, murciélagos y dehesa. Ficha de la ZEC en Flor de Greda.';
		$image = 'https://flordegreda.es/wp-content/uploads/2026/06/sierra-maria-andres-mapa.png';
		echo '<meta name="description" content="' . esc_attr( $desc ) . '" />' . "\n";
		fdg_print_social_tags( $title, $desc, get_permalink(), $image );
		return;
	}

	if ( ! is_singular( array( 'plantas', 'insectos', 'post', 'page' ) ) ) {
		return;
	}

	$post_id = get_queried_object_id();
	if ( ! $post_id ) {
		return;
	}

	$post  = get_post( $post_id );
	$type  = get_post_type( $post_id );
	$title = get_the_title( $post_id );

	if ( 'plantas' === $type ) {
		$nc    = get_post_meta( $post_id, 'nombre_cientifico', true );
		$comun = get_post_meta( $post_id, 'nombre_comun', true );
		if ( $comun && $nc ) {
			$title = $comun . ' (' . $nc . ')';
		} elseif ( $nc ) {
			$title = $nc;
		}
	} elseif ( 'insectos' === $type ) {
		$nc    = get_post_meta( $post_id, 'nombre_cientifico_ins', true );
		$comun = get_post_meta( $post_id, 'nombre_comun_ins', true );
		if ( $comun && $nc ) {
			$title = $comun . ' (' . $nc . ')';
		} elseif ( $nc ) {
			$title = $nc;
		}
	}

	$desc = wp_strip_all_tags( get_the_excerpt( $post ) );
	if ( ! $desc ) {
		$desc = wp_trim_words( wp_strip_all_tags( $post->post_content ), 35, '…' );
	}
	if ( ! $desc ) {
		$label = ( 'insectos' === $type ) ? 'Insecto' : 'Planta';
		$desc  = $title . ' — ' . $label . ' del catálogo Flor de Greda en Salvatierra de los Barros.';
	}

	$image      = get_the_post_thumbnail_url( $post_id, 'full' );
	$full_title = trim( $title ) . ' ' . $sep . ' ' . $site_name;
	echo '<meta name="description" content="' . esc_attr( $desc ) . '" />' . "\n";
	fdg_print_social_tags( $full_title, $desc, get_permalink( $post_id ), $image );
}

function fdg_seo_logo_url() {
	$logo_id = get_theme_mod( 'custom_logo' );
	return $logo_id ? wp_get_attachment_image_url( $logo_id, 'full' ) : '';
}

function fdg_print_social_tags( $title, $description, $url, $image = '' ) {
	$type = ( is_front_page() || is_home() ) ? 'website' : 'article';
	echo '<meta property="og:type" content="' . esc_attr( $type ) . '" />' . "\n";
	echo '<meta property="og:site_name" content="' . esc_attr( get_bloginfo( 'name' ) ) . '" />' . "\n";
	echo '<meta property="og:title" content="' . esc_attr( $title ) . '" />' . "\n";
	echo '<meta property="og:description" content="' . esc_attr( $description ) . '" />' . "\n";
	echo '<meta property="og:url" content="' . esc_url( $url ) . '" />' . "\n";
	if ( $image ) {
		echo '<meta property="og:image" content="' . esc_url( $image ) . '" />' . "\n";
	}
	echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
	echo '<meta name="twitter:title" content="' . esc_attr( $title ) . '" />' . "\n";
	echo '<meta name="twitter:description" content="' . esc_attr( $description ) . '" />' . "\n";
	if ( $image ) {
		echo '<meta name="twitter:image" content="' . esc_url( $image ) . '" />' . "\n";
	}
}

add_action( 'wp_footer', 'fdg_back_to_top_button', 50 );

function fdg_back_to_top_button() {
	if ( is_admin() ) {
		return;
	}
	?>
	<button type="button" class="fdg-back-to-top" id="fdg-back-to-top" aria-label="<?php esc_attr_e( 'Ir arriba', 'generatepress' ); ?>">&#8593;</button>
	<script>
	(function () {
		var btn = document.getElementById('fdg-back-to-top');
		if (!btn) return;
		window.addEventListener('scroll', function () {
			btn.classList.toggle('is-visible', window.scrollY > 400);
		}, { passive: true });
		btn.classList.toggle('is-visible', window.scrollY > 400);
		btn.addEventListener('click', function () {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		});
	})();
	</script>
	<?php
}

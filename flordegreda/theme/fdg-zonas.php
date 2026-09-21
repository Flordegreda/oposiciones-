<?php
/**
 * Flor de Greda — Zonas unificadas (una sola taxonomía para plantas e insectos)
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Taxonomía única "zona" — plantas + insectos
// ---------------------------------------------------------------------------
add_action( 'init', 'fdg_register_zona_taxonomy', 5 );
function fdg_register_zona_taxonomy() {
	register_taxonomy(
		'zona',
		array( 'plantas', 'insectos' ),
		array(
			'labels'            => array(
				'name'          => 'Zonas',
				'singular_name' => 'Zona',
				'menu_name'     => 'Zonas',
				'all_items'     => 'Todas las zonas',
				'add_new_item'  => 'Añadir zona',
				'edit_item'     => 'Editar zona',
			),
			'public'            => true,
			'show_ui'           => true,
			'show_in_rest'      => true,
			'hierarchical'      => true,
			'rewrite'           => array( 'slug' => 'zona' ),
			'show_admin_column' => true,
		)
	);
}

// Gestionar zonas solo desde Plantas → Zonas (evita duplicar menú en insectos)
add_action(
	'admin_menu',
	function () {
		remove_submenu_page( 'edit.php?post_type=insectos', 'edit-tags.php?taxonomy=zona&amp;post_type=insectos' );
	},
	999
);

// ---------------------------------------------------------------------------
// Migración única: zona_insecto → zona
// ---------------------------------------------------------------------------
add_action( 'init', 'fdg_migrate_zona_insecto_to_zona', 15 );
function fdg_migrate_zona_insecto_to_zona() {
	if ( get_option( 'fdg_zona_unified_v2' ) ) {
		return;
	}

	// Registrar temporalmente la taxonomía antigua para poder leer sus términos.
	if ( ! taxonomy_exists( 'zona_insecto' ) ) {
		register_taxonomy(
			'zona_insecto',
			'insectos',
			array(
				'public' => false,
			)
		);
	}

	$old_terms = get_terms(
		array(
			'taxonomy'   => 'zona_insecto',
			'hide_empty' => false,
		)
	);

	if ( is_wp_error( $old_terms ) ) {
		return;
	}

	foreach ( $old_terms as $old ) {
		$new = get_term_by( 'slug', $old->slug, 'zona' );
		if ( ! $new ) {
			$result = wp_insert_term(
				$old->name,
				'zona',
				array(
					'slug'        => $old->slug,
					'description' => $old->description,
				)
			);
			$new_id = is_wp_error( $result ) ? 0 : (int) $result['term_id'];
		} else {
			$new_id = (int) $new->term_id;
		}

		if ( ! $new_id ) {
			continue;
		}

		$insectos = get_posts(
			array(
				'post_type'      => 'insectos',
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'tax_query'      => array(
					array(
						'taxonomy' => 'zona_insecto',
						'field'    => 'term_id',
						'terms'    => $old->term_id,
					),
				),
			)
		);

		foreach ( $insectos as $post_id ) {
			$zona_ids = wp_get_object_terms( $post_id, 'zona', array( 'fields' => 'ids' ) );
			if ( is_wp_error( $zona_ids ) ) {
				$zona_ids = array();
			}
			if ( ! in_array( $new_id, $zona_ids, true ) ) {
				$zona_ids[] = $new_id;
			}
			wp_set_object_terms( $post_id, $zona_ids, 'zona', false );
			wp_remove_object_terms( $post_id, $old->term_id, 'zona_insecto' );
		}
	}

	update_option( 'fdg_zona_unified_v2', 1, false );
	delete_option( 'fdg_zonas_rewrite_flushed' );
	delete_option( 'fdg_zona_unified_done' );
}

// ---------------------------------------------------------------------------
// Sincronizar post_meta "zona" → taxonomía "zona" en plantas
// ---------------------------------------------------------------------------
function fdg_sync_plantas_zona_taxonomy( $post_id ) {
	if ( get_post_type( $post_id ) !== 'plantas' ) {
		return;
	}

	$zona_raw = get_post_meta( $post_id, 'zona', true );
	if ( is_string( $zona_raw ) && strpos( $zona_raw, 'a:' ) === 0 ) {
		$zona_raw = maybe_unserialize( $zona_raw );
	}
	if ( ! is_array( $zona_raw ) ) {
		$zona_raw = array();
	}

	$term_ids = array_filter( array_map( 'intval', $zona_raw ) );
	wp_set_object_terms( $post_id, $term_ids, 'zona', false );
}

add_action( 'save_post_plantas', 'fdg_sync_plantas_zona_taxonomy', 20 );
add_action(
	'acf/save_post',
	function ( $post_id ) {
		if ( get_post_type( $post_id ) === 'plantas' ) {
			fdg_sync_plantas_zona_taxonomy( $post_id );
		}
	},
	20
);

add_action(
	'init',
	function () {
		if ( get_option( 'fdg_zona_sync_v3' ) ) {
			return;
		}

		$plantas = get_posts(
			array(
				'post_type'      => 'plantas',
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			)
		);

		foreach ( $plantas as $post_id ) {
			fdg_sync_plantas_zona_taxonomy( $post_id );
		}

		update_option( 'fdg_zona_sync_v3', 1, false );
	},
	100
);

// ---------------------------------------------------------------------------
// Fusión única: Sierra María Andrés → Sierra
// ---------------------------------------------------------------------------
add_action( 'init', 'fdg_merge_sierra_zonas', 101 );
function fdg_merge_sierra_zonas() {
	if ( get_option( 'fdg_sierra_merged_v1' ) ) {
		return;
	}

	$keep = get_term_by( 'slug', 'sierra', 'zona' );
	$drop = get_term_by( 'slug', 'sierra-maria-andres', 'zona' );

	if ( ! $keep || is_wp_error( $keep ) ) {
		update_option( 'fdg_sierra_merged_v1', 1, false );
		return;
	}

	$keep_id = (int) $keep->term_id;

	if ( $drop && ! is_wp_error( $drop ) ) {
		$drop_id = (int) $drop->term_id;

		foreach ( array( 'plantas', 'insectos' ) as $post_type ) {
			$posts = get_posts(
				array(
					'post_type'      => $post_type,
					'post_status'    => 'any',
					'posts_per_page' => -1,
					'fields'         => 'ids',
					'tax_query'      => array(
						array(
							'taxonomy' => 'zona',
							'field'    => 'term_id',
							'terms'    => $drop_id,
						),
					),
				)
			);

			foreach ( $posts as $post_id ) {
				$term_ids = wp_get_object_terms( $post_id, 'zona', array( 'fields' => 'ids' ) );
				if ( is_wp_error( $term_ids ) ) {
					$term_ids = array();
				}
				$term_ids = array_diff( array_map( 'intval', $term_ids ), array( $drop_id ) );
				$term_ids[] = $keep_id;
				$term_ids = array_values( array_unique( $term_ids ) );
				wp_set_object_terms( $post_id, $term_ids, 'zona', false );
			}
		}

		$plantas = get_posts(
			array(
				'post_type'      => 'plantas',
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			)
		);

		foreach ( $plantas as $post_id ) {
			$zona_raw = get_post_meta( $post_id, 'zona', true );
			if ( is_string( $zona_raw ) && strpos( $zona_raw, 'a:' ) === 0 ) {
				$zona_raw = maybe_unserialize( $zona_raw );
			}
			if ( ! is_array( $zona_raw ) ) {
				continue;
			}
			$ids = array_map( 'intval', $zona_raw );
			$ids = array_diff( $ids, array( $drop_id ) );
			$ids[] = $keep_id;
			$ids = array_values( array_unique( array_filter( $ids ) ) );
			update_post_meta( $post_id, 'zona', $ids );
			wp_set_object_terms( $post_id, $ids, 'zona', false );
		}

		wp_delete_term( $drop_id, 'zona' );
	}

	update_option( 'fdg_sierra_merged_v1', 1, false );
}

function fdg_get_post_zona_terms( $post_id ) {
	$terms = get_the_terms( $post_id, 'zona' );
	if ( $terms && ! is_wp_error( $terms ) && ! empty( $terms ) ) {
		return $terms;
	}

	if ( get_post_type( $post_id ) !== 'plantas' ) {
		return array();
	}

	$zona_raw = get_post_meta( $post_id, 'zona', true );
	if ( is_string( $zona_raw ) && strpos( $zona_raw, 'a:' ) === 0 ) {
		$zona_raw = maybe_unserialize( $zona_raw );
	}
	if ( ! is_array( $zona_raw ) ) {
		return array();
	}

	$out = array();
	foreach ( $zona_raw as $zid ) {
		$t = get_term( (int) $zid, 'zona' );
		if ( $t && ! is_wp_error( $t ) ) {
			$out[] = $t;
		}
	}
	return $out;
}

function fdg_render_zona_links( $post_id ) {
	$terms = fdg_get_post_zona_terms( $post_id );
	if ( empty( $terms ) ) {
		return;
	}

	$seen   = array();
	$render = array();
	foreach ( $terms as $t ) {
		$top = $t;
		while ( $top->parent ) {
			$parent = get_term( (int) $top->parent, 'zona' );
			if ( ! $parent || is_wp_error( $parent ) ) {
				break;
			}
			$top = $parent;
		}
		if ( isset( $seen[ $top->term_id ] ) ) {
			continue;
		}
		$seen[ $top->term_id ] = true;
		$render[]              = $top;
	}

	foreach ( $render as $t ) {
		printf(
			'<a class="fdg-zona-link" href="%s">%s</a>',
			esc_url( home_url( '/zonas/' . $t->slug . '/' ) ),
			esc_html( $t->name )
		);
	}
}

// ---------------------------------------------------------------------------
// URLs /zonas/ y /zonas/{slug}/  (sierra editorial = página WP en /zonas/sierra/)
// ---------------------------------------------------------------------------
function fdg_is_sierra_zec_page() {
	if ( is_page_template( 'page-sierra.php' ) ) {
		return true;
	}
	if ( ! get_query_var( 'fdg_zonas' ) ) {
		return false;
	}
	$slug = sanitize_title( get_query_var( 'fdg_zona_slug' ) );
	$view = sanitize_key( get_query_var( 'fdg_zona_view' ) );
	return 'sierra' === $slug && 'especies' !== $view;
}

function fdg_get_sierra_page_id() {
	static $page_id = null;
	if ( null !== $page_id ) {
		return $page_id;
	}
	$page = get_page_by_path( 'zonas/sierra' );
	if ( ! $page ) {
		$page = get_page_by_path( 'sierra' );
	}
	$page_id = ( $page && ! is_wp_error( $page ) ) ? (int) $page->ID : 0;
	return $page_id;
}

function fdg_render_sierra_zec_content() {
	require get_template_directory() . '/fdg-sierra-zec.php';
}

add_action(
	'init',
	function () {
		add_rewrite_rule( '^zonas/sierra/especies/?$', 'index.php?fdg_zonas=1&fdg_zona_slug=sierra&fdg_zona_view=especies', 'top' );
		add_rewrite_rule( '^zonas/?$', 'index.php?fdg_zonas=1', 'top' );
		add_rewrite_rule( '^zonas/(?!sierra/?$)([^/]+)/?$', 'index.php?fdg_zonas=1&fdg_zona_slug=$matches[1]', 'top' );
		add_rewrite_rule( '^zona_insecto/([^/]+)/?$', 'index.php?fdg_zonas=1&fdg_zona_slug=$matches[1]', 'top' );
	}
);

add_filter(
	'query_vars',
	function ( $vars ) {
		$vars[] = 'fdg_zonas';
		$vars[] = 'fdg_zona_slug';
		$vars[] = 'fdg_zona_view';
		return $vars;
	}
);

add_filter(
	'template_include',
	function ( $template ) {
		if ( get_query_var( 'fdg_zonas' ) ) {
			return get_template_directory() . '/fdg-page-zonas.php';
		}
		return $template;
	}
);

add_action(
	'init',
	function () {
		if ( get_option( 'fdg_zonas_rewrite_flushed' ) && get_option( 'fdg_zona_insecto_rewrite' ) && get_option( 'fdg_zona_sierra_especies_rewrite' ) && get_option( 'fdg_zonas_sierra_wp_page' ) ) {
			return;
		}
		flush_rewrite_rules( false );
		update_option( 'fdg_zonas_rewrite_flushed', 1, false );
		update_option( 'fdg_zona_insecto_rewrite', 1, false );
		update_option( 'fdg_zona_sierra_especies_rewrite', 1, false );
		update_option( 'fdg_zonas_sierra_wp_page', 1, false );
	},
	999
);

// Archivos antiguos → página unificada
add_action(
	'template_redirect',
	function () {
		$slug = get_query_var( 'fdg_zona_slug' );
		if ( $slug === 'sierra-maria-andres' ) {
			wp_safe_redirect( home_url( '/zonas/sierra/' ), 301 );
			exit;
		}

		if ( get_query_var( 'fdg_zonas' ) && 'sierra' === sanitize_title( $slug ) && 'especies' !== sanitize_key( get_query_var( 'fdg_zona_view' ) ) ) {
			$sierra_page = fdg_get_sierra_page_id();
			if ( $sierra_page ) {
				wp_safe_redirect( get_permalink( $sierra_page ), 301 );
				exit;
			}
		}

		if ( is_tax( 'zona' ) || is_tax( 'zona_insecto' ) ) {
			$term = get_queried_object();
			if ( $term && ! is_wp_error( $term ) && ! empty( $term->slug ) ) {
				wp_safe_redirect( home_url( '/zonas/' . $term->slug . '/' ), 301 );
				exit;
			}
		}
	}
);

// ---------------------------------------------------------------------------
// Consultas por zona
// ---------------------------------------------------------------------------
function fdg_get_zona_catalog( $slug ) {
	$plantas  = array();
	$insectos = array();
	$nombre   = '';

	$term = get_term_by( 'slug', $slug, 'zona' );
	if ( ! $term || is_wp_error( $term ) ) {
		return array(
			'nombre'   => '',
			'plantas'  => array(),
			'insectos' => array(),
		);
	}

	$nombre = $term->name;

	$q = new WP_Query(
		array(
			'post_type'      => 'plantas',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'tax_query'      => array(
				array(
					'taxonomy' => 'zona',
					'field'    => 'term_id',
					'terms'    => $term->term_id,
				),
			),
		)
	);
	if ( $q->have_posts() ) {
		$plantas = $q->posts;
	}
	wp_reset_postdata();

	if ( empty( $plantas ) ) {
		$all = get_posts(
			array(
				'post_type'      => 'plantas',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		foreach ( $all as $p ) {
			$zona_raw = get_post_meta( $p->ID, 'zona', true );
			if ( is_string( $zona_raw ) && strpos( $zona_raw, 'a:' ) === 0 ) {
				$zona_raw = maybe_unserialize( $zona_raw );
			}
			if ( is_array( $zona_raw ) && in_array( (string) $term->term_id, array_map( 'strval', $zona_raw ), true ) ) {
				$plantas[] = $p;
			}
		}
	}

	$insectos = get_posts(
		array(
			'post_type'      => 'insectos',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'tax_query'      => array(
				array(
					'taxonomy' => 'zona',
					'field'    => 'term_id',
					'terms'    => $term->term_id,
				),
			),
		)
	);

	return array(
		'nombre'   => $nombre,
		'plantas'  => $plantas,
		'insectos' => $insectos,
	);
}

function fdg_get_all_zonas() {
	$zonas = array();

	$terms = get_terms(
		array(
			'taxonomy'   => 'zona',
			'hide_empty' => false,
			'parent'     => 0,
		)
	);

	if ( is_wp_error( $terms ) ) {
		return $zonas;
	}

	foreach ( $terms as $term ) {
		$zonas[ $term->slug ] = array(
			'slug'   => $term->slug,
			'nombre' => $term->name,
		);
	}

	uasort(
		$zonas,
		function ( $a, $b ) {
			return strcasecmp( $a['nombre'], $b['nombre'] );
		}
	);

	return $zonas;
}

function fdg_zona_card_planta( $post ) {
	$id     = $post->ID;
	$nc     = get_post_meta( $id, 'nombre_cientifico', true ) ?: get_the_title( $post );
	$comun  = get_post_meta( $id, 'nombre_comun', true );
	$img    = get_the_post_thumbnail_url( $id, 'large' );
	$fam    = '';
	$fam_id = get_post_meta( $id, 'familia', true );
	if ( $fam_id ) {
		$ft = get_term( (int) $fam_id, 'category' );
		if ( $ft && ! is_wp_error( $ft ) ) {
			$fam = $ft->name;
		}
	}
	$flora_raw = get_post_meta( $id, 'floracion', true );
	if ( is_string( $flora_raw ) && strpos( $flora_raw, 'a:' ) === 0 ) {
		$flora_raw = maybe_unserialize( $flora_raw );
	}
	$meses_str = is_array( $flora_raw ) ? implode( ' – ', $flora_raw ) : '';
	?>
	<a href="<?php echo esc_url( get_permalink( $post ) ); ?>" class="fdg-tarjeta">
		<div class="fdg-tarjeta__imagen <?php echo ! $img ? 'fdg-tarjeta__imagen--vacia' : ''; ?>">
			<?php if ( $img ) : ?>
				<img src="<?php echo esc_url( $img ); ?>" alt="<?php echo esc_attr( $nc ); ?>" loading="lazy">
			<?php else : ?>
				<span class="fdg-tarjeta__imagen-placeholder">🌿</span>
			<?php endif; ?>
			<?php if ( $fam ) : ?>
				<span class="fdg-tarjeta__familia"><?php echo esc_html( $fam ); ?></span>
			<?php endif; ?>
		</div>
		<div class="fdg-tarjeta__info">
			<h3 class="fdg-tarjeta__nombre-cientifico"><?php echo esc_html( $nc ); ?></h3>
			<p class="fdg-tarjeta__nombre-comun"><?php echo $comun ? esc_html( $comun ) : '—'; ?></p>
			<div class="fdg-tarjeta__meta">
				<span class="fdg-tarjeta__floracion">🌸 <?php echo $meses_str ?: '—'; ?></span>
			</div>
		</div>
	</a>
	<?php
}

function fdg_zona_card_insecto( $post ) {
	$id        = $post->ID;
	$nc        = get_post_meta( $id, 'nombre_cientifico_ins', true ) ?: get_the_title( $post );
	$comun     = get_post_meta( $id, 'nombre_comun_ins', true );
	$img       = get_the_post_thumbnail_url( $id, 'large' );
	$orden     = get_post_meta( $id, 'familia_ins', true );
	$vuelo_raw = get_post_meta( $id, 'vuelo', true );
	if ( is_string( $vuelo_raw ) && strpos( $vuelo_raw, 'a:' ) === 0 ) {
		$vuelo_raw = maybe_unserialize( $vuelo_raw );
	}
	$meses_str = is_array( $vuelo_raw ) ? implode( ' – ', $vuelo_raw ) : '';
	?>
	<a href="<?php echo esc_url( get_permalink( $post ) ); ?>" class="fdg-tarjeta">
		<div class="fdg-tarjeta__imagen <?php echo ! $img ? 'fdg-tarjeta__imagen--vacia' : ''; ?>">
			<?php if ( $img ) : ?>
				<img src="<?php echo esc_url( $img ); ?>" alt="<?php echo esc_attr( $nc ); ?>" loading="lazy">
			<?php else : ?>
				<span class="fdg-tarjeta__imagen-placeholder">🦋</span>
			<?php endif; ?>
			<?php if ( $orden ) : ?>
				<span class="fdg-tarjeta__familia"><?php echo esc_html( $orden ); ?></span>
			<?php endif; ?>
		</div>
		<div class="fdg-tarjeta__info">
			<h3 class="fdg-tarjeta__nombre-cientifico"><?php echo esc_html( $nc ); ?></h3>
			<p class="fdg-tarjeta__nombre-comun"><?php echo $comun ? esc_html( $comun ) : '—'; ?></p>
			<div class="fdg-tarjeta__meta">
				<span class="fdg-tarjeta__floracion">🦋 <?php echo $meses_str ?: '—'; ?></span>
			</div>
		</div>
	</a>
	<?php
}

// ---------------------------------------------------------------------------
// Estilos y menú
// ---------------------------------------------------------------------------
function fdg_enqueue_sierra_zec() {
	$uri = get_template_directory_uri();
	$ver = '1.2.3';
	wp_enqueue_style( 'leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', array(), '1.9.4' );
	wp_enqueue_script( 'leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', array(), '1.9.4', true );
	wp_enqueue_style( 'fdg-home', $uri . '/fdg-home.css', array(), '1.2.1' );
	wp_enqueue_style( 'fdg-sierra', $uri . '/fdg-sierra.css', array( 'fdg-home' ), '1.1.1' );
	wp_enqueue_style( 'fdg-sierra-zec', $uri . '/fdg-sierra-zec.css', array( 'fdg-sierra' ), $ver );
	wp_enqueue_script( 'fdg-sierra-zec', $uri . '/fdg-sierra-zec.js', array( 'leaflet-js' ), $ver, true );
	wp_localize_script(
		'fdg-sierra-zec',
		'fdgSierraZec',
		array(
			'geojsonUrl' => function_exists( 'fdg_home_sierra_geojson_url' )
				? fdg_home_sierra_geojson_url()
				: rest_url( 'fdg/v1/sierra-mapa-home' ),
		)
	);
}

add_action(
	'wp_enqueue_scripts',
	function () {
		if ( fdg_is_sierra_zec_page() ) {
			fdg_enqueue_sierra_zec();
			return;
		}
		if ( ! get_query_var( 'fdg_zonas' ) ) {
			return;
		}
		wp_enqueue_style( 'fdg-archivo', get_template_directory_uri() . '/fdg-archivo.css', array(), '1.2.1' );
		wp_enqueue_style( 'fdg-home', get_template_directory_uri() . '/fdg-home.css', array(), '1.2.0' );
		if ( ! get_query_var( 'fdg_zona_slug' ) && function_exists( 'fdg_mapa_zonas_has_data' ) && fdg_mapa_zonas_has_data() && function_exists( 'fdg_enqueue_mapa_zonas_estatico' ) ) {
			fdg_enqueue_mapa_zonas_estatico();
		}
	},
	30
);

add_filter(
	'body_class',
	function ( $classes ) {
		if ( get_query_var( 'fdg_zonas' ) ) {
			$classes   = array_diff( $classes, array( 'home', 'blog' ) );
			$classes[] = 'fdg-zonas-page';
		}
		if ( fdg_is_sierra_zec_page() ) {
			$classes[] = 'fdg-sierra-zec-page';
		}
		if ( get_query_var( 'fdg_zonas' ) && ! get_query_var( 'fdg_zona_slug' ) && function_exists( 'fdg_mapa_zonas_has_data' ) && fdg_mapa_zonas_has_data() ) {
			$classes[] = 'fdg-zonas-index';
		}
		return $classes;
	}
);

add_action(
	'wp_enqueue_scripts',
	function () {
		if ( ! is_singular( array( 'plantas', 'insectos' ) ) && ! get_query_var( 'fdg_zonas' ) ) {
			return;
		}
		$css = '.fdg-zona-link{display:inline-block;background:#eaf3de;color:#2d5016!important;padding:3px 12px;border-radius:20px;text-decoration:none!important;font-size:14px;margin:2px 4px 2px 0}.fdg-zona-link:hover{background:#d4e8c4}';
		wp_add_inline_style( 'fdg-global', $css );
	},
	40
);

add_filter(
	'wp_nav_menu_objects',
	function ( $items, $args ) {
		if ( empty( $args->theme_location ) || $args->theme_location !== 'primary' ) {
			return $items;
		}

		$has_zonas  = false;
		$has_sierra = false;
		$has_blog   = false;
		$zonas_key  = null;
		$zonas_id   = 0;
		$blog_item  = null;
		foreach ( $items as $key => $item ) {
			$host = (string) wp_parse_url( $item->url, PHP_URL_HOST );
			$path = (string) wp_parse_url( $item->url, PHP_URL_PATH );
			// Sacar Blog del menú WP para recolocarlo al final (después de Zonas).
			if ( 'blog.flordegreda.es' === $host || 'Blog' === $item->title ) {
				$blog_item = $item;
				$has_blog  = true;
				unset( $items[ $key ] );
				continue;
			}
			if ( preg_match( '#/(mapa|sierra-de-maria-andres)(/|$)#', $path ) ) {
				unset( $items[ $key ] );
				continue;
			}
			if ( preg_match( '#/zonas/?$#', $path ) ) {
				$has_zonas = true;
				$zonas_key = $key;
				$zonas_id  = ! empty( $item->db_id ) ? (int) $item->db_id : (int) $item->ID;
			}
			if ( preg_match( '#/zonas/sierra(/|$)#', $path ) ) {
				$has_sierra = true;
			}
		}

		if ( ! $has_zonas ) {
			$zonas_id = 990001;
			$items[]  = (object) array(
				'ID'               => $zonas_id,
				'title'            => 'Zonas',
				'url'              => home_url( '/zonas/' ),
				'menu_item_parent' => 0,
				'classes'          => array( 'menu-item', 'menu-item-zonas' ),
				'type'             => 'custom',
				'object'           => 'custom',
				'object_id'        => '',
				'db_id'            => $zonas_id,
			);
		}

		if ( ! $has_sierra ) {
			$items[] = (object) array(
				'ID'               => 990002,
				'title'            => 'Sierra de María Andrés',
				'url'              => home_url( '/zonas/sierra/' ),
				'menu_item_parent' => $zonas_id,
				'classes'          => array( 'menu-item', 'menu-item-sierra' ),
				'type'             => 'custom',
				'object'           => 'custom',
				'object_id'        => '',
				'db_id'            => 990002,
			);
		}

		// Blog siempre el último a la derecha.
		if ( $has_blog && $blog_item ) {
			$blog_item->menu_item_parent = 0;
			$items[] = $blog_item;
		} else {
			$items[] = (object) array(
				'ID'               => 990003,
				'title'            => 'Blog',
				'url'              => 'https://blog.flordegreda.es/',
				'menu_item_parent' => 0,
				'classes'          => array( 'menu-item', 'menu-item-blog' ),
				'type'             => 'custom',
				'object'           => 'custom',
				'object_id'        => '',
				'db_id'            => 990003,
			);
		}

		return $items;
	},
	10,
	2
);

add_filter(
	'generate_sidebar_layout',
	function ( $layout ) {
		if ( get_query_var( 'fdg_zonas' ) || fdg_is_sierra_zec_page() ) {
			return 'no-sidebar';
		}
		return $layout;
	}
);

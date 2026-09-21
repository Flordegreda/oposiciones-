<?php
/**
 * Plantilla para fichas individuales de plantas — Flor de Greda
 */

get_header();

while ( have_posts() ) : the_post();

  // Leer campos — get_field() si ACF los tiene vinculados, fallback a get_post_meta()
  $nombre_cientifico = get_field('nombre_cientifico') ?: get_post_meta( get_the_ID(), 'nombre_cientifico', true ) ?: get_the_title();
  $nombre_comun      = get_field('nombre_comun')      ?: get_post_meta( get_the_ID(), 'nombre_comun', true );
  $esp_protegida     = get_post_meta( get_the_ID(), 'especie_protegida', true );
  $protegida_labels  = array(
    'peligro'    => array( 'texto' => 'En peligro de extincion',              'color' => '#7b0000', 'bg' => '#fde8e8', 'icono' => '&#9888;' ),
    'sensible'   => array( 'texto' => 'Sensible a la alteracion del habitat', 'color' => '#854f0b', 'bg' => '#fef3e2', 'icono' => '&#9888;' ),
    'vulnerable' => array( 'texto' => 'Vulnerable',                           'color' => '#b35c00', 'bg' => '#fff3e0', 'icono' => '&#9888;' ),
    'interes'    => array( 'texto' => 'De interes especial',                  'color' => '#185fa5', 'bg' => '#e6f1fb', 'icono' => '&#9432;' ),
  );

  // Floración — puede venir serializada o como array de ACF
  $floracion_raw = get_field('floracion');
  if ( ! $floracion_raw ) {
    $floracion_raw = get_post_meta( get_the_ID(), 'floracion', true );
    if ( is_string( $floracion_raw ) && strpos( $floracion_raw, 'a:' ) === 0 ) {
      $floracion_raw = maybe_unserialize( $floracion_raw );
    }
  }
  $floracion = $floracion_raw;

  // Galería — campo ACF 'galeria'
  $galeria = get_field('galeria');
  if ( ! $galeria ) {
    $galeria_raw = get_post_meta( get_the_ID(), 'galeria', true );
    if ( is_string( $galeria_raw ) && strpos( $galeria_raw, 'a:' ) === 0 ) {
      $galeria = maybe_unserialize( $galeria_raw );
    }
  }

  // Familia: ACF taxonomy → category, devuelve ID
  $familia_id  = get_field('familia') ?: get_post_meta( get_the_ID(), 'familia', true );
  $familia_str = '';
  if ( $familia_id ) {
    $term = get_term( (int) $familia_id, 'category' );
    if ( $term && ! is_wp_error( $term ) ) $familia_str = $term->name;
  }
  if ( ! $familia_str ) {
    $fterms = get_the_terms( get_the_ID(), 'familia' );
    if ( $fterms && ! is_wp_error( $fterms ) ) $familia_str = $fterms[0]->name;
  }

  // Hábitat: IDs serializados o array
  $habitat_str = '';
  $habitat_raw = get_field('habitat') ?: get_post_meta( get_the_ID(), 'habitat', true );
  if ( is_string( $habitat_raw ) && strpos( $habitat_raw, 'a:' ) === 0 ) $habitat_raw = maybe_unserialize( $habitat_raw );
  if ( is_array( $habitat_raw ) ) {
    $nombres = [];
    foreach ( $habitat_raw as $hid ) {
      $t = get_term( (int) $hid, 'habitat' );
      if ( $t && ! is_wp_error( $t ) ) $nombres[] = $t->name;
    }
    $habitat_str = implode( ', ', $nombres );
  }

  // Zona: IDs serializados o array
  $zona_str = '';
  $zona_raw = get_field('zona') ?: get_post_meta( get_the_ID(), 'zona', true );
  if ( is_string( $zona_raw ) && strpos( $zona_raw, 'a:' ) === 0 ) $zona_raw = maybe_unserialize( $zona_raw );
  if ( is_array( $zona_raw ) ) {
    $nombres = [];
    foreach ( $zona_raw as $zid ) {
      $t = get_term( (int) $zid, 'zona' );
      if ( $t && ! is_wp_error( $t ) ) $nombres[] = $t->name;
    }
    $zona_str = implode( ', ', $nombres );
  }

  // Floración
  if ( is_array( $floracion ) && ! empty( $floracion ) ) {
    $floracion_str = implode( ' – ', $floracion );
  } else {
    $floracion_str = $floracion ?: '';
  }

  $descripcion_corta = get_post_meta( get_the_ID(), 'descripcion', true );
  if ( ! $descripcion_corta && get_the_content() ) {
    $descripcion_corta = wp_strip_all_tags( get_the_content() );
  }
  $curiosidad = get_post_meta( get_the_ID(), 'curiosidad', true );

?>

<div class="fdg-ficha-wrap">

  <!-- HERO -->
  <div class="fdg-hero">
    <?php if ( has_post_thumbnail() ) : ?>
      <?php the_post_thumbnail( 'full', [ 'class' => 'fdg-hero__img' ] ); ?>
    <?php endif; ?>
    <div class="fdg-hero__overlay">
      <?php if ( $familia_str ) : ?>
        <span class="fdg-hero__badge"><?php echo esc_html( $familia_str ); ?></span>
      <?php endif; ?>
      <h1 class="fdg-hero__titulo-principal"><?php echo esc_html( $nombre_comun ?: $nombre_cientifico ); ?></h1>
      <?php if ( $nombre_comun ) : ?>
        <p class="fdg-hero__nombre-cientifico"><em><?php echo esc_html( $nombre_cientifico ); ?></em></p>
      <?php endif; ?>
    </div>
  </div>

  <!-- CHIPS -->
  <div class="fdg-chips">
    <?php if ( $floracion_str ) : ?>
      <span class="fdg-chip">🌸 Florece: <?php echo esc_html( $floracion_str ); ?></span>
    <?php endif; ?>
    <?php if ( $familia_str ) : ?>
      <span class="fdg-chip">🌿 <?php echo esc_html( $familia_str ); ?></span>
    <?php endif; ?>
    <?php if ( $habitat_str ) : ?>
      <span class="fdg-chip">&#127956; <?php echo esc_html( $habitat_str ); ?></span>
    <?php endif; ?>
    <?php if ( $esp_protegida && isset($protegida_labels[$esp_protegida]) ) :
      $pl = $protegida_labels[$esp_protegida]; ?>
      <span class="fdg-chip fdg-chip--protegida" style="background:<?php echo $pl['bg']; ?>;color:<?php echo $pl['color']; ?>;border:1px solid <?php echo $pl['color']; ?>20;font-weight:600">
        <?php echo $pl['icono']; ?> <?php echo esc_html( $pl['texto'] ); ?>
      </span>
    <?php endif; ?>
  </div>

  <!-- FICHA PARA NEÓFITOS -->
  <div class="fdg-seccion fdg-ficha-neofito">
    <?php if ( $descripcion_corta ) : ?>
    <div class="fdg-ficha-neofito__bloque">
      <p class="fdg-label">Qué es</p>
      <p class="fdg-ficha-neofito__texto"><?php echo esc_html( $descripcion_corta ); ?></p>
    </div>
    <?php endif; ?>
    <?php if ( $zona_str ) : ?>
    <div class="fdg-ficha-neofito__bloque">
      <p class="fdg-label">Dónde verla</p>
      <p class="fdg-ficha-neofito__texto"><?php echo esc_html( $zona_str ); ?></p>
    </div>
    <?php endif; ?>
    <?php if ( $floracion_str ) : ?>
    <div class="fdg-ficha-neofito__bloque">
      <p class="fdg-label">Cuándo</p>
      <p class="fdg-ficha-neofito__texto">Florece en <?php echo esc_html( $floracion_str ); ?>.</p>
    </div>
    <?php endif; ?>
    <?php if ( $curiosidad ) : ?>
    <div class="fdg-ficha-neofito__bloque fdg-ficha-neofito__bloque--curiosidad">
      <p class="fdg-label">Curiosidad</p>
      <p class="fdg-ficha-neofito__texto"><?php echo esc_html( $curiosidad ); ?></p>
    </div>
    <?php endif; ?>
  </div>

  <!-- DESCRIPCIÓN (contenido largo, si existe) -->
  <?php if ( get_the_content() && trim( wp_strip_all_tags( get_the_content() ) ) !== trim( $descripcion_corta ) ) : ?>
  <div class="fdg-seccion fdg-descripcion">
    <p class="fdg-label">Más información</p>
    <div class="fdg-descripcion__texto">
      <?php the_content(); ?>
    </div>
  </div>
  <?php endif; ?>

  <div class="fdg-seccion fdg-ficha-botanica">
    <p class="fdg-label">Datos científicos</p>
    <div class="fdg-tabla-wrap">
      <div class="fdg-tabla-header">🌿 Datos taxonómicos</div>
      <table class="fdg-tabla">
        <?php if ( $nombre_cientifico ) : ?>
        <tr>
          <td class="fdg-tabla__key">Nombre científico</td>
          <td class="fdg-tabla__val"><em><?php echo esc_html( $nombre_cientifico ); ?></em></td>
        </tr>
        <?php endif; ?>
        <?php if ( $nombre_comun ) : ?>
        <tr>
          <td class="fdg-tabla__key">Nombre común</td>
          <td class="fdg-tabla__val"><?php echo esc_html( $nombre_comun ); ?></td>
        </tr>
        <?php endif; ?>
        <?php if ( $familia_str ) : ?>
        <tr>
          <td class="fdg-tabla__key">Familia</td>
          <td class="fdg-tabla__val"><?php echo esc_html( $familia_str ); ?></td>
        </tr>
        <?php endif; ?>
        <?php if ( $floracion_str ) : ?>
        <tr>
          <td class="fdg-tabla__key">Floración</td>
          <td class="fdg-tabla__val"><?php echo esc_html( $floracion_str ); ?></td>
        </tr>
        <?php endif; ?>
        <?php if ( $habitat_str ) : ?>
        <tr>
          <td class="fdg-tabla__key">Hábitat</td>
          <td class="fdg-tabla__val"><?php echo esc_html( $habitat_str ); ?></td>
        </tr>
        <?php endif; ?>
        <?php if ( function_exists( 'fdg_get_post_zona_terms' ) && fdg_get_post_zona_terms( get_the_ID() ) ) : ?>
        <tr>
          <td class="fdg-tabla__key">Zona</td>
          <td class="fdg-tabla__val"><?php fdg_render_zona_links( get_the_ID() ); ?></td>
        </tr>
        <?php endif; ?>
      </table>
    </div>
  </div>

  <!-- GALERÍA -->
  <?php if ( ! empty( $galeria ) && is_array( $galeria ) ) :
    $total      = count( $galeria );
    $grid_class = $total === 1 ? 'single' : ( $total === 2 ? 'duo' : 'multi' );
  ?>
  <div class="fdg-seccion fdg-galeria">
    <p class="fdg-label">Galería</p>
    <div class="fdg-galeria__grid fdg-galeria__grid--<?php echo $grid_class; ?>">
      <?php foreach ( $galeria as $i => $media_id ) :
        $mime     = get_post_mime_type( $media_id );
        $is_video = $mime && strpos( $mime, 'video/' ) === 0;
        $alt      = get_post_meta( $media_id, '_wp_attachment_image_alt', true ) ?: get_the_title( $media_id );
        $class    = 'fdg-galeria__item' . ( $i === 0 ? ' fdg-galeria__item--principal' : '' );
        if ( $is_video ) :
          $url = wp_get_attachment_url( $media_id );
          if ( ! $url ) continue;
          $poster = '';
          $thumb_id = get_post_thumbnail_id( $media_id );
          if ( $thumb_id ) {
            $poster = wp_get_attachment_image_url( $thumb_id, 'large' );
          }
          if ( ! $poster ) {
            $meta = wp_get_attachment_metadata( $media_id );
            if ( ! empty( $meta['image']['src'] ) && ! empty( $meta['file'] ) ) {
              $upload_dir = wp_upload_dir();
              $poster = $upload_dir['baseurl'] . '/' . dirname( $meta['file'] ) . '/' . $meta['image']['src'];
            }
          }
          if ( ! $poster ) {
            foreach ( $galeria as $gid ) {
              if ( (int) $gid === (int) $media_id ) continue;
              $g_mime = get_post_mime_type( $gid );
              if ( $g_mime && strpos( $g_mime, 'video/' ) === 0 ) continue;
              $poster = wp_get_attachment_image_url( $gid, 'large' );
              if ( $poster ) break;
            }
          }
          if ( ! $poster ) {
            $feat_id = get_post_thumbnail_id( get_the_ID() );
            if ( $feat_id ) {
              $poster = wp_get_attachment_image_url( $feat_id, 'large' );
            }
          }
      ?>
        <a href="<?php echo esc_url( $url ); ?>" class="<?php echo esc_attr( $class ); ?> fdg-galeria__item--video" data-type="video" <?php if ( $poster ) echo 'data-poster="' . esc_url( $poster ) . '"'; ?> aria-label="<?php echo esc_attr( $alt ); ?>">
          <?php if ( $poster ) : ?>
            <img src="<?php echo esc_url( $poster ); ?>" alt="<?php echo esc_attr( $alt ); ?>" loading="lazy">
          <?php else : ?>
            <video src="<?php echo esc_url( $url ); ?>#t=0.1" muted playsinline preload="metadata"></video>
          <?php endif; ?>
          <span class="fdg-galeria__play" aria-hidden="true">▶</span>
        </a>
      <?php else :
          $url_grande = wp_get_attachment_image_url( $media_id, 'large' );
          $url_full   = wp_get_attachment_image_url( $media_id, 'full' );
          if ( ! $url_grande ) continue;
      ?>
        <a href="<?php echo esc_url( $url_full ); ?>" class="<?php echo esc_attr( $class ); ?>" data-lightbox="plantas">
          <img src="<?php echo esc_url( $url_grande ); ?>" alt="<?php echo esc_attr( $alt ); ?>" loading="<?php echo $i === 0 ? 'eager' : 'lazy'; ?>">
        </a>
      <?php endif; endforeach; ?>
    </div>
  </div>
  <?php endif; ?>

</div>

<?php endwhile; ?>
<?php get_footer(); ?>
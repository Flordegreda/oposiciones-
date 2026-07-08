<?php
/**
 * Plantilla para fichas individuales de insectos — Flor de Greda
 */
get_header();

while ( have_posts() ) : the_post();

  $nombre_cientifico = get_post_meta( get_the_ID(), 'nombre_cientifico_ins', true ) ?: get_the_title();
  $nombre_comun      = get_post_meta( get_the_ID(), 'nombre_comun_ins', true );
  $familia_ins       = get_post_meta( get_the_ID(), 'familia_ins', true );
  $vuelo_raw         = get_post_meta( get_the_ID(), 'vuelo', true );
  $envergadura       = get_post_meta( get_the_ID(), 'envergadura', true );
  $plantas_asoc      = get_post_meta( get_the_ID(), 'plantas_asociadas', true );
  $galeria           = get_post_meta( get_the_ID(), 'galeria_ins', true );
  $venenoso          = get_post_meta( get_the_ID(), 'venenoso', true );
  $esp_protegida     = get_post_meta( get_the_ID(), 'especie_protegida', true );
  $protegida_labels  = array(
    'peligro'    => array( 'texto' => 'En peligro de extincion',              'color' => '#7b0000', 'bg' => '#fde8e8', 'icono' => '&#9888;' ),
    'sensible'   => array( 'texto' => 'Sensible a la alteracion del habitat', 'color' => '#854f0b', 'bg' => '#fef3e2', 'icono' => '&#9888;' ),
    'vulnerable' => array( 'texto' => 'Vulnerable',                           'color' => '#b35c00', 'bg' => '#fff3e0', 'icono' => '&#9888;' ),
    'interes'    => array( 'texto' => 'De interes especial',                  'color' => '#185fa5', 'bg' => '#e6f1fb', 'icono' => '&#9432;' ),
  );
  $venenoso_labels   = array(
    'no'       => array( 'texto' => 'No venenoso',           'color' => '#4a7c2f', 'bg' => '#eaf3de', 'icono' => '✅' ),
    'leve'     => array( 'texto' => 'Levemente irritante',   'color' => '#b35c00', 'bg' => '#fff3e0', 'icono' => '⚠️' ),
    'moderado' => array( 'texto' => 'Moderadamente tóxico',  'color' => '#c0392b', 'bg' => '#fdf3f2', 'icono' => '⛔' ),
    'si'       => array( 'texto' => 'Venenoso',              'color' => '#7b0000', 'bg' => '#fde8e8', 'icono' => '☠️' ),
  );

  if ( is_string( $vuelo_raw ) && strpos( $vuelo_raw, 'a:' ) === 0 ) $vuelo_raw = maybe_unserialize( $vuelo_raw );
  $vuelo_str = is_array( $vuelo_raw ) ? implode( ' – ', $vuelo_raw ) : $vuelo_raw;

  if ( is_string( $galeria ) && strpos( $galeria, 'a:' ) === 0 ) $galeria = maybe_unserialize( $galeria );

  // Orden taxonómico
  $orden_terms = get_the_terms( get_the_ID(), 'orden_insecto' );
  $orden_str   = ( $orden_terms && ! is_wp_error( $orden_terms ) ) ? $orden_terms[0]->name : '';

  // Hábitat
  $hab_terms = get_the_terms( get_the_ID(), 'habitat_insecto' );
  $hab_str   = '';
  if ( $hab_terms && ! is_wp_error( $hab_terms ) ) {
    $hab_str = implode( ', ', wp_list_pluck( $hab_terms, 'name' ) );
  }

  // Zona
  $zona_terms = get_the_terms( get_the_ID(), 'zona' );
  $zona_str   = '';
  if ( $zona_terms && ! is_wp_error( $zona_terms ) ) {
    $zona_str = implode( ', ', wp_list_pluck( $zona_terms, 'name' ) );
  }

  $descripcion_corta = get_post_meta( get_the_ID(), 'descripcion', true );
  if ( ! $descripcion_corta && get_the_content() ) {
    $descripcion_corta = wp_strip_all_tags( get_the_content() );
  }
  $curiosidad = get_post_meta( get_the_ID(), 'curiosidad', true );

?>

<div class="fdg-ficha-wrap fdg-ficha-insecto">

  <!-- HERO -->
  <div class="fdg-hero">
    <?php if ( has_post_thumbnail() ) : ?>
      <?php the_post_thumbnail( 'full', [ 'class' => 'fdg-hero__img' ] ); ?>
    <?php endif; ?>
    <div class="fdg-hero__overlay">
      <?php if ( $orden_str ) : ?>
        <span class="fdg-hero__badge"><?php echo esc_html( $orden_str ); ?></span>
      <?php endif; ?>
      <h1 class="fdg-hero__titulo-principal"><?php echo esc_html( $nombre_comun ?: $nombre_cientifico ); ?></h1>
      <?php if ( $nombre_comun ) : ?>
        <p class="fdg-hero__nombre-cientifico"><em><?php echo esc_html( $nombre_cientifico ); ?></em></p>
      <?php endif; ?>
    </div>
  </div>

  <!-- CHIPS -->
  <div class="fdg-chips">
    <?php if ( $vuelo_str ) : ?>
      <span class="fdg-chip">🦋 Vuelo: <?php echo esc_html( $vuelo_str ); ?></span>
    <?php endif; ?>
    <?php if ( $orden_str ) : ?>
      <span class="fdg-chip">🔬 <?php echo esc_html( $orden_str ); ?></span>
    <?php endif; ?>
    <?php if ( $hab_str ) : ?>
      <span class="fdg-chip">🏔 <?php echo esc_html( $hab_str ); ?></span>
    <?php endif; ?>
    <?php if ( $venenoso && isset( $venenoso_labels[$venenoso] ) ) :
      $vl = $venenoso_labels[$venenoso]; ?>
      <span class="fdg-chip fdg-chip--venenoso" style="background:<?php echo $vl['bg']; ?>;color:<?php echo $vl['color']; ?>">
        <?php echo $vl['icono']; ?> <?php echo $vl['texto']; ?>
      </span>
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
      <p class="fdg-label">Dónde verlo</p>
      <p class="fdg-ficha-neofito__texto"><?php echo esc_html( $zona_str ); ?></p>
    </div>
    <?php endif; ?>
    <?php if ( $vuelo_str ) : ?>
    <div class="fdg-ficha-neofito__bloque">
      <p class="fdg-label">Cuándo</p>
      <p class="fdg-ficha-neofito__texto">Vuela en <?php echo esc_html( $vuelo_str ); ?>.</p>
    </div>
    <?php endif; ?>
    <?php if ( $curiosidad ) : ?>
    <div class="fdg-ficha-neofito__bloque fdg-ficha-neofito__bloque--curiosidad">
      <p class="fdg-label">Curiosidad</p>
      <p class="fdg-ficha-neofito__texto"><?php echo esc_html( $curiosidad ); ?></p>
    </div>
    <?php endif; ?>
  </div>

  <?php if ( get_the_content() && trim( wp_strip_all_tags( get_the_content() ) ) !== trim( $descripcion_corta ) ) : ?>
  <div class="fdg-seccion fdg-descripcion">
    <p class="fdg-label">Más información</p>
    <div class="fdg-descripcion__texto"><?php the_content(); ?></div>
  </div>
  <?php endif; ?>

  <div class="fdg-seccion fdg-ficha-botanica">
    <p class="fdg-label">Datos científicos</p>
    <div class="fdg-tabla-wrap">
      <div class="fdg-tabla-header">🔬 Datos taxonómicos</div>
      <table class="fdg-tabla">
        <?php if ( $nombre_cientifico ) : ?><tr><td class="fdg-tabla__key">Nombre científico</td><td class="fdg-tabla__val"><em><?php echo esc_html( $nombre_cientifico ); ?></em></td></tr><?php endif; ?>
        <?php if ( $nombre_comun ) : ?><tr><td class="fdg-tabla__key">Nombre común</td><td class="fdg-tabla__val"><?php echo esc_html( $nombre_comun ); ?></td></tr><?php endif; ?>
        <?php if ( $orden_str ) : ?><tr><td class="fdg-tabla__key">Orden</td><td class="fdg-tabla__val"><?php echo esc_html( $orden_str ); ?></td></tr><?php endif; ?>
        <?php if ( $familia_ins ) : ?><tr><td class="fdg-tabla__key">Familia</td><td class="fdg-tabla__val"><?php echo esc_html( $familia_ins ); ?></td></tr><?php endif; ?>
        <?php if ( $envergadura ) : ?><tr><td class="fdg-tabla__key">Envergadura</td><td class="fdg-tabla__val"><?php echo esc_html( $envergadura ); ?></td></tr><?php endif; ?>
        <?php if ( $vuelo_str ) : ?><tr><td class="fdg-tabla__key">Período de vuelo</td><td class="fdg-tabla__val"><?php echo esc_html( $vuelo_str ); ?></td></tr><?php endif; ?>
        <?php if ( $plantas_asoc ) : ?><tr><td class="fdg-tabla__key">Plantas asociadas</td><td class="fdg-tabla__val"><?php echo esc_html( $plantas_asoc ); ?></td></tr><?php endif; ?>
        <?php if ( $hab_str ) : ?><tr><td class="fdg-tabla__key">Hábitat</td><td class="fdg-tabla__val"><?php echo esc_html( $hab_str ); ?></td></tr><?php endif; ?>
        <?php if ( function_exists( 'fdg_get_post_zona_terms' ) && fdg_get_post_zona_terms( get_the_ID() ) ) : ?><tr><td class="fdg-tabla__key">Zona</td><td class="fdg-tabla__val"><?php fdg_render_zona_links( get_the_ID() ); ?></td></tr><?php endif; ?>
        <?php if ( $venenoso && isset( $venenoso_labels[$venenoso] ) ) :
          $vl = $venenoso_labels[$venenoso]; ?>
          <tr>
            <td class="fdg-tabla__key">¿Es venenoso?</td>
            <td class="fdg-tabla__val">
              <span style="display:inline-flex;align-items:center;gap:6px;background:<?php echo $vl['bg']; ?>;color:<?php echo $vl['color']; ?>;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:600">
                <?php echo $vl['icono']; ?> <?php echo $vl['texto']; ?>
              </span>
            </td>
          </tr>
        <?php endif; ?>
      </table>
    </div>
  </div>

  <!-- GALERÍA -->
  <?php if ( ! empty( $galeria ) && is_array( $galeria ) ) :
    $total = count( $galeria );
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
          $url_g = wp_get_attachment_image_url( $media_id, 'large' );
          $url_f = wp_get_attachment_image_url( $media_id, 'full' );
          if ( ! $url_g ) continue;
      ?>
        <a href="<?php echo esc_url( $url_f ); ?>" class="<?php echo esc_attr( $class ); ?>" data-lightbox="insectos">
          <img src="<?php echo esc_url( $url_g ); ?>" alt="<?php echo esc_attr( $alt ); ?>" loading="<?php echo $i === 0 ? 'eager' : 'lazy'; ?>">
        </a>
      <?php endif; endforeach; ?>
    </div>
  </div>
  <?php endif; ?>

</div>

<?php endwhile; ?>
<?php get_footer(); ?>
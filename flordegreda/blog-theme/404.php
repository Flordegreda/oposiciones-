<?php
/**
 * 404
 */
get_header();
?>
<section class="page-hero">
	<p class="page-hero__eyebrow">404</p>
	<h1 class="page-hero__title">No está esta página</h1>
	<p class="page-hero__lead"><a href="<?php echo esc_url( home_url( '/' ) ); ?>">Volver al inicio</a></p>
</section>
<?php
get_footer();

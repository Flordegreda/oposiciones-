<?php
defined( 'ABSPATH' ) || exit;
/** @var array $materias */
/** @var array $sections */
?>
<div class="wrap ojex-admin">
	<h1><?php esc_html_e( 'Oposiciones JEX — Material', 'oposiciones-jex' ); ?></h1>

	<div class="ojex-stats">
		<?php
		$total_bancos = 0;
		$total_preg   = 0;
		foreach ( $materias as $m ) {
			$total_bancos += (int) $m['bancos'];
			$total_preg   += (int) $m['preguntas'];
		}
		?>
		<p>
			<strong><?php echo (int) count( $materias ); ?></strong> materias ·
			<strong><?php echo (int) $total_bancos; ?></strong> bancos ·
			<strong><?php echo (int) $total_preg; ?></strong> preguntas
		</p>
	</div>

	<h2><?php esc_html_e( 'Temario publicado', 'oposiciones-jex' ); ?></h2>
	<?php if ( ! $sections ) : ?>
		<p><?php esc_html_e( 'Aún no hay material. Importa texto o restaura una copia JSON.', 'oposiciones-jex' ); ?></p>
	<?php else : ?>
		<?php foreach ( $sections as $section ) : ?>
			<h3><?php echo esc_html( $section['nombre'] ); ?></h3>
			<ul>
				<?php foreach ( $section['bancos'] as $banco ) : ?>
					<li>
						<?php echo esc_html( $banco['nombre'] ); ?>
						— <?php echo (int) $banco['numPreguntas']; ?> preguntas
						(<?php echo esc_html( $banco['tipo'] ); ?>)
					</li>
				<?php endforeach; ?>
			</ul>
		<?php endforeach; ?>
	<?php endif; ?>

	<p>
		<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=ojex-import-text' ) ); ?>">
			<?php esc_html_e( 'Importar texto', 'oposiciones-jex' ); ?>
		</a>
		<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=ojex-backup' ) ); ?>">
			<?php esc_html_e( 'Copia de seguridad', 'oposiciones-jex' ); ?>
		</a>
	</p>

	<h2><?php esc_html_e( 'Nueva materia', 'oposiciones-jex' ); ?></h2>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-bottom:2rem">
		<?php wp_nonce_field( 'ojex_create_materia' ); ?>
		<input type="hidden" name="action" value="ojex_create_materia" />
		<input type="text" name="materia_nombre" class="regular-text" placeholder="<?php esc_attr_e( 'Nombre de la materia', 'oposiciones-jex' ); ?>" required />
		<?php submit_button( __( 'Crear materia', 'oposiciones-jex' ), 'secondary', 'submit', false ); ?>
	</form>

	<?php
	$pages = get_option( 'ojex_page_ids', array() );
	if ( is_array( $pages ) && $pages ) :
		?>
		<h2><?php esc_html_e( 'Páginas del plugin', 'oposiciones-jex' ); ?></h2>
		<ul>
			<?php foreach ( $pages as $slug => $pid ) : ?>
				<li>
					<a href="<?php echo esc_url( get_permalink( $pid ) ); ?>" target="_blank" rel="noopener">
						<?php echo esc_html( $slug ); ?>
					</a>
				</li>
			<?php endforeach; ?>
		</ul>
	<?php endif; ?>
</div>

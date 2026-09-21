<?php
/**
 * Home / blog index
 */
get_header();
?>

<?php if ( have_posts() ) : ?>
	<div class="post-list">
		<?php
		while ( have_posts() ) :
			the_post();
			?>
			<article <?php post_class( 'post-card' ); ?>>
				<p class="post-card__meta">
					<time datetime="<?php echo esc_attr( get_the_date( DATE_W3C ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time>
					<?php
					$cats = get_the_category();
					if ( $cats ) {
						echo ' · ' . esc_html( $cats[0]->name );
					}
					?>
				</p>
				<h2 class="post-card__title">
					<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
				</h2>
				<p class="post-card__excerpt"><?php echo esc_html( wp_strip_all_tags( get_the_excerpt() ) ); ?></p>
			</article>
			<?php
		endwhile;
		?>
	</div>
	<div class="pagination">
		<?php
		the_posts_pagination(
			array(
				'mid_size'  => 1,
				'prev_text' => '← Anterior',
				'next_text' => 'Siguiente →',
			)
		);
		?>
	</div>
<?php else : ?>
	<div class="empty-state">
		<p>Todavía no hay entradas.</p>
	</div>
<?php endif; ?>

<?php
get_footer();

<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="site">
	<header class="site-header">
		<div class="site-header__inner">
			<a class="site-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
				<img
					class="site-brand__logo"
					src="https://flordegreda.es/wp-content/uploads/2026/05/LOGO.png"
					alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"
					width="220"
					height="220"
					decoding="async"
				>
				<span class="site-brand__name"><?php bloginfo( 'name' ); ?></span>
			</a>
			<nav class="nav-primary" aria-label="<?php esc_attr_e( 'Principal', 'flordegreda-blog' ); ?>">
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'primary',
						'container'      => false,
						'fallback_cb'    => 'fdg_blog_fallback_menu',
						'depth'          => 1,
					)
				);
				?>
			</nav>
		</div>
	</header>
	<main class="site-main" id="content">

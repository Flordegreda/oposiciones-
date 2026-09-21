	</main>
	<footer class="site-footer">
		<div class="site-footer__inner">
			<div>
				<a class="site-footer__brand" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php bloginfo( 'name' ); ?></a>
				<p class="site-footer__note">Salvatierra de los Barros</p>
			</div>
			<div>
				<p class="site-footer__copy">
					<a href="https://flordegreda.es/">flordegreda.es</a><br>
					&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> Tomás Mesa
				</p>
			</div>
		</div>
	</footer>
</div>
<?php wp_footer(); ?>
</body>
</html>

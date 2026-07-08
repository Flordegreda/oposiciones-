<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FDG_CAMPO_BRAND_TEXT', 'Flor de Greda' );

function fdg_campo_image_lib_available() {
	return extension_loaded( 'gd' ) && function_exists( 'imagecreatetruecolor' );
}

function fdg_campo_font_path( $variant = 'regular' ) {
	$files = array(
		'regular' => 'DejaVuSans.ttf',
		'bold'    => 'DejaVuSans-Bold.ttf',
		'italic'  => 'DejaVuSans-Oblique.ttf',
	);
	$file  = isset( $files[ $variant ] ) ? $files[ $variant ] : $files['regular'];

	return FDG_CAMPO_DIR . 'assets/fonts/' . $file;
}

function fdg_campo_is_valid_font_file( $path ) {
	if ( ! is_readable( $path ) ) {
		return false;
	}
	$fh = fopen( $path, 'rb' );
	if ( ! $fh ) {
		return false;
	}
	$header = fread( $fh, 4 );
	fclose( $fh );
	if ( ! $header || strlen( $header ) < 4 ) {
		return false;
	}
	// TTF / OTF — rechaza HTML u otros ficheros corruptos.
	return "\x00\x01\x00\x00" === $header || 'OTTO' === $header || 'true' === $header || 'typ1' === $header;
}

function fdg_campo_has_freetype() {
	$path = fdg_campo_font_path( 'regular' );
	return function_exists( 'imagettftext' )
		&& fdg_campo_is_valid_font_file( $path );
}

function fdg_campo_image_from_file( $path ) {
	if ( ! is_readable( $path ) ) {
		return null;
	}

	$info = wp_check_filetype( $path );
	$type = $info['type'];

	if ( 'image/jpeg' === $type && function_exists( 'imagecreatefromjpeg' ) ) {
		return imagecreatefromjpeg( $path );
	}
	if ( 'image/png' === $type && function_exists( 'imagecreatefrompng' ) ) {
		$img = imagecreatefrompng( $path );
		if ( $img ) {
			imagealphablending( $img, true );
			imagesavealpha( $img, true );
		}
		return $img;
	}
	if ( 'image/webp' === $type && function_exists( 'imagecreatefromwebp' ) ) {
		return imagecreatefromwebp( $path );
	}

	return null;
}

function fdg_campo_save_image_resource( $img, $path, $mime = 'image/jpeg' ) {
	if ( 'image/png' === $mime ) {
		imagesavealpha( $img, true );
		return imagepng( $img, $path, 6 );
	}
	if ( 'image/webp' === $mime && function_exists( 'imagewebp' ) ) {
		return imagewebp( $img, $path, 86 );
	}
	return imagejpeg( $img, $path, 88 );
}

function fdg_campo_hex_color( $img, $hex ) {
	$hex = ltrim( $hex, '#' );
	$r   = hexdec( substr( $hex, 0, 2 ) );
	$g   = hexdec( substr( $hex, 2, 2 ) );
	$b   = hexdec( substr( $hex, 4, 2 ) );

	return imagecolorallocate( $img, $r, $g, $b );
}

function fdg_campo_truncate_text( $text, $max = 52 ) {
	$text = trim( wp_strip_all_tags( (string) $text ) );
	if ( function_exists( 'mb_strlen' ) && function_exists( 'mb_substr' ) ) {
		if ( mb_strlen( $text ) <= $max ) {
			return $text;
		}
		return mb_substr( $text, 0, $max - 1 ) . '…';
	}
	if ( strlen( $text ) <= $max ) {
		return $text;
	}
	return substr( $text, 0, $max - 1 ) . '…';
}

function fdg_campo_draw_text( $img, $text, $x, $y, $size, $color, $variant = 'regular' ) {
	$text = fdg_campo_truncate_text( $text, 80 );
	if ( '' === $text ) {
		return;
	}

	if ( fdg_campo_has_freetype() ) {
		$font = fdg_campo_font_path( $variant );
		imagettftext( $img, $size, 0, (int) $x, (int) $y, $color, $font, $text );
		return;
	}

	$gd_font = ( 'bold' === $variant ) ? 5 : 3;
	imagestring( $img, $gd_font, (int) $x, (int) ( $y - 12 ), $text, $color );
}

function fdg_campo_image_cover_crop( $src, $src_w, $src_h, $dest_w, $dest_h ) {
	$dest  = imagecreatetruecolor( $dest_w, $dest_h );
	$white = imagecolorallocate( $dest, 234, 243, 222 );
	imagefill( $dest, 0, 0, $white );

	$src_ratio  = $src_w / $src_h;
	$dest_ratio = $dest_w / $dest_h;

	if ( $src_ratio > $dest_ratio ) {
		$crop_h = $src_h;
		$crop_w = (int) round( $src_h * $dest_ratio );
		$src_x  = (int) round( ( $src_w - $crop_w ) / 2 );
		$src_y  = 0;
	} else {
		$crop_w = $src_w;
		$crop_h = (int) round( $src_w / $dest_ratio );
		$src_x  = 0;
		$src_y  = (int) round( ( $src_h - $crop_h ) / 2 );
	}

	imagecopyresampled( $dest, $src, 0, 0, $src_x, $src_y, $dest_w, $dest_h, $crop_w, $crop_h );
	return $dest;
}

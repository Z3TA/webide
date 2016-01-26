
(function() {
	
	"use strict";
	
	editor.on("start", subPixel_main);
	
	function subPixel_main() {
		// Add another canvas to use for 
		
		// Add ourself to 
		}
	
	function beforeRendering() {
	}
	
	function afterRendering() {
		}
	
	
function copyPix_LCD( source, dest, w1 ) {
	
	// Source:
	
	// copies a 3:1 image to a 1:1 image, using LCD stripes
	// w1 = centre weighting for sampling. e.g. 0.6
	
	var sc = source.getContext('2d');
	var sw = source.width;
	var sh = source.height;
	var sp = sc.getImageData(0, 0, sw, sh);
	
	var dc = dest.getContext('2d');
	var dw = dest.width;
	var dh = dest.height;
	var dp = dc.getImageData(0, 0, dw, dh);
	
	var readIndex, writeIndex, r, g, b, a, x, y;
	
	// sampling weightings. w1 = weight for sub-pixel; w2 = weight for
	var w2 = (1-w1) * 0.5;
	var w21 = w1 + w2;
	var w211 = w2 + w2 + w1;
	
	// copy. we cheat, by ignoring the width edges.
	// todo: check extents of source reads, e.g. to use 0..dw, and then prevent index error (too slow?)
	for( y = 0; y < dh; y++ ) {
		
		for( x = 1; x < (dw-1); x++ ) {
			
			readIndex  = (y * sw + x * 3) * 4;
			writeIndex = (y * dw + x) * 4;
			
			// r
			dp.data[writeIndex + 0] = Math.round(
			w1 *   sp.data[ readIndex + 0 ]
			+	w2 * ( sp.data[ readIndex - 4 ] + sp.data[ readIndex +  4 ] )
			);
			
			// g
			dp.data[writeIndex + 1] = Math.round(
			w1 *   sp.data[ readIndex + 5 ]
			+	w2 * ( sp.data[ readIndex + 1 ] + sp.data[ readIndex +  9 ] )
			);
			
			// b
			dp.data[writeIndex + 2] = Math.round(
			w1 *   sp.data[ readIndex + 10 ]
			+	w2 * ( sp.data[ readIndex + 6 ] + sp.data[ readIndex + 14 ] )
			);
			
			// a
			dp.data[writeIndex + 3] = Math.round(
			0.3333 * (
			w211 *   sp.data[ readIndex + 7 ]
			+	w21  * ( sp.data[ readIndex + 3 ] + sp.data[ readIndex + 11 ] )
			+	w2   * ( sp.data[ readIndex - 1 ] + sp.data[ readIndex + 15 ] )
			)
			);
			
		}
		
	}
	
	dc.putImageData(dp,0,0);
	}
	
	
})();
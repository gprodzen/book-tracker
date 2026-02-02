/**
 * color-extractor.js - Extract dominant color from book covers
 *
 * Uses Canvas API to sample colors from cover images and generate
 * visually appealing gradients for card headers.
 */

const colorCache = new Map();

// Fallback bronze color (matches design system accent)
const FALLBACK = {
    r: 139, g: 94, b: 52,
    hex: '#8b5e34',
    gradient: 'linear-gradient(135deg, #8b5e34 0%, #a06840 100%)',
    isDark: false
};

/**
 * Extract dominant color from an image URL
 * @param {string} imageUrl - URL of the cover image
 * @returns {Promise<{r: number, g: number, b: number, hex: string, gradient: string, isDark: boolean}>}
 */
export async function extractDominantColor(imageUrl) {
    // Return cached result if available
    if (colorCache.has(imageUrl)) {
        return colorCache.get(imageUrl);
    }

    // Return fallback for missing URLs
    if (!imageUrl) {
        return FALLBACK;
    }

    try {
        const img = await loadImage(imageUrl);
        const colorData = extractColorFromImage(img);

        // Cache the result
        colorCache.set(imageUrl, colorData);
        return colorData;
    } catch (error) {
        // CORS errors or failed loads - return fallback silently
        console.debug('Color extraction failed for:', imageUrl, error.message);
        colorCache.set(imageUrl, FALLBACK);
        return FALLBACK;
    }
}

/**
 * Load an image with CORS handling
 */
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));

        // Set timeout for slow loads
        const timeout = setTimeout(() => {
            reject(new Error('Image load timeout'));
        }, 5000);

        img.onload = () => {
            clearTimeout(timeout);
            resolve(img);
        };

        img.src = url;
    });
}

/**
 * Extract color data from a loaded image
 */
function extractColorFromImage(img) {
    // Create small canvas for performance
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Sample at reduced resolution
    const sampleSize = 50;
    canvas.width = sampleSize;
    canvas.height = sampleSize;

    // Draw scaled image
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

    // Get pixel data
    let imageData;
    try {
        imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    } catch (e) {
        // CORS security error
        throw new Error('CORS blocked');
    }

    // Find dominant color using color quantization
    const dominant = findDominantColor(imageData.data);

    // Adjust for visual appeal
    const adjusted = adjustColorForGradient(dominant);

    return adjusted;
}

/**
 * Find dominant color using simplified k-means clustering
 */
function findDominantColor(pixels) {
    const colorBuckets = {};

    // Sample every 4th pixel for performance
    for (let i = 0; i < pixels.length; i += 16) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        // Skip transparent pixels
        if (a < 128) continue;

        // Skip very dark or very light pixels (likely borders/backgrounds)
        const brightness = (r + g + b) / 3;
        if (brightness < 30 || brightness > 225) continue;

        // Quantize to reduce color space
        const key = `${Math.floor(r / 32)},${Math.floor(g / 32)},${Math.floor(b / 32)}`;

        if (!colorBuckets[key]) {
            colorBuckets[key] = { r: 0, g: 0, b: 0, count: 0 };
        }

        colorBuckets[key].r += r;
        colorBuckets[key].g += g;
        colorBuckets[key].b += b;
        colorBuckets[key].count++;
    }

    // Find most common color bucket
    let maxCount = 0;
    let dominant = { r: 139, g: 94, b: 52 }; // Fallback bronze

    for (const key in colorBuckets) {
        const bucket = colorBuckets[key];
        if (bucket.count > maxCount) {
            maxCount = bucket.count;
            dominant = {
                r: Math.round(bucket.r / bucket.count),
                g: Math.round(bucket.g / bucket.count),
                b: Math.round(bucket.b / bucket.count)
            };
        }
    }

    return dominant;
}

/**
 * Adjust color for visual appeal in gradients
 */
function adjustColorForGradient(color) {
    let { r, g, b } = color;

    // Calculate brightness and saturation
    const brightness = (r + g + b) / 3;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    // Boost saturation if too low
    if (saturation < 0.2) {
        const factor = 1.3;
        const avg = (r + g + b) / 3;
        r = Math.min(255, Math.max(0, avg + (r - avg) * factor));
        g = Math.min(255, Math.max(0, avg + (g - avg) * factor));
        b = Math.min(255, Math.max(0, avg + (b - avg) * factor));
    }

    // Darken if too bright (for white text readability)
    if (brightness > 180) {
        const factor = 0.7;
        r = Math.round(r * factor);
        g = Math.round(g * factor);
        b = Math.round(b * factor);
    }

    // Lighten if too dark
    if (brightness < 60) {
        const factor = 1.4;
        r = Math.min(255, Math.round(r * factor));
        g = Math.min(255, Math.round(g * factor));
        b = Math.min(255, Math.round(b * factor));
    }

    // Generate hex
    const hex = rgbToHex(r, g, b);

    // Generate lighter color for gradient end
    const lighter = {
        r: Math.min(255, Math.round(r * 1.15)),
        g: Math.min(255, Math.round(g * 1.15)),
        b: Math.min(255, Math.round(b * 1.15))
    };
    const lighterHex = rgbToHex(lighter.r, lighter.g, lighter.b);

    // Determine if color is dark (for potential text color decisions)
    const isDark = brightness < 128;

    return {
        r: Math.round(r),
        g: Math.round(g),
        b: Math.round(b),
        hex,
        gradient: `linear-gradient(135deg, ${hex} 0%, ${lighterHex} 100%)`,
        isDark
    };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Clear the color cache (useful for testing)
 */
export function clearColorCache() {
    colorCache.clear();
}

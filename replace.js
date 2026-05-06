const fs = require('fs');
const path = require('path');

const configPath = path.join('d:', 'Regestr loyiha', 'js', 'config.js');
let config = fs.readFileSync(configPath, 'utf8');

// Replace specific cities that contain "shahar Emergency Department"
config = config.replace(/ shahar Emergency Department/g, " ShTB");

// Replace specific tumans that contain "tuman Emergency Department"
config = config.replace(/ tuman Emergency Department/g, " TTB");

// Replace all remaining "Emergency Department"
config = config.replace(/Emergency Department/g, "TTB");

fs.writeFileSync(configPath, config);
console.log('Replacements completed.');

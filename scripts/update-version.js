const fs = require('fs');
const path = require('path');

// Lire version.json
const versionPath = path.join(__dirname, '..', 'version.json');
const packagePath = path.join(__dirname, '..', 'package.json');

try {
  // Lire les fichiers
  const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Construire la version
  const version = `${versionData.major}.${versionData.minor}.${versionData.micro}`;
  
  // Mettre à jour la version dans package.json
  packageData.version = version;
  
  // Écrire le fichier package.json mis à jour
  fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
  
  console.log(`Version mise à jour vers ${version}`);
} catch (error) {
  console.error('Erreur lors de la mise à jour de la version:', error);
  process.exit(1);
}

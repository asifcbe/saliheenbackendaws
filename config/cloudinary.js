const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const uploadToCloudinary = (file, _folder) =>
  Promise.resolve({ secure_url: `/uploads/${file.filename}` });

const deleteFromCloudinary = (url) => {
  if (!url || url.includes('cloudinary.com')) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      const filename = path.basename(url);
      const filepath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch (_) {}
    resolve();
  });
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };

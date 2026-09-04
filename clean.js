import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const folders = ['dist', 'release', 'temp_submissions'];

folders.forEach(folder => {
    const dir = path.join(__dirname, folder);
    if (fs.existsSync(dir)) {
        console.log(`Cleaning: ${folder}...`);
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        } catch (err) {
            console.error(`Error deleting ${folder}:`, err.message);
        }
    }
});

console.log("Cleanup complete!");
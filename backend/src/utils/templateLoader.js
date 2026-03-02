import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads an email template and replaces placeholders with data
 * @param {string} templateName - Name of the template file (without .html)
 * @param {Object} data - Key-value pairs for replacement
 * @returns {string} Processed HTML
 */
export const loadTemplate = (templateName, data = {}) => {
    try {
        // Path to the color-email-templates folder
        // Currently inside backend/src/utils/, templates are at PORTAL/email-templates/color-email-templates/
        const templatePath = path.join(__dirname, '../../../email-templates/color-email-templates', `${templateName}.html`);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templatePath}`);
        }

        let html = fs.readFileSync(templatePath, 'utf8');

        // Replace placeholders {{key}} with data[key]
        Object.keys(data).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(placeholder, data[key]);
        });

        return html;
    } catch (error) {
        console.error(`Error loading template ${templateName}:`, error);
        throw error;
    }
};

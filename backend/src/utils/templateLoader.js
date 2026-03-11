import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process {{#if key}}...{{/if}} blocks - include content if key is truthy, else remove block
 */
function processConditionals(html, data) {
    const ifBlockRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    return html.replace(ifBlockRegex, (match, key, innerContent) => {
        const value = data[key];
        if (value !== undefined && value !== null && value !== '') {
            return innerContent;
        }
        return '';
    });
}

/**
 * Loads an email template and replaces placeholders with data
 * Supports {{key}} placeholders and {{#if key}}...{{/if}} conditionals
 * @param {string} templateName - Name of the template file (without .html)
 * @param {Object} data - Key-value pairs for replacement
 * @returns {string} Processed HTML
 */
export const loadTemplate = (templateName, data = {}) => {
    try {
        // email-templates is in backend/ for Vercel deployment (../../ from src/utils)
const templatePath = path.join(__dirname, '../../email-templates/color-email-templates', `${templateName}.html`);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templatePath}`);
        }

        let html = fs.readFileSync(templatePath, 'utf8');

        // 1. Process {{#if key}}...{{/if}} conditionals first (before replacing {{key}} inside them)
        html = processConditionals(html, data);

        // 2. Replace placeholders {{key}} with data[key] (escape for HTML where needed)
        Object.keys(data).forEach(key => {
            const value = data[key];
            const safeValue = (value !== undefined && value !== null) ? String(value) : '';
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            html = html.replace(placeholder, safeValue);
        });

        return html;
    } catch (error) {
        console.error(`Error loading template ${templateName}:`, error);
        throw error;
    }
};

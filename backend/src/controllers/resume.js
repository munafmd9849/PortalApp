/**
 * Resume Controller
 * Handles resume generation and PDF export
 */

import prisma from '../config/database.js';

// Optional Puppeteer - will be loaded dynamically if available
let puppeteer = null;

/**
 * Generate PDF from HTML resume
 * POST /api/students/generate-resume-pdf
 */
export async function generateResumePDF(req, res) {
  try {
    const userId = req.userId;
    const { templateId = '1', studentId } = req.body;

    // Get student data
    const targetStudentId = studentId || userId;
    const student = await prisma.student.findUnique({
      where: { userId: targetStudentId },
      include: {
        skills: true,
        education: {
          orderBy: { endYear: 'desc' },
        },
        projects: {
          orderBy: { createdAt: 'desc' },
        },
        experiences: {
          orderBy: { start: 'desc' },
        },
        achievements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Generate HTML based on template
    const html = generateResumeHTML(student, templateId);
    
    if (!html || html.trim().length === 0) {
      throw new Error('Generated HTML is empty');
    }

    // Try to load Puppeteer if not already loaded
    if (!puppeteer) {
      try {
        const puppeteerModule = await import('puppeteer');
        puppeteer = puppeteerModule.default;
      } catch (e) {
        console.warn('Puppeteer not available. PDF generation will use frontend fallback.');
        return res.status(503).json({
          error: 'Backend PDF generation not available',
          message: 'Puppeteer is not installed. Please use the frontend PDF export feature.',
          fallback: 'frontend'
        });
      }
    }

    // Generate PDF using Puppeteer
    let browser;
    try {
      console.log('Launching Puppeteer...');
      browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
        timeout: 60000, // 60 second timeout for launch
      });

      console.log('Puppeteer launched, creating page...');
      const page = await browser.newPage();
      
      console.log('Setting page content...');
      await page.setContent(html, { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });
      
      console.log('Generating PDF...');
      const pdf = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
      });

      console.log('PDF generated, closing browser...');
      await browser.close();
      
      if (!pdf || pdf.length === 0) {
        throw new Error('Generated PDF is empty');
      }

      console.log(`PDF size: ${pdf.length} bytes`);

      // Set response headers
      const fileName = `RESUME_${student.id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdf.length);

      // Send PDF
      res.send(pdf);
      console.log('PDF sent successfully');
    } catch (puppeteerError) {
      console.error('Puppeteer error details:', {
        name: puppeteerError.name,
        message: puppeteerError.message,
        stack: puppeteerError.stack
      });
      
      // Close browser if it exists
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
      
      // Return error that will trigger frontend fallback
      return res.status(503).json({
        error: 'Failed to generate PDF with Puppeteer',
        message: puppeteerError.message || 'Puppeteer error occurred',
        fallback: 'frontend'
      });
    }
  } catch (error) {
    console.error('Generate resume PDF error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      message: error.message 
    });
  }
}

/**
 * Generate HTML resume based on template
 */
function generateResumeHTML(student, templateId) {
  // Parse project data
  const projects = (student.projects || []).map(project => {
    let techStack = [];
    let aiBullets = [];
    
    try {
      techStack = project.technologies ? (typeof project.technologies === 'string' ? JSON.parse(project.technologies) : project.technologies) : [];
      aiBullets = project.ai_bullets ? (typeof project.ai_bullets === 'string' ? JSON.parse(project.ai_bullets) : project.ai_bullets) : [];
    } catch (e) {
      // Keep empty arrays
    }
    
    return {
      ...project,
      techStack,
      aiBullets
    };
  });

  const skills = (student.skills || []).map(s => s.skillName || s);
  const experiences = student.experiences || [];
  const education = student.education || [];

  // Template 1 - Classic
  if (templateId === '1') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
      background-color: #fff;
    }
    h1 {
      font-size: 24pt;
      font-weight: bold;
      margin: 0 0 5px 0;
      text-transform: uppercase;
    }
    h2 {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
    }
    .header {
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    .section {
      margin-bottom: 15px;
    }
    ul {
      margin: 5px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 3px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(student.fullName || 'Your Name')}</h1>
    <div style="font-size: 10pt;">
      ${student.email ? `<span>${escapeHtml(student.email)}</span>` : ''}
      ${student.phone ? `<span style="margin-left: 15px;">${escapeHtml(student.phone)}</span>` : ''}
      ${student.linkedin ? `<span style="margin-left: 15px;">${escapeHtml(student.linkedin)}</span>` : ''}
      ${student.githubUrl ? `<span style="margin-left: 15px;">${escapeHtml(student.githubUrl)}</span>` : ''}
    </div>
  </div>

  ${student.summary ? `
  <div class="section">
    <h2>Summary</h2>
    <p style="margin: 0; text-align: justify;">${escapeHtml(student.summary)}</p>
  </div>
  ` : ''}

  ${skills.length > 0 ? `
  <div class="section">
    <h2>Skills</h2>
    <p style="margin: 0;">${skills.map(s => escapeHtml(s)).join(', ')}</p>
  </div>
  ` : ''}

  ${experiences.length > 0 ? `
  <div class="section">
    <h2>Experience</h2>
    ${experiences.map(exp => `
      <div style="margin-bottom: 12px;">
        <div style="font-weight: bold; font-size: 12pt;">
          ${escapeHtml(exp.title)} | ${escapeHtml(exp.company)}
        </div>
        <div style="font-size: 10pt; font-style: italic; margin-bottom: 5px;">
          ${escapeHtml(exp.start)} - ${exp.end ? escapeHtml(exp.end) : 'Present'}
        </div>
        ${exp.description ? `<p style="margin: 5px 0 0 0; text-align: justify;">${escapeHtml(exp.description)}</p>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${projects.length > 0 ? `
  <div class="section">
    <h2>Projects</h2>
    ${projects.map(project => `
      <div style="margin-bottom: 12px;">
        <div style="font-weight: bold; font-size: 12pt;">
          ${escapeHtml(project.title)}
        </div>
        ${project.techStack && project.techStack.length > 0 ? `
          <div style="font-size: 10pt; font-style: italic; margin-bottom: 5px;">
            Technologies: ${project.techStack.map(t => escapeHtml(t)).join(', ')}
          </div>
        ` : ''}
        ${project.ai_summary ? `
          <p style="margin: 5px 0; text-align: justify;">${escapeHtml(project.ai_summary)}</p>
        ` : project.description ? `
          <p style="margin: 5px 0; text-align: justify;">${escapeHtml(project.description)}</p>
        ` : ''}
        ${project.aiBullets && project.aiBullets.length > 0 ? `
          <ul>
            ${project.aiBullets.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${education.length > 0 ? `
  <div class="section">
    <h2>Education</h2>
    ${education.map(edu => `
      <div style="margin-bottom: 10px;">
        <div style="font-weight: bold; font-size: 12pt;">
          ${escapeHtml(edu.degree)} | ${escapeHtml(edu.institution)}
        </div>
        ${edu.startYear && edu.endYear ? `
          <div style="font-size: 10pt; font-style: italic;">
            ${edu.startYear} - ${edu.endYear}
          </div>
        ` : ''}
        ${edu.cgpa ? `
          <div style="font-size: 10pt;">
            CGPA: ${edu.cgpa}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}
</body>
</html>
    `;
  }

  // Default to Template 1
  return generateResumeHTML(student, '1');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}


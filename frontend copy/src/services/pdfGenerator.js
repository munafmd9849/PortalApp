// PDF generation service using HTML-to-PDF approach
export class PDFGenerator {
  constructor() {
    this.currentRenderController = null;
  }

  // Cancel any in-flight render
  cancelCurrentRender() {
    if (this.currentRenderController) {
      this.currentRenderController.abort();
      this.currentRenderController = null;
    }
  }

  // Generate PDF from resume text data using HTML approach
  async generateResumePDF(resumeText, signal) {
    return new Promise((resolve, reject) => {
      try {
        if (signal?.aborted) {
          reject(new Error('Render cancelled'));
          return;
        }

        // Create HTML content for PDF
        const htmlContent = this.createResumeHTML(resumeText || '');
        
        // Create a temporary iframe for PDF generation
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.width = '8.5in';
        iframe.style.height = '11in';
        
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Wait for content to render then convert to PDF
        setTimeout(() => {
          if (signal?.aborted) {
            document.body.removeChild(iframe);
            reject(new Error('Render cancelled'));
            return;
          }

          try {
            // Use browser's print functionality to create PDF
            const printWindow = iframe.contentWindow;
            
            // Create blob from HTML content (simplified approach)
            const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(htmlBlob);
            
            // Clean up
            document.body.removeChild(iframe);
            
            // For now, return HTML blob as PDF preview
            // In production, you'd use a proper HTML-to-PDF service
            resolve(htmlBlob);
          } catch (error) {
            document.body.removeChild(iframe);
            reject(error);
          }
        }, 100);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Create formatted HTML from resume text
  createResumeHTML(resumeText) {
    const sections = this.parseResumeText(resumeText);
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Resume</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 40px;
            color: #333;
            background: white;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
            margin-top: 20px;
            margin-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 5px;
          }
          .content {
            margin-bottom: 15px;
            font-size: 12px;
          }
          .bullet-point {
            margin-left: 20px;
            margin-bottom: 5px;
          }
          .contact-info {
            color: #1d4ed8;
            font-weight: 500;
          }
          @media print {
            body { margin: 20px; }
            .section-title { break-after: avoid; }
          }
        </style>
      </head>
      <body>
    `;

    sections.forEach(section => {
      if (section.title) {
        htmlContent += `<div class="section-title">${this.escapeHtml(section.title)}</div>`;
      }
      
      section.content.forEach(line => {
        if (line.startsWith('•') || line.startsWith('-')) {
          htmlContent += `<div class="bullet-point">• ${this.escapeHtml(line.substring(1).trim())}</div>`;
        } else if (line.includes('@') || line.includes('linkedin.com') || line.includes('github.com')) {
          htmlContent += `<div class="content contact-info">${this.escapeHtml(line)}</div>`;
        } else {
          htmlContent += `<div class="content">${this.escapeHtml(line)}</div>`;
        }
      });
    });

    htmlContent += `
      </body>
      </html>
    `;

    return htmlContent;
  }

  // Escape HTML characters
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Parse resume text into structured sections
  parseResumeText(text) {
    if (!text) return [{ title: '', content: ['No resume content available'] }];

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const sections = [];
    let currentSection = { title: '', content: [] };

    lines.forEach(line => {
      // Check if line is a section header (all caps, ends with colon, or common headers)
      const isHeader = this.isHeaderLine(line);
      
      if (isHeader) {
        // Save previous section if it has content
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        // Start new section
        currentSection = { title: line, content: [] };
      } else {
        // Add to current section content
        currentSection.content.push(line);
      }
    });

    // Add final section
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : [{ title: '', content: lines }];
  }

  // Determine if a line is a section header
  isHeaderLine(line) {
    const upperLine = line.toUpperCase();
    const commonHeaders = [
      'CONTACT INFORMATION', 'PROFESSIONAL SUMMARY', 'EXPERIENCE', 'EDUCATION',
      'SKILLS', 'PROJECTS', 'ACHIEVEMENTS', 'CERTIFICATIONS', 'OBJECTIVE'
    ];
    
    return (
      line === upperLine && line.length > 2 && line.length < 50 ||
      line.endsWith(':') && line.length < 30 ||
      commonHeaders.some(header => upperLine.includes(header))
    );
  }

  // Generate PDF with cancellation support
  async renderPDF(resumeText) {
    this.cancelCurrentRender();
    this.currentRenderController = new AbortController();
    
    try {
      const pdfBlob = await this.generateResumePDF(resumeText, this.currentRenderController.signal);
      this.currentRenderController = null;
      return pdfBlob;
    } catch (error) {
      this.currentRenderController = null;
      throw error;
    }
  }

  // Download PDF
  downloadPDF(pdfBlob, filename = 'resume.pdf') {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Cleanup
  cleanup() {
    this.cancelCurrentRender();
  }
}

// Singleton instance
export const pdfGenerator = new PDFGenerator();

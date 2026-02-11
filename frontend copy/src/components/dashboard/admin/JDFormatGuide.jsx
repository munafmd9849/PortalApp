import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

/**
 * JD Format Guide Component
 * Shows users the expected format for Job Description documents
 */
const JDFormatGuide = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const exampleFormat = `JOB DESCRIPTION

Job Title: Software Engineer
Company: Tech Solutions Inc.
Location: Bangalore, India
Job Type: Full-Time
Work Mode: Hybrid
Openings: 5

COMPENSATION
Salary: ₹12-15 LPA
CTC: ₹15 Lakhs per annum

QUALIFICATIONS
• B.Tech in Computer Science or related field
• Minimum 2-3 years of experience
• Strong problem-solving skills

REQUIREMENTS
• Proficiency in JavaScript, React, Node.js
• Experience with REST APIs and databases
• Knowledge of cloud platforms (AWS/Azure)
• Good communication skills

RESPONSIBILITIES
• Develop and maintain web applications
• Collaborate with cross-functional teams
• Write clean and maintainable code
• Participate in code reviews

SKILLS
JavaScript, React, Node.js, SQL, MongoDB, AWS, Docker

BENEFITS
• Health insurance
• Flexible working hours
• Learning and development opportunities
• Performance bonuses

Website: https://techsolutions.com
LinkedIn: https://linkedin.com/company/techsolutions`;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-blue-800">
            JD Format Guide - How to Structure Your Job Description
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-blue-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-blue-600" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4 text-sm text-blue-900">
          {/* Format Requirements */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Recommended Format Structure
            </h4>
            <div className="bg-white rounded p-3 border border-blue-200 font-mono text-xs whitespace-pre-wrap overflow-x-auto">
              {exampleFormat}
            </div>
          </div>

          {/* Field Guidelines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Required Fields (Best Results)</h4>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Job Title:</strong> "Job Title: Software Engineer"</li>
                <li>• <strong>Company:</strong> "Company: ABC Corp"</li>
                <li>• <strong>Location:</strong> "Location: Bangalore"</li>
                <li>• <strong>Description:</strong> Full job description text</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Optional Fields</h4>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Salary:</strong> "₹12-15 LPA" or "12-15 Lakhs"</li>
                <li>• <strong>Stipend:</strong> "₹25k/month" (for internships)</li>
                <li>• <strong>Job Type:</strong> "Full-Time" or "Internship"</li>
                <li>• <strong>Work Mode:</strong> "Remote", "Hybrid", or "On-site"</li>
                <li>• <strong>Skills:</strong> Comma-separated or bullet list</li>
                <li>• <strong>Requirements:</strong> Bullet points (• or -)</li>
              </ul>
            </div>
          </div>

          {/* Format Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <h4 className="font-semibold mb-2 text-yellow-800">💡 Format Tips</h4>
            <ul className="space-y-1 text-xs text-yellow-900">
              <li>✅ Use clear labels like "Job Title:", "Company:", "Location:"</li>
              <li>✅ Use bullet points (• or -) for lists (Requirements, Skills, Benefits)</li>
              <li>✅ Include section headers (REQUIREMENTS, RESPONSIBILITIES, etc.)</li>
              <li>✅ For salary, use formats like "₹12-15 LPA" or "12-15 Lakhs per annum"</li>
              <li>✅ Include full URLs for Website and LinkedIn</li>
              <li>⚠️ Avoid complex tables or images (text extraction only)</li>
              <li>⚠️ Ensure PDF/DOC files are text-based (not scanned images)</li>
            </ul>
          </div>

          {/* Supported Formats */}
          <div>
            <h4 className="font-semibold mb-2">Supported File Formats</h4>
            <div className="flex gap-4 text-xs">
              <div>
                <strong>PDF:</strong> Text-based PDFs (not scanned)
              </div>
              <div>
                <strong>DOC/DOCX:</strong> Microsoft Word documents
              </div>
              <div>
                <strong>TXT:</strong> Plain text files
              </div>
            </div>
          </div>

          {/* What Gets Extracted */}
          <div>
            <h4 className="font-semibold mb-2">What the Parser Extracts</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div>✓ Job Title</div>
              <div>✓ Company Name</div>
              <div>✓ Location</div>
              <div>✓ Salary/Stipend</div>
              <div>✓ Job Type</div>
              <div>✓ Work Mode</div>
              <div>✓ Skills</div>
              <div>✓ Requirements</div>
              <div>✓ Responsibilities</div>
              <div>✓ Qualifications</div>
              <div>✓ Experience</div>
              <div>✓ Benefits</div>
              <div>✓ Website URL</div>
              <div>✓ LinkedIn URL</div>
              <div>✓ Openings</div>
              <div>✓ Duration</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JDFormatGuide;

